"""
全量 985 高校爬取测试脚本

对所有 39 所 985 高校执行阶段一完整流程：
  1. 发现官网首页
  2. 发现研究生院 URL
  3. 发现院系列表页
  4. 提取学院列表
  5. 写入测试数据库 data/test_crawl_all985.db

用于验证阶段一代码的完整性和鲁棒性。
"""

from __future__ import annotations

import asyncio
import sys
import os
import json
from pathlib import Path
from datetime import datetime

# 将项目根目录加入 sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from loguru import logger
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select, func

from src.models.base import Base
from src.models.university import University, Department
from src.discovery.chsi_crawler import UNIVERSITIES_985, UNIVERSITY_PROVINCES
from src.discovery.university_discover import (
    discover_homepage,
    discover_graduate_url,
    discover_dept_list_url,
    clear_homepage_cache,
)
from src.discovery.department_discover import (
    discover_departments_from_page,
    discover_departments_from_homepage,
)
from src.utils.http_client import http_client


# 测试数据库路径
TEST_DB_PATH = Path(__file__).resolve().parent.parent / "data" / "test_crawl_all985.db"
TEST_DB_URL = f"sqlite+aiosqlite:///{TEST_DB_PATH}"


async def crawl_single_university(name: str) -> dict:
    """
    爬取单所高校的完整信息。

    Returns:
        {
            "name": str,
            "homepage": str | None,
            "graduate_url": str | None,
            "dept_list_url": str | None,
            "departments": list[dict],
            "dept_count": int,
            "discovery_method": str,
            "error": str | None,
            "elapsed": float,
        }
    """
    start = datetime.now()
    result = {
        "name": name,
        "homepage": None,
        "graduate_url": None,
        "dept_list_url": None,
        "departments": [],
        "dept_count": 0,
        "discovery_method": "none",
        "error": None,
        "elapsed": 0,
    }

    try:
        # Step 1: 发现官网首页
        homepage = await discover_homepage(name)
        result["homepage"] = homepage
        if not homepage:
            result["error"] = "未找到官网首页"
            return result

        # Step 2: 发现研究生院 URL
        graduate_url = await discover_graduate_url(homepage, name)
        result["graduate_url"] = graduate_url

        # Step 3: 发现院系列表页
        dept_list_url = await discover_dept_list_url(homepage, name)
        result["dept_list_url"] = dept_list_url

        # Step 4: 提取学院列表
        departments = []
        discovery_method = "none"

        if dept_list_url:
            departments = await discover_departments_from_page(
                dept_list_url, homepage, name
            )
            discovery_method = "dept_list_page"

        if not departments:
            departments = await discover_departments_from_homepage(homepage, name)
            discovery_method = "homepage_nav"

        if not departments:
            discovery_method = "none"

        result["departments"] = departments
        result["dept_count"] = len(departments)
        result["discovery_method"] = discovery_method

    except Exception as e:
        result["error"] = str(e)
        import traceback
        traceback.print_exc()

    result["elapsed"] = (datetime.now() - start).total_seconds()
    return result


