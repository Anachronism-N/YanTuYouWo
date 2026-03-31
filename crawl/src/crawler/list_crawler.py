"""列表页爬虫 - 爬取通知列表页并解析条目"""

from __future__ import annotations

import re
import time
from datetime import datetime
from typing import Optional

from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.notice import AdmissionNotice, CrawlLog, CrawlState
from src.models.university import DepartmentSource
from src.utils.http_client import http_client
from src.parser.list_parser import notice_list_parser
from src.processor.rule_filter import batch_filter

# 日期正则（用于导航页预检）
_DATE_RE = re.compile(r"\d{4}[-./年]\d{1,2}[-./月]\d{1,2}")
# 宽松日期正则（匹配分离式日期如 2023-12、2023年12月 等）
_DATE_LOOSE_RE = re.compile(r"\d{4}[-./年]\d{1,2}")
# 列表结构正则（检测是否有通知列表的HTML结构特征）
_LIST_STRUCTURE_RE = re.compile(
    r'class=["\'].*?(news[-_]?(?:list|item|simplelist)|list[-_]?(?:item|box|content)|'
    r'wp_article_list|notice[-_]?list|tzgg|article[-_]?list|newlist)',
    re.I
)


async def crawl_source(
    source: DepartmentSource,
    session: AsyncSession,
    university_id: int,
    max_pages: int = 5,
) -> CrawlLog:
    """
    爬取单个信息源的通知列表页（支持多页翻页）。

    流程：
    1. 请求第一页列表页HTML
    2. 自适应解析通知条目
    3. 检测分页，爬取后续页面
    4. 规则过滤 + 权重评分
    5. URL去重（排除已入库的）
    6. 返回新条目供后续处理

    Args:
        source: 信息源对象
        session: 数据库会话
        university_id: 高校 ID
        max_pages: 最大翻页数（默认5页，防止无限翻页）

    Returns:
        爬取日志（包含新条目数据）
    """
    start_time = time.time()
    log = CrawlLog(
        source_id=source.id,
        department_id=source.department_id,
        crawl_time=datetime.now(),
    )

    try:
        # 1. 请求第一页列表页（支持反爬降级）
        logger.info(f"爬取列表页: {source.source_url}")
        html, status_code = await http_client.fetch(source.source_url, return_status=True)

        # 检测反爬拦截（412/202 + JS挑战页面）
        is_anti_crawl = False
        if status_code in (412, 202) and html:
            # 检查是否是瑞数等反爬JS挑战页面
            if len(html) < 5000 and ("$_ts" in html or "_$jZ" in html or "window['$_ts']" in html):
                is_anti_crawl = True
                logger.info(f"检测到反爬拦截(瑞数): {source.source_url}")
                html = None  # 清空，触发Playwright降级

        # 如果 httpx 请求失败或被反爬拦截，尝试 Playwright 降级
        if not html:
            logger.info(f"httpx 请求失败，尝试 Playwright 降级: {source.source_url}")
            try:
                from src.crawler.detail_crawler import _fetch_with_playwright
                html = await _fetch_with_playwright(source.source_url)
            except Exception:
                pass

        if not html:
            log.error_message = "请求失败：无法获取页面内容"
            return log

        # 1.5 导航页预检：如果页面太小且没有日期模式，直接跳过
        if _is_navigation_page(html):
            log.error_message = "跳过：导航页/非列表页（页面过小或无通知列表结构）"
            log.total_items = 0
            return log

        # 2. 解析第一页通知条目（优先使用自动解析，失败后LLM兜底）
        items = await notice_list_parser.parse_with_llm_fallback(
            html,
            source.source_url,
            source.parser_config,
        )

        # 2.5 如果解析结果为空或全部被规则过滤，检测是否需要JS渲染
        need_pw_retry = False
        if not items:
            need_pw_retry = True
        elif items:
            # 快速预检：如果规则过滤后0条通过，可能是匹配了导航菜单
            pre_filtered = batch_filter(items, source_type=source.source_type)
            if not pre_filtered:
                need_pw_retry = True

        if need_pw_retry and _needs_js_rendering(html):
            logger.info(f"检测到JS动态加载页面，尝试 Playwright 渲染: {source.source_url}")
            try:
                from src.crawler.detail_crawler import _fetch_with_playwright
                pw_html = await _fetch_with_playwright(source.source_url, wait_time=5000)
                if pw_html and len(pw_html) > len(html):
                    logger.info(f"Playwright 渲染成功: {len(pw_html)} chars (原始 {len(html)} chars)")
                    html = pw_html
                    pw_items = await notice_list_parser.parse_with_llm_fallback(
                        html,
                        source.source_url,
                        source.parser_config,
                    )
                    if pw_items:
                        logger.info(f"Playwright 渲染后解析成功: {len(pw_items)} 条")
                        items = pw_items
            except Exception as e:
                logger.debug(f"Playwright 渲染失败: {e}")

        if not items:
            log.error_message = "解析失败：未提取到任何通知条目"
            return log

        # 3. 检测分页并爬取后续页面
        all_items = list(items)
        page_urls = notice_list_parser.detect_pagination(html, source.source_url)

        if page_urls:
            logger.info(f"检测到 {len(page_urls)} 个分页链接，开始翻页爬取（最多 {max_pages - 1} 页）")
            pages_crawled = 1  # 已爬取第一页

            for page_url in page_urls[:max_pages - 1]:
                pages_crawled += 1
                logger.debug(f"  爬取第 {pages_crawled} 页: {page_url}")

                page_html = await http_client.fetch(page_url)
                if not page_html:
                    logger.debug(f"  第 {pages_crawled} 页请求失败，停止翻页")
                    break

                page_items = notice_list_parser.parse(page_html, page_url, source.parser_config)
                if not page_items:
                    logger.debug(f"  第 {pages_crawled} 页解析为空，停止翻页")
                    break

                all_items.extend(page_items)
                logger.debug(f"  第 {pages_crawled} 页: {len(page_items)} 条")

            logger.info(f"翻页爬取完成: 共 {pages_crawled} 页, {len(all_items)} 条")

        # 4. 全局去重（按URL）
        seen_urls = set()
        unique_items = []
        for item in all_items:
            if item["url"] not in seen_urls:
                seen_urls.add(item["url"])
                unique_items.append(item)

        log.total_items = len(unique_items)

        # 5. 规则过滤 + 权重评分（传入信息源类型用于加权）
        scored_items = batch_filter(unique_items, source_type=source.source_type)

        # 6. URL 去重（排除已入库的）
        new_items = await _deduplicate(scored_items, session)
        log.new_items = len(new_items)

        # 7. 统计相关条目数
        log.relevant_items = len([i for i in new_items if i.get("relevance_score", 0) >= 0.5])

        # 8. 临时存储新条目数据，供调用方使用
        log._new_items_data = new_items

        # 9. 更新增量爬取状态
        await _update_crawl_state(source.id, unique_items, session)

        logger.info(
            f"列表页爬取完成: 总计 {log.total_items} 条, "
            f"过滤后 {len(scored_items)} 条, 新增 {log.new_items} 条, "
            f"高相关 {log.relevant_items} 条"
        )

    except Exception as e:
        log.error_message = f"爬取异常: {str(e)}"
        logger.error(f"爬取异常: {source.source_url} - {e}")

    finally:
        log.duration_seconds = time.time() - start_time

    return log


