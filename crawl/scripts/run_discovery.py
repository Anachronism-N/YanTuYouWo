"""运行自动发现流程 - 阶段一 + 阶段二"""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

# 确保crawl/ 根目录在 sys.path，无论从哪个 CWD 启动
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from loguru import logger
from sqlalchemy import select, func

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

            # 断点续跑优化：已存在且已有院系的高校直接跳过（不重复抓取）
            existing_uni = (await session.execute(
                select(University).where(University.name == name)
            )).scalar_one_or_none()
            if existing_uni:
                existing_dept_cnt = (await session.execute(
                    select(func.count(Department.id)).where(
                        Department.university_id == existing_uni.id
                    )
                )).scalar()
                if existing_dept_cnt and existing_dept_cnt > 0:
                    logger.info(f"已完成（{existing_dept_cnt} 院系），跳过: {name}")
                    university = existing_uni
                    continue

            # Step 2: 发现官网 URL
            homepage = await discover_homepage(name)
            if not homepage:
                logger.warning(f"跳过（无官网 URL）: {name}")
                continue

            # Step 3: 发现研究生院 URL
            graduate_url = await discover_graduate_url(homepage, name)

            # Step 4: 发现院系列表页
            dept_list_url = await discover_dept_list_url(homepage, name)

            # 创建高校记录（幂等：已存在则复用，支持断点续跑）
            existing = (await session.execute(
                select(University).where(University.name == name)
            )).scalar_one_or_none()
            if existing:
                university = existing
                logger.info(f"高校已存在，跳过创建: {name}")
            else:
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

            # Step 7: 学院数据入库（幂等：同校同名已存在则跳过，支持断点续跑）
            new_depts = 0
            for dept_data in departments:
                dname = dept_data["name"]
                dup = (await session.execute(
                    select(Department).where(
                        Department.university_id == university.id,
                        Department.name == dname,
                    )
                )).scalar_one_or_none()
                if dup:
                    continue
                dept = Department(
                    university_id=university.id,
                    name=dname,
                    homepage_url=dept_data.get("url"),
                    auto_discovered=True,
                    discovery_method="dept_list_page",
                )
                session.add(dept)
                total_depts += 1
                new_depts += 1

            await session.commit()
            logger.info(f"{name}: 新增 {new_depts} 个学院（共发现 {len(departments)}）")

        logger.info(f"========== 阶段一完成: {len(university_data)} 所高校, {total_depts} 个学院 ==========")


async def run_phase2():
    """
    阶段二：定位信息发布页。

    对每个学院，自动定位其通知列表页 URL。
    """
    logger.info("========== 阶段二：定位信息发布页（并发） ==========")

    import asyncio as _aio

    async with async_session() as session:
        # 获取所有学院 + 高校信息（一次性预取，避免循环内反复查 DB）
        rows = (await session.execute(
            select(Department, University)
            .join(University, Department.university_id == University.id)
            .where(Department.is_active == True)
        )).all()

        # 过滤：有 homepage_url 且尚无信息源（断点续跑）
        todo = []
        done_with_src = 0
        for dept, university in rows:
            if not dept.homepage_url:
                continue
            n_src = (await session.execute(
                select(func.count(DepartmentSource.id)).where(
                    DepartmentSource.department_id == dept.id
                )
            )).scalar()
            if n_src and n_src > 0:
                done_with_src += 1
                continue
            todo.append((dept.id, dept.homepage_url, dept.name, university.name))

        logger.info(f"待定位: {len(todo)} 个学院（已定位跳过 {done_with_src}）")

        sem = _aio.Semaphore(6)  # 并发定位上限（http_client 内部仍做域名级限流）

        async def _locate(item):
            dept_id, url, dept_name, uni_name = item
            async with sem:
                try:
                    cands = await locate_notice_pages(url, dept_name, uni_name)
                    return (dept_id, dept_name, cands)
                except Exception as e:
                    logger.debug(f"定位异常 {dept_name}: {e}")
                    return (dept_id, dept_name, [])

        success_count = 0
        fail_count = 0
        processed = 0
        # 并发执行网络/分析阶段
        results = await _aio.gather(*[_locate(it) for it in todo])
        # 串行入库
        for dept_id, dept_name, candidates in results:
            processed += 1
            if candidates:
                for j, candidate in enumerate(candidates[:5]):
                    dup = (await session.execute(
                        select(DepartmentSource).where(
                            DepartmentSource.department_id == dept_id,
                            DepartmentSource.source_url == candidate["url"],
                        )
                    )).scalar_one_or_none()
                    if dup:
                        continue
                    session.add(DepartmentSource(
                        department_id=dept_id,
                        source_url=candidate["url"],
                        source_type=candidate.get("type", "学院通知"),
                        priority=j + 1,
                        parser_type="auto",
                    ))
                success_count += 1
                logger.info(f"✅ 定位成功: {dept_name} → {len(candidates)} 源")
            else:
                fail_count += 1
                logger.warning(f"❌ 定位失败: {dept_name}")
            if processed % 20 == 0:
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
