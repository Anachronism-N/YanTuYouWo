"""
阶段 B2：批量调用 LLM 提取教师主页 → 升级到 Tier 1

用法：
  # 处理某所学校的全部 Tier 2 教师
  python scripts/run_tutor_profile.py --db data/large_scale_test.db --university 武汉大学

  # 处理指定学院（推荐 POC）
  python scripts/run_tutor_profile.py --db data/xxx.db \\
      --university 北京航空航天大学 --department 计算机学院 --limit 5

  # 跳过已经是 Tier 1 的（增量模式）
  python scripts/run_tutor_profile.py --db data/xxx.db --only-tier2

  # 保留 dry-run 输出
  python scripts/run_tutor_profile.py --db data/xxx.db --limit 1 --dry-run
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
from src.models.tutor import Tutor, TutorCrawlLog  # noqa: E402
from src.tutor.profile_extractor import extract_profile  # noqa: E402


async def process_tutor(
    session: AsyncSession,
    tutor: Tutor,
    *,
    dry_run: bool = False,
) -> dict:
    """对单位老师调 LLM，更新 Tier 1 字段"""
    t0 = time.time()

    if not tutor.homepage_url:
        return {"status": "skip", "reason": "no_homepage", "duration": 0}

    # 获取 university/department
    uni = await session.get(University, tutor.university_id)
    dept = (
        await session.get(Department, tutor.department_id)
        if tutor.department_id else None
    )

    result = await extract_profile(
        tutor.homepage_url,
        name=tutor.name,
        university=uni.name if uni else "",
        department=dept.name if dept else "",
    )

    duration = time.time() - t0

    if result["status"] != "ok":
        if not dry_run:
            session.add(TutorCrawlLog(
                tutor_id=tutor.id,
                stage="B2_profile",
                status=result["status"],
                duration_seconds=duration,
                error_message=f"raw_text={result.get('raw_text_length', 0)}",
            ))
            await session.commit()
        return {
            "status": result["status"],
            "name": tutor.name,
            "duration": duration,
        }

    data = result["data"]
    completeness = result["completeness"]

    if dry_run:
        logger.info(f"[DRY] {tutor.name}: completeness={completeness}, fields={list(data.keys())}")
        for k, v in data.items():
            preview = (str(v)[:80]) if not isinstance(v, list) else f"({len(v)} 项)"
            logger.info(f"    {k}: {preview}")
        return {
            "status": "ok_dry",
            "name": tutor.name,
            "completeness": completeness,
            "duration": duration,
        }

    # 写入 — 仅当新数据有效时才覆盖
    if data.get("title"):
        tutor.title = data["title"]
    if data.get("research_areas"):
        tutor.research_areas = data["research_areas"]
    if data.get("biography"):
        tutor.biography = data["biography"]
    if data.get("email") and not tutor.email:
        tutor.email = data["email"]
    if data.get("phone"):
        tutor.phone = data["phone"]
    if data.get("office_address"):
        tutor.office_address = data["office_address"]
    if data.get("education"):
        tutor.education = data["education"]
    if data.get("experience"):
        tutor.experience = data["experience"]
    if data.get("publications"):
        tutor.publications = data["publications"]
        tutor.paper_count = len(data["publications"])
    if data.get("projects"):
        tutor.projects = data["projects"]
        tutor.project_count = len(data["projects"])
    if data.get("awards"):
        tutor.awards = data["awards"]
    if data.get("recruiting_info"):
        tutor.recruiting_info = data["recruiting_info"]
    if data.get("recruiting_requirements"):
        tutor.recruiting_requirements = data["recruiting_requirements"]
    if "is_recruiting" in data:
        tutor.is_recruiting = data["is_recruiting"]

    # tier 升级
    if completeness >= 60:
        tutor.crawl_tier = "tier1"
        tutor.profile_completeness = max(tutor.profile_completeness or 0, completeness)
    elif completeness >= 40:
        # 中等完整度：保持 tier2 但提升 completeness
        tutor.profile_completeness = max(tutor.profile_completeness or 0, completeness)

    tutor.last_crawled_at = datetime.now()
    if tutor.crawl_source != "official":
        tutor.crawl_source = "official"

    session.add(TutorCrawlLog(
        tutor_id=tutor.id,
        stage="B2_profile",
        status="success",
        tier_assigned=tutor.crawl_tier,
        completeness=completeness,
        duration_seconds=duration,
        fields_extracted=list(data.keys()),
        llm_model=settings.llm_models.get("extract", {}).get("model"),
    ))
    await session.commit()

    return {
        "status": "ok",
        "name": tutor.name,
        "completeness": completeness,
        "tier": tutor.crawl_tier,
        "fields": len(data),
        "duration": duration,
    }


async def run(
    db_url: str,
    *,
    university_filter: str | None = None,
    department_filter: str | None = None,
    only_tier2: bool = True,
    limit: int | None = None,
    dry_run: bool = False,
    concurrency: int = 3,
) -> None:
    if not settings.SILICONFLOW_API_KEY:
        logger.error("缺少 SILICONFLOW_API_KEY，无法调用 LLM。请配置 .env")
        return

    engine = create_async_engine(db_url, echo=False, pool_pre_ping=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    # 选出待处理教师
    async with SessionLocal() as session:
        q = (
            select(Tutor.id)
            .join(University, Tutor.university_id == University.id)
            .outerjoin(Department, Tutor.department_id == Department.id)
            .where(Tutor.homepage_url.isnot(None))
        )
        if university_filter:
            q = q.where(University.name.contains(university_filter))
        if department_filter:
            q = q.where(Department.name.contains(department_filter))
        if only_tier2:
            q = q.where(Tutor.crawl_tier != "tier1")
        # 优先处理 completeness 较高的（更可能是真实详情）
        q = q.order_by(Tutor.profile_completeness.desc(), Tutor.id)
        if limit:
            q = q.limit(limit)
        ids = [r[0] for r in (await session.execute(q)).all()]

    if not ids:
        logger.warning("没有待处理的教师")
        await engine.dispose()
        return

    logger.info(f"========== 阶段 B2：LLM Profile 提取 ==========")
    logger.info(f"待处理教师: {len(ids)} | 并发: {concurrency} | dry_run={dry_run}")

    sem = asyncio.Semaphore(concurrency)
    stats: dict = {"ok": 0, "ok_dry": 0, "fetch_failed": 0, "no_content": 0,
                   "llm_failed": 0, "invalid": 0, "skip": 0}
    completeness_total = 0

    async def _worker(idx: int, tutor_id: int) -> dict:
        async with sem:
            async with SessionLocal() as s:
                tutor = await s.get(Tutor, tutor_id)
                if tutor is None:
                    return {"status": "skip"}
                r = await process_tutor(s, tutor, dry_run=dry_run)
            logger.info(
                f"[{idx + 1}/{len(ids)}] {r.get('name','?'):<8} "
                f"{r['status']:<14} | completeness={r.get('completeness', 0):>3} "
                f"| tier={r.get('tier', '-'):<6} | {r.get('duration', 0):>4.1f}s"
            )
            return r

    tasks = [_worker(i, tid) for i, tid in enumerate(ids)]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    for r in results:
        if isinstance(r, Exception):
            stats["llm_failed"] += 1
            continue
        stats[r["status"]] = stats.get(r["status"], 0) + 1
        completeness_total += r.get("completeness", 0)

    await engine.dispose()

    logger.info("========== 阶段 B2 完成 ==========")
    for k, v in stats.items():
        logger.info(f"  - {k}: {v}")
    if stats["ok"]:
        logger.info(f"平均完整度: {completeness_total / stats['ok']:.1f}/100")

    # 数据库 tier 分布
    engine2 = create_async_engine(db_url, echo=False)
    S2 = async_sessionmaker(engine2, class_=AsyncSession, expire_on_commit=False)
    async with S2() as session:
        tier_dist = await session.execute(
            select(Tutor.crawl_tier, func.count(Tutor.id)).group_by(Tutor.crawl_tier)
        )
        tier_dict = dict(tier_dist.fetchall())
    await engine2.dispose()
    logger.info("Tier 分布:")
    for tier, cnt in sorted(tier_dict.items()):
        logger.info(f"  - {tier}: {cnt}")


def main():
    parser = argparse.ArgumentParser(description="阶段 B2: LLM Profile 提取")
    parser.add_argument("--db", type=str, default=None)
    parser.add_argument("--university", type=str, default=None)
    parser.add_argument("--department", type=str, default=None)
    parser.add_argument("--only-tier2", action="store_true", default=True,
                        help="跳过已是 tier1 的教师（默认开启）")
    parser.add_argument("--all", action="store_true", help="处理所有教师（包括 tier1）")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--concurrency", type=int, default=3)
    args = parser.parse_args()

    db_url = (
        f"sqlite+aiosqlite:///{Path(args.db).resolve()}"
        if args.db else settings.DATABASE_URL
    )

    asyncio.run(run(
        db_url,
        university_filter=args.university,
        department_filter=args.department,
        only_tier2=not args.all,
        limit=args.limit,
        dry_run=args.dry_run,
        concurrency=args.concurrency,
    ))


if __name__ == "__main__":
    main()