async def should_crawl(source_id: int, session: AsyncSession) -> bool:
    """
    判断信息源是否需要爬取（基于增量爬取状态）。

    规则：
    - 从未爬取过 → 需要爬取
    - 连续无更新 >= 5 次 → 降低频率（每3次才爬1次）
    - 连续无更新 >= 10 次 → 降低频率（每5次才爬1次）
    - 其他情况 → 需要爬取

    Args:
        source_id: 信息源 ID
        session: 数据库会话

    Returns:
        是否需要爬取
    """
    result = await session.execute(
        select(CrawlState).where(CrawlState.source_id == source_id)
    )
    state = result.scalar_one_or_none()

    if not state:
        return True  # 从未爬取过

    no_update = state.consecutive_no_update

    if no_update >= 10:
        # 连续10次无更新，每5次爬1次
        total_crawls = await _count_crawls(source_id, session)
        return total_crawls % 5 == 0
    elif no_update >= 5:
        # 连续5次无更新，每3次爬1次
        total_crawls = await _count_crawls(source_id, session)
        return total_crawls % 3 == 0

    return True


async def _count_crawls(source_id: int, session: AsyncSession) -> int:
    """统计信息源的总爬取次数"""
    from sqlalchemy import func
    result = await session.execute(
        select(func.count()).select_from(CrawlLog).where(CrawlLog.source_id == source_id)
    )
    return result.scalar() or 0


async def _deduplicate(
    items: list[dict],
    session: AsyncSession,
) -> list[dict]:
    """
    URL 去重：检查数据库中是否已存在。

    Args:
        items: 通知条目列表
        session: 数据库会话

    Returns:
        去重后的新条目列表
    """
    if not items:
        return []

    urls = [item["url"] for item in items]

    # 查询已存在的 URL
    result = await session.execute(
        select(AdmissionNotice.source_url).where(
            AdmissionNotice.source_url.in_(urls)
        )
    )
    existing_urls = {row[0] for row in result.fetchall()}

    new_items = [item for item in items if item["url"] not in existing_urls]

    if existing_urls:
        logger.debug(f"去重: {len(existing_urls)} 条已存在, {len(new_items)} 条新增")

    return new_items


