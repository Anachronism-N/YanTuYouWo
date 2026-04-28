"""
师资页定位器 — 阶段 A 核心模块

对标 `discovery/notice_page_locator.py` 的架构，但目标从"通知列表页"换成"师资/导师名录页"。

六层策略级联：
  策略 1：导航链接关键词匹配（httpx + BS4）
  策略 2：页面全文链接扫描 + URL 路径特征匹配
  策略 3：Playwright 渲染（处理 SPA / 动态菜单）
  策略 4：LLM 分析页面结构，智能定位
  策略 5：常见师资路径猜测（/szdw /faculty /people ...）
  策略 6：回退到研究生院「博导名录」页面

输出：候选师资页列表（验证过评分 >= 阈值）
"""

from __future__ import annotations

import re
from urllib.parse import urlparse

from bs4 import BeautifulSoup
from loguru import logger

from src.utils.http_client import http_client
from src.utils.url_utils import normalize_url, is_valid_url, get_domain
from src.discovery.anti_crawl_fallback import detect_anti_crawl


# ============================================================
# 师资页关键词配置（按优先级分组）
# ============================================================

PRIORITY_KEYWORDS: list[list[str]] = [
    # 最高优先级：研究生导师（与保研场景最相关）
    [
        "博士生导师", "硕士生导师", "博导", "硕导",
        "研究生导师", "导师队伍", "导师名录", "导师介绍",
        "博导名录", "硕导名录",
    ],
    # 次优先级：师资队伍
    [
        "师资队伍", "师资力量", "教师队伍", "全体教师",
        "在职教师", "教师名录", "教职员工", "教授名录",
        "师资概况", "教师介绍", "研究人员",
        "faculty", "people", "staff", "professors",
    ],
    # 按职称分组的页面
    [
        "教授", "副教授", "特聘教授", "长江学者",
        "杰青", "青年教师", "院士",
    ],
]

PRIORITY_TYPE_MAP = {
    0: "advisor_list",      # 博导/硕导名录
    1: "faculty_list",      # 师资队伍
    2: "faculty_by_title",  # 按职称分组
}

# URL 路径特征（按优先级）
URL_PATH_PATTERNS_PRIORITY: list[tuple[str, str]] = [
    # 博导/硕导（最高信任）
    (r"/bdmd",        "advisor_list"),   # 博导名录
    (r"/bdml",        "advisor_list"),
    (r"/bszs",        "advisor_list"),   # 有时指代博导招生（需验证）
    (r"/dsjl",        "advisor_list"),   # 导师介绍
    (r"/dsdw",        "advisor_list"),   # 导师队伍
    (r"/yjsds",       "advisor_list"),   # 研究生导师
    # 师资队伍（一般信任）
    (r"/szdw",        "faculty_list"),   # 师资队伍
    (r"/szll",        "faculty_list"),   # 师资力量
    (r"/jsdw",        "faculty_list"),   # 教师队伍
    (r"/jsml",        "faculty_list"),   # 教师名录
    (r"/rcpy/szdw",   "faculty_list"),   # 人才培养-师资队伍
    (r"/faculty",     "faculty_list"),
    (r"/people",      "faculty_list"),
    (r"/staff",       "faculty_list"),
    (r"/teachers?",   "faculty_list"),
    (r"/professors?", "faculty_list"),
    # 按职称
    (r"/jsjs/js",     "faculty_by_title"),  # 教师介绍
    (r"/jaaa/js",     "faculty_by_title"),
]

# 非师资页关键词（导航中匹配到这些应排除）
_NON_FACULTY_KEYWORDS = [
    # 通知/新闻（与师资无关）
    "通知公告", "新闻动态", "最新消息", "招生信息",
    "夏令营", "推免", "预推免", "直博",
    # 静态展示
    "学院概况", "学院简介", "院长致辞", "历史沿革",
    "学科建设", "科研平台", "实验室", "联系我们",
    "党建工作", "工会工作", "团委", "学生工作",
    "校友风采", "国际交流", "下载中心", "信息公开",
    # 研究方向/成果（不是师资名录）
    "研究方向", "研究领域", "科研成果", "学术活动",
    # 本科相关
    "本科招生", "本科生培养", "本科教育",
    # 英文
    "notice", "news", "about", "contact", "download",
    "admission", "enrollment", "research",
]

