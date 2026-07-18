"""日期推断 —— 在 LLM 漏提时，用正则从正文/标题补全关键日期。

保研用户最关心「报名截止日期」与「活动时间」，但 LLM 提取并非 100% 命中
（尤其正文较长、日期表述分散时）。本模块作为兜底：在 LLM 提取为空时，
按关键词附近的日期模式补全 registration_start/end 与 camp_start/end。

设计要点：
- 优先匹配「报名截止 / 申请截止 / 截止日期 / 请于…前报名」等明确截止信号；
- 支持 YYYY-MM-DD / YYYY.M.D / YYYY年M月D日 / M月D日（缺年时用标题年份补全）；
- 只在「截止」「前」「期限」「截至」等限定词附近取日期，避免误把活动时间当报名截止。
"""
from __future__ import annotations

import re
from datetime import date, datetime
from typing import Optional


# 完整日期（含年）：2026-06-15 / 2026.6.15 / 2026/06/15 / 2026年6月15日
_FULL_DATE_RE = re.compile(
    r"(\d{4})\s*[年./\-]\s*(\d{1,2})\s*[月./\-]\s*(\d{1,2})\s*日?"
)
# 仅月日：6月15日 / 06-15 / 6.15（需配合年份推断）
_MD_DATE_RE = re.compile(
    r"(?<!\d)(\d{1,2})\s*[月./\-]\s*(\d{1,2})\s*(?:日|号)?(?!\d)"
)

# 报名截止信号词（只认明确的截止信号，避免被"请…报名"等泛词误导）
_REG_END_SIGNALS = [
    r"报名截止(?:日期|时间|期限|期)?\s*[：:.\s]*",
    r"报名(?:期|时间|期限)?\s*(?:为|是|从|将于)?\s*(?:截至|截止)(?:于|在|至|到)?\s*",
    r"(?:申请|提交|注册|填报|邮寄|接收)截止(?:日期|时间|期)?\s*[：:.\s]*",
    r"截止(?:日期|时间)\s*[：:]\s*",
    r"截至\s*",
    r"[Dd]eadline\s*[：:.\s]*",
]
_REG_END_RE = re.compile("|".join(_REG_END_SIGNALS))

# 「日期 + 前 + 报名/申请/提交」反序模式（"请于6月15日前完成报名"）
# 日期在前、动作在后，无法用 signal→date 架构，单独扫描。
_DATE_BEFORE_ACTION_RE = re.compile(
    r"(\d{4}\s*[年./\-]\s*\d{1,2}\s*[月./\-]\s*\d{1,2}\s*日?|"  # 完整日期
    r"(?<!\d)\d{1,2}\s*月\s*\d{1,2}\s*日?)"                      # 月日
    r"\s*(?:之)?前\s*(?:完成|进行|完成)?\s*"
    r"(?:报名|申请|提交|注册|填报|邮寄)",
)

# 报名开始信号
_REG_START_SIGNALS = [
    r"报名(?:开始|起始|起止|时间|期限|期)\s*[：:.\s]*",
    r"(?:申请|提交)开始(?:时间|日期)?\s*[：:.\s]*",
]
_REG_START_RE = re.compile("|".join(_REG_START_SIGNALS))

# 活动时间信号（仅明确的活动/夏令营/举办词，不再用宽泛的"时间："）
_CAMP_SIGNALS = [
    r"(?:活动|夏令营|营期|举办|会议)(?:时间|日期|期|安排)\s*[：:.\s]*",
    r"(?:活动|举办)(?:时间为|期为|起止为|时间从)\s*",
    r"开营(?:时间)?\s*[：:.\s]*",
]
_CAMP_RE = re.compile("|".join(_CAMP_SIGNALS))


def _safe_date(year: int, month: int, day: int) -> Optional[date]:
    try:
        return date(year, month, day)
    except ValueError:
        return None


def _parse_full_date(text: str) -> Optional[date]:
    m = _FULL_DATE_RE.search(text)
    if m:
        return _safe_date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
    return None


