"""
师资页列表解析器 — 阶段 B1 核心模块

从学院师资页 HTML 中抽出教师条目（Tier 2 基础卡片）。

输入：
  - HTML
  - 师资页 URL（用于相对链接绝对化）

输出：[{name, title, homepage_url, email?, photo_url?, research_areas?, raw_text}, ...]

四层策略级联（类比 `parser/list_parser.py`）：
  Strategy 1：CMS 常见模板匹配（博达站群 / WP / 正方）
  Strategy 2：启发式（姓氏白名单 + 职称近邻 + 教师详情 URL 特征）
  Strategy 3：结构检测（重复容器，`<li>` / `<div.teacher>` / `<td>` 等）
  Strategy 4：LLM 兜底（仅在前三层失败时调用）
"""

from __future__ import annotations

import re
from typing import Optional

from bs4 import BeautifulSoup, Tag
from loguru import logger

from src.utils.url_utils import normalize_url, is_valid_url


# ============================================================
# 常量：姓氏白名单 / 职称 / 噪音文本
# ============================================================

# 常用百家姓（涵盖 99% 中国人口）
_COMMON_SURNAMES = set(
    "王李张刘陈杨赵黄周吴徐孙胡朱高林何郭马罗梁宋郑谢韩唐冯于董萧程曹袁邓许傅沈曾彭吕苏卢蒋蔡贾丁魏薛叶阎余潘杜戴夏钟汪田任姜范方石姚谭廖邹熊金陆郝孔白崔康毛邱秦江史顾侯邵孟龙万段雷钱汤尹黎易常武乔贺赖龚文庞樊兰殷施陶洪翟安颜倪严牛温芦季俞章鲁葛伍韦申尤毕聂焦向柳邢路岳齐沿梅莫庄辛管祝左涂谷祁时舒耿牟卜路詹关苗凌费纪靳盛童欧甄项曲成游阳裴席卫查屈鲍位覃霍翁隋植甘景薄单包司柏宁柯阮桂闵欧阳解强柴华车冉房边辜吉饶刁瞿戚丘古米池滕晋苑邬臧畅宫来嵺苟全褚廉简娄盖符奚木穆党燕郎邸冀谈姬屠连郜晏栾郁商蒙计喻揭窦迟宇敖糜鄢冷卓花仇艾蓝都巩稽井练仲乐虞卞封竺冼原官衣楚佟栗匡宗应台巫鞠僧桑荆谌银扬明沙薄伏岑习胥保和蔺"
)

# 职称关键词（用于语义判断）
_TITLE_KEYWORDS = [
    "院士", "教授", "副教授", "讲师", "助理教授", "特聘教授", "讲座教授",
    "研究员", "副研究员", "助理研究员", "高级工程师", "工程师",
    "长江学者", "杰青", "优青", "千人计划", "青年千人",
    "博士生导师", "硕士生导师", "博导", "硕导",
    "系主任", "院长", "副院长", "所长", "副所长",
    "Professor", "Associate Professor", "Assistant Professor", "Lecturer",
]

# 非人名噪音文本（导航、功能链接等）
_NOISE_TEXTS = {
    # 导航
    "首页", "返回", "更多", "详情", "查看", "点击", "全部", "主页",
    "旧版", "新版", "英文版", "English", "登录", "注册",
    # 学院板块
    "学院概况", "学院简介", "学院介绍", "组织机构", "机构设置", "现任领导", "历任领导",
    "师资队伍", "师资力量", "科学研究", "人才培养", "党建工作", "学生工作", "招生就业",
    "国际交流", "合作交流", "下载中心", "联系我们", "院长致辞", "学院新闻",
    "通知公告", "新闻动态", "学术报告", "学术活动",
    # 学科
    "研究方向", "研究领域", "研究组", "实验室", "重点学科",
    # 常见单字常在导航
    "概况", "简介", "介绍", "历史", "文化", "荣誉",
    # 高校校名（会被识别为 2-4 字）
    "武大主页", "清华主页", "北大主页", "学校主页",
}

