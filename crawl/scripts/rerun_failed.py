"""重跑失败源脚本 - 清理无效源 + 重跑失败的列表页 + 重跑正文提取失败的详情页

用法：
    # 完整重跑（清理 + 重跑列表 + 重跑详情）
    python scripts/rerun_failed.py --db data/large_scale_test.db

    # 只清理无效源
    python scripts/rerun_failed.py --db data/large_scale_test.db --clean-only

    # 只重跑列表页失败的源
    python scripts/rerun_failed.py --db data/large_scale_test.db --list-only

    # 只重跑正文提取失败的详情页
    python scripts/rerun_failed.py --db data/large_scale_test.db --detail-only
"""

from __future__ import annotations

import argparse
import asyncio
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from loguru import logger


# 无效源URL模式（应该被清理的）
INVALID_URL_PATTERNS = [
    r"\.pdf$",                          # PDF文件
    r"/main\.htm$",                     # 首页
    r"^https?://[^/]+/?$",             # 域名根路径
    r"/index\.htm$",                    # 首页
    r"career\.buaa\.edu\.cn",           # 就业网（非招生）
    r"news\.seu\.edu\.cn/?$",           # 新闻网首页
    r"recruit\.html$",                  # 招生首页
    r"education\.html$",               # 教育首页
    r"index_new\.html$",               # 首页变体
    r"bmsgrade\.sdu\.edu\.cn/?$",      # 基础医学院首页
    r"gr\.uestc\.edu\.cn/?$",          # 研究生院首页
    r"yz\.neu\.edu\.cn",               # 研究生院首页
    r"_upload/article/files.*\.pdf",   # 上传的PDF文件
]


async def clean_invalid_sources(db_path: str) -> int:
    """清理无效源（PDF、导航页、首页等）"""
    import sqlite3
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 获取所有失败的源
    failed_sources = cursor.execute("""
        SELECT ds.id, ds.source_url, u.name, d.name
        FROM crawl_logs cl
        JOIN department_sources ds ON cl.source_id = ds.id
        JOIN departments d ON ds.department_id = d.id
        JOIN universities u ON d.university_id = u.id
        WHERE cl.error_message IS NOT NULL
    """).fetchall()
    
    cleaned = 0
    for sid, url, uni, dept in failed_sources:
        for pattern in INVALID_URL_PATTERNS:
            if re.search(pattern, url, re.I):
                logger.info(f"清理无效源: [{sid}] {uni}/{dept} | {url}")
                cursor.execute("UPDATE department_sources SET is_active = 0 WHERE id = ?", (sid,))
                # 同时删除对应的爬取日志，这样重跑时不会再处理
                cursor.execute("DELETE FROM crawl_logs WHERE source_id = ?", (sid,))
                cleaned += 1
                break
    
    conn.commit()
    conn.close()
    logger.info(f"清理了 {cleaned} 个无效源")
    return cleaned


async def rerun_failed_lists(db_path: str, max_pages: int = 3):
    """重跑所有列表页解析失败的源"""
    from src.config import settings
    settings.DATABASE_URL = f"sqlite+aiosqlite:///{db_path}"
    settings.ensure_dirs()

    import src.storage.database as db_module
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
    from sqlalchemy import text

    db_module.engine = create_async_engine(settings.DATABASE_URL, echo=False, pool_pre_ping=True)
    db_module.async_session = async_sessionmaker(db_module.engine, class_=AsyncSession, expire_on_commit=False)
    await db_module.init_db()

    from src.processor.notice_processor import NoticeProcessor
    from src.utils.http_client import http_client

    try:
        async with db_module.async_session() as session:
            # 获取所有失败的源ID
            result = await session.execute(text("""
                SELECT cl.source_id
                FROM crawl_logs cl
                JOIN department_sources ds ON cl.source_id = ds.id
                WHERE cl.error_message IS NOT NULL
                AND ds.is_active = 1
            """))
            failed_ids = [row[0] for row in result.fetchall()]
            
            if not failed_ids:
                logger.info("没有需要重跑的失败源")
                return
            
            logger.info(f"需要重跑 {len(failed_ids)} 个失败源")
            
            # 删除旧的失败日志
            for sid in failed_ids:
                await session.execute(text("DELETE FROM crawl_logs WHERE source_id = :sid"), {"sid": sid})
            # 重置 crawl_states
            for sid in failed_ids:
                await session.execute(text("DELETE FROM crawl_states WHERE source_id = :sid"), {"sid": sid})
            await session.commit()
            
            # 重跑
            processor = NoticeProcessor(session)
            processor._max_pages = max_pages
            
            from src.models.university import University, Department, DepartmentSource
            from sqlalchemy import select
            
            for i, sid in enumerate(failed_ids):
                result = await session.execute(
                    select(DepartmentSource, Department, University)
                    .join(Department, DepartmentSource.department_id == Department.id)
                    .join(University, Department.university_id == University.id)
                    .where(DepartmentSource.id == sid)
                )
                row = result.first()
                if not row:
                    continue
                
                source, dept, university = row
                context = f"{university.name} - {dept.name}"
                logger.info(f"[{i+1}/{len(failed_ids)}] 重跑: {context} | {source.source_url}")
                
                await processor._process_source(source, dept, university)
                await asyncio.sleep(1.0)
            
            processor._print_stats()
    finally:
        await http_client.close()
        await db_module.engine.dispose()