_NON_FACULTY_URL_PATTERNS = [
    r"/tzgg", r"/notice", r"/announcement",
    r"/xwdt", r"/news",
    r"/zsxx", r"/yjszs", r"/admission",
    r"/xygk", r"/about",
    r"/djgz", r"/tw/", r"/alumni",
    r"/kyxm", r"/research",
]

# 具体教师详情页特征（应跳过）
_TEACHER_DETAIL_PATTERNS = [
    r"/info/\d+/\d+\.htm",
    r"/teacher/\d+",
    r"/people/\d+",
    r"/faculty/view/",
    r"[?&]userid=",
    r"[?&]teacher_?id=",
    r"/\d{4,}\.htm$",
]


def _is_teacher_detail_url(url: str) -> bool:
    """判断 URL 是不是某个教师的详情页（应跳过）"""
    url_lower = url.lower()
    if any(kw in url_lower for kw in ["/list.", "/index.", "/index/"]):
        return False
    for pattern in _TEACHER_DETAIL_PATTERNS:
        if re.search(pattern, url, re.I):
            return True
    return False


def _clean_href(href: str | None) -> str | None:
    """清洗 href 属性：

    - 去掉前后空白 / 内部所有空白（很多学院 HTML 里的 href 带大量空格换行）
    - 过滤 javascript: / mailto: / tel: / 锚点 / 空
    """
    if not href:
        return None
    # 内部空白（包括换行/制表符）一律压缩掉
    cleaned = re.sub(r"\s+", "", href)
    if not cleaned:
        return None
    lowered = cleaned.lower()
    if lowered.startswith(("javascript:", "mailto:", "tel:", "#")):
        return None
    return cleaned


def _is_non_faculty_page(text: str, url: str) -> bool:
    """判断链接是否指向非师资页面（应排除）"""
    text_lower = (text or "").lower().strip()
    url_lower = url.lower()

    for kw in _NON_FACULTY_KEYWORDS:
        if kw in text_lower:
            return True
    for pattern in _NON_FACULTY_URL_PATTERNS:
        if re.search(pattern, url_lower):
            return True
    return False


def _type_priority(source_type: str) -> int:
    """用于排序，数字越大优先级越高"""
    return {
        "advisor_list": 3,
        "faculty_list": 2,
        "faculty_by_title": 1,
    }.get(source_type, 0)


# ============================================================
# 主入口函数
# ============================================================

