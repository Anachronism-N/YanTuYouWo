"""定时调度器 - 使用 APScheduler 实现定时爬取

用法：
    # 启动调度器（默认每6小时执行一次）
    python -m src.scheduler.cron_scheduler

    # 自定义间隔（单位：小时）
    python -m src.scheduler.cron_scheduler --interval 12

    # 使用指定数据库
    python -m src.scheduler.cron_scheduler --db data/test_phase2_locate.db
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys
from datetime import datetime

from loguru import logger

# 确保项目根目录在 sys.path 中
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))


async def run_scheduled_crawl(db_path: str | None = None):
    """执行一次定时爬取任务"""
    logger.info(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 定时爬取任务开始")

    try:
        from src.config import settings

        if db_path:
            settings.DATABASE_URL = f"sqlite+aiosqlite:///{db_path}"

        settings.ensure_dirs()

        import src.storage.database as db_module
        from src.processor.notice_processor import NoticeProcessor
        from src.utils.http_client import http_client

        if db_path:
            from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
            db_module.engine = create_async_engine(settings.DATABASE_URL, echo=False, pool_pre_ping=True)
            db_module.async_session = async_sessionmaker(
                db_module.engine, class_=AsyncSession, expire_on_commit=False
            )

        await db_module.init_db()

        try:
            async with db_module.async_session() as session:
                processor = NoticeProcessor(session)
                await processor.process_all()
        finally:
            await http_client.close()
            await db_module.engine.dispose()

        logger.info(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 定时爬取任务完成")

    except Exception as e:
        logger.error(f"定时爬取任务异常: {e}")


def start_scheduler(interval_hours: int = 6, db_path: str | None = None):
    """
    启动定时调度器。

    Args:
        interval_hours: 爬取间隔（小时）
        db_path: 数据库路径（可选）
    """
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        from apscheduler.triggers.interval import IntervalTrigger
    except ImportError:
        logger.error("APScheduler 未安装，请运行: pip install apscheduler")
        logger.info("回退到简单的 asyncio 循环调度...")
        _simple_scheduler(interval_hours, db_path)
        return

    scheduler = AsyncIOScheduler()

    scheduler.add_job(
        run_scheduled_crawl,
        trigger=IntervalTrigger(hours=interval_hours),
        kwargs={"db_path": db_path},
        id="crawl_job",
        name="推免信息定时爬取",
        replace_existing=True,
        max_instances=1,  # 防止任务重叠
    )

    logger.info(f"定时调度器已启动，每 {interval_hours} 小时执行一次")
    logger.info("按 Ctrl+C 停止")

    scheduler.start()

    # 立即执行一次
    loop = asyncio.get_event_loop()
    loop.create_task(run_scheduled_crawl(db_path))

    try:
        loop.run_forever()
    except (KeyboardInterrupt, SystemExit):
        logger.info("调度器已停止")
        scheduler.shutdown()


def _simple_scheduler(interval_hours: int, db_path: str | None):
    """简单的 asyncio 循环调度（APScheduler 不可用时的回退方案）"""

    async def _loop():
        logger.info(f"简单调度器已启动，每 {interval_hours} 小时执行一次")
        while True:
            await run_scheduled_crawl(db_path)
            logger.info(f"下次执行时间: {interval_hours} 小时后")
            await asyncio.sleep(interval_hours * 3600)

    try:
        asyncio.run(_loop())
    except KeyboardInterrupt:
        logger.info("调度器已停止")


def main():
    """命令行入口"""
    parser = argparse.ArgumentParser(description="推免信息定时爬取调度器")
    parser.add_argument("--interval", "-i", type=int, default=6, help="爬取间隔（小时，默认6）")
    parser.add_argument("--db", type=str, help="数据库路径")
    args = parser.parse_args()

    start_scheduler(interval_hours=args.interval, db_path=args.db)


if __name__ == "__main__":
    main()
