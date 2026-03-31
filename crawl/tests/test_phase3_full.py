"""阶段三完整流程测试 - 含LLM调用"""
import sys
import asyncio
import os

sys.path.insert(0, "/Users/cedric/project/yantu/crawl")
os.environ["LOG_LEVEL"] = "INFO"

from loguru import logger
logger.remove()
logger.add(sys.stderr, level="INFO", format="{time:HH:mm:ss} | {level: <5} | {message}")


async def main():
    from src.config import settings
    settings.DATABASE_URL = "sqlite+aiosqlite:///data/test_phase2_locate.db"
    settings.ensure_dirs()

    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
    from sqlalchemy import select
    from src.models.base import Base
    from src.models.university import University, Department, DepartmentSource
    from src.utils.http_client import http_client

    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    sf = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with sf() as session:
        result = await session.execute(
            select(DepartmentSource, Department, University)
            .join(Department, DepartmentSource.department_id == Department.id)
            .join(University, Department.university_id == University.id)
            .where(University.name == "华南理工大学")
            .where(DepartmentSource.source_type == "招生")
        )
        rows = result.all()
        if not rows:
            print("No source found")
            await engine.dispose()
            return

        source, dept, uni = rows[0]
        print(f"Source: {source.source_url}")

        from src.crawler.list_crawler import crawl_source
        log = await crawl_source(source, session, uni.id)
        new_items = getattr(log, "_new_items_data", [])
        high = [i for i in new_items if i.get("relevance_score", 0) >= 0.5]
        print(f"Total: {log.total_items}, New: {log.new_items}, High: {len(high)}")

        if high:
            item = high[0]
            print(f"\nProcessing: [{item['relevance_score']:.2f}] {item['title']}")
            print(f"URL: {item['url']}")

            from src.crawler.detail_crawler import process_notice
            notice = await process_notice(item, session, uni.id, dept.id, source.id)
            if notice:
                print(f"\n✅ SUCCESS!")
                print(f"  type={notice.program_type}")
                print(f"  year={notice.year}")
                print(f"  degree={notice.target_degree}")
                print(f"  confidence={notice.llm_confidence}")
                print(f"  status={notice.status}")
                print(f"  summary={notice.summary}")
                if notice.disciplines:
                    print(f"  disciplines={notice.disciplines}")
                if notice.registration_start:
                    print(f"  reg_start={notice.registration_start}")
                if notice.registration_end:
                    print(f"  reg_end={notice.registration_end}")
                await session.rollback()
            else:
                print("FAILED")
        else:
            print("No high-relevance items")

    await http_client.close()
    await engine.dispose()
    print("\nDone!")


if __name__ == "__main__":
    asyncio.run(main())