async def locate_faculty_pages(
    dept_homepage: str,
    dept_name: str,
    university_name: str,
    graduate_url: str | None = None,
) -> list[dict]:
    """六层策略级联定位学院师资页。

    Args:
        dept_homepage: 学院官网首页 URL
        dept_name: 学院名称
        university_name: 高校名称
        graduate_url: 研究生院 URL（用于策略 6 回退）

    Returns:
        候选师资页列表，每项：
        {
            "url": str,
            "type": "advisor_list" | "faculty_list" | "faculty_by_title",
            "priority": int,              # 1 最高
            "method": str,
            "text": str,
            "validation_score": int,      # 0-100
        }
    """
    context = f"{university_name} {dept_name}"
    candidates: list[dict] = []

    # ---- 策略 1：导航关键词匹配 ----
    try:
        r = await _strategy_nav_keywords(dept_homepage)
        if r:
            candidates.extend(r)
            logger.info(f"[F1] {context}: 找到 {len(r)} 个候选")
    except Exception as e:
        logger.warning(f"[F1] {context} 异常: {e}")

    # ---- 策略 2：全文链接扫描 + URL 路径特征 ----
    if len(candidates) < 2:
        try:
            r = await _strategy_link_scan(dept_homepage)
            if r:
                new_r = _dedup(r, candidates)
                candidates.extend(new_r)
                logger.info(f"[F2] {context}: 补充 {len(new_r)} 个候选")
        except Exception as e:
            logger.warning(f"[F2] {context} 异常: {e}")

    # ---- 策略 3：Playwright 渲染 ----
    if not candidates:
        try:
            r = await _strategy_playwright(dept_homepage)
            if r:
                candidates.extend(r)
                logger.info(f"[F3] {context}: 找到 {len(r)} 个候选")
        except Exception as e:
            logger.warning(f"[F3] {context} 异常: {e}")

    # ---- 策略 4：LLM 分析（可选，若 LLM 可用） ----
    if not candidates:
        try:
            r = await _strategy_llm_analyze(dept_homepage, context)
            if r:
                candidates.extend(r)
                logger.info(f"[F4] {context}: 找到 {len(r)} 个候选")
        except Exception as e:
            logger.debug(f"[F4] {context} 跳过: {e}")

    # ---- 策略 5：子路径猜测 ----
    if not candidates:
        try:
            r = await _strategy_path_guess(dept_homepage)
            if r:
                candidates.extend(r)
                logger.info(f"[F5] {context}: 猜测找到 {len(r)} 个候选")
        except Exception as e:
            logger.warning(f"[F5] {context} 异常: {e}")

    # ---- 策略 5.5：子路径学院 → 父站点扫描 ----
    if not candidates:
        parsed = urlparse(dept_homepage)
        path_parts = [p for p in parsed.path.strip('/').split('/') if p]
        if path_parts:
            try:
                parent_url = f"{parsed.scheme}://{parsed.netloc}"
                r = await _strategy_nav_keywords(parent_url)
                if r:
                    new_r = _dedup(r, candidates)
                    candidates.extend(new_r)
                    logger.info(f"[F5.5] {context}: 父站点补充 {len(new_r)} 个候选")
            except Exception as e:
                logger.debug(f"[F5.5] {context} 异常: {e}")

    # ---- 策略 6：研究生院回退（有限作用，师资数据通常不在研究生院）----
    if not candidates and graduate_url:
        try:
            r = await _strategy_graduate_fallback(graduate_url, university_name)
            if r:
                candidates.extend(r)
                logger.info(f"[F6] {context}: 研究生院补充 {len(r)} 个候选")
        except Exception as e:
            logger.debug(f"[F6] {context} 异常: {e}")

    # ---- 验证候选 ----
    candidates.sort(key=lambda x: (x.get("priority", 99), -_type_priority(x.get("type", ""))))
    validated = []
    for c in candidates[:15]:
        try:
            score = await validate_faculty_page(c["url"])
            text = c.get("text", "") or ""
            # 导航中明确写着"博导/师资队伍"的链接给予加分
            high_trust = ["博导", "硕导", "研究生导师", "导师名录", "导师队伍",
                          "师资队伍", "faculty", "people"]
            mid_trust = ["教师队伍", "教师名录", "教授名录", "研究人员", "staff"]
            if c.get("method") in ("nav_keyword", "link_text", "url_pattern"):
                if any(kw in text for kw in high_trust):
                    score = max(score, 50)
                elif any(kw in text for kw in mid_trust):
                    score = max(score, 40)
            c["validation_score"] = score
            if score >= 30:
                validated.append(c)
        except Exception as e:
            logger.debug(f"验证失败: {c['url']} - {e}")

    # 按 type 优先级 + 分数排序
    validated.sort(key=lambda x: (-_type_priority(x.get("type", "")), -x.get("validation_score", 0)))

    # 选出最佳（博导最多 2 个 + 师资最多 2 个 + 按职称最多 1 个）
    final = _select_best_per_type(validated)

    logger.info(f"定位完成: {context} → {len(final)} 个有效师资页")
    return final


# ============================================================
# 策略实现
# ============================================================

async def _strategy_nav_keywords(url: str) -> list[dict]:
    html = await http_client.fetch(url, retry=1)
    if not html or detect_anti_crawl(html):
        return []
    return _extract_nav_keywords_from_html(html, url)


def _extract_nav_keywords_from_html(html: str, base_url: str) -> list[dict]:
    soup = BeautifulSoup(html, "lxml")
    results: list[dict] = []

    for a_tag in soup.find_all("a", href=True):
        text = a_tag.get_text(strip=True)
        href = _clean_href(a_tag.get("href"))
        if not href:
            continue

        if not text or len(text) > 30 or len(text) < 2:
            continue

        full_url = normalize_url(href, base_url)
        if not is_valid_url(full_url):
            continue

        if _is_teacher_detail_url(full_url):
            continue
        if _is_non_faculty_page(text, full_url):
            continue

        # 同域（允许同校子域名）
        base_domain = get_domain(base_url)
        link_domain = get_domain(full_url)
        base_root = ".".join(base_domain.split(".")[-3:])
        link_root = ".".join(link_domain.split(".")[-3:])
        if base_root != link_root:
            continue

        matched = False
        for priority_idx, keywords in enumerate(PRIORITY_KEYWORDS):
            for kw in keywords:
                if kw.lower() in text.lower():
                    source_type = PRIORITY_TYPE_MAP[priority_idx]
                    results.append({
                        "url": full_url,
                        "type": source_type,
                        "priority": priority_idx + 1,
                        "method": "nav_keyword",
                        "text": text,
                    })
                    matched = True
                    break
            if matched:
                break

    # 去重，保留最高优先级
    seen: dict[str, dict] = {}
    for r in results:
        if r["url"] not in seen or r["priority"] < seen[r["url"]]["priority"]:
            seen[r["url"]] = r
    return list(seen.values())


