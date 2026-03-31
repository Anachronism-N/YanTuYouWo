"""
真实爬取快速测试 - 选取 2 所高校快速验证，写入测试数据库
数据写入: crawl/data/test_crawl.db
"""
from __future__ import annotations
import asyncio, sys, time
from datetime import datetime
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from loguru import logger
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select, func
from src.models.base import Base
from src.models.university import University, Department
from src.discovery.chsi_crawler import UNIVERSITY_PROVINCES
from src.discovery.university_discover import discover_homepage, discover_graduate_url, discover_dept_list_url, clear_homepage_cache
from src.discovery.department_discover import discover_departments_from_page, discover_departments_from_homepage
from src.utils.http_client import http_client

TEST_DB_PATH = Path(__file__).resolve().parent.parent / "data" / "test_crawl.db"
TEST_DB_URL = f"sqlite+aiosqlite:///{TEST_DB_PATH}"
TEST_UNIVERSITIES = ["北京大学", "武汉大学"]

async def main():
    start_time = datetime.now()
    logger.info(f"快速爬取测试: {TEST_UNIVERSITIES}")
    TEST_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    sf = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    clear_homepage_cache()
    for i, name in enumerate(TEST_UNIVERSITIES):
        logger.info(f"\n[{i+1}/{len(TEST_UNIVERSITIES)}] {name}")
        async with sf() as session:
            homepage = await discover_homepage(name)
            if not homepage:
                logger.error(f"{name}: 无法发现官网")
                continue
            logger.info(f"  官网: {homepage}")
            graduate_url = await discover_graduate_url(homepage, name)
            logger.info(f"  研究生院: {graduate_url or '未找到'}")
            dept_list_url = await discover_dept_list_url(homepage, name)
            logger.info(f"  院系列表: {dept_list_url or '未找到'}")
            uni = University(name=name, level="985", province=UNIVERSITY_PROVINCES.get(name, ""), homepage_url=homepage, graduate_url=graduate_url, dept_list_url=dept_list_url, auto_discovered=True)
            session.add(uni)
            await session.flush()
            departments, method = [], "unknown"
            if dept_list_url:
                departments = await discover_departments_from_page(dept_list_url, homepage, name)
                method = "dept_list_page"
            if not departments:
                departments = await discover_departments_from_homepage(homepage, name)
                method = "homepage_nav"
            for d in departments:
                session.add(Department(university_id=uni.id, name=d["name"], homepage_url=d.get("url"), auto_discovered=True, discovery_method=method))
            await session.commit()
            logger.info(f"  {name}: {len(departments)} 个学院 ({method})")
            for j, d in enumerate(departments[:5]):
                logger.info(f"     {j+1}. {d['name']}")
            if len(departments) > 5:
                logger.info(f"     ... 还有 {len(departments)-5} 个")
    await http_client.close()
    async with sf() as session:
        uni_count = (await session.execute(select(func.count()).select_from(University))).scalar()
        dept_count = (await session.execute(select(func.count()).select_from(Department))).scalar()
        logger.info(f"\n数据库: {uni_count} 所高校, {dept_count} 个学院")
        logger.info(f"文件: {TEST_DB_PATH}")
        logger.info(f"耗时: {(datetime.now()-start_time).total_seconds():.1f}s")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
