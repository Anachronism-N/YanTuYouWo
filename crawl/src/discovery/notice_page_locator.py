"""
信息发布页定位器 - 阶段二核心模块

六层策略级联定位学院通知列表页：
  策略 1：导航链接关键词匹配（httpx + BS4）
  策略 2：页面全文链接扫描 + URL 路径特征匹配
  策略 3：Playwright 渲染 + 完整 DOM 扫描
  策略 4：LLM 分析页面结构，智能定位
  策略 5：搜索引擎查询 "{学院名} 通知公告"
  策略 6：回退到研究生院/研招办统一页面
"""

from __future__ import annotations

import re
from typing import Optional
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup
from loguru import logger

from src.utils.http_client import http_client
from src.utils.url_utils import normalize_url, is_valid_url, get_base_url, get_domain
from src.discovery.anti_crawl_fallback import detect_anti_crawl


# ============================================================
# 通知页关键词配置（按优先级分组）
# ============================================================

PRIORITY_KEYWORDS: list[list[str]] = [
    # 最高优先级：招生相关（直接包含招生信息的页面）
    [
        "招生", "研究生招生", "推免", "夏令营", "预推免",
        "推荐免试", "直博", "硕博连读", "优秀大学生",
        "研究生教育", "研究生信息", "研究生培养",
        "本科生招生", "招生信息", "招生专业",
        "招生就业", "招生与就业",
        "人才培养",  # 很多学院将招生信息放在"人才培养"栏目下
        "教育教学",  # 部分学院将研究生招生放在"教育教学"下
        "admission", "enrollment",
    ],
    # 次优先级：通知公告
    [
        "通知公告", "通知", "公告", "通知通告",
        "信息公告", "事务通知", "教务通知",
        "最新动态", "最新消息",
        "notice", "announcement", "inform",
    ],
    # 最低优先级：新闻动态
    [
        "新闻动态", "新闻", "动态", "学院新闻", "学院动态",
        "科研动态", "学术活动", "学术报告",
        "news",
    ],
]

# 类型名称映射
PRIORITY_TYPE_MAP = {0: "招生", 1: "通知", 2: "新闻"}

# URL 路径特征（按优先级排序）
URL_PATH_PATTERNS_PRIORITY: list[tuple[str, str]] = [
    # 招生相关路径（最高优先级）
    (r"/zsxx", "招生"),          # 招生信息
    (r"/yjszs", "招生"),         # 研究生招生
    (r"/zs/", "招生"),           # 招生
    (r"/zsjy", "招生"),          # 招生就业
    (r"/admission", "招生"),
    (r"/enrollment", "招生"),
    (r"/sszs", "招生"),          # 硕士招生
    (r"/bszs", "招生"),          # 博士招生
    (r"/yjsjy", "招生"),         # 研究生教育
    (r"/rcpy/yjsjy", "招生"),    # 人才培养-研究生教育
    (r"/rcpy", "招生"),          # 人才培养
    (r"/Postgraduate", "招生"),   # 研究生信息（英文路径）
    (r"/jyjx", "招生"),          # 教育教学
    # 通知公告路径
    (r"/tzgg", "通知"),          # 通知公告
    (r"/notice", "通知"),
    (r"/announcement", "通知"),
    (r"/xygg", "通知"),          # 学院公告
    (r"/xytz", "通知"),          # 学院通知
    (r"/zxxx", "通知"),          # 最新消息
    (r"/gonggao", "通知"),
    (r"/tongzhi", "通知"),
    (r"/inform", "通知"),         # 信息公告
    (r"/bulletin", "通知"),       # 公告栏
    (r"/zxdt", "通知"),          # 最新动态
    (r"/jxtz", "通知"),          # 教学通知
    # 新闻动态路径
    (r"/xwdt", "新闻"),          # 新闻动态
    (r"/news", "新闻"),
    (r"/xyxw", "新闻"),          # 学院新闻
    (r"/dongtai", "新闻"),
    (r"/kydt", "新闻"),          # 科研动态
    (r"/xshd", "新闻"),          # 学术活动
    # 通用列表路径
    (r"/list\.htm", "通知"),
    (r"/index/tzgg", "通知"),
]

# 研究生院通知页关键词
GRADUATE_NOTICE_KEYWORDS = [
    "通知公告", "招生信息", "推免", "夏令营",
    "硕士招生", "博士招生", "研究生招生",
    "通知", "公告",
]

# 具体帖子URL特征（这些URL是单篇文章，不是列表页）
# 注意：CMS系统中纯数字路径（如 /5527/list.htm, /45190/list.htm）是栏目ID，不是日期
_ARTICLE_URL_PATTERNS = [
    # 日期路径：必须是 年/月日 或 年/月/日 格式，后面跟非list的内容
    # 例如 /2026/0327/c5491a523348/page.htm 或 /2024/12/some-article
    r"/20\d{2}/\d{2,4}/[a-zA-Z]",  # /20xx/xxxx/字母开头 → 文章页
    r"/page\.htm",                   # page.htm（文章详情页）
    r"/page\.psp",                   # page.psp（文章详情页）
    r"/detail[/?.]",                  # 详情页（后面必须跟/或?或.，避免匹配 /details_list）
    r"/content\.htm",                # 内容页
    r"/info/\d+/\d+\.htm",         # 多级信息页：/info/1051/11867.htm
    r"/info/\d+\.htm",              # 信息页：/info/1234.htm
    r"[?&]id=\d+",                   # 带 id 参数
    r"[?&]articleId=",                # 带 articleId 参数
    r"[?&]newsId=",                   # 带 newsId 参数
    r"/article/\d+",                 # /article/123 格式
    r"/view/\d+",                    # /view/123 格式
    r"/show[/.]\d+",                 # /show/123 或 /show.123 格式
]

