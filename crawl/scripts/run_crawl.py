"""运行爬取流程 - 阶段三

用法：
    # 爬取所有活跃信息源
    python scripts/run_crawl.py

    # 只爬取指定高校
    python scripts/run_crawl.py --university "中国海洋大学"

    # 只爬取指定学院
    python scripts/run_crawl.py --university "中国海洋大学" --department "化学化工学院"

    # 限制最大信息源数（用于测试）
    python scripts/run_crawl.py --max-sources 5

    # 使用指定数据库
    python scripts/run_crawl.py --db data/test_phase2_locate.db

    # 处理单个信息源（按 ID）
    python scripts/run_crawl.py --source-id 42

    # 指定最大翻页数
    python scripts/run_crawl.py --max-pages 10

    # 只爬取招生类型信息源
    python scripts/run_crawl.py --source-type 招生
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys

from loguru import logger

# 确保项目根目录在 sys.path 中
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


async def run_crawl(
    university: str | None = None,
    department: str | None = None,
    max_sources: int | None = None,
    db_path: str | None = None,
    source_id: int | None = None,
    max_pages: int = 5,
    source_type: str | None = None,
):
    """
    阶段三：爬取推免信息。

    Args:
        university: 限定高校名称（可选）
        department: 限定学院名称（可选）
        max_sources: 最大处理信息源数（可选）
        db_path: 数据库路径（可选，默认使用配置中的路径）
        source_id: 单个信息源 ID（可选，用于调试）
        max_pages: 每个信息源最大翻页数（默认5）
        source_type: 限定信息源类型（招生/通知/新闻，可选）
    """
    from src.config import settings

    # 如果指定了数据库路径，覆盖配置
    if db_path:
        settings.DATABASE_URL = f"sqlite+aiosqlite:///{db_path}"

    settings.ensure_dirs()

    import src.storage.database as db_module
    from src.processor.notice_processor import NoticeProcessor
    from src.utils.http_client import http_client

    # 如果覆盖了数据库路径，需要重新创建引擎
    if db_path:
        from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
        db_module.engine = create_async_engine(settings.DATABASE_URL, echo=False, pool_pre_ping=True)
        db_module.async_session = async_sessionmaker(db_module.engine, class_=AsyncSession, expire_on_commit=False)

    await db_module.init_db()

    logger.info("=" * 60)
    logger.info("  阶段三：爬取推免信息")
    logger.info("=" * 60)
    if source_id:
        logger.info(f"  指定信息源 ID: {source_id}")
    if university:
        logger.info(f"  限定高校: {university}")
    if department:
        logger.info(f"  限定学院: {department}")
    if max_sources:
        logger.info(f"  最大信息源数: {max_sources}")
    logger.info(f"  最大翻页数: {max_pages}")
    if source_type:
        logger.info(f"  信息源类型: {source_type}")
    logger.info(f"  数据库: {settings.DATABASE_URL}")
    logger.info("=" * 60)

    try:
        async with db_module.async_session() as session:
            processor = NoticeProcessor(session)

            if source_id:
                # 处理单个信息源
                await processor.process_single(source_id)
            else:
                # 处理所有活跃信息源
                await processor.process_all(
                    university_name=university,
                    department_name=department,
                    max_sources=max_sources,
                    max_pages=max_pages,
                    source_type=source_type,
                )
    finally:
        await http_client.close()
        await db_module.engine.dispose()


def main():
    """命令行入口"""
    parser = argparse.ArgumentParser(description="阶段三：爬取推免信息")
    parser.add_argument("--university", "-u", type=str, help="限定高校名称")
    parser.add_argument("--department", "-d", type=str, help="限定学院名称")
    parser.add_argument("--max-sources", "-m", type=int, help="最大处理信息源数")
    parser.add_argument("--db", type=str, help="数据库路径")
    parser.add_argument("--source-id", "-s", type=int, help="单个信息源 ID")
    parser.add_argument("--max-pages", type=int, default=5, help="每个信息源最大翻页数（默认5）")
    parser.add_argument("--source-type", type=str, help="限定信息源类型（招生/通知/新闻）")
    args = parser.parse_args()

    asyncio.run(run_crawl(
        university=args.university,
        department=args.department,
        max_sources=args.max_sources,
        db_path=args.db,
        source_id=args.source_id,
        max_pages=args.max_pages,
        source_type=args.source_type,
    ))


if __name__ == "__main__":
    main()
