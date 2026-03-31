"""
阶段二测试脚本 - 信息发布页定位

对阶段一已入库的学院，执行阶段二通知页定位流程：
  1. 从数据库读取高校和学院数据
  2. 对每个学院执行六层策略级联定位
  3. 验证候选通知页
  4. 将定位结果写入 DepartmentSource 表

支持两种模式：
  - 抽样测试：每所高校随机选 2 个学院（快速验证）
  - 全量测试：对所有学院执行定位（完整验证）

用法：
    python tests/test_phase2_locate.py              # 抽样测试（每校2个学院）
    python tests/test_phase2_locate.py --full        # 全量测试
    python tests/test_phase2_locate.py --uni 北京大学  # 指定高校
"""

from __future__ import annotations

import asyncio
import sys
import os
import json
import random
from pathlib import Path
from datetime import datetime

# 将项目根目录加入 sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from loguru import logger
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select, func

from src.models.base import Base
from src.models.university import University, Department, DepartmentSource
from src.discovery.notice_page_locator import locate_notice_pages, locate_all_departments
from src.utils.http_client import http_client


# 测试数据库路径（使用阶段一的全量数据库）
SOURCE_DB_PATH = Path(__file__).resolve().parent.parent / "data" / "test_crawl_all985.db"
# 阶段二测试数据库
TEST_DB_PATH = Path(__file__).resolve().parent.parent / "data" / "test_phase2_locate.db"
TEST_DB_URL = f"sqlite+aiosqlite:///{TEST_DB_PATH}"

# 代表性高校（用于抽样测试）
SAMPLE_UNIVERSITIES = [
    "北京大学",       # 综合性大学，学院多
    "清华大学",       # 理工为主
    "浙江大学",       # JS 渲染页面
    "复旦大学",       # 学院数最多
    "华中科技大学",   # 中部高校
    "哈尔滨工业大学", # 东北高校
]


async def load_universities_from_db(
    session: AsyncSession,
    target_uni: str | None = None,
) -> list[dict]:
    """从阶段一数据库加载高校和学院数据"""
    query = select(University)
    if target_uni:
        query = query.where(University.name == target_uni)
    query = query.order_by(University.name)

    result = await session.execute(query)
    universities = result.scalars().all()

    data = []
    for uni in universities:
        # 加载学院
        dept_result = await session.execute(
            select(Department).where(Department.university_id == uni.id)
        )
        departments = dept_result.scalars().all()

        data.append({
            "id": uni.id,
            "name": uni.name,
            "homepage_url": uni.homepage_url,
            "graduate_url": uni.graduate_url,
            "departments": [
                {
                    "id": d.id,
                    "name": d.name,
                    "homepage_url": d.homepage_url,
                }
                for d in departments
            ],
        })

    return data


