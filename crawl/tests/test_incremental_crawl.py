"""增量爬取逻辑测试——验证 should_crawl 的增量/降频规则。"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from loguru import logger
logger.remove()
logger.add(sys.stderr, level="WARNING")


async def _setup():
    """内存 DB + 一个源 + 可控 CrawlState/fail_count"""
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from src.models.base import Base
    from src.models.university import University, Department, DepartmentSource
    from src.models.notice import CrawlState, CrawlLog
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    Session = async_sessionmaker(engine, expire_on_commit=False)
    async with Session() as s:
        u = University(name="T", level="985", province="P"); s.add(u); await s.flush()
        d = Department(university_id=u.id, name="D"); s.add(d); await s.flush()
        src = DepartmentSource(department_id=d.id, source_url="http://t/x", is_active=True, fail_count=0)
        s.add(src); await s.flush()
        await s.commit()
        src_id = src.id
    return engine, Session, src_id


async def _set_state(Session, src_id, no_update, fail_count, crawl_logs=0):
    """设置源的 CrawlState 和 fail_count，以及 crawl_logs 次数"""
    from sqlalchemy import select, delete
    from src.models.notice import CrawlState, CrawlLog
    from src.models.university import DepartmentSource
    async with Session() as s:
        # fail_count
        (await s.execute(
            select(DepartmentSource).where(DepartmentSource.id == src_id)
        )).scalar_one().fail_count = fail_count
        # CrawlState
        await s.execute(delete(CrawlState).where(CrawlState.source_id == src_id))
        if no_update is not None:
            s.add(CrawlState(source_id=src_id, last_notice_count=0, consecutive_no_update=no_update))
        # crawl_logs（影响 _count_crawls 的 total_crawls % N 判定）
        from datetime import datetime
        for _ in range(crawl_logs):
            s.add(CrawlLog(source_id=src_id, crawl_time=datetime.now()))
        await s.commit()


async def test_new_source_crawls():
    """新源（无状态、fail=0）→ 应爬"""
    from src.crawler.list_crawler import should_crawl
    engine, Session, sid = await _setup()
    async with Session() as s:
        assert await should_crawl(sid, s) is True
    print("  ✅ 新源爬取")


async def test_failed_source_skipped():
    """fail>=3 频繁失败 → 大幅降频；fail>=5 更甚"""
    from src.crawler.list_crawler import should_crawl
    engine, Session, sid = await _setup()
    # fail=3, crawl_logs=0 → 0%5==0 True; crawl_logs=1 → 1%5!=0 False
    await _set_state(Session, sid, no_update=None, fail_count=3, crawl_logs=0)
    async with Session() as s:
        assert await should_crawl(sid, s) is True   # 0%5==0
    await _set_state(Session, sid, no_update=None, fail_count=3, crawl_logs=1)
    async with Session() as s:
        assert await should_crawl(sid, s) is False  # 1%5!=0，降频跳过
    print("  ✅ 频繁失败源降频（fail>=3 每5次1次）")


async def test_no_update_reduced():
    """连续无更新 → 降频"""
    from src.crawler.list_crawler import should_crawl
    engine, Session, sid = await _setup()
    await _set_state(Session, sid, no_update=5, fail_count=0, crawl_logs=0)
    async with Session() as s:
        assert await should_crawl(sid, s) is True   # 0%3==0
    await _set_state(Session, sid, no_update=5, fail_count=0, crawl_logs=1)
    async with Session() as s:
        assert await should_crawl(sid, s) is False  # 1%3!=0，无更新降频
    print("  ✅ 无更新源降频（no_update>=5 每3次1次）")


async def test_fresh_source_crawls():
    """刚爬过、有更新（no_update=0）→ 应爬"""
    from src.crawler.list_crawler import should_crawl
    engine, Session, sid = await _setup()
    await _set_state(Session, sid, no_update=0, fail_count=0, crawl_logs=5)
    async with Session() as s:
        assert await should_crawl(sid, s) is True
    print("  ✅ 活跃源（有更新）始终爬取")


async def main():
    print("=== 增量爬取逻辑测试 ===")
    await test_new_source_crawls()
    await test_failed_source_skipped()
    await test_no_update_reduced()
    await test_fresh_source_crawls()
    print("\n[PASS] 所有增量逻辑测试通过!")


if __name__ == "__main__":
    asyncio.run(main())
