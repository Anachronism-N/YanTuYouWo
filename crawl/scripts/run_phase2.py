"""单独运行阶段2（信息源定位）到指定数据库。

用法：
    python scripts/run_phase2.py --db data/large_scale_test.db
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from loguru import logger


async def main():
    parser = argparse.ArgumentParser(description="运行阶段2：信息源定位")
    parser.add_argument("--db", required=True, help="数据库路径")
    args = parser.parse_args()

    db_path = str(Path(args.db).resolve())

    logger.remove()
    logger.add(sys.stderr, level="INFO", format="{time:HH:mm:ss} | {level: <5} | {message}")

    from src.config import settings
    settings.DATABASE_URL = f"sqlite+aiosqlite:///{db_path}"
    settings.ensure_dirs()

    import src.storage.database as db_module
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

    db_module.engine = create_async_engine(settings.DATABASE_URL, echo=False, pool_pre_ping=True)
    db_module.async_session = async_sessionmaker(db_module.engine, class_=AsyncSession, expire_on_commit=False)
    await db_module.init_db()

    from src.utils.http_client import http_client

    try:
        from scripts.run_discovery import run_phase2
        t0 = time.time()
        await run_phase2()
        t1 = time.time()
        logger.info(f"阶段2耗时: {t1 - t0:.0f}s ({(t1 - t0) / 60:.1f}min)")
    finally:
        await http_client.close()
        await db_module.engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
