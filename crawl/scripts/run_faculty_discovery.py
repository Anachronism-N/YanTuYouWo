"""
阶段 A：批量为学院定位「师资页」

对应 `run_discovery.py` 的通知页定位流程，但目标是 `FacultyPageSource` 表。

用法：
  # 全量（所有 985 高校的所有激活学院）
  python scripts/run_faculty_discovery.py

  # 指定数据库
  python scripts/run_faculty_discovery.py --db data/yantu_crawl.db

  # 仅处理某所学校
  python scripts/run_faculty_discovery.py --university 北京大学

  # 仅处理某所学校某个学院
  python scripts/run_faculty_discovery.py --university 清华大学 --department 计算机

  # 限制学院数量（调试）
  python scripts/run_faculty_discovery.py --limit 10

  # 只处理尚未定位到师资页的学院
  python scripts/run_faculty_discovery.py --only-missing

  # 仅对新入库的学院（近 7 天）执行
  python scripts/run_faculty_discovery.py --since-days 7

  # 预演：只打印候选，不入库
  python scripts/run_faculty_discovery.py --university 北京大学 --limit 1 --dry-run
"""

from __future__ import annotations

import argparse
import asyncio
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

from loguru import logger
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.config import settings  # noqa: E402
from src.models import Base  # noqa: E402
from src.models.university import University, Department  # noqa: E402
from src.models.tutor import FacultyPageSource  # noqa: E402
from src.tutor.faculty_locator import locate_faculty_pages  # noqa: E402


# ============================================================
# 数据库工具
# ============================================================

def _build_engine(db_url: str):
    return create_async_engine(db_url, echo=False, pool_pre_ping=True)


async def _ensure_tables(engine) -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


# ============================================================
# 主流程
# ============================================================

async def process_department(
    session: AsyncSession,
    dept: Department,
    university: University,
    *,
    dry_run: bool = False,
) -> dict:
    """为单个学院定位师资页并入库"""
    t0 = time.time()

    homepage = dept.homepage_url
    if not homepage:
        return {"status": "skip", "reason": "no_homepage", "candidates": 0, "duration": 0}

    try:
        candidates = await locate_faculty_pages(
            dept_homepage=homepage,
            dept_name=dept.name,
            university_name=university.name,
            graduate_url=university.graduate_url,
        )
    except Exception as e:
        logger.warning(f"[{university.name}/{dept.name}] 异常: {e}")
        return {"status": "error", "reason": str(e), "candidates": 0, "duration": time.time() - t0}

    duration = time.time() - t0

    if not candidates:
        return {"status": "empty", "reason": "no_candidates", "candidates": 0, "duration": duration}

    if dry_run:
        logger.info(f"[DRY] {university.name}/{dept.name} → {len(candidates)} 个候选:")
        for c in candidates:
            logger.info(
                f"    - [{c['type']}] {c['validation_score']}分 ({c['method']}) "
                f"{c['text']} → {c['url']}"
            )
        return {"status": "dry", "candidates": len(candidates), "duration": duration}

    # 入库：先查已有，再插入新增
    existing_urls_q = await session.execute(
        select(FacultyPageSource.source_url).where(FacultyPageSource.department_id == dept.id)
    )
    existing_urls = {row[0] for row in existing_urls_q.fetchall()}

    new_rows = 0
    updated_rows = 0
    for c in candidates:
        if c["url"] in existing_urls:
            updated_rows += 1
            continue
        row = FacultyPageSource(
            department_id=dept.id,
            source_url=c["url"],
            source_type=c["type"],
            priority=c.get("priority", 1),
            validation_score=c.get("validation_score"),
            discovery_method=c.get("method"),
            is_active=True,
        )
        session.add(row)
        new_rows += 1

    await session.commit()
    return {
        "status": "ok",
        "candidates": len(candidates),
        "new": new_rows,
        "existing": updated_rows,
        "duration": duration,
    }