# 非信息发布页关键词（这些页面是静态展示页，不包含可更新的招生/通知信息）
# 导航栏中匹配到这些关键词的链接应被排除
_NON_INFO_PAGE_KEYWORDS = [
    # 静态展示类
    "学院概况", "学院简介", "学院介绍", "学校概况", "学校简介",
    "院长致辞", "历史沿革", "现任领导", "领导班子", "组织机构",
    "机构设置", "院系设置", "学部院系",
    # 师资类
    "师资队伍", "师资力量", "教师名录", "教授名录", "导师介绍",
    "师资概况", "教职员工", "人才队伍",
    # 党建行政类
    "党建工作", "党建园地", "党群工作", "纪检监察",
    "工会工作", "团委", "学生工作", "学工在线",
    "基层党建", "党委", "党务公开", "党员发展",
    # 学科展示类
    "学科建设", "学科介绍", "学科方向", "重点学科",
    "科研平台", "实验室", "研究方向", "研究领域",
    # 校友/合作类
    "校友风采", "校友会", "国际交流", "合作交流", "对外合作",
    # 其他非信息发布类
    "联系我们", "下载中心", "资料下载", "办事指南",
    "信息公开", "规章制度", "管理制度",
    "图书馆", "档案馆", "校园风光",
    # 英文版
    "about", "faculty", "staff", "contact", "overview",
]

# URL路径中的非信息发布页特征
_NON_INFO_URL_PATTERNS = [
    r"/szll",       # 师资力量
    r"/szdw",       # 师资队伍
    r"/xygk",       # 学院概况
    r"/lsyg",       # 历史沿革
    r"/xrld",       # 现任领导
    r"/jgsz",       # 机构设置
    r"/djgz",       # 党建工作
    r"/ghgz",       # 工会工作
    r"/xkjs",       # 学科建设
    r"/xkjj",       # 学科介绍
    r"/kypt",       # 科研平台
    r"/about",      # 关于
    r"/faculty",    # 师资
    r"/staff",      # 员工
    r"/contact",    # 联系
    r"/overview",   # 概况
    r"/alumni",     # 校友
    r"/download",   # 下载
]


def _is_article_url(url: str) -> bool:
    """判断URL是否为具体帖子/文章页面（而非列表页）"""
    url_lower = url.lower()
    # 如果URL包含列表页特征，直接放行（不是文章）
    if any(kw in url_lower for kw in ["/list.", "/index.", "/index/"]):
        return False
    for pattern in _ARTICLE_URL_PATTERNS:
        if re.search(pattern, url, re.I):
            return True
    return False


def _is_non_info_page(text: str, url: str) -> bool:
    """
    判断链接是否指向非信息发布页（静态展示页面）。

    这些页面不包含可更新的招生/通知信息，应被排除：
    - 学院概况、师资队伍、党建工作等静态展示页
    - 学科建设、实验室介绍等非动态内容页
    """
    text_lower = text.lower().strip()
    url_lower = url.lower()

    # 文本关键词排除
    for kw in _NON_INFO_PAGE_KEYWORDS:
        if kw in text_lower:
            return True

    # URL路径排除
    for pattern in _NON_INFO_URL_PATTERNS:
        if re.search(pattern, url_lower):
            return True

    return False


# ============================================================
# 主入口函数
# ============================================================

