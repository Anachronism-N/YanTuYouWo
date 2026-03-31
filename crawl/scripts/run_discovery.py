"""运行自动发现流程 - 阶段一 + 阶段二"""

from __future__ import annotations

import asyncio

from loguru import logger
from sqlalchemy import select

from src.config import settings
from src.storage.database import init_db, async_session, close_db
from src.models.university import University, Department, DepartmentSource
from src.discovery.chsi_crawler import build_university_database, UNIVERSITY_PROVINCES
from src.discovery.university_discover import (
    discover_homepage,
    discover_graduate_url,
    discover_dept_list_url,
)
from src.discovery.department_discover import (
    discover_departments_from_page,
    discover_departments_from_homepage,
    verify_coverage,
)
from src.discovery.notice_page_locator import locate_notice_pages
from src.utils.http_client import http_client


async def run_phase1():
    """
    阶段一：构建高校学院 URL 库。

    流程：
    1. 从研招网获取 985 高校 + 招生单位列表
    2. 自动发现各高校官网 URL
    3. 自动发现院系列表页 + 提取学院 URL
    4. 覆盖率校验
    5. 数据入库
    """
    settings.ensure_dirs()
    await init_db()

    logger.info("========== 阶段一：构建高校学院 URL 库 ==========")

    # Step 1: 获取高校 + 招生单位数据
    university_data = await build_university_database()

    async with async_session() as session:
        total_depts = 0

        for uni_data in university_data:
            name = uni_data["name"]
            logger.info(f"--- 处理高校: {name} ---")

            # Step 2: 发现官网 URL
            homepage = await discover_homepage(name)
            if not homepage:
                logger.warning(f"跳过（无官网 URL）: {name}")
                continue

            # Step 3: 发现研究生院 URL
            graduate_url = await discover_graduate_url(homepage, name)

            # Step 4: 发现院系列表页
            dept_list_url = await discover_dept_list_url(homepage, name)

            # 创建高校记录
            university = University(
                name=name,
                level="985",
                province=UNIVERSITY_PROVINCES.get(name, ""),
                homepage_url=homepage,
                graduate_url=graduate_url,
                dept_list_url=dept_list_url,
                chsi_id=uni_data.get("chsi_id", ""),
                auto_discovered=True,
            )
            session.add(university)
            await session.flush()

            # Step 5: 提取学院 URL
            departments = []
            if dept_list_url:
                departments = await discover_departments_from_page(
                    dept_list_url, homepage, name
                )

            if not departments:
                departments = await discover_departments_from_homepage(homepage, name)

            # Step 6: 覆盖率校验
            chsi_dept_names = [d["name"] for d in uni_data.get("departments", [])]
            if chsi_dept_names and departments:
                coverage = verify_coverage(chsi_dept_names, departments)
                logger.info(
                    f"{name} 覆盖率: {coverage['coverage_rate']:.0%} "
                    f"({coverage['matched']}/{coverage['total_chsi']})"
                )

            # Step 7: 学院数据入库
            for dept_data in departments:
                dept = Department(
                    university_id=university.id,
                    name=dept_data["name"],
                    homepage_url=dept_data.get("url"),
                    auto_discovered=True,
                    discovery_method="dept_list_page",
                )
                session.add(dept)
                total_depts += 1

            await session.commit()
            logger.info(f"{name}: 入库 {len(departments)} 个学院")

        logger.info(f"========== 阶段一完成: {len(university_data)} 所高校, {total_depts} 个学院 ==========")


async def run_phase2():
    """
    阶段二：定位信息发布页。

    对每个学院，自动定位其通知列表页 URL。
    """
    logger.info("========== 阶段二：定位信息发布页 ==========")

    async with async_session() as session:
        # 获取所有学院
        result = await session.execute(
            select(Department).where(Department.is_active == True)
        )
        departments = result.scalars().all()

        logger.info(f"待处理学院数: {len(departments)}")

        success_count = 0
        fail_count = 0

        for i, dept in enumerate(departments):
            if not dept.homepage_url:
                continue

            # 获取高校信息
            uni_result = await session.execute(
                select(University).where(University.id == dept.university_id)
            )
            university = uni_result.scalar_one_or_none()
            if not university:
                continue

            logger.info(f"[{i + 1}/{len(departments)}] {university.name} - {dept.name}")

            # 定位通知页
            candidates = await locate_notice_pages(
                dept.homepage_url,
                dept.name,
                university.name,
            )

            if candidates:
                # 创建信息源记录（去重：同一学院不重复入库同一URL）
                for j, candidate in enumerate(candidates[:5]):  # 最多保存 5 个
                    existing = await session.execute(
                        select(DepartmentSource).where(
                            DepartmentSource.department_id == dept.id,
                            DepartmentSource.source_url == candidate["url"],
                        )
                    )
                    if existing.scalar_one_or_none():
                        continue
                    source = DepartmentSource(
                        department_id=dept.id,
                        source_url=candidate["url"],
                        source_type=candidate.get("type", "学院通知"),
                        priority=j + 1,
                        parser_type="auto",
                    )
                    session.add(source)

                success_count += 1
                logger.info(f"✅ 定位成功: {dept.name} → {len(candidates)} 个信息源")
            else:
                fail_count += 1
                logger.warning(f"❌ 定位失败: {dept.name}")

            # 每处理 10 个学院提交一次
            if (i + 1) % 10 == 0:
                await session.commit()

        await session.commit()

        total = success_count + fail_count
        rate = success_count / total if total > 0 else 0
        logger.info(
            f"========== 阶段二完成: 成功 {success_count}/{total} ({rate:.0%}) =========="
        )


async def main():
    """运行完整的自动发现流程"""
    try:
        await run_phase1()
        await run_phase2()
    finally:
        await http_client.close()
        await close_db()


if __name__ == "__main__":
    asyncio.run(main())
