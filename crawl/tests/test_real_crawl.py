"""
真实爬取测试脚本 - 爬取部分985高校并写入测试数据库

使用专用的测试数据库文件: data/test_crawl.db
选取 6 所代表性高校进行真实爬取：
  - 北京大学（静态HTML，学院多）
  - 清华大学（组织机构页）
  - 浙江大学（SPA页面）
  - 复旦大学（静态HTML，学院多）
  - 武汉大学（静态HTML）
  - 中国科学技术大学（静态HTML）
"""

from __future__ import annotations

import asyncio
import sys
import os
from pathlib import Path
from datetime import datetime

# 将项目根目录加入 sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from loguru import logger
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select, func, text

from src.models.base import Base
from src.models.university import University, Department, DepartmentSource
from src.discovery.chsi_crawler import UNIVERSITY_PROVINCES
from src.discovery.university_discover import (
    discover_homepage,
    discover_graduate_url,
    discover_dept_list_url,
    clear_homepage_cache,
)
from src.discovery.department_discover import (
    discover_departments_from_page,
    discover_departments_from_homepage,
    verify_coverage,
)
from src.utils.http_client import http_client


# 测试数据库路径
TEST_DB_PATH = Path(__file__).resolve().parent.parent / "data" / "test_crawl.db"
TEST_DB_URL = f"sqlite+aiosqlite:///{TEST_DB_PATH}"

# 选取的测试高校
TEST_UNIVERSITIES = [
    "北京大学",
    "清华大学",
    "浙江大学",
    "复旦大学",
    "武汉大学",
    "中国科学技术大学",
]