# 教师详情页 URL 特征（href 匹配则加分）
_TEACHER_DETAIL_URL_PATTERNS = [
    r"/info/\d+/\d+",           # 博达站群常见
    r"/teacher/\d+",
    r"/people/\d+",
    r"/faculty/\d+",
    r"/detail/\d+",
    r"/show\.aspx",
    r"[?&]userid=",
    r"[?&]teacher_?id=",
    r"[?&]id=\d+",
    r"/szdw/[^/]+/[^/]+\.htm$",  # 师资-类别-具体老师
    r"/szdw/[^/]+/[^/]+/[a-f0-9]{16,}\.htm",  # 师资 + 哈希文件名（北理工）
    r"/jsjs/\d+",
    r"/dsjs/\d+",
    r"/jszy[^/]*/[a-zA-Z]+\d*",  # 个人主页 (武大 jszy.whu.edu.cn/<拼音>)
    r"/[a-zA-Z]{4,12}\d*/zh_CN/index",  # 拼音/英文名+索引（个人主页常见）
    r"^https?://[^/]*/[a-zA-Z]+\d{0,3}/?$",  # 子域名+短路径（如 icslab.whu.edu.cn）
]

# 导航/页眉/页脚容器
_NAV_CONTAINER_TAGS = ["nav", "header", "footer"]
_NAV_CLASS_PATTERNS = re.compile(r"(nav|menu|header|footer|sidebar|breadcrumb)", re.I)


# ============================================================
# 工具函数
# ============================================================

# 2-3 字纯汉字姓名（首字姓氏）
_CHINESE_NAME_RE = re.compile(r"^[\u4e00-\u9fa5]{2,3}$")
# 带点的少数民族/外籍名，至少 3 字符
_DOT_NAME_RE = re.compile(r"^[\u4e00-\u9fa5A-Za-z]+(?:·[\u4e00-\u9fa5A-Za-z]+)+$")
# 英文名
_ENGLISH_NAME_RE = re.compile(r"^[A-Z][a-z]+(?:[\s-][A-Z][a-z]+){1,3}$")
_EMAIL_PATTERN = re.compile(r"[\w.+-]+@[\w-]+\.(?:edu\.cn|ac\.cn|com\.cn|cn|com|org)")

# 这些关键词不应出现在"姓名"里 — 否则是伪名（如"李未教授"、"全体教师"）
_NON_NAME_SUFFIXES = [
    "教授", "讲师", "研究员", "导师", "教师", "同学", "学生", "全体",
    "博士", "硕士", "博导", "硕导", "院士", "主任", "系主", "副",
]


def _looks_like_name(text: str) -> bool:
    """严格判断文本是否为人名。"""
    if not text:
        return False
    t = text.strip()
    if t in _NOISE_TEXTS:
        return False
    # 含职称关键词的肯定不是名字
    for suffix in _NON_NAME_SUFFIXES:
        if suffix in t:
            return False
    # 规则 1：2-3 字纯汉字 + 姓氏白名单（这是最常见的 95%+ 情况）
    if _CHINESE_NAME_RE.match(t) and t[0] in _COMMON_SURNAMES:
        return True
    # 规则 2：含 · 的少数民族/外籍名
    if _DOT_NAME_RE.match(t) and 3 <= len(t) <= 25:
        return True
    # 规则 3：英文名
    if _ENGLISH_NAME_RE.match(t):
        return True
    return False


# 姓名结束标记（遇到立即截断）
_NAME_BOUNDARY_RE = re.compile(
    r"(?:职称|职务|性别|男|女|博导|硕导|博士|硕士|教授|副教授|研究员|讲师|"
    r"[Pp]rofessor|[Aa]ssociate|[Ll]ecturer|"
    r"[\s\u3000]|[:：,，、、。\.\(（;；])"
)


