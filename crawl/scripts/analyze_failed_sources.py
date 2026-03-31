"""
分析失败信息源并给出修复建议。

用法：
    python scripts/analyze_failed_sources.py --db data/test_phase2_locate.db
    python scripts/analyze_failed_sources.py --db data/test_phase2_locate.db --fix
"""

from __future__ import annotations

import asyncio
import sys
import re
from pathlib import Path
from urllib.parse import urlparse, urljoin

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from loguru import logger
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select, delete, text

from src.models.base import Base
from src.models.notice import CrawlLog
from src.models.university import University, Department, DepartmentSource
from src.utils.http_client import http_client


# ============================================================
# 失败原因分类
# ============================================================

class FailureCategory:
    JS_DYNAMIC = "JS动态加载页"       # 页面内容由JS动态渲染，静态HTML几乎为空
    NAVIGATION = "导航/索引页"         # 不是通知列表页，而是导航页
    SPA = "SPA单页应用"               # React/Vue等SPA应用
    EMPTY = "空页面/请求失败"          # 页面为空或请求失败
    NO_LIST = "无通知列表结构"         # 页面有内容但不是通知列表
    ANTI_CRAWL = "反爬拦截"           # 被反爬系统拦截
    WRONG_TYPE = "页面类型错误"        # URL指向的不是通知列表（如本科招生、课程介绍等）


async def analyze_page(url: str) -> dict:
    """分析单个URL的页面结构"""
    result = {
        "url": url,
        "status": "unknown",
        "html_size": 0,
        "a_count": 0,
        "li_count": 0,
        "has_date": False,
        "has_list_structure": False,
        "is_js_dynamic": False,
        "is_spa": False,
        "category": None,
        "suggestion": None,
        "text_preview": "",
    }

    try:
        html = await http_client.fetch(url)
        if not html:
            result["status"] = "fetch_failed"
            result["category"] = FailureCategory.EMPTY
            result["suggestion"] = "删除（无法访问）"
            return result

        result["html_size"] = len(html)
        result["a_count"] = html.count("<a ")
        result["li_count"] = html.count("<li")
        result["has_date"] = bool(re.search(r"\d{4}[-./年]\d{1,2}[-./月]\d{1,2}", html))

        # 检查是否是JS动态加载
        js_markers = ["_jsq_", "document.write", "$.ajax", "XMLHttpRequest", "fetch("]
        result["is_js_dynamic"] = any(m in html for m in js_markers) and result["a_count"] < 5

        # 检查是否是SPA
        spa_markers = ['<div id="app"', '<div id="root"', "window.__NUXT__", "window.__NEXT_DATA__"]
        result["is_spa"] = any(m in html for m in spa_markers)

        # 检查是否有列表结构
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "lxml")

        # 提取文本预览
        text = soup.get_text(strip=True)
        result["text_preview"] = text[:300]

        # 检查列表结构
        list_containers = soup.select("ul.news_list, ul.list_item, .list ul, .news-list, table.list")
        result["has_list_structure"] = len(list_containers) > 0

        # 分类失败原因
        if result["html_size"] < 500:
            result["category"] = FailureCategory.EMPTY
            result["suggestion"] = "删除（页面内容极少）"
        elif result["is_js_dynamic"] and result["a_count"] < 3:
            result["category"] = FailureCategory.JS_DYNAMIC
            result["suggestion"] = "需要Playwright渲染或替换URL"
        elif result["is_spa"]:
            result["category"] = FailureCategory.SPA
            result["suggestion"] = "需要Playwright渲染或替换URL"
        elif result["html_size"] < 3000 and result["a_count"] < 5:
            result["category"] = FailureCategory.NAVIGATION
            result["suggestion"] = "删除（导航页，非通知列表）"
        elif not result["has_date"] and result["a_count"] < 10:
            result["category"] = FailureCategory.NO_LIST
            result["suggestion"] = "删除或替换URL"
        elif result["a_count"] >= 10 and result["has_date"]:
            result["category"] = FailureCategory.NO_LIST
            result["suggestion"] = "解析器需要优化（页面有列表结构但未识别）"
        else:
            result["category"] = FailureCategory.NO_LIST
            result["suggestion"] = "需要进一步分析"

        result["status"] = "ok"

    except Exception as e:
        result["status"] = f"error: {e}"
        result["category"] = FailureCategory.EMPTY
        result["suggestion"] = f"删除（异常: {e}）"

    return result