async def run_real_crawl():
    """执行真实爬取并写入测试数据库"""

    # 确保数据目录存在
    TEST_DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    # 如果测试数据库已存在，先删除（每次全新爬取）
    if TEST_DB_PATH.exists():
        os.remove(TEST_DB_PATH)
        logger.info(f"已删除旧的测试数据库: {TEST_DB_PATH}")

    # 创建测试数据库引擎
    engine = create_async_engine(TEST_DB_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    # 创建表
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info(f"测试数据库已创建: {TEST_DB_PATH}")

    # 清除首页缓存
    clear_homepage_cache()

    start_time = datetime.now()
    total_depts = 0
    results_summary = []

    for i, name in enumerate(TEST_UNIVERSITIES):
        logger.info(f"\n{'='*60}")
        logger.info(f"[{i+1}/{len(TEST_UNIVERSITIES)}] 开始处理: {name}")
        logger.info(f"{'='*60}")

        uni_result = {
            "name": name,
            "homepage": None,
            "graduate_url": None,
            "dept_list_url": None,
            "dept_count": 0,
            "error": None,
        }

        try:
            # Step 1: 发现官网首页
            homepage = await discover_homepage(name)
            uni_result["homepage"] = homepage
            if not homepage:
                uni_result["error"] = "未找到官网首页"
                logger.warning(f"跳过（无官网 URL）: {name}")
                results_summary.append(uni_result)
                continue

            logger.info(f"  官网首页: {homepage}")

            # Step 2: 发现研究生院 URL
            graduate_url = await discover_graduate_url(homepage, name)
            uni_result["graduate_url"] = graduate_url
            logger.info(f"  研究生院: {graduate_url or '未找到'}")

            # Step 3: 发现院系列表页
            dept_list_url = await discover_dept_list_url(homepage, name)
            uni_result["dept_list_url"] = dept_list_url
            logger.info(f"  院系列表页: {dept_list_url or '未找到'}")

            # Step 4: 提取学院列表
            departments = []
            discovery_method = "unknown"

            if dept_list_url:
                departments = await discover_departments_from_page(
                    dept_list_url, homepage, name
                )
                discovery_method = "dept_list_page"

            if not departments:
                departments = await discover_departments_from_homepage(homepage, name)
                discovery_method = "homepage_nav"

            uni_result["dept_count"] = len(departments)
            logger.info(f"  提取学院数: {len(departments)} (策略: {discovery_method})")

            # 打印前 10 个学院
            for j, dept in enumerate(departments[:10]):
                logger.info(f"    [{j+1}] {dept['name']} → {dept.get('url', 'N/A')[:80]}")
            if len(departments) > 10:
                logger.info(f"    ... 还有 {len(departments) - 10} 个学院")

            # Step 5: 写入数据库
            async with session_factory() as session:
                university = University(
                    name=name,
                    level="985",
                    province=UNIVERSITY_PROVINCES.get(name, ""),
                    homepage_url=homepage,
                    graduate_url=graduate_url,
                    dept_list_url=dept_list_url,
                    auto_discovered=True,
                )
                session.add(university)
                await session.flush()

                for dept_data in departments:
                    dept = Department(
                        university_id=university.id,
                        name=dept_data["name"],
                        homepage_url=dept_data.get("url"),
                        auto_discovered=True,
                        discovery_method=discovery_method,
                    )
                    session.add(dept)

                await session.commit()
                total_depts += len(departments)
                logger.info(f"  ✅ 已写入数据库: {name} ({len(departments)} 个学院)")

        except Exception as e:
            uni_result["error"] = str(e)
            logger.error(f"  ❌ 处理失败: {name} - {e}")
            import traceback
            traceback.print_exc()

        results_summary.append(uni_result)

    # 关闭 HTTP 客户端
    await http_client.close()

    # 打印汇总
    elapsed = (datetime.now() - start_time).total_seconds()
    logger.info(f"\n{'='*60}")
    logger.info(f"🎉 爬取完成！")
    logger.info(f"{'='*60}")
    logger.info(f"⏱️  总耗时: {elapsed:.1f}s")
    logger.info(f"🏫 高校数: {len(TEST_UNIVERSITIES)}")
    logger.info(f"🏛️  学院总数: {total_depts}")
    logger.info(f"💾 数据库: {TEST_DB_PATH}")
    logger.info(f"")

    # 汇总表
    logger.info(f"{'高校':<15} {'官网':<5} {'研究生院':<5} {'院系页':<5} {'学院数':<6} {'状态'}")
    logger.info(f"{'-'*60}")
    for r in results_summary:
        status = "✅" if r["dept_count"] > 0 else ("❌ " + (r["error"] or "无学院"))
        logger.info(
            f"{r['name']:<13} "
            f"{'✅' if r['homepage'] else '❌':<5} "
            f"{'✅' if r['graduate_url'] else '❌':<5} "
            f"{'✅' if r['dept_list_url'] else '❌':<5} "
            f"{r['dept_count']:<6} "
            f"{status}"
        )

    # 验证数据库内容
    logger.info(f"\n📊 数据库验证:")
    async with session_factory() as session:
        # 高校数
        uni_count = (await session.execute(
            select(func.count()).select_from(University)
        )).scalar()
        logger.info(f"  universities 表: {uni_count} 条记录")

        # 学院数
        dept_count = (await session.execute(
            select(func.count()).select_from(Department)
        )).scalar()
        logger.info(f"  departments 表: {dept_count} 条记录")

        # 每所高校的学院数
        result = await session.execute(
            select(University.name, func.count(Department.id))
            .join(Department, University.id == Department.university_id)
            .group_by(University.name)
            .order_by(func.count(Department.id).desc())
        )
        for row in result:
            logger.info(f"    {row[0]}: {row[1]} 个学院")

    await engine.dispose()

    logger.info(f"\n💡 查看数据库:")
    logger.info(f"  sqlite3 {TEST_DB_PATH}")
    logger.info(f"  > SELECT u.name, COUNT(d.id) FROM universities u LEFT JOIN departments d ON u.id = d.university_id GROUP BY u.name;")
    logger.info(f"  > SELECT u.name, d.name, d.homepage_url FROM universities u JOIN departments d ON u.id = d.university_id ORDER BY u.name;")


if __name__ == "__main__":
    asyncio.run(run_real_crawl())