def _extract_name_prefix(text: str, max_name_len: int = 25) -> str | None:
    """从长文本开头抽取人名。

    例："杨芙清职称：教授  中国科学院院士研究所" → "杨芙清"
    例："高文职称：教授 中国工程院院士" → "高文"（注意 "高文职" 是错的）
    例："约翰·爱德华·霍普克罗夫特职称：教授..." → "约翰·爱德华·霍普克罗夫特"
    例："蔡朝晖 女 教授" → "蔡朝晖"
    """
    if not text:
        return None
    t = text.strip()

    # 用边界正则找到第一个分隔点
    m = _NAME_BOUNDARY_RE.search(t)
    if m:
        candidate = t[:m.start()].strip()
    else:
        candidate = t.strip()

    if not candidate:
        return None

    # 英文名检查
    if _ENGLISH_NAME_RE.match(candidate):
        return candidate

    # 外籍名（带 ·）
    if _DOT_NAME_RE.match(candidate) and 3 <= len(candidate) <= max_name_len:
        return candidate

    # 纯中文：必须姓氏白名单 + 长度 2-3
    if candidate[0] in _COMMON_SURNAMES and _CHINESE_NAME_RE.match(candidate):
        if not any(suffix in candidate for suffix in _NON_NAME_SUFFIXES):
            return candidate

    return None


def _is_in_nav(tag: Tag) -> bool:
    """判断元素是否位于导航/页眉/页脚内"""
    cur: Optional[Tag] = tag
    while cur is not None and hasattr(cur, "name"):
        if cur.name in _NAV_CONTAINER_TAGS:
            return True
        classes = cur.get("class") if hasattr(cur, "get") else None
        if classes:
            class_str = " ".join(classes) if isinstance(classes, list) else str(classes)
            if _NAV_CLASS_PATTERNS.search(class_str):
                return True
        cur = cur.parent
    return False


def _matches_teacher_url(url: str) -> bool:
    """href 是否像教师详情页"""
    for pat in _TEACHER_DETAIL_URL_PATTERNS:
        if re.search(pat, url, re.I):
            return True
    return False


def _find_local_card(tag: Tag, max_hops: int = 4) -> Tag | None:
    """向上查找最近的"卡片级"容器，限制总文本长度避免命中整页。

    卡片级元素：li / tr / dd / article，或带 class 含 teacher/faculty/item/card 的 div。
    """
    cur: Optional[Tag] = tag
    for _ in range(max_hops):
        if cur is None:
            break
        if not hasattr(cur, "name"):
            cur = cur.parent
            continue
        name = cur.name
        is_card = name in ("li", "tr", "dd", "article")
        if not is_card and name == "div":
            classes = cur.get("class") or []
            cls_str = " ".join(classes if isinstance(classes, list) else [classes]).lower()
            if any(kw in cls_str for kw in ("teacher", "faculty", "item", "card", "person", "staff", "member")):
                is_card = True
        if is_card:
            # 卡片不应过大（>800 字符的几乎肯定是整张表/整段）
            txt_len = len(cur.get_text())
            if txt_len < 800:
                return cur
            return None  # 太大就不要再往上找了
        cur = cur.parent
    return None


def _find_title_near(tag: Tag, max_hops: int = 3) -> str | None:
    """在卡片局部内查找职称关键词（最精确的关键词本身）。"""
    sorted_titles = sorted(_TITLE_KEYWORDS, key=len, reverse=True)
    # 1) 先查链接文本本身
    text = tag.get_text(" ", strip=True)
    for kw in sorted_titles:
        if kw in text:
            return kw
    # 2) 在卡片局部容器内查找
    card = _find_local_card(tag, max_hops=max_hops)
    if card is None:
        return None
    text = card.get_text(" ", strip=True)
    for kw in sorted_titles:
        if kw in text:
            return kw
    return None