async def _strategy_link_scan(url: str) -> list[dict]:
    html = await http_client.fetch(url, retry=1)
    if not html or detect_anti_crawl(html):
        return []

    soup = BeautifulSoup(html, "lxml")
    results: list[dict] = []

    for a_tag in soup.find_all("a", href=True):
        href = _clean_href(a_tag.get("href"))
        if not href:
            continue
        text = a_tag.get_text(strip=True) or ""

        full_url = normalize_url(href, url)
        if not is_valid_url(full_url):
            continue
        if _is_teacher_detail_url(full_url):
            continue
        if text and _is_non_faculty_page(text, full_url):
            continue

        matched = False
        # URL 路径特征
        for pattern, source_type in URL_PATH_PATTERNS_PRIORITY:
            if re.search(pattern, full_url, re.I):
                priority = {"advisor_list": 1, "faculty_list": 2, "faculty_by_title": 3}[source_type]
                results.append({
                    "url": full_url,
                    "type": source_type,
                    "priority": priority,
                    "method": "url_pattern",
                    "text": text or "(无文本)",
                })
                matched = True
                break

        # 链接文本关键词（补充）
        if not matched and text and 2 <= len(text) <= 30:
            for priority_idx, keywords in enumerate(PRIORITY_KEYWORDS):
                for kw in keywords:
                    if kw.lower() in text.lower():
                        source_type = PRIORITY_TYPE_MAP[priority_idx]
                        results.append({
                            "url": full_url,
                            "type": source_type,
                            "priority": priority_idx + 1,
                            "method": "link_text",
                            "text": text,
                        })
                        matched = True
                        break
                if matched:
                    break

    seen: dict[str, dict] = {}
    for r in results:
        if r["url"] not in seen or r["priority"] < seen[r["url"]]["priority"]:
            seen[r["url"]] = r
    return list(seen.values())


async def _strategy_playwright(url: str) -> list[dict]:
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        logger.debug("Playwright 未安装，跳过 F3")
        return []

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            try:
                await page.goto(url, timeout=15000, wait_until="domcontentloaded")
                await page.wait_for_timeout(2000)
                # 展开下拉菜单
                try:
                    nav_items = await page.query_selector_all("nav li, .nav li, .menu li, header li")
                    for item in nav_items[:10]:
                        try:
                            await item.hover()
                            await page.wait_for_timeout(200)
                        except Exception:
                            pass
                except Exception:
                    pass
                html = await page.content()
            finally:
                await browser.close()
    except Exception as e:
        logger.debug(f"Playwright 渲染失败: {url} - {e}")
        return []

    if not html or detect_anti_crawl(html):
        return []

    # 复用策略 1 + 策略 2 的解析
    results = _extract_nav_keywords_from_html(html, url)
    for r in results:
        r["method"] = "playwright"

    # URL 路径补充
    soup = BeautifulSoup(html, "lxml")
    for a_tag in soup.find_all("a", href=True):
        href = _clean_href(a_tag.get("href"))
        if not href:
            continue
        text = a_tag.get_text(strip=True) or ""
        full_url = normalize_url(href, url)
        if not is_valid_url(full_url):
            continue
        if _is_teacher_detail_url(full_url):
            continue
        for pattern, source_type in URL_PATH_PATTERNS_PRIORITY:
            if re.search(pattern, full_url, re.I):
                priority = {"advisor_list": 1, "faculty_list": 2, "faculty_by_title": 3}[source_type]
                results.append({
                    "url": full_url,
                    "type": source_type,
                    "priority": priority,
                    "method": "playwright",
                    "text": text or "(无文本)",
                })
                break

    seen: dict[str, dict] = {}
    for r in results:
        if r["url"] not in seen or r["priority"] < seen[r["url"]]["priority"]:
            seen[r["url"]] = r
    return list(seen.values())