async def _update_crawl_state(
    source_id: int,
    items: list[dict],
    session: AsyncSession,
):
    """
    更新增量爬取状态。

    Args:
        source_id: 信息源 ID
        items: 本次解析到的所有条目
        session: 数据库会话
    """
    result = await session.execute(
        select(CrawlState).where(CrawlState.source_id == source_id)
    )
    state = result.scalar_one_or_none()

    # 获取本次最新通知日期
    latest_date = None
    for item in items:
        if item.get("date"):
            try:
                from datetime import date as date_type
                d = datetime.strptime(item["date"][:10], "%Y-%m-%d").date()
                if latest_date is None or d > latest_date:
                    latest_date = d
            except (ValueError, TypeError):
                pass

    if state is None:
        # 首次爬取，创建状态
        state = CrawlState(
            source_id=source_id,
            last_crawl_time=datetime.now(),
            last_notice_date=latest_date,
            last_notice_count=len(items),
            consecutive_no_update=0,
        )
        session.add(state)
    else:
        # 更新状态
        old_date = state.last_notice_date
        old_count = state.last_notice_count

        state.last_crawl_time = datetime.now()
        state.last_notice_count = len(items)

        if latest_date:
            if old_date is None or latest_date > old_date:
                # 有新内容
                state.last_notice_date = latest_date
                state.consecutive_no_update = 0
            elif latest_date == old_date and len(items) == old_count:
                # 无更新
                state.consecutive_no_update += 1
            else:
                state.consecutive_no_update = 0
        else:
            # 无法判断，保守处理
            state.consecutive_no_update += 1


def _is_navigation_page(html: str) -> bool:
    """
    快速预检：判断页面是否是导航页/非通知列表页。

    导航页特征：
    1. HTML很小（<2KB）且没有日期模式 → JS动态加载的导航页
    2. HTML较小（<5KB）且a标签很少且没有日期 → 静态导航页
    3. 中等页面但没有日期且没有列表结构 → 学院介绍/导航页
    4. 页面标题包含非信息发布页关键词 → 静态展示页

    注意：有些列表页的日期格式非标准（如分离式 2023-12 + 05），
    或者有明确的列表结构class，这些不应被误判为导航页。

    Args:
        html: 页面HTML内容

    Returns:
        True 表示是导航页，应该跳过
    """
    html_size = len(html)
    has_date = bool(_DATE_RE.search(html))
    has_loose_date = bool(_DATE_LOOSE_RE.search(html))
    has_list_structure = bool(_LIST_STRUCTURE_RE.search(html))

    # 如果有明确的列表结构class，不判定为导航页（让解析器去处理）
    if has_list_structure:
        return False

    # 如果有宽松日期匹配（如 2023-12），也不判定为导航页
    if has_loose_date:
        return False

    # 规则1：极小页面（<2KB）且无任何日期 → 几乎肯定是导航页或空页面
    if html_size < 2000 and not has_date:
        return True

    # 规则2：小页面（<5KB）且无日期且链接少 → 大概率是导航页
    if html_size < 5000 and not has_date:
        a_count = html.count("<a ")
        if a_count < 10:
            return True

    # 规则3：中等页面（<15KB）且无日期 → 可能是学院介绍/导航页
    if html_size < 15000 and not has_date:
        return True

    # 规则4：页面有日期但日期数量极少（<3个）且链接密度高 → 可能是首页/导航页
    # 首页通常有少量日期（如版权年份）但大量导航链接
    if has_date and html_size > 15000:
        date_count = len(_DATE_RE.findall(html))
        a_count = html.count("<a ")
        # 日期少于3个但链接超过50个 → 首页/导航页
        if date_count < 3 and a_count > 50:
            return True

    return False


def _needs_js_rendering(html: str) -> bool:
    """
    检测页面是否需要JS渲染才能获取通知列表。

    特征：
    1. 页面有空的列表容器（<ol>、<ul>、<div>等有class但无内容）
    2. 页面有JS框架标记（Vue、React、Angular等）
    3. 页面有分页组件但列表为空

    Args:
        html: 页面HTML内容

    Returns:
        True 表示需要JS渲染
    """
    from bs4 import BeautifulSoup

    # 快速检查：页面太小不需要JS渲染
    if len(html) < 5000:
        return False

    soup = BeautifulSoup(html, "lxml")

    # 检查1：是否有空的列表容器（ol/ul有class但无li子元素）
    for tag_name in ("ol", "ul"):
        for el in soup.find_all(tag_name):
            cls = el.get("class", [])
            if cls:  # 有class说明是有意义的容器
                lis = el.find_all("li", recursive=False)
                if len(lis) == 0:
                    # 空容器 + 有分页组件 = 大概率是JS动态加载
                    pagination = soup.select_one(
                        ".pagination, .page, .pager, .pagination-nav, .wp_paging"
                    )
                    if pagination:
                        return True

    # 检查2：是否有Vue/React/Angular等SPA框架标记
    body = soup.find("body")
    if body:
        body_attrs = " ".join(f"{k}={v}" for k, v in body.attrs.items() if isinstance(v, str))
        if any(marker in body_attrs for marker in ("ng-app", "data-reactroot")):
            return True

    # 检查3：是否有id="app"或id="root"的空容器
    for container_id in ("app", "root", "__nuxt", "__next"):
        el = soup.find(id=container_id)
        if el and len(el.get_text(strip=True)) < 100:
            return True

    return False
