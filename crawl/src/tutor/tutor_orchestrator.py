"""
导师爬取编排器 — 阶段 B1

对一个 `FacultyPageSource`：
  1. 获取 HTML（含反爬降级）
  2. 调用 `parse_faculty_list` 解析
  3. 如果解析为 0，尝试"类别中转页"子链回退
  4. 检测分页、循环抓取更多页
  5. 全局去重 → 转为 Tier 2 `Tutor` 条目
"""

from __future__ import annotations

import asyncio
import re
from typing import Optional
from urllib.parse import urlparse

from bs4 import BeautifulSoup
from loguru import logger

from src.utils.http_client import http_client
from src.utils.url_utils import normalize_url, is_valid_url
from src.discovery.anti_crawl_fallback import detect_anti_crawl
from src.tutor.faculty_list_parser import parse_faculty_list


# ============================================================
# 类别中转页识别
# ============================================================

# 中转页的子链接文本特征（南开、北理工等）
_CATEGORY_LINK_KEYWORDS = [
    "教授", "副教授", "讲师", "助理教授",
    "研究员", "副研究员", "助理研究员",
    "博士生导师", "硕士生导师",
    "院士", "长江学者", "杰青", "青年千人",
    "在职教师", "离退休", "兼职教师",
]


def _is_category_index(html: str, teachers_found: int) -> bool:
    """判断当前页是否是"师资类别中转页"（无具体教师，只是分类入口）"""
    if teachers_found > 0:
        return False
    if not html or len(html) < 500:
        return False
    soup = BeautifulSoup(html, "lxml")
    # 统计带职称关键词的链接
    category_links = 0
    for a in soup.find_all("a", href=True):
        t = a.get_text(strip=True)
        if not t or len(t) > 15:
            continue
        for kw in _CATEGORY_LINK_KEYWORDS:
            if kw in t:
                category_links += 1
                break
    return category_links >= 3


def _extract_category_links(html: str, base_url: str) -> list[str]:
    """从类别中转页抽取子分类链接"""
    soup = BeautifulSoup(html, "lxml")
    seen: set[str] = set()
    result: list[str] = []
    for a in soup.find_all("a", href=True):
        t = a.get_text(strip=True)
        if not t or len(t) > 15:
            continue
        is_category = any(kw in t for kw in _CATEGORY_LINK_KEYWORDS)
        if not is_category:
            continue
        href = re.sub(r"\s+", "", a.get("href") or "")
        if not href or href.startswith(("javascript:", "mailto:", "tel:", "#")):
            continue
        full = normalize_url(href, base_url)
        if not is_valid_url(full) or full == base_url:
            continue
        # 同域限定
        if urlparse(full).netloc != urlparse(base_url).netloc:
            continue
        if full not in seen:
            seen.add(full)
            result.append(full)
    return result[:8]  # 最多 8 个子分类


# ============================================================
# 分页检测（复用 list_parser）
# ============================================================

def _detect_pagination(html: str, current_url: str, max_pages: int = 5) -> list[str]:
    """检测分页 URL，复用现有 NoticeListParser.detect_pagination"""
    try:
        from src.parser.list_parser import NoticeListParser
        parser = NoticeListParser()
        urls = parser.detect_pagination(html, current_url)
        return urls[:max_pages - 1]  # 不含当前页
    except Exception as e:
        logger.debug(f"分页检测失败: {e}")
        return []


# ============================================================
# 反爬感知的 HTML 获取
# ============================================================

async def _fetch_with_fallback(url: str) -> str | None:
    """httpx → Playwright 降级"""
    html = await http_client.fetch(url, retry=1)
    if html and not detect_anti_crawl(html):
        return html
    # Playwright 降级
    try:
        from playwright.async_api import async_playwright
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            try:
                await page.goto(url, timeout=20000, wait_until="domcontentloaded")
                await page.wait_for_timeout(2500)
                html = await page.content()
                return html if not detect_anti_crawl(html) else None
            finally:
                await browser.close()
    except Exception as e:
        logger.debug(f"Playwright 降级失败: {url} - {e}")
        return None


# ============================================================
# 主入口：抓取一个师资源的全部教师
# ============================================================

async def crawl_faculty_source(
    source_url: str,
    *,
    max_pages: int = 5,
    follow_category_sublinks: bool = True,
) -> dict:
    """抓取并解析一个师资页，返回 {entries, pages_fetched, stats}"""

    all_entries: list[dict] = []
    pages_fetched = 0
    sub_pages_fetched = 0

    # Step 1: 主页抓取 + 解析
    html = await _fetch_with_fallback(source_url)
    if not html:
        return {
            "entries": [],
            "pages_fetched": 0,
            "status": "fetch_failed",
            "stats": {"via_subpages": 0},
        }

    pages_fetched += 1
    entries = parse_faculty_list(html, source_url)
    all_entries.extend(entries)

    # Step 2: 翻页抓取
    if entries:
        page_urls = _detect_pagination(html, source_url, max_pages=max_pages)
        for i, p_url in enumerate(page_urls):
            if pages_fetched >= max_pages:
                break
            p_html = await _fetch_with_fallback(p_url)
            pages_fetched += 1
            if not p_html:
                continue
            p_entries = parse_faculty_list(p_html, p_url)
            all_entries.extend(p_entries)
            if not p_entries:
                # 连续一页无内容，停止翻页
                break

    # Step 3: 0 条 → 尝试类别中转页回退
    if not all_entries and follow_category_sublinks and _is_category_index(html, 0):
        sub_urls = _extract_category_links(html, source_url)
        logger.info(f"检测到类别中转页，尝试 {len(sub_urls)} 个子分类 | {source_url}")
        for sub_url in sub_urls:
            sub_html = await _fetch_with_fallback(sub_url)
            sub_pages_fetched += 1
            if not sub_html:
                continue
            sub_entries = parse_faculty_list(sub_html, sub_url)
            # 给每个条目打上子分类标记（便于溯源）
            for e in sub_entries:
                e["sub_source_url"] = sub_url
            all_entries.extend(sub_entries)
            # 子分类也可能有翻页
            if sub_entries:
                sub_page_urls = _detect_pagination(sub_html, sub_url, max_pages=3)
                for sp_url in sub_page_urls[:2]:  # 每个子分类最多 2 页
                    sp_html = await _fetch_with_fallback(sp_url)
                    sub_pages_fetched += 1
                    if sp_html:
                        sp_entries = parse_faculty_list(sp_html, sp_url)
                        for e in sp_entries:
                            e["sub_source_url"] = sub_url
                        all_entries.extend(sp_entries)

    # Step 4: 全局去重（按 name + homepage_url）
    dedup: dict[tuple, dict] = {}
    for e in all_entries:
        key = (e["name"], e.get("homepage_url") or "")
        if key not in dedup:
            dedup[key] = e
        else:
            # 合并空缺字段
            existing = dedup[key]
            for field in ("title", "email", "photo_url"):
                if not existing.get(field) and e.get(field):
                    existing[field] = e[field]
            if not existing.get("research_areas") and e.get("research_areas"):
                existing["research_areas"] = e["research_areas"]

    final = list(dedup.values())
    return {
        "entries": final,
        "pages_fetched": pages_fetched + sub_pages_fetched,
        "status": "ok" if final else "empty",
        "stats": {
            "main_pages": pages_fetched,
            "sub_pages": sub_pages_fetched,
            "raw_count": len(all_entries),
            "dedup_count": len(final),
        },
    }