def _infer_year_from_context(text: str, default: Optional[int] = None) -> int:
    """从文本中提取年份（标题里的 20NN年/20NN届），否则用 default 或当前年。"""
    m = re.search(r"(20\d{2})\s*[年届级]", text)
    if m:
        return int(m.group(1))
    if default:
        return default
    return datetime.now().year


def _find_date_after(text: str, signal_re: re.Pattern, default_year: int) -> Optional[date]:
    """在信号词之后 40 字符内找第一个完整日期；找不到则尝试月日（用 default_year 补年）。"""
    for m in signal_re.finditer(text):
        window = text[m.end(): m.end() + 40]
        d = _parse_full_date(window)
        if d:
            return d
        # 退而求其次：月日 + 推断年份
        md = _MD_DATE_RE.search(window)
        if md:
            d = _safe_date(default_year, int(md.group(1)), int(md.group(2)))
            if d:
                return d
    return None


def _find_date_window_range(
    text: str, signal_re: re.Pattern, default_year: int
) -> tuple[Optional[date], Optional[date]]:
    """在信号词后窗口内尝试解析区间（start 至 end）。"""
    for m in signal_re.finditer(text):
        window = text[m.end(): m.end() + 60]
        # 先尝试两个完整日期
        fulls = list(_FULL_DATE_RE.finditer(window))
        if len(fulls) >= 2:
            s = _safe_date(int(fulls[0][1]), int(fulls[0][2]), int(fulls[0][3]))
            e = _safe_date(int(fulls[1][1]), int(fulls[1][2]), int(fulls[1][3]))
            if s and e:
                return s, e
        # 一个完整日期 + 一个月日
        if len(fulls) == 1:
            s = _safe_date(int(fulls[0][1]), int(fulls[0][2]), int(fulls[0][3]))
            tail = window[fulls[0].end():]
            md = _MD_DATE_RE.search(tail)
            if md:
                e = _safe_date(s.year, int(md[1]), int(md[2]))
                if s and e and e >= s:
                    return s, e
            return s, None
        # 两个都是月日（无年份）：用 default_year 补全
        if len(fulls) == 0:
            mds = list(_MD_DATE_RE.finditer(window))
            if len(mds) >= 2:
                s = _safe_date(default_year, int(mds[0][1]), int(mds[0][2]))
                e = _safe_date(default_year, int(mds[1][1]), int(mds[1][2]))
                if s and e and e >= s:
                    return s, e
    return None, None


def infer_registration_window(
    content: str, title: str = "", default_year: Optional[int] = None
) -> tuple[Optional[date], Optional[date]]:
    """推断报名区间 (start, end)。end 是用户最关心的截止日。"""
    text = f"{title}\n{content or ''}"
    year = _infer_year_from_context(title, default_year)

    end = _find_date_after(text, _REG_END_RE, year)
    if end is None:
        # 反序模式：「6月15日前报名」
        m = _DATE_BEFORE_ACTION_RE.search(text)
        if m:
            grp = m.group(1)
            d = _parse_full_date(grp)
            if d is None:
                md = _MD_DATE_RE.search(grp)
                if md:
                    d = _safe_date(year, int(md.group(1)), int(md.group(2)))
            end = d

    start_w, end_w = _find_date_window_range(text, _REG_START_RE, year)
    start = start_w
    # 如果开始信号里也解出了 end，且主 end 信号没命中，用它
    if end is None and end_w:
        end = end_w
    return start, end


def infer_camp_window(
    content: str, title: str = "", default_year: Optional[int] = None
) -> tuple[Optional[date], Optional[date]]:
    """推断活动/夏令营举办区间 (start, end)。"""
    text = f"{title}\n{content or ''}"
    year = _infer_year_from_context(title, default_year)
    s, e = _find_date_window_range(text, _CAMP_RE, year)
    if s is None:
        # 单日期兜底
        s = _find_date_after(text, _CAMP_RE, year)
    return s, e