async def locate_notice_pages(
    dept_homepage: str,
    dept_name: str,
    university_name: str,
    graduate_url: str | None = None,
) -> list[dict]:
    """
    六层策略级联定位学院的通知列表页。

    Args:
        dept_homepage: 学院官网首页 URL
        dept_name: 学院名称
        university_name: 高校名称
        graduate_url: 研究生院 URL（用于策略6回退）

    Returns:
        候选通知页列表，每项包含：
        {
            "url": str,           # 通知页 URL
            "type": str,          # 类型：招生/通知/新闻
            "priority": int,      # 优先级（1最高）
            "method": str,        # 发现方法
            "text": str,          # 链接文本
            "validation_score": int,  # 验证分数 (0-100)
        }
    """
    context = f"{university_name} {dept_name}"
    all_candidates: list[dict] = []

    # ---- 策略 0：处理跳转首页（如浙大公共管理学院首页是跳转页） ----
    actual_homepage = await _resolve_redirect_homepage(dept_homepage)
    if actual_homepage != dept_homepage:
        logger.info(f"[策略0] {context}: 首页跳转 → {actual_homepage}")
        dept_homepage = actual_homepage

    # ---- 策略 1：导航链接关键词匹配 ----
    logger.debug(f"[策略1] 导航关键词匹配: {context}")
    try:
        result = await _strategy_nav_keywords(dept_homepage)
        if result:
            all_candidates.extend(result)
            logger.info(f"[策略1] {context}: 找到 {len(result)} 个候选")
    except Exception as e:
        logger.warning(f"[策略1] {context} 异常: {e}")

    # ---- 策略 2：页面全文链接扫描 + URL 路径特征 ----
    if len(all_candidates) < 3:
        logger.debug(f"[策略2] 全文链接扫描: {context}")
        try:
            result = await _strategy_link_scan(dept_homepage)
            if result:
                new_results = _deduplicate_candidates(result, all_candidates)
                all_candidates.extend(new_results)
                logger.info(f"[策略2] {context}: 补充 {len(new_results)} 个候选")
        except Exception as e:
            logger.warning(f"[策略2] {context} 异常: {e}")

    # ---- 策略 3：Playwright 渲染（仅在前两层无结果时） ----
    if not all_candidates:
        logger.debug(f"[策略3] Playwright 渲染: {context}")
        try:
            result = await _strategy_playwright(dept_homepage)
            if result:
                all_candidates.extend(result)
                logger.info(f"[策略3] {context}: 找到 {len(result)} 个候选")
        except Exception as e:
            logger.warning(f"[策略3] {context} 异常: {e}")

    # ---- 策略 4：LLM 分析页面结构 ----
    if not all_candidates:
        logger.debug(f"[策略4] LLM 分析: {context}")
        try:
            result = await _strategy_llm_analyze(dept_homepage, context)
            if result:
                all_candidates.extend(result)
                logger.info(f"[策略4] {context}: 找到 {len(result)} 个候选")
        except Exception as e:
            logger.warning(f"[策略4] {context} 异常: {e}")

    # ---- 策略 5：子路径猜测（常见通知页路径） ----
    if not all_candidates:
        logger.debug(f"[策略5] 子路径猜测: {context}")
        try:
            result = await _strategy_path_guess(dept_homepage)
            if result:
                all_candidates.extend(result)
                logger.info(f"[策略5] {context}: 找到 {len(result)} 个候选")
        except Exception as e:
            logger.warning(f"[策略5] {context} 异常: {e}")

    # ---- 策略 5.5：对于子路径学院，尝试从父站点定位 ----
    if not all_candidates:
        parsed = urlparse(dept_homepage)
        path_parts = [p for p in parsed.path.strip('/').split('/') if p]
        if path_parts:  # URL 有子路径，如 sem.tsinghua.edu.cn/ies
            logger.debug(f"[策略5.5] 子路径学院父站点扫描: {context}")
            try:
                parent_url = f"{parsed.scheme}://{parsed.netloc}"
                result = await _strategy_nav_keywords(parent_url)
                if result:
                    new_results = _deduplicate_candidates(result, all_candidates)
                    all_candidates.extend(new_results)
                    logger.info(f"[策略5.5] {context}: 从父站点找到 {len(new_results)} 个候选")
            except Exception as e:
                logger.warning(f"[策略5.5] {context} 异常: {e}")

    # ---- 策略 6：回退到研究生院 ----
    if not all_candidates and graduate_url:
        logger.debug(f"[策略6] 研究生院回退: {context}")
        try:
            result = await _strategy_graduate_fallback(graduate_url, university_name)
            if result:
                all_candidates.extend(result)
                logger.info(f"[策略6] {context}: 从研究生院找到 {len(result)} 个候选")
        except Exception as e:
            logger.warning(f"[策略6] {context} 异常: {e}")

    # ---- 验证候选页面 ----
    # 验证前按优先级排序，确保招生类URL优先被验证
    all_candidates.sort(key=lambda x: (x.get("priority", 99), x.get("method", "z")))

    validated = []
    for candidate in all_candidates[:15]:  # 最多验证 15 个
        try:
            score = await validate_notice_list_page(candidate["url"])

            # 对导航菜单中明确标记为招生相关的候选给予额外信任分
            # 因为导航菜单中的"招生信息"/"研究生教育"等链接是人工维护的，可信度高
            link_text = candidate.get("text", "")
            if candidate.get("type") == "招生" and candidate.get("method") in ("nav_keyword", "link_text", "url_pattern"):
                # 高信任关键词：直接与招生相关
                high_trust_kws = ["招生", "推免", "夏令营", "研究生教育", "研究生招生",
                                  "研究生培养", "研究生信息", "招生就业"]
                # 中信任关键词：间接可能包含招生信息
                mid_trust_kws = ["人才培养", "教育教学"]
                if any(kw in link_text for kw in high_trust_kws):
                    score = max(score, 50)  # 导航中的招生链接至少50分
                    logger.debug(f"招生链接高信任加分: {link_text} → {score}/100 | {candidate['url']}")
                elif any(kw in link_text for kw in mid_trust_kws):
                    score = max(score, 40)  # 间接渠道至少40分
                    logger.debug(f"招生链接中信任加分: {link_text} → {score}/100 | {candidate['url']}")

            candidate["validation_score"] = score
            if score >= 30:  # 降低阈值，允许更多候选通过
                validated.append(candidate)
        except Exception as e:
            logger.debug(f"验证失败: {candidate['url']} - {e}")

    # 按优先级 + 验证分数排序
    validated.sort(key=lambda x: (-_type_priority(x.get("type", "新闻")), -x.get("validation_score", 0)))

    # 选择最佳信息源（招生类保留多个，通知/新闻各保留1个）
    final = _select_best_per_type(validated)

    logger.info(f"定位完成: {context} → {len(final)} 个有效通知页")
    return final


# ============================================================
# 策略实现
# ============================================================

async def _strategy_nav_keywords(url: str) -> list[dict]:
    """策略 1：导航链接关键词匹配"""
    html = await http_client.fetch(url, retry=1)
    if not html:
        return []

    # 检测反爬
    anti_crawl = detect_anti_crawl(html)
    if anti_crawl:
        logger.warning(f"[策略1] 检测到反爬系统 ({anti_crawl}): {url}")
        return []

    return _extract_nav_keywords_from_html(html, url)