async def _strategy_llm_analyze(url: str, context: str) -> list[dict]:
    """LLM 分析页面结构 — 复用 notice_page_locator 的 LLM 客户端"""
    html = await http_client.fetch(url, retry=1)
    if not html or detect_anti_crawl(html):
        return []

    try:
        from src.parser.content_extractor import simplify_html
        from src.llm.client import llm_client
    except ImportError:
        return []

    simplified = simplify_html(html, max_length=3000)

    # 为师资场景定制的 prompt
    prompt = f"""你是网页结构分析助手。以下是「{context}」官网的 HTML 内容（已精简）。

请找出页面中所有**师资队伍 / 导师名录**相关的列表页 URL（不要文章详情页、不要通知公告页）。

要求：
1. 优先找「博士生导师名录」「硕士生导师名录」
2. 其次找「师资队伍」「教师队伍」「全体教师」
3. 再次找按职称分组的页面（教授 / 副教授等）
4. 返回 JSON 数组，每项包含 url、text（链接文本）、type（"advisor_list" / "faculty_list" / "faculty_by_title"）
5. 按相关性从高到低排序，最多 5 项

HTML 内容：
{simplified}
"""
    try:
        # 使用底层原始 LLM 接口
        import json
        from src.config import settings
        from openai import AsyncOpenAI
        client = AsyncOpenAI(
            api_key=settings.SILICONFLOW_API_KEY,
            base_url=settings.SILICONFLOW_BASE_URL,
        )
        resp = await client.chat.completions.create(
            model=settings.LLM_ANALYZE_MODEL if hasattr(settings, "LLM_ANALYZE_MODEL")
                else "Qwen/Qwen2.5-32B-Instruct",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1000,
            temperature=0.1,
        )
        content = resp.choices[0].message.content or ""
        # 尝试解析 JSON（带容错）
        content = content.strip().lstrip("```json").lstrip("```").rstrip("```")
        match = re.search(r"\[.*\]", content, re.S)
        if match:
            content = match.group(0)
        items = json.loads(content)
    except Exception as e:
        logger.debug(f"LLM 分析失败: {e}")
        return []

    results = []
    for item in items if isinstance(items, list) else []:
        item_url = normalize_url(item.get("url", ""), url)
        if not is_valid_url(item_url):
            continue
        stype = item.get("type", "faculty_list")
        if stype not in ("advisor_list", "faculty_list", "faculty_by_title"):
            stype = "faculty_list"
        results.append({
            "url": item_url,
            "type": stype,
            "priority": 4,
            "method": "llm_analyze",
            "text": item.get("text", ""),
        })
    return results


async def _strategy_path_guess(url: str) -> list[dict]:
    """尝试常见师资页路径"""
    parsed = urlparse(url)
    base = f"{parsed.scheme}://{parsed.netloc}"
    url_path = parsed.path.rstrip("/")

    bases_to_try = [base]
    if url_path and url_path != "/":
        bases_to_try.insert(0, base + url_path)

    common_paths = [
        # 博导/硕导名录
        ("/bdmd/index.htm",    "advisor_list"),
        ("/dsjl/index.htm",    "advisor_list"),
        ("/dsdw/index.htm",    "advisor_list"),
        ("/yjsds/index.htm",   "advisor_list"),
        # 师资队伍
        ("/szdw/index.htm",    "faculty_list"),
        ("/szdw.htm",          "faculty_list"),
        ("/szll/index.htm",    "faculty_list"),
        ("/jsdw/index.htm",    "faculty_list"),
        ("/jsml/index.htm",    "faculty_list"),
        ("/rcpy/szdw/index.htm", "faculty_list"),
        ("/faculty/index.htm", "faculty_list"),
        ("/faculty.html",      "faculty_list"),
        ("/people/index.htm",  "faculty_list"),
        ("/people.html",       "faculty_list"),
        ("/staff/index.htm",   "faculty_list"),
        ("/teachers/index.htm","faculty_list"),
    ]

    results = []
    for try_base in bases_to_try:
        consecutive_failures = 0
        for path, source_type in common_paths:
            if consecutive_failures >= 3:
                break
            candidate_url = try_base + path
            try:
                html = await http_client.fetch(candidate_url, retry=0)
                if not html or len(html) <= 500:
                    consecutive_failures += 1
                    continue
                consecutive_failures = 0
                if detect_anti_crawl(html):
                    continue
                # 快速校验：中文姓名（2-4 字）链接数量
                name_links = len(re.findall(
                    r">([\u4e00-\u9fa5]{2,4})</a>", html
                ))
                soup_quick = BeautifulSoup(html, "lxml")
                title_tag = soup_quick.find("title")
                title_text = title_tag.get_text(strip=True) if title_tag else ""
                title_match = bool(re.search(
                    r"师资|教师|导师|faculty|people|staff",
                    title_text, re.I,
                ))
                if name_links >= 5 or (title_match and len(html) > 2000):
                    priority = {"advisor_list": 1, "faculty_list": 2, "faculty_by_title": 3}[source_type]
                    results.append({
                        "url": candidate_url,
                        "type": source_type,
                        "priority": priority,
                        "method": "path_guess",
                        "text": f"(猜测路径: {path})",
                    })
            except Exception:
                consecutive_failures += 1
                continue
        if results:
            break
    return results


