"""大规模测试脚本 - 从头运行完整的阶段1+2+3流程。

用法：
    # 运行完整流程（阶段1+2+3）
    python scripts/run_large_scale_test.py

    # 只运行阶段3（使用已有数据库）
    python scripts/run_large_scale_test.py --phase3-only

    # 指定数据库路径
    python scripts/run_large_scale_test.py --db data/large_scale_test.db

    # 指定最大翻页数
    python scripts/run_large_scale_test.py --max-pages 3
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys
import time
from datetime import datetime
from pathlib import Path

# 确保项目根目录在 sys.path 中
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from loguru import logger


async def run_phase1_and_2(db_path: str):
    """运行阶段1（高校+学院发现）和阶段2（信息源定位）"""
    from src.config import settings

    settings.DATABASE_URL = f"sqlite+aiosqlite:///{db_path}"
    settings.ensure_dirs()

    import src.storage.database as db_module
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

    db_module.engine = create_async_engine(settings.DATABASE_URL, echo=False, pool_pre_ping=True)
    db_module.async_session = async_sessionmaker(db_module.engine, class_=AsyncSession, expire_on_commit=False)
    await db_module.init_db()

    from scripts.run_discovery import run_phase1, run_phase2
    from src.utils.http_client import http_client

    try:
        logger.info("=" * 70)
        logger.info("  大规模测试 - 阶段1：构建高校学院 URL 库")
        logger.info("=" * 70)

        t0 = time.time()
        await run_phase1()
        t1 = time.time()
        logger.info(f"阶段1耗时: {t1 - t0:.0f}s")

        logger.info("=" * 70)
        logger.info("  大规模测试 - 阶段2：定位信息发布页")
        logger.info("=" * 70)

        await run_phase2()
        t2 = time.time()
        logger.info(f"阶段2耗时: {t2 - t1:.0f}s")

    finally:
        await http_client.close()
        await db_module.engine.dispose()


async def run_optimize(db_path: str):
    """运行信息源优化（清理无效源）"""
    from scripts.optimize_sources import run_fix

    logger.info("=" * 70)
    logger.info("  大规模测试 - 优化：清理无效信息源")
    logger.info("=" * 70)

    t0 = time.time()
    await run_fix(db_path)
    t1 = time.time()
    logger.info(f"优化耗时: {t1 - t0:.0f}s")


async def run_phase3(db_path: str, max_pages: int = 3):
    """运行阶段3（爬取），按类型分批运行"""
    from scripts.run_crawl import run_crawl

    source_types = ["招生", "通知", "新闻"]
    total_start = time.time()

    for source_type in source_types:
        logger.info("=" * 70)
        logger.info(f"  大规模测试 - 阶段3：爬取 [{source_type}] 类信息源")
        logger.info("=" * 70)

        t0 = time.time()
        await run_crawl(
            db_path=db_path,
            max_pages=max_pages,
            source_type=source_type,
        )
        t1 = time.time()
        logger.info(f"[{source_type}] 爬取耗时: {t1 - t0:.0f}s")

    total_end = time.time()
    logger.info(f"阶段3总耗时: {total_end - total_start:.0f}s")


async def generate_report(db_path: str):
    """生成测试报告"""
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
    from sqlalchemy import text

    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}", echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        # 基础统计
        uni_count = (await session.execute(text("SELECT COUNT(*) FROM universities"))).scalar()
        dept_count = (await session.execute(text("SELECT COUNT(*) FROM departments WHERE is_active=1"))).scalar()
        source_count = (await session.execute(text("SELECT COUNT(*) FROM department_sources WHERE is_active=1"))).scalar()

        # 按类型统计信息源
        source_by_type = (await session.execute(text(
            "SELECT source_type, COUNT(*) as cnt FROM department_sources WHERE is_active=1 GROUP BY source_type ORDER BY cnt DESC"
        ))).fetchall()

        # 爬取统计
        total_crawled = (await session.execute(text("SELECT COUNT(*) FROM crawl_logs"))).scalar()
        success_count = (await session.execute(text("SELECT COUNT(*) FROM crawl_logs WHERE error_message IS NULL"))).scalar()
        failed_count = (await session.execute(text("SELECT COUNT(*) FROM crawl_logs WHERE error_message IS NOT NULL"))).scalar()

        # 按类型统计爬取
        crawl_by_type = (await session.execute(text("""
            SELECT ds.source_type,
                   COUNT(cl.id) as total,
                   SUM(CASE WHEN cl.error_message IS NULL THEN 1 ELSE 0 END) as success,
                   SUM(CASE WHEN cl.error_message IS NOT NULL THEN 1 ELSE 0 END) as failed,
                   SUM(cl.new_items) as new_items,
                   SUM(cl.relevant_items) as relevant_items
            FROM crawl_logs cl
            JOIN department_sources ds ON cl.source_id = ds.id
            GROUP BY ds.source_type
        """))).fetchall()

        # 入库通知统计
        notice_count = (await session.execute(text("SELECT COUNT(*) FROM admission_notices"))).scalar()
        notice_by_type = (await session.execute(text(
            "SELECT program_type, COUNT(*) as cnt FROM admission_notices GROUP BY program_type ORDER BY cnt DESC"
        ))).fetchall()

        # 覆盖高校
        covered_unis = (await session.execute(text(
            "SELECT COUNT(DISTINCT university_id) FROM admission_notices"
        ))).scalar()

        # 按高校统计入库
        uni_notices = (await session.execute(text("""
            SELECT u.name, COUNT(an.id) as cnt
            FROM admission_notices an
            JOIN universities u ON an.university_id = u.id
            GROUP BY u.name ORDER BY cnt DESC
        """))).fetchall()

        # 失败源详情
        failed_sources = (await session.execute(text("""
            SELECT ds.source_type, u.name, d.name, ds.source_url, cl.error_message
            FROM crawl_logs cl
            JOIN department_sources ds ON cl.source_id = ds.id
            JOIN departments d ON ds.department_id = d.id
            JOIN universities u ON d.university_id = u.id
            WHERE cl.error_message IS NOT NULL
            ORDER BY ds.source_type, u.name
        """))).fetchall()

    await engine.dispose()

    # 输出报告
    success_rate = success_count / max(total_crawled, 1) * 100

    report = f"""
{'=' * 70}
  📊 大规模测试报告
  生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
  数据库: {db_path}
{'=' * 70}

