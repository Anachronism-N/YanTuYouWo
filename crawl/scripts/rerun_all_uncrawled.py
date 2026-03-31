"""重跑所有未爬取的源"""
import asyncio
import sys
import time
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path("/Users/cedric/project/yantu/crawl")))

from loguru import logger

async def main():
    from src.config import settings
    db_path = "/Users/cedric/project/yantu/crawl/data/large_scale_test.db"
    settings.DATABASE_URL = f"sqlite+aiosqlite:///{db_path}"
    settings.ensure_dirs()

    import src.storage.database as db_module
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
    from sqlalchemy import text, select

    db_module.engine = create_async_engine(settings.DATABASE_URL, echo=False, pool_pre_ping=True)
    db_module.async_session = async_sessionmaker(db_module.engine, class_=AsyncSession, expire_on_commit=False)
    await db_module.init_db()

    from src.processor.notice_processor import NoticeProcessor
    from src.utils.http_client import http_client
    from src.models.university import University, Department, DepartmentSource

    try:
        async with db_module.async_session() as session:
            # 获取所有未爬取的源（没有crawl_log记录的活跃源）
            result = await session.execute(text("""
                SELECT ds.id, ds.source_url, u.name, d.name
                FROM department_sources ds
                JOIN departments d ON ds.department_id=d.id
                JOIN universities u ON d.university_id=u.id
                WHERE ds.is_active=1
                AND ds.id NOT IN (SELECT source_id FROM crawl_logs)
                ORDER BY u.name, d.name
            """))
            uncrawled = result.fetchall()
            logger.info(f"需要爬取 {len(uncrawled)} 个未爬取的源")

            processor = NoticeProcessor(session)
            processor._max_pages = 3

            for i, (sid, url, uni, dept) in enumerate(uncrawled):
                logger.info(f"[{i+1}/{len(uncrawled)}] {uni} - {dept} | {url}")

                # 获取完整对象
                result = await session.execute(
                    select(DepartmentSource, Department, University)
                    .join(Department, DepartmentSource.department_id == Department.id)
                    .join(University, Department.university_id == University.id)
                    .where(DepartmentSource.id == sid)
                )
                row = result.first()
                if not row:
                    continue

                source, dept_obj, uni_obj = row
                await processor._process_source(source, dept_obj, uni_obj)
                await asyncio.sleep(1.0)

            processor._print_stats()
    finally:
        await http_client.close()
        await db_module.engine.dispose()

if __name__ == "__main__":
    logger.remove()
    log_path = f"/Users/cedric/project/yantu/crawl/data/logs/rerun_all_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
    logger.add(sys.stderr, level="INFO", format="{time:HH:mm:ss} | {level: <5} | {message}")
    logger.add(log_path, level="DEBUG", format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {message}")
    asyncio.run(main())