async def run_all_985_crawl():
    """对所有 39 所 985 高校执行完整爬取"""

    logger.info("=" * 70)
    logger.info("🏫 全量 985 高校阶段一爬取测试")
    logger.info(f"📋 高校数量: {len(UNIVERSITIES_985)}")
    logger.info("=" * 70)

    # 准备数据库
    TEST_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    if TEST_DB_PATH.exists():
        os.remove(TEST_DB_PATH)
        logger.info(f"已删除旧的测试数据库: {TEST_DB_PATH}")

    engine = create_async_engine(TEST_DB_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info(f"测试数据库已创建: {TEST_DB_PATH}")

    # 清除首页缓存
    clear_homepage_cache()

    start_time = datetime.now()
    all_results = []

    # 逐校爬取
    for i, name in enumerate(UNIVERSITIES_985):
        logger.info(f"\n[{i+1}/{len(UNIVERSITIES_985)}] 🔍 {name}")

        result = await crawl_single_university(name)
        all_results.append(result)

        # 简要日志
        status_icon = "✅" if result["dept_count"] > 0 else "⚠️" if result["homepage"] else "❌"
        logger.info(
            f"  {status_icon} 官网={'✓' if result['homepage'] else '✗'} "
            f"研院={'✓' if result['graduate_url'] else '✗'} "
            f"院系页={'✓' if result['dept_list_url'] else '✗'} "
            f"学院={result['dept_count']} "
            f"策略={result['discovery_method']} "
            f"耗时={result['elapsed']:.1f}s"
            + (f" 错误={result['error']}" if result['error'] else "")
        )

        # 写入数据库
        if result["homepage"]:
            try:
                async with session_factory() as session:
                    university = University(
                        name=name,
                        level="985",
                        province=UNIVERSITY_PROVINCES.get(name, ""),
                        homepage_url=result["homepage"],
                        graduate_url=result["graduate_url"],
                        dept_list_url=result["dept_list_url"],
                        auto_discovered=True,
                    )
                    session.add(university)
                    await session.flush()

                    for dept_data in result["departments"]:
                        dept = Department(
                            university_id=university.id,
                            name=dept_data["name"],
                            homepage_url=dept_data.get("url"),
                            auto_discovered=True,
                            discovery_method=result["discovery_method"],
                        )
                        session.add(dept)

                    await session.commit()
            except Exception as e:
                logger.error(f"  数据库写入失败: {name} - {e}")

    # 关闭 HTTP 客户端
    await http_client.close()

    # ==================== 汇总报告 ====================
    elapsed = (datetime.now() - start_time).total_seconds()

    # 统计
    success_count = sum(1 for r in all_results if r["dept_count"] > 0)
    homepage_count = sum(1 for r in all_results if r["homepage"])
    graduate_count = sum(1 for r in all_results if r["graduate_url"])
    dept_list_count = sum(1 for r in all_results if r["dept_list_url"])
    total_depts = sum(r["dept_count"] for r in all_results)
    error_count = sum(1 for r in all_results if r["error"])
    zero_dept_count = sum(1 for r in all_results if r["homepage"] and r["dept_count"] == 0)

    logger.info(f"\n{'=' * 70}")
    logger.info(f"📊 全量 985 高校爬取结果汇总")
    logger.info(f"{'=' * 70}")
    logger.info(f"⏱️  总耗时: {elapsed:.1f}s ({elapsed/60:.1f}min)")
    logger.info(f"🏫 高校总数: {len(UNIVERSITIES_985)}")
    logger.info(f"✅ 成功提取学院: {success_count}/{len(UNIVERSITIES_985)} ({success_count/len(UNIVERSITIES_985)*100:.0f}%)")
    logger.info(f"🌐 找到官网: {homepage_count}/{len(UNIVERSITIES_985)}")
    logger.info(f"🎓 找到研究生院: {graduate_count}/{len(UNIVERSITIES_985)}")
    logger.info(f"📋 找到院系列表页: {dept_list_count}/{len(UNIVERSITIES_985)}")
    logger.info(f"🏛️  学院总数: {total_depts}")
    logger.info(f"❌ 错误数: {error_count}")
    logger.info(f"⚠️  有官网但无学院: {zero_dept_count}")

    # 详细汇总表
    logger.info(f"\n{'高校':<18} {'官网':^4} {'研院':^4} {'院系页':^4} {'学院数':>5} {'策略':<16} {'耗时':>6} {'状态'}")
    logger.info("-" * 90)

    # 按状态排序：成功 → 部分成功 → 失败
    sorted_results = sorted(all_results, key=lambda r: (
        0 if r["dept_count"] > 0 else (1 if r["homepage"] else 2),
        -r["dept_count"]
    ))

    for r in sorted_results:
        if r["dept_count"] > 0:
            status = "✅"
        elif r["homepage"] and not r["error"]:
            status = "⚠️ 无学院"
        elif r["error"]:
            status = f"❌ {r['error'][:20]}"
        else:
            status = "❌ 无官网"

        logger.info(
            f"{r['name']:<16} "
            f"{'✅' if r['homepage'] else '❌':^4} "
            f"{'✅' if r['graduate_url'] else '❌':^4} "
            f"{'✅' if r['dept_list_url'] else '❌':^4} "
            f"{r['dept_count']:>5} "
            f"{r['discovery_method']:<16} "
            f"{r['elapsed']:>5.1f}s "
            f"{status}"
        )

    # 失败高校详情
    failed = [r for r in all_results if r["dept_count"] == 0]
    if failed:
        logger.info(f"\n⚠️  未成功提取学院的高校 ({len(failed)} 所):")
        for r in failed:
            logger.info(f"  - {r['name']}: {r['error'] or '无学院数据'}")
            if r["homepage"]:
                logger.info(f"    官网: {r['homepage']}")
            if r["dept_list_url"]:
                logger.info(f"    院系页: {r['dept_list_url']}")

    # 数据库验证
    logger.info(f"\n📊 数据库验证 ({TEST_DB_PATH}):")
    async with session_factory() as session:
        uni_count = (await session.execute(
            select(func.count()).select_from(University)
        )).scalar()
        dept_count = (await session.execute(
            select(func.count()).select_from(Department)
        )).scalar()
        logger.info(f"  universities 表: {uni_count} 条记录")
        logger.info(f"  departments 表: {dept_count} 条记录")

        result_rows = await session.execute(
            select(University.name, func.count(Department.id))
            .join(Department, University.id == Department.university_id)
            .group_by(University.name)
            .order_by(func.count(Department.id).desc())
        )
        for row in result_rows:
            logger.info(f"    {row[0]}: {row[1]} 个学院")

    await engine.dispose()

    # 保存 JSON 报告
    report_path = TEST_DB_PATH.parent / "all985_crawl_report.json"
    report_data = []
    for r in all_results:
        report_data.append({
            "name": r["name"],
            "homepage": r["homepage"],
            "graduate_url": r["graduate_url"],
            "dept_list_url": r["dept_list_url"],
            "dept_count": r["dept_count"],
            "discovery_method": r["discovery_method"],
            "error": r["error"],
            "elapsed": round(r["elapsed"], 1),
            "departments": [{"name": d["name"], "url": d.get("url", "")} for d in r["departments"]],
        })
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report_data, f, ensure_ascii=False, indent=2)
    logger.info(f"\n📄 详细报告已保存: {report_path}")

    # 最终判定
    logger.info(f"\n{'=' * 70}")
    if success_count == len(UNIVERSITIES_985):
        logger.info(f"🎉 全部 {len(UNIVERSITIES_985)} 所 985 高校爬取成功！可以进入阶段二！")
    elif success_count >= len(UNIVERSITIES_985) - 2:
        logger.info(f"✅ {success_count}/{len(UNIVERSITIES_985)} 所高校爬取成功（{len(UNIVERSITIES_985) - success_count} 所失败，可能是网络或特殊限制）")
        logger.info(f"   建议：检查失败高校后可进入阶段二")
    else:
        logger.info(f"⚠️  仅 {success_count}/{len(UNIVERSITIES_985)} 所高校爬取成功，需要排查问题")
    logger.info(f"{'=' * 70}")

    return all_results


if __name__ == "__main__":
    results = asyncio.run(run_all_985_crawl())