async def run(
    db_url: str,
    *,
    university_filter: str | None = None,
    department_filter: str | None = None,
    limit: int | None = None,
    only_missing: bool = False,
    since_days: int | None = None,
    dry_run: bool = False,
    concurrency: int = 3,
) -> None:
    """批量执行师资页定位"""
    engine = _build_engine(db_url)
    await _ensure_tables(engine)
    SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    # Step 1: 选出待处理学院
    # 注意：不过滤 `Department.is_active`。该字段主要反映「通知爬取」是否成功，
    # 与师资页定位正交 —— 很多无通知源的学院仍有师资名录。
    async with SessionLocal() as session:
        q = (
            select(Department, University)
            .join(University, Department.university_id == University.id)
            .where(Department.homepage_url.isnot(None))
        )
        if university_filter:
            q = q.where(University.name.contains(university_filter))
        if department_filter:
            q = q.where(Department.name.contains(department_filter))
        if since_days:
            threshold = datetime.now() - timedelta(days=since_days)
            q = q.where(Department.created_at >= threshold)

        # only_missing: 排除已有 faculty_page_sources 记录的学院
        if only_missing:
            subq = select(FacultyPageSource.department_id).distinct()
            q = q.where(~Department.id.in_(subq))

        q = q.order_by(University.name, Department.name)
        if limit:
            q = q.limit(limit)

        rows = (await session.execute(q)).all()

    if not rows:
        logger.warning("没有匹配的学院，退出")
        await engine.dispose()
        return

    total = len(rows)
    logger.info(f"========== 阶段 A：师资页定位 ==========")
    logger.info(f"待处理学院: {total} 个 | 并发: {concurrency} | dry_run={dry_run}")

    # Step 2: 并发处理（但控制对每所学校的串行访问，避免被限流）
    stats = {"ok": 0, "empty": 0, "skip": 0, "error": 0, "dry": 0}
    total_new = 0
    total_existing = 0

    # 为了简单，用简单的并发信号量控制
    sem = asyncio.Semaphore(concurrency)

    async def _worker(idx: int, dept: Department, uni: University) -> dict:
        async with sem:
            async with SessionLocal() as s:
                # 重新加载（避免跨 session 对象）
                dept_r = await s.get(Department, dept.id)
                uni_r = await s.get(University, uni.id)
                result = await process_department(
                    s, dept_r, uni_r, dry_run=dry_run,
                )
            logger.info(
                f"[{idx + 1}/{total}] {uni.name}/{dept.name}: "
                f"{result['status']} | "
                f"候选 {result.get('candidates', 0)} "
                f"(+{result.get('new', 0)}新 {result.get('existing', 0)}旧) | "
                f"耗时 {result.get('duration', 0):.1f}s"
            )
            return result

    tasks = [_worker(i, dept, uni) for i, (dept, uni) in enumerate(rows)]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    for r in results:
        if isinstance(r, Exception):
            stats["error"] += 1
            continue
        stats[r["status"]] = stats.get(r["status"], 0) + 1
        total_new += r.get("new", 0)
        total_existing += r.get("existing", 0)

    # Step 3: 统计报告
    await engine.dispose()

    logger.info("========== 阶段 A 完成 ==========")
    logger.info(f"学院总数  : {total}")
    logger.info(f"成功      : {stats.get('ok', 0)}")
    logger.info(f"无候选    : {stats.get('empty', 0)}")
    logger.info(f"跳过      : {stats.get('skip', 0)}")
    logger.info(f"异常      : {stats.get('error', 0)}")
    if dry_run:
        logger.info(f"Dry-run   : {stats.get('dry', 0)}（未写入）")
    else:
        logger.info(f"新增信息源: {total_new}")
        logger.info(f"已存在    : {total_existing}")

    # 覆盖率统计
    engine2 = _build_engine(db_url)
    Session2 = async_sessionmaker(engine2, class_=AsyncSession, expire_on_commit=False)
    async with Session2() as session:
        total_depts = (await session.execute(select(func.count(Department.id)))).scalar() or 0
        depts_with_source = (await session.execute(
            select(func.count(func.distinct(FacultyPageSource.department_id)))
        )).scalar() or 0
        total_sources = (await session.execute(
            select(func.count(FacultyPageSource.id))
        )).scalar() or 0
    await engine2.dispose()

    if total_depts > 0:
        coverage = depts_with_source / total_depts * 100
        logger.info(
            f"覆盖率    : {depts_with_source}/{total_depts} 学院已有师资页 "
            f"({coverage:.1f}%)，共 {total_sources} 个信息源"
        )


def main():
    parser = argparse.ArgumentParser(description="批量定位学院师资页（阶段 A）")
    parser.add_argument("--db", type=str, default=None, help="SQLite 文件路径")
    parser.add_argument("--university", type=str, default=None, help="学校名（模糊匹配）")
    parser.add_argument("--department", type=str, default=None, help="学院名（模糊匹配）")
    parser.add_argument("--limit", type=int, default=None, help="处理学院数量上限")
    parser.add_argument("--only-missing", action="store_true", help="只处理尚未定位过的学院")
    parser.add_argument("--since-days", type=int, default=None, help="只处理近 N 天新增的学院")
    parser.add_argument("--dry-run", action="store_true", help="不写入数据库，仅预演")
    parser.add_argument("--concurrency", type=int, default=3, help="并发数")
    args = parser.parse_args()

    if args.db:
        db_url = f"sqlite+aiosqlite:///{Path(args.db).resolve()}"
    else:
        db_url = settings.DATABASE_URL

    asyncio.run(run(
        db_url,
        university_filter=args.university,
        department_filter=args.department,
        limit=args.limit,
        only_missing=args.only_missing,
        since_days=args.since_days,
        dry_run=args.dry_run,
        concurrency=args.concurrency,
    ))


if __name__ == "__main__":
    main()