def _find_email_near(tag: Tag, name: str | None = None, max_hops: int = 3) -> str | None:
    """在卡片局部内查找邮箱。

    若提供 `name`，邮箱必须出现在 name 之后的 200 字符内（保证归属）。
    """
    card = _find_local_card(tag, max_hops=max_hops)
    if card is None:
        return None
    text = card.get_text(" ", strip=True)
    m = _EMAIL_PATTERN.search(text)
    if not m:
        return None
    email = m.group(0)
    # 归属性校验：邮箱必须在姓名附近（同一卡片内的距离 < 200 字符）
    if name and name in text:
        name_idx = text.find(name)
        email_idx = text.find(email)
        if abs(email_idx - name_idx) > 200:
            return None
    return email


def _find_photo_near(tag: Tag, base_url: str, max_hops: int = 3) -> str | None:
    """在卡片局部内查找头像 URL"""
    card = _find_local_card(tag, max_hops=max_hops)
    if card is None:
        return None
    img = card.find("img") if hasattr(card, "find") else None
    if not img:
        return None
    src = img.get("src") or img.get("data-src") or img.get("data-original")
    if not src:
        return None
    src_lower = src.lower()
    # 过滤 logo/icon/装饰图
    if any(kw in src_lower for kw in ("logo", "icon", "banner", "/bg.", "/bgs/", "/static/imgs/", "default")):
        return None
    full = normalize_url(src.strip(), base_url)
    if not is_valid_url(full):
        return None
    return full


# 不合理的研究方向特征（应过滤掉）
_INVALID_AREA_PATTERNS = [
    re.compile(r"\d{2,}"),           # 连续 2+ 数字（电话/邮编）
    re.compile(r"@"),                 # 邮箱片段
    re.compile(r"[\.。][\u4e00-\u9fa5]"),  # 句号后跟中文（句子片段）
    re.compile(r"^[\d\-+]+$"),       # 全数字/破折号
    re.compile(r"(电话|邮箱|邮件|传真|地址|微信|手机|TEL|Email|Tel|Phone|Mail|Address)", re.I),
    re.compile(r"(担任|期间|获奖|发表|主持|参与|主讲|教授|论文|会议)"),  # 句子动词
]

# 含科研术语关键字符（白名单：通常是真方向）
_AREA_HINT_PATTERNS = re.compile(
    r"(学习|算法|网络|计算|分析|系统|理论|工程|建模|挖掘|检测|识别|"
    r"处理|视觉|语言|数据|安全|图像|信号|控制|优化|协议|架构|"
    r"AI|LLM|NLP|CV|ML|DL|RL|HPC|HCI|IoT|VR|AR|XR|"
    r"learning|network|algorithm|theory|computing|analysis)",
    re.I,
)


def _is_valid_area(s: str) -> bool:
    """判断单个研究方向字符串是否合理。"""
    s = s.strip()
    if not (2 <= len(s) <= 20):
        return False
    for pat in _INVALID_AREA_PATTERNS:
        if pat.search(s):
            return False
    # 必须包含中文字符或英文字母
    if not re.search(r"[\u4e00-\u9fa5A-Za-z]", s):
        return False
    return True


def _find_research_areas_near(tag: Tag, max_hops: int = 3) -> list[str]:
    """在卡片局部内查找研究方向。"""
    card = _find_local_card(tag, max_hops=max_hops)
    if card is None:
        return []
    text = card.get_text(" ", strip=True)
    keywords = ["研究方向", "研究领域", "主要方向", "研究兴趣", "研究内容", "Research Interests"]
    for kw in keywords:
        if kw in text:
            idx = text.find(kw) + len(kw)
            segment = text[idx:idx + 100].strip().lstrip("：:").strip()
            # 在第一个句号 / "办公"/"邮箱"/"电话"等处截断
            stop_markers = ["。", "办公电话", "电话", "邮箱", "电子邮件", "传真", "地址", "Email", "Tel", "Office"]
            min_stop = len(segment)
            for sm in stop_markers:
                pos = segment.find(sm)
                if pos > 0 and pos < min_stop:
                    min_stop = pos
            segment = segment[:min_stop]
            # 用分隔符切分
            areas = re.split(r"[，,、；;\s]{1,3}", segment)
            areas = [a.strip().rstrip("。.;:：") for a in areas]
            valid_areas = [a for a in areas if _is_valid_area(a)]
            if valid_areas:
                return valid_areas[:6]
    return []