async def run_phase2_test(
    mode: str = "sample",
    target_uni: str | None = None,
    sample_per_uni: int = 2,
):
    """
    运行阶段二测试。

    Args:
        mode: "sample"（抽样）或 "full"（全量）
        target_uni: 指定高校名称
        sample_per_uni: 抽样模式下每校选取的学院数
    """
    logger.info("=" * 70)
    logger.info("📍 阶段二测试 - 信息发布页定位")
    logger.info(f"📋 模式: {'全量' if mode == 'full' else '抽样'}")
    if target_uni:
        logger.info(f"🏫 指定高校: {target_uni}")
    logger.info("=" * 70)

    # 连接阶段一数据库
    if not SOURCE_DB_PATH.exists():
        logger.error(f"阶段一数据库不存在: {SOURCE_DB_PATH}")
        logger.error("请先运行 python tests/test_all_985_crawl.py 完成阶段一")
        return

    source_engine = create_async_engine(f"sqlite+aiosqlite:///{SOURCE_DB_PATH}", echo=False)
    source_session_factory = async_sessionmaker(source_engine, class_=AsyncSession, expire_on_commit=False)

    # 加载数据
    async with source_session_factory() as session:
        universities = await load_universities_from_db(session, target_uni)

    await source_engine.dispose()

    if not universities:
        logger.error("未找到高校数据")
        return

    logger.info(f"📊 加载了 {len(universities)} 所高校")

    # 准备测试数据库
    TEST_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    if TEST_DB_PATH.exists():
        os.remove(TEST_DB_PATH)

    test_engine = create_async_engine(TEST_DB_URL, echo=False)
    test_session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    start_time = datetime.now()
    all_results = []
    total_depts_tested = 0
    total_sources_found = 0

    for uni_data in universities:
        uni_name = uni_data["name"]
        departments = uni_data["departments"]

        if not departments:
            logger.warning(f"⚠️  {uni_name}: 无学院数据，跳过")
            continue

        # 抽样模式：选取部分学院
        if mode == "sample" and not target_uni:
            # 优先选有 URL 的学院
            depts_with_url = [d for d in departments if d.get("homepage_url")]
            if len(depts_with_url) > sample_per_uni:
                selected = random.sample(depts_with_url, sample_per_uni)
            elif depts_with_url:
                selected = depts_with_url
            else:
                selected = departments[:sample_per_uni]
        else:
            selected = departments

        logger.info(f"\n{'='*60}")
        logger.info(f"🏫 {uni_name} ({len(selected)}/{len(departments)} 个学院)")
        logger.info(f"{'='*60}")

        # 执行定位
        locate_results = await locate_all_departments(
            departments=selected,
            university_name=uni_name,
            graduate_url=uni_data.get("graduate_url"),
        )

        # 写入测试数据库
        async with test_session_factory() as session:
            # 先写入高校
            university = University(
                name=uni_name,
                level="985",
                province="",
                homepage_url=uni_data.get("homepage_url", ""),
                graduate_url=uni_data.get("graduate_url", ""),
                auto_discovered=True,
            )
            session.add(university)
            await session.flush()

            for result in locate_results:
                # 写入学院
                dept = Department(
                    university_id=university.id,
                    name=result["department_name"],
                    homepage_url=next(
                        (d["homepage_url"] for d in selected if d["name"] == result["department_name"]),
                        None,
                    ),
                    auto_discovered=True,
                )
                session.add(dept)
                await session.flush()

                # 写入信息源（去重：同一学院不重复入库同一URL）
                seen_urls = set()
                for source in result["sources"]:
                    if source["url"] in seen_urls:
                        continue
                    seen_urls.add(source["url"])
                    dept_source = DepartmentSource(
                        department_id=dept.id,
                        source_url=source["url"],
                        source_type=source.get("type", "通知"),
                        priority=source.get("priority", 5),
                        parser_type="auto",
                    )
                    session.add(dept_source)

            await session.commit()

        # 统计
        for r in locate_results:
            total_depts_tested += 1
            total_sources_found += len(r["sources"])

        all_results.append({
            "university": uni_name,
            "departments_tested": len(selected),
            "departments_total": len(departments),
            "results": locate_results,
        })

    # 关闭 HTTP 客户端
    await http_client.close()

    # ==================== 汇总报告 ====================
    elapsed = (datetime.now() - start_time).total_seconds()

    # 统计各状态
    status_counts = {"success": 0, "partial": 0, "fallback": 0, "failed": 0, "skipped": 0}
    for uni_result in all_results:
        for r in uni_result["results"]:
            status_counts[r["status"]] = status_counts.get(r["status"], 0) + 1

    logger.info(f"\n{'='*70}")
    logger.info(f"📊 阶段二测试汇总报告")
    logger.info(f"{'='*70}")
    logger.info(f"⏱️  总耗时: {elapsed:.1f}s ({elapsed/60:.1f}min)")
    logger.info(f"🏫 高校数: {len(all_results)}")
    logger.info(f"🏛️  学院数: {total_depts_tested}")
    logger.info(f"📄 信息源总数: {total_sources_found}")
    logger.info(f"")
    logger.info(f"📈 定位结果统计:")
    logger.info(f"  ✅ 成功（含招生页）: {status_counts['success']} ({status_counts['success']/max(total_depts_tested,1)*100:.1f}%)")
    logger.info(f"  ⚠️  部分（仅通知/新闻）: {status_counts['partial']} ({status_counts['partial']/max(total_depts_tested,1)*100:.1f}%)")
    logger.info(f"  🔄 回退（研究生院）: {status_counts['fallback']} ({status_counts['fallback']/max(total_depts_tested,1)*100:.1f}%)")
    logger.info(f"  ❌ 失败: {status_counts['failed']} ({status_counts['failed']/max(total_depts_tested,1)*100:.1f}%)")
    if status_counts.get('skipped', 0) > 0:
        logger.info(f"  ⏭️  跳过（非学院实体）: {status_counts['skipped']}")

    # 覆盖率（成功 + 部分 + 回退），排除 skipped
    effective_total = total_depts_tested - status_counts.get('skipped', 0)
    covered = status_counts["success"] + status_counts["partial"] + status_counts["fallback"]
    coverage = covered / max(effective_total, 1) * 100
    logger.info(f"")
    logger.info(f"\n📊 总覆盖率: {covered}/{effective_total} ({coverage:.1f}%)")

    # 各高校详情
    logger.info(f"\n{'高校':<18} {'测试学院':>6} {'成功':>4} {'部分':>4} {'回退':>4} {'失败':>4} {'跳过':>4} {'信息源':>5} {'覆盖率':>6}")    logger.info("-" * 80)

    for uni_result in all_results:
        uni_name = uni_result["university"]
        tested = uni_result["departments_tested"]
        results = uni_result["results"]

        s = sum(1 for r in results if r["status"] == "success")
        p = sum(1 for r in results if r["status"] == "partial")
        f_back = sum(1 for r in results if r["status"] == "fallback")
        fail = sum(1 for r in results if r["status"] == "failed")
        skip = sum(1 for r in results if r["status"] == "skipped")
        sources = sum(len(r["sources"]) for r in results)
        eff = tested - skip
        cov = (s + p + f_back) / max(eff, 1) * 100

        logger.info(
            f"{uni_name:<16} {tested:>6} {s:>4} {p:>4} {f_back:>4} {fail:>4} {skip:>4} {sources:>5} {cov:>5.1f}%"
        )

    # 失败详情
    failed_depts = []
    for uni_result in all_results:
        for r in uni_result["results"]:
            if r["status"] == "failed":
                failed_depts.append(f"{uni_result['university']} - {r['department_name']}")

    if failed_depts:
        logger.info(f"\n❌ 定位失败的学院 ({len(failed_depts)} 个):")
        for dept in failed_depts[:20]:
            logger.info(f"  - {dept}")
        if len(failed_depts) > 20:
            logger.info(f"  ... 还有 {len(failed_depts) - 20} 个")

    # 保存 JSON 报告
    report_path = TEST_DB_PATH.parent / "phase2_locate_report.json"
    report_data = {
        "test_time": datetime.now().isoformat(),
        "mode": mode,
        "elapsed_seconds": round(elapsed, 1),
        "total_universities": len(all_results),
        "total_departments": total_depts_tested,
        "total_sources": total_sources_found,
        "status_counts": status_counts,
        "coverage_rate": round(coverage, 1),
        "universities": [],
    }

    for uni_result in all_results:
        uni_report = {
            "name": uni_result["university"],
            "departments_tested": uni_result["departments_tested"],
            "departments_total": uni_result["departments_total"],
            "results": [],
        }
        for r in uni_result["results"]:
            uni_report["results"].append({
                "department": r["department_name"],
                "status": r["status"],
                "sources": [
                    {
                        "url": s["url"],
                        "type": s.get("type", ""),
                        "method": s.get("method", ""),
                        "validation_score": s.get("validation_score", 0),
                    }
                    for s in r["sources"]
                ],
            })
        report_data["universities"].append(uni_report)

    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report_data, f, ensure_ascii=False, indent=2)
    logger.info(f"\n📄 详细报告已保存: {report_path}")

    # 最终判定
    logger.info(f"\n{'='*70}")
    if coverage >= 85:
        logger.info(f"🎉 覆盖率 {coverage:.1f}% ≥ 85%，阶段二定位达标！")
    elif coverage >= 70:
        logger.info(f"✅ 覆盖率 {coverage:.1f}%，接近目标（85%），可继续优化")
    else:
        logger.info(f"⚠️  覆盖率 {coverage:.1f}% < 70%，需要排查问题")
    logger.info(f"{'='*70}")

    await test_engine.dispose()

    return all_results


