"""
阶段 B1：基于 `FacultyPageSource` 批量爬取并入库教师（Tier 2）

用法：
  # 跑所有已定位的师资页
  python scripts/run_tutor_crawl.py --db data/large_scale_test.db

  # 限定单个学校 / 学院
  python scripts/run_tutor_crawl.py --db data/xxx.db --university 北京大学
  python scripts/run_tutor_crawl.py --db data/xxx.db --department 计算机

  # 限制数量（POC）
  python scripts/run_tutor_crawl.py --db data/xxx.db --limit 5

  # dry-run（不入库）
  python scripts/run_tutor_crawl.py --db data/xxx.db --limit 2 --dry-run

  # 每个源最多 N 页
  python scripts/run_tutor_crawl.py --db data/xxx.db --max-pages 3
"""

from __future__ import annotations

import argparse
import asyncio
import sys
import time
from datetime import datetime
from pathlib import Path

from loguru import logger
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.config import settings  # noqa: E402
from src.models import Base  # noqa: E402
from src.models.university import University, Department  # noqa: E402
from src.models.tutor import (  # noqa: E402
    Tutor, FacultyPageSource, TutorCrawlLog,
)
from src.tutor.tutor_orchestrator import crawl_faculty_source  # noqa: E402


# ============================================================
# Tier 2 评分
# ============================================================

def _score_tier2_completeness(entry: dict) -> int:
    """给 Tier 2 基础卡片评分（0-60）。

    Tier 1 的上限是 100（含 publications/projects/biography）。
    Tier 2 只有列表页能抽到的字段，封顶 60。
    """
    score = 15  # 有姓名
    if entry.get("homepage_url"):
        score += 15
    if entry.get("title"):
        score += 10
    if entry.get("email"):
        score += 10
    if entry.get("photo_url"):
        score += 5
    if entry.get("research_areas"):
        score += 5
    return min(score, 60)


# ============================================================
# 入库：upsert
# ============================================================

async def upsert_tutor(
    session: AsyncSession,
    entry: dict,
    *,
    university_id: int,
    department_id: int,
    discipline: str | None,
    faculty_source_id: int,
) -> tuple[Tutor, str]:
    """
    插入或更新 Tutor。
    Returns: (tutor, action) — action 为 'insert' / 'update' / 'skip'
    """
    # 查找已有
    q = select(Tutor).where(and_(
        Tutor.department_id == department_id,
        Tutor.name == entry["name"],
    ))
    existing = (await session.execute(q)).scalar_one_or_none()

    completeness = _score_tier2_completeness(entry)
    new_tier = "tier2" if entry.get("homepage_url") else "tier3"

    fields = {
        "title": entry.get("title"),
        "research_areas": entry.get("research_areas") or [],
        "homepage_url": entry.get("homepage_url"),
        "email": entry.get("email"),
        "avatar_url": entry.get("photo_url"),
        "discipline": discipline,
        "source_url": entry.get("sub_source_url") or entry.get("homepage_url"),
        "crawl_tier": new_tier,
        "profile_completeness": completeness,
        "crawl_source": "official",
        "last_crawled_at": datetime.now(),
    }

    if existing is None:
        t = Tutor(
            university_id=university_id,
            department_id=department_id,
            name=entry["name"],
            **{k: v for k, v in fields.items() if v is not None},
        )
        session.add(t)
        await session.flush()
        return t, "insert"

    # 已存在：若现有 tier 更高（tier1/tier2 已有数据）不降级
    order = {"tier3": 0, "tier2": 1, "tier1": 2}
    existing_level = order.get(existing.crawl_tier, 0)
    new_level = order.get(new_tier, 0)

    if new_level < existing_level:
        # 不要覆盖更高完整度的数据，只更新 last_crawled_at
        existing.last_crawled_at = datetime.now()
        return existing, "skip"

    # 逐字段合并：新值不空则覆盖
    changed = False
    for k, v in fields.items():
        if v is None or (isinstance(v, list) and not v):
            continue
        if getattr(existing, k, None) != v:
            setattr(existing, k, v)
            changed = True
    existing.last_crawled_at = datetime.now()
    # completeness 取 max（避免从高 tier 降到低）
    if completeness > (existing.profile_completeness or 0):
        existing.profile_completeness = completeness
    return existing, "update" if changed else "skip"


# ============================================================
# 单源处理
# ============================================================