# ============================================================
# 页面级 title/discipline 推断
# ============================================================

# URL 路径 → 默认职称
_URL_TITLE_HINTS: list[tuple[re.Pattern, str]] = [
    (re.compile(r"/(bssds|bsds|bdmd|bdml|博导)", re.I), "博士生导师"),
    (re.compile(r"/(ssds|sssds|sdml|sdmd)", re.I), "硕士生导师"),
    (re.compile(r"/(ys|院士)", re.I), "院士"),
    (re.compile(r"/(zjjs|qtjs|jsml)/?\d*", re.I), "教授"),
    (re.compile(r"/(fjs|fjswfyjy)", re.I), "副教授"),
    (re.compile(r"/(jsbdm)", re.I), "讲师"),
]


def _infer_default_title(url: str, html: str) -> str | None:
    """从 URL 路径或页面标题推断默认职称（用于卡片内找不到 title 时兜底）"""
    for pat, title in _URL_TITLE_HINTS:
        if pat.search(url):
            return title
    # 从 <title> / <h1> 推断
    soup = BeautifulSoup(html, "lxml")
    sources = []
    if soup.title:
        sources.append(soup.title.get_text(strip=True))
    for h in soup.find_all(["h1", "h2"], limit=3):
        sources.append(h.get_text(strip=True))
    text = " ".join(sources)
    sorted_titles = sorted(_TITLE_KEYWORDS, key=len, reverse=True)
    for kw in sorted_titles:
        if kw in text:
            return kw
    return None


# ============================================================
# 主入口
# ============================================================

def parse_faculty_list(html: str, base_url: str) -> list[dict]:
    """
    从师资页 HTML 中抽取教师条目。

    Returns:
        list of dict，每项字段：
        {
            "name": str,
            "title": str | None,
            "homepage_url": str | None,
            "email": str | None,
            "photo_url": str | None,
            "research_areas": list[str],
            "raw_text": str,
            "method": str,   # heuristic / cms_xxx / llm
        }
    """
    if not html or len(html) < 300:
        return []

    soup = BeautifulSoup(html, "lxml")
    default_title = _infer_default_title(base_url, html)

    # 策略 1：CMS 模板
    results = _try_cms_templates(soup, base_url)
    if results and len(results) >= 3:
        logger.debug(f"CMS 模板命中: {len(results)} 条")
        return _apply_default_title(results, default_title)

    # 策略 2：启发式
    results = _try_heuristic(soup, base_url)
    # 策略 3：结构检测
    results2 = _try_structural(soup, base_url)
    combined = _dedup_entries((results or []) + (results2 or []))
    if combined:
        logger.debug(
            f"启发式{len(results) if results else 0} + 结构{len(results2) if results2 else 0} "
            f"→ 合并 {len(combined)} 条"
        )
    return _apply_default_title(combined, default_title)


def _apply_default_title(entries: list[dict], default_title: str | None) -> list[dict]:
    """对 title 为空的条目应用默认职称"""
    if not default_title:
        return entries
    for e in entries:
        if not e.get("title"):
            e["title"] = default_title
            e["title_source"] = "default"
    return entries


# ============================================================
# Strategy 1: CMS 模板（占位 — 可按需补充）
# ============================================================