async def run_analysis(db_path: str, do_fix: bool = False):
    """分析所有失败的信息源"""
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}", echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        # 查询所有失败的信息源
        result = await session.execute(text("""
            SELECT ds.id, ds.source_url, ds.source_type, 
                   d.name as dept_name, u.name as uni_name,
                   cl.error_message
            FROM crawl_logs cl
            JOIN department_sources ds ON cl.source_id = ds.id
            JOIN departments d ON ds.department_id = d.id
            JOIN universities u ON d.university_id = u.id
            WHERE cl.error_message IS NOT NULL
            ORDER BY u.name, d.name
        """))
        failed_sources = result.fetchall()

    logger.info(f"{'='*70}")
    logger.info(f"📋 失败信息源分析报告 ({len(failed_sources)} 个)")
    logger.info(f"{'='*70}")

    categories = {}
    to_delete = []
    to_investigate = []

    for row in failed_sources:
        source_id, source_url, source_type, dept_name, uni_name, error_msg = row
        logger.info(f"\n🔍 [{source_type}] {uni_name} / {dept_name}")
        logger.info(f"   URL: {source_url}")

        analysis = await analyze_page(source_url)

        cat = analysis["category"]
        categories[cat] = categories.get(cat, 0) + 1

        logger.info(f"   状态: {analysis['status']}, HTML大小: {analysis['html_size']}")
        logger.info(f"   a标签: {analysis['a_count']}, li标签: {analysis['li_count']}, 有日期: {analysis['has_date']}")
        logger.info(f"   分类: {cat}")
        logger.info(f"   建议: {analysis['suggestion']}")
        if analysis["text_preview"]:
            logger.info(f"   预览: {analysis['text_preview'][:150]}")

        if "删除" in (analysis["suggestion"] or ""):
            to_delete.append((source_id, uni_name, dept_name, source_type, source_url, cat))
        elif "解析器" in (analysis["suggestion"] or ""):
            to_investigate.append((source_id, uni_name, dept_name, source_type, source_url, cat, analysis))
        else:
            to_investigate.append((source_id, uni_name, dept_name, source_type, source_url, cat, analysis))

    await http_client.close()

    # 汇总报告
    logger.info(f"\n{'='*70}")
    logger.info(f"📊 分析汇总")
    logger.info(f"{'='*70}")
    for cat, count in sorted(categories.items(), key=lambda x: -x[1]):
        logger.info(f"  {cat}: {count} 个")
    logger.info(f"\n  建议删除: {len(to_delete)} 个")
    logger.info(f"  需要进一步处理: {len(to_investigate)} 个")

    if to_delete:
        logger.info(f"\n{'─'*50}")
        logger.info(f"🗑️  建议删除的信息源:")
        logger.info(f"{'─'*50}")
        for sid, uni, dept, stype, url, cat in to_delete:
            logger.info(f"  [{stype}] {uni}/{dept}: {url} ({cat})")

    if to_investigate:
        logger.info(f"\n{'─'*50}")
        logger.info(f"🔧 需要进一步处理的信息源:")
        logger.info(f"{'─'*50}")
        for item in to_investigate:
            sid, uni, dept, stype, url, cat = item[:6]
            logger.info(f"  [{stype}] {uni}/{dept}: {url} ({cat})")

    # 执行修复
    if do_fix and to_delete:
        logger.info(f"\n{'='*70}")
        logger.info(f"🔧 执行修复: 删除 {len(to_delete)} 个无效信息源")
        logger.info(f"{'='*70}")

        async with session_factory() as session:
            for sid, uni, dept, stype, url, cat in to_delete:
                # 删除信息源
                await session.execute(
                    delete(DepartmentSource).where(DepartmentSource.id == sid)
                )
                # 同时删除对应的爬取日志
                await session.execute(
                    delete(CrawlLog).where(CrawlLog.source_id == sid)
                )
                logger.info(f"  🗑️  已删除: [{stype}] {uni}/{dept}: {url}")
            await session.commit()

        logger.info(f"\n✅ 已删除 {len(to_delete)} 个无效信息源")

        # 计算新的成功率
        async with session_factory() as session:
            result = await session.execute(text("""
                SELECT COUNT(*) as total,
                    SUM(CASE WHEN cl.error_message IS NULL THEN 1 ELSE 0 END) as success,
                    SUM(CASE WHEN cl.error_message IS NOT NULL THEN 1 ELSE 0 END) as failed
                FROM crawl_logs cl
            """))
            row = result.fetchone()
            if row:
                total, success, failed = row
                logger.info(f"\n📊 修复后成功率: {success}/{total} = {success/max(total,1)*100:.1f}%")

    await engine.dispose()


async def main():
    import argparse
    parser = argparse.ArgumentParser(description="分析失败信息源")
    parser.add_argument("--db", required=True, help="数据库路径")
    parser.add_argument("--fix", action="store_true", help="执行修复（删除无效信息源）")
    args = parser.parse_args()

    db_path = str(Path(args.db).resolve())

    logger.remove()
    logger.add(sys.stderr, level="INFO", format="{time:HH:mm:ss} | {level: <5} | {message}")

    await run_analysis(db_path, do_fix=args.fix)


if __name__ == "__main__":
    asyncio.run(main())