def _extract_nav_keywords_from_html(html: str, base_url: str) -> list[dict]:
    """从 HTML 中提取导航关键词匹配的链接"""
    soup = BeautifulSoup(html, "lxml")
    results = []

    for a_tag in soup.find_all("a", href=True):
        text = a_tag.get_text(strip=True)
        href = a_tag["href"]

        if not text or len(text) > 30 or len(text) < 2:
            continue

        full_url = normalize_url(href, base_url)
        if not is_valid_url(full_url):
            continue

        # 过滤具体帖子URL（单篇文章不是列表页）
        if _is_article_url(full_url):
            continue

        # 过滤非信息发布页（静态展示页面）
        if _is_non_info_page(text, full_url):
            continue

        # 跳过外部链接（不同域名的链接通常不是通知页）
        base_domain = get_domain(base_url)
        link_domain = get_domain(full_url)
        # 允许同一高校的子域名（如 cs.pku.edu.cn → grs.pku.edu.cn）
        base_root = ".".join(base_domain.split(".")[-3:])
        link_root = ".".join(link_domain.split(".")[-3:])
        if base_root != link_root:
            continue

        # 按优先级匹配
        for priority_idx, keywords in enumerate(PRIORITY_KEYWORDS):
            for kw in keywords:
                if kw in text.lower():
                    notice_type = PRIORITY_TYPE_MAP[priority_idx]
                    results.append({
                        "url": full_url,
                        "type": notice_type,
                        "priority": priority_idx + 1,
                        "method": "nav_keyword",
                        "text": text,
                    })
                    break
            else:
                continue
            break  # 匹配到一个优先级组后跳出

    # 去重，保留最高优先级
    seen: dict[str, dict] = {}
    for r in results:
        if r["url"] not in seen or r["priority"] < seen[r["url"]]["priority"]:
            seen[r["url"]] = r

    return list(seen.values())