async def _strategy_graduate_fallback(graduate_url: str, university_name: str) -> list[dict]:
    """
    在研究生院页面找「博导名录」/「导师信息」入口。
    部分高校把全校博导信息集中发布在研究生院。
    """
    html = await http_client.fetch(graduate_url, retry=1)
    if not html or detect_anti_crawl(html):
        return []

    soup = BeautifulSoup(html, "lxml")
    results: list[dict] = []
    keywords = ["博导", "硕导", "导师名录", "导师介绍", "导师队伍", "研究生导师"]

    for a_tag in soup.find_all("a", href=True):
        text = a_tag.get_text(strip=True)
        href = _clean_href(a_tag.get("href"))
        if not href:
            continue
        if not text or len(text) > 30 or len(text) < 2:
            continue
        full_url = normalize_url(href, graduate_url)
        if not is_valid_url(full_url):
            continue
        for kw in keywords:
            if kw in text:
                results.append({
                    "url": full_url,
                    "type": "advisor_list",
                    "priority": 5,
                    "method": "graduate_fallback",
                    "text": text,
                })
                break

    seen: dict[str, dict] = {}
    for r in results:
        if r["url"] not in seen:
            seen[r["url"]] = r
    return list(seen.values())


# ============================================================
# 候选去重与选择
# ============================================================

def _dedup(new_items: list[dict], existing: list[dict]) -> list[dict]:
    """从 new_items 中去除 existing 已有的 URL"""
    existing_urls = {x["url"] for x in existing}
    return [x for x in new_items if x["url"] not in existing_urls]


def _select_best_per_type(validated: list[dict]) -> list[dict]:
    """
    从已验证候选中选择最佳信息源：
      - 博导名录最多 2 个
      - 师资队伍最多 2 个
      - 按职称分组最多 1 个
    """
    by_type = {"advisor_list": [], "faculty_list": [], "faculty_by_title": []}
    for c in validated:
        t = c.get("type", "faculty_list")
        if t in by_type:
            by_type[t].append(c)

    final: list[dict] = []
    final.extend(by_type["advisor_list"][:2])
    final.extend(by_type["faculty_list"][:2])
    final.extend(by_type["faculty_by_title"][:1])

    # 跨 type 去重（同 URL 只保留最高优先级）
    seen: dict[str, dict] = {}
    for c in final:
        if c["url"] not in seen:
            seen[c["url"]] = c
        elif _type_priority(c["type"]) > _type_priority(seen[c["url"]]["type"]):
            seen[c["url"]] = c
    return list(seen.values())


# ============================================================
# 验证机制
# ============================================================

# 中文姓名正则（2-4 个连续汉字）
_NAME_PATTERN = re.compile(r"^[\u4e00-\u9fa5]{2,4}$")

# 职称关键词
_TITLE_KEYWORDS = [
    "教授", "副教授", "讲师", "助理教授", "研究员",
    "副研究员", "助理研究员", "长江学者", "杰青", "院士",
    "特聘", "讲座教授", "博士生导师", "硕士生导师",
    "Professor", "Associate", "Lecturer",
]