def _try_cms_templates(soup: BeautifulSoup, base_url: str) -> list[dict]:
    """识别常见 CMS 教师模板。

    目前识别：
      - 博达站群 `.news_list li` / `.teacher_list .item`
      - 自研模板 `.teacher-card` / `.faculty-item`
    """
    containers_candidates = [
        {"selector": "ul.news_list li", "name": "bodacms_news_list"},
        {"selector": "div.teacher_list .item", "name": "teacher_list_item"},
        {"selector": ".teacher-card", "name": "teacher_card"},
        {"selector": ".faculty-item", "name": "faculty_item"},
        {"selector": ".jsxx-list li", "name": "jsxx_list"},
        {"selector": ".wp_paging li, .person-list li", "name": "wp_person"},
    ]

    best: list[dict] = []
    best_method = None
    for cand in containers_candidates:
        items = soup.select(cand["selector"])
        if len(items) < 5:
            continue
        parsed = []
        for it in items:
            name_link = it.find("a")
            if not name_link:
                continue
            name = name_link.get_text(strip=True)
            if not _looks_like_name(name):
                continue
            href = name_link.get("href") or ""
            href = re.sub(r"\s+", "", href).strip()
            full_url = normalize_url(href, base_url) if href else None
            if full_url and not is_valid_url(full_url):
                full_url = None
            parsed.append({
                "name": name,
                "title": _find_title_near(it, max_hops=2),
                "homepage_url": full_url,
                "email": _find_email_near(it, name=name, max_hops=2),
                "photo_url": _find_photo_near(it, base_url, max_hops=2),
                "research_areas": _find_research_areas_near(it, max_hops=2),
                "raw_text": it.get_text(" ", strip=True)[:200],
                "method": f"cms_{cand['name']}",
            })
        if len(parsed) > len(best):
            best = parsed
            best_method = cand["name"]

    if best:
        logger.debug(f"CMS 模板选中: {best_method} ({len(best)} 条)")
    return best


# ============================================================
# Strategy 2: 启发式（主力）
# ============================================================

def _try_heuristic(soup: BeautifulSoup, base_url: str) -> list[dict]:
    """启发式抽取：

    对 `<a>` 标签，支持两种名字识别：
      1. 链接文本纯粹是人名（2-3 字 + 姓氏白名单）
      2. 链接文本以姓名开头（长文本，北大院士页的情况）

    其他校验：
      - 不在 `<nav>` / `<header>` / `<footer>` / 菜单类容器中
      - href 指向教师详情 URL 或附近有职称关键词
    """
    results: list[dict] = []

    for a_tag in soup.find_all("a", href=True):
        text = a_tag.get_text(strip=True)
        if not text:
            continue

        # 两条路径：纯姓名 或 姓名前缀
        name: str | None = None
        if _looks_like_name(text):
            name = text
        elif len(text) >= 4 and len(text) < 200:
            # 长文本尝试提取前缀姓名
            # 但要求链接不是标题类（结尾不是 职称 类关键词以外的长后缀）
            extracted = _extract_name_prefix(text)
            if extracted and _looks_like_name(extracted):
                name = extracted

        if not name:
            continue

        if _is_in_nav(a_tag):
            continue

        href = re.sub(r"\s+", "", a_tag.get("href") or "")
        if not href or href.startswith(("javascript:", "mailto:", "tel:", "#")):
            continue
        full_url = normalize_url(href, base_url)
        if not is_valid_url(full_url):
            continue

        # 必须满足：URL 是教师详情页 OR 附近有职称
        url_matches = _matches_teacher_url(full_url)
        # 首先在链接文本自身中找职称（针对北大那种整合式链接）
        title = None
        for kw in sorted(_TITLE_KEYWORDS, key=len, reverse=True):
            if kw in text:
                title = kw
                break
        if not title:
            title = _find_title_near(a_tag, max_hops=3)

        if not url_matches and not title:
            continue

        # 构建条目
        email = _find_email_near(a_tag, name=name, max_hops=3)
        photo_url = _find_photo_near(a_tag, base_url, max_hops=3)
        research_areas = _find_research_areas_near(a_tag, max_hops=3)
        raw_text = text if len(text) > 15 else (
            a_tag.parent.get_text(" ", strip=True)[:200] if a_tag.parent else ""
        )

        results.append({
            "name": name,
            "title": title,
            "homepage_url": full_url,
            "email": email,
            "photo_url": photo_url,
            "research_areas": research_areas,
            "raw_text": raw_text,
            "method": "heuristic",
        })

    return results