📌 基础数据
  高校数: {uni_count}
  学院数: {dept_count}
  信息源数: {source_count}
  信息源分布: {', '.join(f'{t}={c}' for t, c in source_by_type)}

📌 爬取结果
  总爬取: {total_crawled}
  成功: {success_count}
  失败: {failed_count}
  成功率: {success_rate:.1f}%

  按类型:
"""
    for row in crawl_by_type:
        stype, total, success, failed, new_items, relevant = row
        rate = success / max(total, 1) * 100
        report += f"    [{stype}] {success}/{total} ({rate:.1f}%) | 新发现: {new_items or 0} | 高相关: {relevant or 0}\n"

    report += f"""
📌 入库通知
  总入库: {notice_count}
  覆盖高校: {covered_unis}
  按类型: {', '.join(f'{t}={c}' for t, c in notice_by_type)}

  按高校:
"""
    for name, cnt in uni_notices:
        report += f"    {name}: {cnt}\n"

    if failed_sources:
        report += f"""
📌 失败源详情 ({len(failed_sources)} 个)
"""
        for stype, uni, dept, url, err in failed_sources:
            report += f"    [{stype}] {uni}/{dept}: {url}\n"
            report += f"      错误: {err}\n"

    report += f"\n{'=' * 70}\n"

    logger.info(report)

    # 保存报告到文件
    report_path = Path(db_path).parent / "logs" / f"large_scale_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(report, encoding="utf-8")
    logger.info(f"报告已保存: {report_path}")

    return {
        "success_rate": success_rate,
        "total_sources": source_count,
        "total_crawled": total_crawled,
        "success_count": success_count,
        "failed_count": failed_count,
        "notice_count": notice_count,
        "covered_unis": covered_unis,
    }


async def main():
    parser = argparse.ArgumentParser(description="大规模测试")
    parser.add_argument("--db", type=str, default="data/large_scale_test.db", help="数据库路径")
    parser.add_argument("--phase3-only", action="store_true", help="只运行阶段3（使用已有数据库）")
    parser.add_argument("--max-pages", type=int, default=3, help="每个信息源最大翻页数")
    parser.add_argument("--report-only", action="store_true", help="只生成报告")
    args = parser.parse_args()

    db_path = str(Path(args.db).resolve())

    # 配置日志
    logger.remove()
    log_path = Path(db_path).parent / "logs" / f"large_scale_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
    log_path.parent.mkdir(parents=True, exist_ok=True)
    logger.add(sys.stderr, level="INFO", format="{time:HH:mm:ss} | {level: <5} | {message}")
    logger.add(str(log_path), level="DEBUG", format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {message}")

    logger.info(f"日志文件: {log_path}")

    total_start = time.time()

    if args.report_only:
        await generate_report(db_path)
        return

    if not args.phase3_only:
        # 删除旧数据库（如果存在）
        if os.path.exists(db_path):
            os.remove(db_path)
            logger.info(f"已删除旧数据库: {db_path}")

        await run_phase1_and_2(db_path)
        # 优化不在这里运行，因为需要先爬取一次才知道哪些源有问题

    # 运行阶段3
    await run_phase3(db_path, max_pages=args.max_pages)

    # 生成报告
    result = await generate_report(db_path)

    total_end = time.time()
    logger.info(f"\n总耗时: {total_end - total_start:.0f}s ({(total_end - total_start) / 60:.1f}min)")

    # 如果成功率低于90%，运行分析并修复
    if result["success_rate"] < 90:
        logger.info(f"\n⚠️ 成功率 {result['success_rate']:.1f}% < 90%，运行失败源分析...")
        from scripts.analyze_failed_sources import run_analysis
        await run_analysis(db_path, do_fix=True)

        # 重新生成报告
        logger.info("\n修复后重新统计...")
        await generate_report(db_path)


if __name__ == "__main__":
    asyncio.run(main())