async def validate_faculty_page(url: str) -> int:
    """
    验证一个页面是否为师资名录页。

    评分标准（满分 100）：
      1. 包含多个中文姓名风格的链接（≥ 8）→ +30
      2. 页面包含多个职称关键词（≥ 5）  → +25
      3. 存在头像/照片结构（img+姓名 配对 ≥ 5） → +15
      4. 存在邮箱（mailto: 或 @xxx.edu.cn）→ +10
      5. 页面标题含「师资/教师/导师/faculty/people」关键词 → +10
      6. 存在分页组件 → +5
      7. URL 路径特征（szdw / faculty / people 等）→ +5

      静态展示页（师资概况等纯文本）扣分。

    Returns:
        0-100 分
    """
    html = await http_client.fetch(url, retry=0)
    if not html:
        # 请求失败但 URL 特征匹配 → 给基础分（SPA 页面可能返回空 HTML）
        url_lower = url.lower()
        if any(p in url_lower for p in ["/szdw", "/jsdw", "/faculty", "/people", "/bdmd", "/yjsds"]):
            return 30
        return 0

    if detect_anti_crawl(html):
        return 20  # 被反爬拦截但域名存在

    soup = BeautifulSoup(html, "lxml")
    score = 0

    # 1. 中文姓名风格链接
    name_links = 0
    email_links = 0
    img_with_name = 0

    for a in soup.find_all("a", href=True):
        t = a.get_text(strip=True)
        if _NAME_PATTERN.match(t):
            name_links += 1
            # 头像图标结构：链接内含 img 或同一父元素有 img
            if a.find("img") or (a.parent and a.parent.find("img")):
                img_with_name += 1
        href = a.get("href", "")
        if href.startswith("mailto:"):
            email_links += 1

    if name_links >= 20:
        score += 30
    elif name_links >= 10:
        score += 25
    elif name_links >= 5:
        score += 15
    elif name_links >= 3:
        score += 5

    # 2. 职称关键词
    all_text = soup.get_text()
    title_count = sum(all_text.count(kw) for kw in _TITLE_KEYWORDS)
    if title_count >= 15:
        score += 25
    elif title_count >= 8:
        score += 20
    elif title_count >= 3:
        score += 10

    # 3. 头像 + 姓名 配对
    if img_with_name >= 10:
        score += 15
    elif img_with_name >= 5:
        score += 10
    elif img_with_name >= 2:
        score += 5

    # 4. 邮箱
    email_count = email_links + len(re.findall(r"[\w.+-]+@[\w-]+\.(?:edu\.cn|ac\.cn|com\.cn|cn)", all_text))
    if email_count >= 5:
        score += 10
    elif email_count >= 1:
        score += 5

    # 5. 页面标题
    title_tag = soup.find("title")
    if title_tag:
        page_title = title_tag.get_text(strip=True)
        if re.search(r"师资|教师|导师|faculty|people|staff", page_title, re.I):
            score += 10

    # 6. 分页组件
    if (soup.find(class_=re.compile(r"pag|page", re.I))
            or soup.find("a", string=re.compile(r"下一页|>>|Next"))):
        score += 5

    # 7. URL 路径补偿
    url_lower = url.lower()
    if any(p in url_lower for p in ["/szdw", "/jsdw", "/bdmd", "/yjsds", "/faculty",
                                     "/people", "/staff", "/teacher", "/dsjl", "/dsdw"]):
        score = max(score, 30)

    # 8. JS 动态页面补偿
    if title_tag and name_links == 0 and len(html) > 2000:
        page_title = title_tag.get_text(strip=True)
        if re.search(r"师资|教师|导师|faculty|people", page_title, re.I):
            score = max(score, 35)

    # 9. 静态展示页降分（师资概况、师资介绍这种纯文字页）
    if title_tag:
        page_title = title_tag.get_text(strip=True)
        # 有"概况/简介"但姓名链接 < 5 → 静态页
        if (re.search(r"概况|简介|介绍|致辞", page_title) and name_links < 5):
            score = min(score, 15)

    logger.debug(
        f"师资验证: names={name_links} titles={title_count} "
        f"imgs={img_with_name} emails={email_count} → {score}/100 | {url}"
    )
    return min(score, 100)