async def process_faculty_source(
    session: AsyncSession,
    fps: FacultyPageSource,
    *,
    max_pages: int = 5,
    dry_run: bool = False,
) -> dict:
    t0 = time.time()

    # 拿到 department + university 上下文
    dept_q = select(Department, University).join(
        University, Department.university_id == University.id
    ).where(Department.id == fps.department_id)
    row = (await session.execute(dept_q)).first()
    if not row:
        return {"status": "skip", "reason": "no_department"}
    dept, uni = row

    context = f"{uni.name}/{dept.name}"
    result = await crawl_faculty_source(fps.source_url, max_pages=max_pages)

    duration = time.time() - t0
    entries = result["entries"]
    status = result["status"]

    if not entries:
        if not dry_run:
            fps.fail_count = (fps.fail_count or 0) + 1
            await session.commit()
        return {
            "context": context,
            "status": status,
            "entries": 0,
            "duration": duration,
            "stats": result.get("stats", {}),
        }

    # 入库
    inserted = 0
    updated = 0
    skipped = 0

    for e in entries:
        if dry_run:
            continue
        try:
            _, action = await upsert_tutor(
                session, e,
                university_id=uni.id,
                department_id=dept.id,
                discipline=dept.discipline_category,
                faculty_source_id=fps.id,
            )
            if action == "insert":
                inserted += 1
            elif action == "update":
                updated += 1
            else:
                skipped += 1
        except Exception as ex:
            logger.warning(f"[{context}] upsert 失败 {e.get('name','?')}: {ex}")

    if not dry_run:
        fps.last_success_at = datetime.now()
        fps.last_tutor_count = len(entries)
        fps.fail_count = 0
        session.add(TutorCrawlLog(
            faculty_source_id=fps.id,
            stage="B1_list",
            status="success",
            tier_assigned="tier2",
            completeness=None,
            duration_seconds=duration,
            fields_extracted=["name", "title", "homepage_url"],
        ))
        await session.commit()

    return {
        "context": context,
        "status": "ok",
        "entries": len(entries),
        "inserted": inserted,
        "updated": updated,
        "skipped": skipped,
        "duration": duration,
        "stats": result.get("stats", {}),
    }


# ============================================================
# 主流程
# ============================================================

async def run(
    db_url: str,
    *,
    university_filter: str | None = None,
    department_filter: str | None = None,
    limit: int | None = None,
    max_pages: int = 5,
    dry_run: bool = False,
    concurrency: int = 2,
) -> None:
    engine = create_async_engine(db_url, echo=False, pool_pre_ping=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    # Step 1: 选择待爬的信息源
    async with SessionLocal() as session:
        q = (
            select(FacultyPageSource, Department, University)
            .join(Department, FacultyPageSource.department_id == Department.id)
            .join(University, Department.university_id == University.id)
            .where(FacultyPageSource.is_active == True)  # noqa: E712
        )
        if university_filter:
            q = q.where(University.name.contains(university_filter))
        if department_filter:
            q = q.where(Department.name.contains(department_filter))
        q = q.order_by(University.name, Department.name, FacultyPageSource.priority)
        if limit:
            q = q.limit(limit)
        rows = (await session.execute(q)).all()

    if not rows:
        logger.warning("没有匹配的师资页，退出")
        await engine.dispose()
        return

    logger.info(f"========== 阶段 B1：导师列表爬取 ==========")
    logger.info(f"师资页数量: {len(rows)} | 并发: {concurrency} | max_pages: {max_pages} | dry_run={dry_run}")

    sem = asyncio.Semaphore(concurrency)
    total_inserted = 0
    total_updated = 0
    stats_by_status = {"ok": 0, "empty": 0, "fetch_failed": 0, "skip": 0}

    async def _worker(idx: int, fps_id: int) -> dict:
        async with sem:
            async with SessionLocal() as s:
                fps = await s.get(FacultyPageSource, fps_id)
                r = await process_faculty_source(
                    s, fps, max_pages=max_pages, dry_run=dry_run,
                )
                logger.info(
                    f"[{idx + 1}/{len(rows)}] {r.get('context','?')}: "
                    f"{r['status']} | 教师 {r.get('entries', 0)} "
                    f"(+{r.get('inserted', 0)}新 {r.get('updated', 0)}更 {r.get('skipped', 0)}跳) | "
                    f"耗时 {r.get('duration', 0):.1f}s"
                )
                return r

    tasks = [_worker(i, fps.id) for i, (fps, _, _) in enumerate(rows)]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    for r in results:
        if isinstance(r, Exception):
            stats_by_status["fetch_failed"] = stats_by_status.get("fetch_failed", 0) + 1
            continue
        stats_by_status[r["status"]] = stats_by_status.get(r["status"], 0) + 1
        total_inserted += r.get("inserted", 0)
        total_updated += r.get("updated", 0)

    await engine.dispose()

    logger.info("========== 阶段 B1 完成 ==========")
    logger.info(f"师资页处理: {len(rows)}")
    for k, v in stats_by_status.items():
        logger.info(f"  - {k}: {v}")
    logger.info(f"新增导师: {total_inserted}")
    logger.info(f"更新导师: {total_updated}")

    # 覆盖率统计
    engine2 = create_async_engine(db_url, echo=False)
    S2 = async_sessionmaker(engine2, class_=AsyncSession, expire_on_commit=False)
    async with S2() as session:
        total_tutors = (await session.execute(select(func.count(Tutor.id)))).scalar() or 0
        tier_dist = await session.execute(
            select(Tutor.crawl_tier, func.count(Tutor.id)).group_by(Tutor.crawl_tier)
        )
        tier_dict = dict(tier_dist.fetchall())
    await engine2.dispose()

    logger.info(f"数据库导师总数: {total_tutors}")
    for tier, cnt in tier_dict.items():
        logger.info(f"  - {tier}: {cnt}")


def main():
    parser = argparse.ArgumentParser(description="阶段 B1：导师列表批量爬取")
    parser.add_argument("--db", type=str, default=None)
    parser.add_argument("--university", type=str, default=None)
    parser.add_argument("--department", type=str, default=None)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--max-pages", type=int, default=5)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--concurrency", type=int, default=2)
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
        max_pages=args.max_pages,
        dry_run=args.dry_run,
        concurrency=args.concurrency,
    ))


if __name__ == "__main__":
    main()