async def _strategy_link_scan(url: str) -> list[dict]:
    """策略 2：页面全文链接扫描 + URL 路径特征 + 链接文本关键词"""
    html = await http_client.fetch(url, retry=1)
    if not html:
        return []

    anti_crawl = detect_anti_crawl(html)
    if anti_crawl:
        return []

    soup = BeautifulSoup(html, "lxml")
    results = []

    for a_tag in soup.find_all("a", href=True):
        href = a_tag["href"]
        text = a_tag.get_text(strip=True)

        full_url = normalize_url(href, url)
        if not is_valid_url(full_url):
            continue

        # 过滤具体帖子URL
        if _is_article_url(full_url):
            continue

        # 过滤非信息发布页
        if text and _is_non_info_page(text, full_url):
            continue

        matched = False
        # URL 路径特征匹配
        for pattern, notice_type in URL_PATH_PATTERNS_PRIORITY:
            if re.search(pattern, full_url, re.I):
                priority = 1 if notice_type == "招生" else (2 if notice_type == "通知" else 3)
                results.append({
                    "url": full_url,
                    "type": notice_type,
                    "priority": priority,
                    "method": "url_pattern",
                    "text": text or "(无文本)",
                })
                matched = True
                break

        # 链接文本关键词匹配（补充URL路径未匹配到的）
        if not matched and text and 2 <= len(text) <= 30:
            for priority_idx, keywords in enumerate(PRIORITY_KEYWORDS):
                for kw in keywords:
                    if kw in text.lower():
                        notice_type = PRIORITY_TYPE_MAP[priority_idx]
                        results.append({
                            "url": full_url,
                            "type": notice_type,
                            "priority": priority_idx + 1,
                            "method": "link_text",
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


async def _strategy_playwright(url: str) -> list[dict]:
    """策略 3：Playwright 渲染 + 完整 DOM 扫描"""
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        logger.debug("Playwright 未安装，跳过策略3")
        return []

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            try:
                await page.goto(url, timeout=15000, wait_until="domcontentloaded")
                await page.wait_for_timeout(2000)  # 等待 JS 渲染

                # 尝试展开下拉菜单
                try:
                    nav_items = await page.query_selector_all("nav li, .nav li, .menu li")
                    for item in nav_items[:10]:
                        try:
                            await item.hover()
                            await page.wait_for_timeout(300)
                        except Exception:
                            pass
                except Exception:
                    pass

                html = await page.content()
            finally:
                await browser.close()

        if not html:
            return []

        # 检测反爬
        anti_crawl = detect_anti_crawl(html)
        if anti_crawl:
            return []

        # 使用策略1和策略2的逻辑解析渲染后的 HTML
        results = _extract_nav_keywords_from_html(html, url)

        # 补充 URL 路径匹配
        soup = BeautifulSoup(html, "lxml")
        for a_tag in soup.find_all("a", href=True):
            href = a_tag["href"]
            text = a_tag.get_text(strip=True)
            full_url = normalize_url(href, url)
            if not is_valid_url(full_url):
                continue

            for pattern, notice_type in URL_PATH_PATTERNS_PRIORITY:
                if re.search(pattern, full_url, re.I):
                    priority = 1 if notice_type == "招生" else (2 if notice_type == "通知" else 3)
                    results.append({
                        "url": full_url,
                        "type": notice_type,
                        "priority": priority,
                        "method": "playwright",
                        "text": text or "(无文本)",
                    })
                    break

        # 去重
        seen: dict[str, dict] = {}
        for r in results:
            if r["url"] not in seen or r["priority"] < seen[r["url"]]["priority"]:
                seen[r["url"]] = r

        return list(seen.values())

    except Exception as e:
        logger.debug(f"Playwright 渲染失败: {url} - {e}")
        return []


async def _strategy_llm_analyze(url: str, context: str) -> list[dict]:
    """策略 4：LLM 分析页面结构"""
    html = await http_client.fetch(url, retry=1)
    if not html:
        return []

    anti_crawl = detect_anti_crawl(html)
    if anti_crawl:
        return []

    from src.parser.content_extractor import simplify_html
    from src.llm.client import llm_client

    simplified = simplify_html(html, max_length=3000)

    try:
        llm_results = await llm_client.analyze_page(simplified, context)
        results = []
        for item in llm_results:
            item_url = normalize_url(item.get("url", ""), url)
            if is_valid_url(item_url):
                notice_type = item.get("type", "通知")
                if notice_type not in ("招生", "通知", "新闻"):
                    notice_type = "通知"
                results.append({
                    "url": item_url,
                    "type": notice_type,
                    "priority": 4,
                    "method": "llm_analyze",
                    "text": item.get("text", ""),
                })
        return results
    except Exception as e:
        logger.warning(f"LLM 分析失败: {e}")
        return []


async def _strategy_path_guess(url: str) -> list[dict]:
    """
    策略 5：子路径猜测 - 尝试常见的通知页路径。

    很多高校网站的通知页 URL 遵循固定模式，
    直接构造 URL 并验证是否可访问。
    """
    parsed = urlparse(url)
    base = f"{parsed.scheme}://{parsed.netloc}"

    # 如果学院 URL 本身有子路径（如 sem.tsinghua.edu.cn/ies），
    # 则在子路径基础上猜测
    url_path = parsed.path.rstrip("/")
    bases_to_try = [base]
    if url_path and url_path != "/":
        bases_to_try.insert(0, base + url_path)  # 优先尝试子路径

    # 常见通知页路径
    common_paths = [
        # 招生相关
        ("/zsxx/index.htm", "招生"),
        ("/yjszs/index.htm", "招生"),
        ("/zs/index.htm", "招生"),
        ("/zsxx.htm", "招生"),
        ("/yjsjy/index.htm", "招生"),
        ("/rcpy/yjsjy/index.htm", "招生"),
        # 通知公告
        ("/tzgg/index.htm", "通知"),
        ("/tzgg.htm", "通知"),
        ("/xygg/index.htm", "通知"),
        ("/notice/index.htm", "通知"),
        ("/xytz/index.htm", "通知"),
        ("/tzgg/list.htm", "通知"),
        ("/inform/index.htm", "通知"),
        ("/zxdt/index.htm", "通知"),
        ("/zxdt.htm", "通知"),
        # 新闻动态
        ("/xwdt/index.htm", "新闻"),
        ("/news/index.htm", "新闻"),
        ("/xyxw/index.htm", "新闻"),
        ("/xwdt.htm", "新闻"),
        ("/kydt/index.htm", "新闻"),
        ("/xshd/index.htm", "新闻"),
        ("/xshd.htm", "新闻"),          # 学术活动（简短路径）
        ("/zxdt.htm", "通知"),          # 最新动态（简短路径）
    ]

    results = []
    consecutive_failures = 0  # 连续失败计数
    for try_base in bases_to_try:
        consecutive_failures = 0
        for path, notice_type in common_paths:
            # 如果连续 3 次失败（403/超时），说明整个域名被反爬，提前终止
            if consecutive_failures >= 3:
                logger.debug(f"子路径猜测: 连续 {consecutive_failures} 次失败，跳过剩余路径")
                break

            candidate_url = try_base + path
            try:
                html = await http_client.fetch(candidate_url, retry=0)
                if not html or len(html) <= 500:
                    consecutive_failures += 1
                    continue
                consecutive_failures = 0  # 重置计数
                anti_crawl = detect_anti_crawl(html)
                if not anti_crawl:
                    # 快速验证：页面中是否有多个日期，或标题含关键词
                    date_count = len(re.findall(r"\d{4}[-./年]\d{1,2}[-./月]\d{1,2}", html))
                    soup_quick = BeautifulSoup(html, "lxml")
                    title_tag = soup_quick.find("title")
                    title_text = title_tag.get_text(strip=True) if title_tag else ""
                    title_match = bool(re.search(
                        r"招生|通知|公告|新闻|动态|notice|news",
                        title_text, re.I
                    ))

                    if date_count >= 3 or (title_match and len(html) > 2000):
                        priority = 1 if notice_type == "招生" else (2 if notice_type == "通知" else 3)
                        results.append({
                            "url": candidate_url,
                            "type": notice_type,
                            "priority": priority,
                            "method": "path_guess",
                            "text": f"(猜测路径: {path})",
                        })
            except Exception:
                consecutive_failures += 1
                continue

        if results:
            break  # 已找到结果，不再尝试其他 base

    return results


async def _strategy_graduate_fallback(
    graduate_url: str,
    university_name: str,
) -> list[dict]:
    """
    策略 6：回退到研究生院/研招办统一页面。

    当学院级别的通知页无法定位时，使用学校研究生院的通知页。
    """
    html = await http_client.fetch(graduate_url, retry=1)
    if not html:
        return []

    anti_crawl = detect_anti_crawl(html)
    if anti_crawl:
        return []

    soup = BeautifulSoup(html, "lxml")
    results = []

    for a_tag in soup.find_all("a", href=True):
        text = a_tag.get_text(strip=True)
        href = a_tag["href"]

        if not text or len(text) > 30 or len(text) < 2:
            continue

        full_url = normalize_url(href, graduate_url)
        if not is_valid_url(full_url):
            continue

        # 匹配研究生院通知页关键词
        for kw in GRADUATE_NOTICE_KEYWORDS:
            if kw in text:
                notice_type = "招生" if any(k in text for k in ["招生", "推免", "夏令营"]) else "通知"
                results.append({
                    "url": full_url,
                    "type": notice_type,
                    "priority": 5,  # 研究生院回退优先级较低
                    "method": "graduate_fallback",
                    "text": text,
                })
                break

    # 去重
    seen: dict[str, dict] = {}
    for r in results:
        if r["url"] not in seen:
            seen[r["url"]] = r

    return list(seen.values())


# ============================================================
# 验证机制
# ============================================================

async def validate_notice_list_page(url: str) -> int:
    """
    验证一个页面是否为通知列表页。

    评分标准（满分 100）：
    1. 包含多个带日期的链接条目（≥ 5 条）→ +40 分
    2. 条目标题长度合理（10-100 字符）→ +20 分
    3. 日期格式符合常见模式 → +20 分
    4. 页面标题包含"通知"/"公告"/"招生"等关键词 → +10 分
    5. 存在分页组件 → +10 分

    Args:
        url: 待验证的 URL

    Returns:
        验证分数 (0-100)
    """
    html = await http_client.fetch(url, retry=0)
    if not html:
        # 请求失败（DNS/网络错误），但如果URL路径匹配关键特征（SPA路由），给予基础分
        url_lower = url.lower()
        if any(p in url_lower for p in ["/tzgg", "/zsxx", "/yjszs", "/notice", "/inform",
                                         "/postgraduate", "/undergraduate", "/yjsjy",
                                         "/bulletin", "/admission", "/enrollment"]):
            logger.debug(f"请求失败但URL路径匹配关键特征，给予SPA基础分: {url}")
            return 35
        return 0

    # 检测反爬
    anti_crawl = detect_anti_crawl(html)
    if anti_crawl:
        # 被反爬拦截但域名存在，给一个基础分
        return 20

    soup = BeautifulSoup(html, "lxml")
    score = 0

    # 1. 检查带日期的链接条目
    date_pattern = re.compile(r"\d{4}[-./年]\d{1,2}[-./月]\d{1,2}")
    date_links = 0
    reasonable_titles = 0

    for a_tag in soup.find_all("a", href=True):
        title = a_tag.get_text(strip=True)
        if not title or len(title) < 5:
            continue

        # 在父元素中查找日期
        parent = a_tag.parent
        if parent:
            parent_text = parent.get_text()
            if date_pattern.search(parent_text):
                date_links += 1
                # 2. 标题长度合理
                if 8 <= len(title) <= 150:
                    reasonable_titles += 1

    if date_links >= 8:
        score += 40
    elif date_links >= 5:
        score += 30
    elif date_links >= 3:
        score += 20
    elif date_links >= 1:
        score += 10

    if reasonable_titles >= 5:
        score += 20
    elif reasonable_titles >= 3:
        score += 10

    # 3. 日期格式
    all_text = soup.get_text()
    date_count = len(date_pattern.findall(all_text))
    if date_count >= 8:
        score += 20
    elif date_count >= 5:
        score += 15
    elif date_count >= 3:
        score += 10

    # 4. 页面标题关键词
    title_tag = soup.find("title")
    if title_tag:
        page_title = title_tag.get_text(strip=True)
        if re.search(r"招生|推免|夏令营|admission", page_title, re.I):
            score += 10
        elif re.search(r"通知|公告|notice|announcement", page_title, re.I):
            score += 10
        elif re.search(r"新闻|动态|news", page_title, re.I):
            score += 5

    # 5. 分页组件
    if (soup.find(class_=re.compile(r"pag|page", re.I))
            or soup.find("a", string=re.compile(r"下一页|>>|Next"))
            or soup.find(id=re.compile(r"pag|page", re.I))):
        score += 10

    # 6. JS 动态渲染页面补偿：标题含关键词但内容为空（JS 加载）
    #    这类页面标题正确但日期为 0，给予通过分数
    if title_tag:
        page_title = title_tag.get_text(strip=True)
        is_title_match = bool(re.search(
            r"招生|推免|通知|公告|新闻|动态|研究生教育|研究生培养|研究生信息|最新动态|学术活动|科研动态|人才培养|教育教学|notice|news|announcement|admission",
            page_title, re.I
        ))
        if is_title_match and date_links == 0 and len(html) > 2000:
            # 标题匹配但无日期 → 可能是 JS 动态渲染
            score = max(score, 35)  # 保证通过验证阈值
            logger.debug(f"JS 动态页面补偿: 标题='{page_title}' | {url}")

    # 7. URL 路径特征补偿：URL 中含有通知/招生路径特征
    url_lower = url.lower()
    if any(p in url_lower for p in ["/tzgg", "/zsxx", "/yjszs", "/notice", "/inform",
                                     "/postgraduate", "/undergraduate", "/yjsjy",
                                     "/rcpy/yjsjy", "/bulletin", "/zxdt", "/jxtz",
                                     "/admission", "/enrollment", "/sszs", "/bszs",
                                     "/rcpy", "/zsjy"]):
        score = max(score, 30)  # URL 路径匹配，保证基础分

    # 8. 负面信号检测：页面内容明显不是信息列表页
    #    如果页面是纯静态展示页（师资介绍、学院概况等），降低分数
    if title_tag:
        page_title = title_tag.get_text(strip=True)
        is_static_page = bool(re.search(
            r"师资|概况|简介|领导|机构|党建|工会|校友|联系|下载|规章|制度|实验室|平台"
            r"|faculty|staff|about|overview|contact|download",
            page_title, re.I
        ))
        if is_static_page and score > 0:
            # 静态展示页面，大幅降低分数
            score = min(score, 15)  # 最多15分，不会通过30分阈值
            logger.debug(f"静态展示页降分: 标题='{page_title}' | {url}")

    logger.debug(f"验证分数: {score}/100 | dates={date_links} titles={reasonable_titles} | {url}")
    return min(score, 100)


# ============================================================
# 批量处理
# ============================================================

async def locate_all_departments(
    departments: list[dict],
    university_name: str,
    graduate_url: str | None = None,
) -> list[dict]:
    """
    批量定位所有学院的通知页。

    Args:
        departments: 学院列表 [{"id": int, "name": str, "homepage_url": str}]
        university_name: 高校名称
        graduate_url: 研究生院 URL

    Returns:
        定位结果列表 [{
            "department_id": int,
            "department_name": str,
            "sources": [{"url", "type", "priority", "method", "validation_score"}],
            "status": "success" | "partial" | "fallback" | "failed",
        }]
    """
    results = []

    for i, dept in enumerate(departments):
        dept_id = dept.get("id")
        dept_name = dept["name"]
        dept_url = dept.get("homepage_url", "")

        logger.info(f"[{i+1}/{len(departments)}] 定位通知页: {university_name} {dept_name}")

        # 过滤非学院实体（阶段一数据噪声）
        if is_non_department_entity(dept_name):
            logger.info(f"  ⏭️  跳过非学院实体: {dept_name}")
            results.append({
                "department_id": dept_id,
                "department_name": dept_name,
                "sources": [],
                "status": "skipped",
            })
            continue

        if not dept_url:
            # 无学院 URL，直接回退到研究生院
            if graduate_url:
                sources = await _strategy_graduate_fallback(graduate_url, university_name)
                # 验证
                validated = []
                for s in sources[:3]:
                    try:
                        score = await validate_notice_list_page(s["url"])
                        s["validation_score"] = score
                        if score >= 30:
                            validated.append(s)
                    except Exception:
                        pass
                results.append({
                    "department_id": dept_id,
                    "department_name": dept_name,
                    "sources": validated,
                    "status": "fallback" if validated else "failed",
                })
            else:
                results.append({
                    "department_id": dept_id,
                    "department_name": dept_name,
                    "sources": [],
                    "status": "failed",
                })
            continue

        # 正常定位
        try:
            sources = await locate_notice_pages(
                dept_homepage=dept_url,
                dept_name=dept_name,
                university_name=university_name,
                graduate_url=graduate_url,
            )
        except Exception as e:
            logger.error(f"定位异常: {university_name} {dept_name}: {e}")
            sources = []

        if sources:
            # 有招生类型的算 success，只有通知/新闻的算 partial
            has_admission = any(s.get("type") == "招生" for s in sources)
            status = "success" if has_admission else "partial"
        else:
            status = "failed"

        results.append({
            "department_id": dept_id,
            "department_name": dept_name,
            "sources": sources,
            "status": status,
        })

    # 汇总统计
    success = sum(1 for r in results if r["status"] == "success")
    partial = sum(1 for r in results if r["status"] == "partial")
    fallback = sum(1 for r in results if r["status"] == "fallback")
    failed = sum(1 for r in results if r["status"] == "failed")
    skipped = sum(1 for r in results if r["status"] == "skipped")
    total_sources = sum(len(r["sources"]) for r in results)

    logger.info(f"\n{'='*60}")
    logger.info(f"📊 {university_name} 通知页定位汇总")
    logger.info(f"  ✅ 成功（含招生页）: {success}/{len(departments)}")
    logger.info(f"  ⚠️  部分（仅通知/新闻）: {partial}/{len(departments)}")
    logger.info(f"  🔄 回退（研究生院）: {fallback}/{len(departments)}")
    logger.info(f"  ❌ 失败: {failed}/{len(departments)}")
    if skipped:
        logger.info(f"  ⏭️  跳过（非学院实体）: {skipped}/{len(departments)}")
    logger.info(f"  📄 信息源总数: {total_sources}")
    logger.info(f"{'='*60}")

    return results


# ============================================================
# 辅助函数
# ============================================================

# 非学院实体名称（阶段一数据噪声，不应进行通知页定位）
_NON_DEPARTMENT_PATTERNS = [
    r"^中国科学院院士$",
    r"^中国工程院院士$",
    r"^学部院系$",
    r"^院系设置$",
    r"^科学技术研究院$",
    r"^院士$",
    r"^书院$",  # 仅匹配纯"书院"，不匹配"XX书院"
    r"^学院部门$",
    r"^独立学院$",
    r".*课题组.*招聘.*",
    r".*招聘.*课题组.*",
    r".*荣获.*",
    r".*部署启动.*",
    r".*筹建工作.*",
    r".*学子在.*",
    r".*党工委.*",
    r".*领导小组.*",
]


def is_non_department_entity(name: str) -> bool:
    """判断是否为非学院实体（阶段一数据噪声）"""
    name = name.strip()
    # 名称过长（>25字符）通常是新闻标题而非学院名称
    if len(name) > 25:
        return True
    for pattern in _NON_DEPARTMENT_PATTERNS:
        if re.match(pattern, name):
            return True
    return False


async def _resolve_redirect_homepage(url: str) -> str:
    """
    处理跳转首页：某些学院首页是一个跳转页面（如浙大公共管理学院），
    需要跟踪到实际的子站点。

    策略：
    1. 获取首页 HTML
    2. 如果页面很短（< 3000 字符）且包含少量链接，
       尝试找到"中文"或"中文网"链接作为实际首页
    3. 如果有 meta refresh 或 JS 跳转，跟踪跳转
    """
    try:
        html = await http_client.fetch(url, retry=0)
        if not html:
            return url

        # 检查 meta refresh 跳转
        meta_match = re.search(
            r'<meta[^>]*http-equiv=["\']refresh["\'][^>]*content=["\'][^"]*url=([^"\'>]+)',
            html, re.I
        )
        if meta_match:
            redirect_url = normalize_url(meta_match.group(1).strip(), url)
            if is_valid_url(redirect_url):
                logger.debug(f"Meta refresh 跳转: {url} → {redirect_url}")
                return redirect_url

        # 检查 JS 跳转: window.location = "..."
        js_match = re.search(
            r'window\.location(?:\.href)?\s*=\s*["\']([^"\'>]+)["\']',
            html, re.I
        )
        if js_match:
            redirect_url = normalize_url(js_match.group(1).strip(), url)
            if is_valid_url(redirect_url):
                logger.debug(f"JS 跳转: {url} → {redirect_url}")
                return redirect_url

        # 如果页面很短，检查是否是跳转页面
        soup = BeautifulSoup(html, "lxml")
        links = soup.find_all("a", href=True)
        real_links = [a for a in links if a.get_text(strip=True) and len(a.get_text(strip=True)) > 1]

        if len(html) < 5000 and len(real_links) <= 10:
            # 页面很短且链接很少，可能是跳转页
            for a_tag in real_links:
                text = a_tag.get_text(strip=True).lower()
                if text in ("中文", "中文网", "中文版", "简体中文", "首页", "进入网站", "进入"):
                    redirect_url = normalize_url(a_tag["href"], url)
                    if is_valid_url(redirect_url) and redirect_url != url:
                        logger.debug(f"跳转页面: {url} → {redirect_url} (链接文本: {text})")
                        return redirect_url

        # 检查是否是大学主站的学院介绍页（如 JSP 页面）
        # 这类页面通常包含"进入XX学院"的链接，指向学院独立网站
        parsed_url = urlparse(url)
        is_main_site_page = (
            ".jsp" in parsed_url.path.lower()
            or (parsed_url.path.endswith(".htm") and "/" not in parsed_url.path.strip("/").rsplit("/", 1)[0] if "/" in parsed_url.path.strip("/") else False)
        )
        if is_main_site_page or len(html) > 10000:
            # 查找"进入XX"链接
            for a_tag in soup.find_all("a", href=True):
                text = a_tag.get_text(strip=True)
                href = a_tag["href"]
                if re.search(r"进入.{2,10}(学院|书院|系|研究所|研究院|中心)", text):
                    redirect_url = normalize_url(href, url)
                    if is_valid_url(redirect_url) and redirect_url != url:
                        # 确保是不同域名的链接（独立网站）
                        if get_domain(redirect_url) != get_domain(url):
                            logger.debug(f"发现学院独立网站: {url} → {redirect_url} (链接文本: {text})")
                            return redirect_url

    except Exception as e:
        logger.debug(f"跳转检测失败: {url} - {e}")

    return url


def _deduplicate_candidates(new: list[dict], existing: list[dict]) -> list[dict]:
    """去重：移除已存在的候选"""
    existing_urls = {c["url"] for c in existing}
    return [r for r in new if r["url"] not in existing_urls]


def _type_priority(notice_type: str) -> int:
    """类型优先级：招生 > 通知 > 新闻"""
    return {"招生": 3, "通知": 2, "新闻": 1}.get(notice_type, 0)


def _select_best_per_type(candidates: list[dict]) -> list[dict]:
    """
    选择最佳的信息源候选。

    策略：
    1. 一个学院可以有多个信息渠道（如"研究生教育"和"招生信息"都保留）
    2. 招生类信息源全部保留（最多3个），因为它们是核心目标
    3. 通知和新闻类各保留最佳的1个作为补充
    4. URL级别去重，确保不会有重复URL
    5. 最终返回最多 5 个信息源
    """
    # URL 级别去重：相同URL保留优先级最高的
    url_best: dict[str, dict] = {}
    for c in candidates:
        url = c["url"]
        if url not in url_best or _type_priority(c.get("type", "新闻")) > _type_priority(url_best[url].get("type", "新闻")):
            url_best[url] = c
        elif _type_priority(c.get("type", "新闻")) == _type_priority(url_best[url].get("type", "新闻")):
            if c.get("validation_score", 0) > url_best[url].get("validation_score", 0):
                url_best[url] = c

    deduped = list(url_best.values())

    # 分类收集
    admission = [c for c in deduped if c.get("type") == "招生"]
    notice = [c for c in deduped if c.get("type") == "通知"]
    news = [c for c in deduped if c.get("type") == "新闻"]

    # 各类按验证分数排序
    admission.sort(key=lambda x: -x.get("validation_score", 0))
    notice.sort(key=lambda x: -x.get("validation_score", 0))
    news.sort(key=lambda x: -x.get("validation_score", 0))

    # 组合结果：招生类全部保留（最多3个），通知和新闻各保留最佳1个
    result = []
    result.extend(admission[:3])
    if notice:
        result.append(notice[0])
    if news:
        result.append(news[0])

    return result[:5]