async def rerun_failed_details(db_path: str):
    """重跑所有正文提取失败的详情页
    
    从日志中找到所有"正文提取失败"的URL，重新爬取并提取正文。
    """
    from src.config import settings
    settings.DATABASE_URL = f"sqlite+aiosqlite:///{db_path}"
    settings.ensure_dirs()

    import src.storage.database as db_module
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
    from sqlalchemy import text

    db_module.engine = create_async_engine(settings.DATABASE_URL, echo=False, pool_pre_ping=True)
    db_module.async_session = async_sessionmaker(db_module.engine, class_=AsyncSession, expire_on_commit=False)
    await db_module.init_db()

    from src.crawler.detail_crawler import process_notice
    from src.utils.http_client import http_client

    # 从日志文件中提取正文提取失败的URL
    log_dir = Path(db_path).parent / "logs"
    failed_urls = set()
    
    for log_file in log_dir.glob("large_scale_*.log"):
        with open(log_file, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                if "正文提取失败" in line:
                    # 提取URL
                    url_match = re.search(r"(https?://\S+)", line)
                    if url_match:
                        failed_urls.add(url_match.group(1))
    
    logger.info(f"找到 {len(failed_urls)} 个正文提取失败的URL")
    
    if not failed_urls:
        return
    
    try:
        async with db_module.async_session() as session:
            # 查找这些URL对应的已入库通知（如果有的话跳过）
            result = await session.execute(text(
                "SELECT source_url FROM admission_notices"
            ))
            existing_urls = {row[0] for row in result.fetchall()}
            
            # 过滤掉已入库的
            urls_to_retry = failed_urls - existing_urls
            logger.info(f"排除已入库后，需要重试 {len(urls_to_retry)} 个URL")
            
            # 为每个URL构建item并重新处理
            # 需要从crawl_logs中找到对应的source_id和university_id
            success_count = 0
            fail_count = 0
            
            for i, url in enumerate(urls_to_retry):
                if i % 50 == 0:
                    logger.info(f"进度: {i}/{len(urls_to_retry)}, 成功: {success_count}, 失败: {fail_count}")
                
                # 查找对应的source信息
                result = await session.execute(text("""
                    SELECT ds.id, ds.department_id, d.university_id
                    FROM department_sources ds
                    JOIN departments d ON ds.department_id = d.id
                    WHERE :url LIKE '%' || replace(replace(ds.source_url, 'http://', ''), 'https://', '') || '%'
                    OR ds.source_url LIKE '%' || :domain || '%'
                    LIMIT 1
                """), {"url": url, "domain": urlparse(url).netloc})
                row = result.first()
                
                if not row:
                    # 尝试通过域名匹配
                    domain = urlparse(url).netloc
                    result = await session.execute(text("""
                        SELECT ds.id, ds.department_id, d.university_id
                        FROM department_sources ds
                        JOIN departments d ON ds.department_id = d.id
                        WHERE ds.source_url LIKE :pattern
                        LIMIT 1
                    """), {"pattern": f"%{domain}%"})
                    row = result.first()
                
                if not row:
                    fail_count += 1
                    continue
                
                source_id, department_id, university_id = row
                
                item = {
                    "title": "",  # 将从页面中提取
                    "url": url,
                    "date": None,
                    "relevance_score": 0.6,  # 之前已经通过了相关性过滤
                }
                
                try:
                    notice = await process_notice(
                        item, session,
                        university_id=university_id,
                        department_id=department_id,
                        source_id=source_id,
                    )
                    if notice:
                        success_count += 1
                    else:
                        fail_count += 1
                except Exception as e:
                    fail_count += 1
                
                # 每10条提交一次
                if (i + 1) % 10 == 0:
                    await session.commit()
                
                await asyncio.sleep(0.5)
            
            await session.commit()
            logger.info(f"详情页重跑完成: 成功 {success_count}, 失败 {fail_count}")
    
    finally:
        await http_client.close()
        await db_module.engine.dispose()


async def print_report(db_path: str):
    """打印当前状态报告"""
    import sqlite3
    conn = sqlite3.connect(db_path)
    
    total = conn.execute("SELECT COUNT(*) FROM department_sources WHERE is_active=1").fetchone()[0]
    crawled = conn.execute("SELECT COUNT(*) FROM crawl_logs").fetchone()[0]
    success = conn.execute("SELECT COUNT(*) FROM crawl_logs WHERE error_message IS NULL").fetchone()[0]
    failed = conn.execute("SELECT COUNT(*) FROM crawl_logs WHERE error_message IS NOT NULL").fetchone()[0]
    notices = conn.execute("SELECT COUNT(*) FROM admission_notices").fetchone()[0]
    
    # 按类型统计
    by_type = conn.execute("""
        SELECT ds.source_type,
            SUM(CASE WHEN cl.error_message IS NULL THEN 1 ELSE 0 END) as ok,
            SUM(CASE WHEN cl.error_message IS NOT NULL THEN 1 ELSE 0 END) as fail,
            COUNT(*) as total
        FROM crawl_logs cl
        JOIN department_sources ds ON cl.source_id=ds.id
        GROUP BY ds.source_type
    """).fetchall()
    
    # 覆盖高校
    covered = conn.execute("""
        SELECT COUNT(DISTINCT d.university_id)
        FROM admission_notices an
        JOIN departments d ON an.department_id=d.id
    """).fetchone()[0]
    total_unis = conn.execute("SELECT COUNT(*) FROM universities").fetchone()[0]
    
    conn.close()
    
    rate = success / max(crawled, 1) * 100
    
    print(f"\n{'='*60}")
    print(f"  📊 当前状态报告")
    print(f"{'='*60}")
    print(f"  活跃源: {total} | 已爬取: {crawled}")
    print(f"  成功: {success} | 失败: {failed} | 成功率: {rate:.1f}%")
    print(f"  通知入库: {notices}")
    print(f"  覆盖高校: {covered}/{total_unis}")
    print(f"\n  按类型:")
    for stype, ok, fail, tot in by_type:
        r = ok / max(tot, 1) * 100
        print(f"    [{stype}] {ok}/{tot} ({r:.1f}%)")
    print(f"{'='*60}\n")


async def main():
    parser = argparse.ArgumentParser(description="重跑失败源")
    parser.add_argument("--db", type=str, default="data/large_scale_test.db", help="数据库路径")
    parser.add_argument("--clean-only", action="store_true", help="只清理无效源")
    parser.add_argument("--list-only", action="store_true", help="只重跑列表页失败的源")
    parser.add_argument("--detail-only", action="store_true", help="只重跑正文提取失败的详情页")
    parser.add_argument("--max-pages", type=int, default=3, help="最大翻页数")
    args = parser.parse_args()

    db_path = str(Path(args.db).resolve())

    # 配置日志
    logger.remove()
    log_path = Path(db_path).parent / "logs" / f"rerun_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
    log_path.parent.mkdir(parents=True, exist_ok=True)
    logger.add(sys.stderr, level="INFO", format="{time:HH:mm:ss} | {level: <5} | {message}")
    logger.add(str(log_path), level="DEBUG", format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {message}")

    logger.info(f"日志文件: {log_path}")
    
    # 打印当前状态
    await print_report(db_path)
    
    t0 = time.time()
    
    if args.clean_only:
        await clean_invalid_sources(db_path)
    elif args.list_only:
        await rerun_failed_lists(db_path, args.max_pages)
    elif args.detail_only:
        await rerun_failed_details(db_path)
    else:
        # 完整流程
        logger.info("=" * 60)
        logger.info("  步骤1: 清理无效源")
        logger.info("=" * 60)
        await clean_invalid_sources(db_path)
        
        logger.info("=" * 60)
        logger.info("  步骤2: 重跑列表页失败的源")
        logger.info("=" * 60)
        await rerun_failed_lists(db_path, args.max_pages)
        
        logger.info("=" * 60)
        logger.info("  步骤3: 重跑正文提取失败的详情页")
        logger.info("=" * 60)
        await rerun_failed_details(db_path)
    
    t1 = time.time()
    logger.info(f"总耗时: {t1 - t0:.0f}s")
    
    # 打印最终状态
    await print_report(db_path)


if __name__ == "__main__":
    asyncio.run(main())