# ============================================================
# Strategy 3: 结构检测（重复容器）
# ============================================================

def _try_structural(soup: BeautifulSoup, base_url: str) -> list[dict]:
    """识别"重复卡片"结构，适合网格化师资页。

    实现：查找包含 ≥ 5 个人名的直接父容器，按其子元素迭代。
    """
    results: list[dict] = []

    # Step 1: 全部姓名链接（纯姓名 或 前缀姓名）
    name_links: list[tuple[Tag, str]] = []  # (<a>, extracted_name)
    for a in soup.find_all("a", href=True):
        t = a.get_text(strip=True)
        name = None
        if _looks_like_name(t):
            name = t
        elif len(t) >= 4 and len(t) < 200:
            ext = _extract_name_prefix(t)
            if ext and _looks_like_name(ext):
                name = ext
        if name and not _is_in_nav(a):
            name_links.append((a, name))

    if len(name_links) < 5:
        return []

    # Step 2: 统计每个姓名链接的父容器，找出承载最多姓名的容器
    from collections import Counter
    parent_counter: Counter = Counter()
    for a, _name in name_links:
        p = a.parent
        for _ in range(3):
            if p is None:
                break
            if p.name in ("li", "div", "td", "article", "dd") and p.parent:
                parent_counter[id(p.parent)] = parent_counter.get(id(p.parent), 0) + 1
                break
            p = p.parent

    if not parent_counter:
        return []

    top_parent_id, top_count = parent_counter.most_common(1)[0]
    if top_count < 5:
        return []

    top_parent = None
    for a, _name in name_links:
        p = a.parent
        for _ in range(3):
            if p is None:
                break
            if p.parent and id(p.parent) == top_parent_id:
                top_parent = p.parent
                break
            p = p.parent
        if top_parent:
            break

    if not top_parent:
        return []

    # Step 3: 迭代子元素
    for child in top_parent.find_all(recursive=False):
        name_link = None
        name_val = None
        for a in child.find_all("a", href=True):
            t = a.get_text(strip=True)
            if _looks_like_name(t):
                name_link, name_val = a, t
                break
            elif len(t) >= 4 and len(t) < 200:
                ext = _extract_name_prefix(t)
                if ext and _looks_like_name(ext):
                    name_link, name_val = a, ext
                    break
        if not name_link or not name_val:
            continue

        href = re.sub(r"\s+", "", name_link.get("href") or "")
        if href.startswith(("javascript:", "mailto:", "tel:", "#")):
            continue
        full_url = normalize_url(href, base_url) if href else None
        if full_url and not is_valid_url(full_url):
            full_url = None

        # 在 child 中找职称（包括 <a> 文本本身）
        child_text = child.get_text(" ", strip=True)
        title = None
        for kw in sorted(_TITLE_KEYWORDS, key=len, reverse=True):
            if kw in child_text:
                title = kw
                break

        results.append({
            "name": name_val,
            "title": title,
            "homepage_url": full_url,
            "email": _find_email_near(child, name=name_val, max_hops=2),
            "photo_url": _find_photo_near(child, base_url, max_hops=2),
            "research_areas": _find_research_areas_near(child, max_hops=2),
            "raw_text": child_text[:200],
            "method": "structural",
        })

    return results


# ============================================================
# 去重
# ============================================================

def _dedup_entries(entries: list[dict]) -> list[dict]:
    """按 (name, homepage_url) 去重，合并同人的字段"""
    merged: dict[tuple, dict] = {}
    for e in entries:
        key = (e["name"], e.get("homepage_url") or "")
        if key not in merged:
            merged[key] = e
            continue
        existing = merged[key]
        # 合并：取非空值
        for k in ("title", "email", "photo_url"):
            if not existing.get(k) and e.get(k):
                existing[k] = e[k]
        if not existing.get("research_areas") and e.get("research_areas"):
            existing["research_areas"] = e["research_areas"]

    return list(merged.values())