async def run_single_department_test():
    """快速测试单个学院的通知页定位"""
    # 测试几个代表性学院
    test_cases = [
        ("北京大学", "计算机学院", "https://cs.pku.edu.cn", "https://grs.pku.edu.cn"),
        ("清华大学", "计算机科学与技术系", "https://www.cs.tsinghua.edu.cn", "https://yz.tsinghua.edu.cn"),
        ("浙江大学", "计算机科学与技术学院", "https://www.cs.zju.edu.cn", "https://grs.zju.edu.cn"),
    ]

    logger.info("=" * 60)
    logger.info("🔍 单学院通知页定位快速测试")
    logger.info("=" * 60)

    for uni_name, dept_name, dept_url, grad_url in test_cases:
        logger.info(f"\n--- {uni_name} {dept_name} ---")
        logger.info(f"学院 URL: {dept_url}")

        results = await locate_notice_pages(
            dept_homepage=dept_url,
            dept_name=dept_name,
            university_name=uni_name,
            graduate_url=grad_url,
        )

        if results:
            for r in results:
                logger.info(
                    f"  ✅ [{r['type']}] {r['url']}"
                    f" (方法={r['method']}, 分数={r.get('validation_score', '?')})"
                )
        else:
            logger.warning(f"  ❌ 未找到通知页")

    await http_client.close()


if __name__ == "__main__":
    args = sys.argv[1:]

    if "--quick" in args:
        # 快速测试单个学院
        asyncio.run(run_single_department_test())
    elif "--full" in args:
        # 全量测试
        target = None
        if "--uni" in args:
            idx = args.index("--uni")
            if idx + 1 < len(args):
                target = args[idx + 1]
        asyncio.run(run_phase2_test(mode="full", target_uni=target))
    elif "--uni" in args:
        # 指定高校
        idx = args.index("--uni")
        if idx + 1 < len(args):
            target = args[idx + 1]
            asyncio.run(run_phase2_test(mode="full", target_uni=target))
        else:
            print("请指定高校名称，如: --uni 北京大学")
    else:
        # 默认抽样测试
        asyncio.run(run_phase2_test(mode="sample"))
