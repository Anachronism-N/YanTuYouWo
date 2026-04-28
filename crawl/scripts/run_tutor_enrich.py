"""
阶段 C：通过 OpenAlex 等外部数据源补充导师学术指标

用法：
  python scripts/run_tutor_enrich.py --db data/large_scale_test.db
  python scripts/run_tutor_enrich.py --db data/xxx.db --university 武汉大学 --limit 10
  python scripts/run_tutor_enrich.py --db data/xxx.db --skip-existing  # 跳过已有 h_index 的
"""

from __future__ import annotations

import argparse
import asyncio
import sys
import time
from datetime import datetime
from pathlib import Path

from loguru import logger
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.config import settings  # noqa: E402
from src.models import Base  # noqa: E402
from src.models.university import University, Department  # noqa: E402
from src.models.tutor import Tutor, TutorCrawlLog  # noqa: E402
from src.tutor.enrichers.openalex_enricher import enrich_from_openalex, OpenAlexClient  # noqa: E402


async def enrich_tutor(
    session: AsyncSession,
    tutor: Tutor,
    *,
    client: OpenAlexClient,
    dry_run: bool = False,
) -> dict:
    t0 = time.time()
    uni = await session.get(University, tutor.university_id)
    if not uni:
        return {"status": "skip", "reason": "no_university", "duration": 0}

    result = await enrich_from_openalex(
        name=tutor.name,
        university=uni.name,
        client=client,
    )
    duration = time.time() - t0

    if result["status"] != "ok":
        if not dry_run:
            session.add(TutorCrawlLog(
                tutor_id=tutor.id,
                stage="C_enrich",
                status=result["status"],
                duration_seconds=duration,
                error_message=f"method={result.get('match_method')}",
            ))
            await session.commit()
        return {
            "status": result["status"],
            "name": tutor.name,
            "duration": duration,
        }

    if dry_run:
        logger.info(
            f"[DRY] {tutor.name}: h={result.get('h_index')} "
            f"works={result.get('works_count')} match={result.get('match_name')}"
        )
        return {
            "status": "ok_dry",
            "name": tutor.name,
            "duration": duration,
        }

    # 写入学术指标
    if result.get("h_index") is not None:
        tutor.h_index = result["h_index"]
    if result.get("i10_index") is not None:
        tutor.i10_index = result["i10_index"]
    if result.get("citation_count") is not None:
        tutor.citation_count = result["citation_count"]
    if result.get("works_count") is not None:
        if not tutor.paper_count or tutor.paper_count < result["works_count"]:
            tutor.paper_count = result["works_count"]

    # AMiner 级深度数据（核心新增）
    if result.get("papers"):
        tutor.papers = result["papers"]
    if result.get("coauthors"):
        tutor.coauthors = result["coauthors"]
    if result.get("topics"):
        tutor.topics = result["topics"]
    if result.get("yearly_stats"):
        tutor.yearly_stats = result["yearly_stats"]
    # 兼容旧字段
    if result.get("recent_papers"):
        tutor.recent_papers = result["recent_papers"]

    # external_ids
    ext = tutor.external_ids or {}
    if result.get("openalex_id"):
        ext["openalex_id"] = result["openalex_id"]
    tutor.external_ids = ext
    tutor.last_crawled_at = datetime.now()

    # crawl_source 标记（不覆盖 official）
    if not tutor.crawl_source:
        tutor.crawl_source = "openalex"

    # 提升 completeness（深度数据加分）
    bonus = 0
    if result.get("h_index"):
        bonus += 5
    if result.get("papers"):
        bonus += min(len(result["papers"]) // 5, 10)  # 论文越多加越多，上限 10
    if result.get("coauthors"):
        bonus += 3
    if result.get("topics"):
        bonus += 3
    if result.get("yearly_stats"):
        bonus += 2
    tutor.profile_completeness = min(
        (tutor.profile_completeness or 0) + bonus, 100
    )
    if tutor.profile_completeness >= 60 and tutor.crawl_tier != "tier1":
        tutor.crawl_tier = "tier1"

    fields = ["h_index", "i10_index", "citation_count"]
    if result.get("papers"): fields.append(f"papers({len(result['papers'])})")
    if result.get("coauthors"): fields.append(f"coauthors({len(result['coauthors'])})")
    if result.get("topics"): fields.append(f"topics({len(result['topics'])})")
    if result.get("yearly_stats"): fields.append(f"yearly({len(result['yearly_stats'])})")

    session.add(TutorCrawlLog(
        tutor_id=tutor.id,
        stage="C_enrich",
        status="success",
        tier_assigned=tutor.crawl_tier,
        completeness=tutor.profile_completeness,
        duration_seconds=duration,
        fields_extracted=fields,
    ))
    await session.commit()

    return {
        "status": "ok",
        "name": tutor.name,
        "h_index": result.get("h_index"),
        "works": result.get("works_count"),
        "papers": len(result.get("papers") or []),
        "match_name": result.get("match_name"),
        "method": result.get("match_method"),
        "duration": duration,
    }


async def run(
    db_url: str,
    *,
    university_filter: str | None = None,
    department_filter: str | None = None,
    skip_existing: bool = False,
    limit: int | None = None,
    dry_run: bool = False,
    concurrency: int = 5,
) -> None:
    engine = create_async_engine(db_url, echo=False, pool_pre_ping=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with SessionLocal() as session:
        q = (
            select(Tutor.id)
            .join(University, Tutor.university_id == University.id)
            .outerjoin(Department, Tutor.department_id == Department.id)
        )
        if university_filter:
            q = q.where(University.name.contains(university_filter))
        if department_filter:
            q = q.where(Department.name.contains(department_filter))
        if skip_existing:
            q = q.where(Tutor.h_index.is_(None))
        # 优先处理 Tier 1 (有 LLM 提取过的)
        q = q.order_by(Tutor.crawl_tier.desc(), Tutor.profile_completeness.desc(), Tutor.id)
        if limit:
            q = q.limit(limit)
        ids = [r[0] for r in (await session.execute(q)).all()]

    if not ids:
        logger.warning("没有待处理的教师")
        await engine.dispose()
        return

    logger.info(f"========== 阶段 C：OpenAlex 学术指标补充 ==========")
    logger.info(f"待处理教师: {len(ids)} | 并发: {concurrency} | dry_run={dry_run}")

    sem = asyncio.Semaphore(concurrency)
    client = OpenAlexClient()
    stats: dict = {"ok": 0, "ok_dry": 0, "no_match": 0, "search_failed": 0, "skip": 0}
    h_total = 0

    async def _worker(idx: int, tutor_id: int) -> dict:
        async with sem:
            async with SessionLocal() as s:
                tutor = await s.get(Tutor, tutor_id)
                if tutor is None:
                    return {"status": "skip"}
                r = await enrich_tutor(s, tutor, client=client, dry_run=dry_run)
            logger.info(
                f"[{idx + 1}/{len(ids)}] {r.get('name','?'):<8} "
                f"{r['status']:<13} | h={r.get('h_index', '-')!s:<4} works={r.get('works','-')!s:<5} "
                f"papers={r.get('papers', 0):<3} | "
                f"match={(r.get('match_name') or '-')[:20]:<20} | {r.get('duration', 0):.1f}s"
            )
            return r

    tasks = [_worker(i, tid) for i, tid in enumerate(ids)]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    for r in results:
        if isinstance(r, Exception):
            stats["search_failed"] += 1
            continue
        stats[r["status"]] = stats.get(r["status"], 0) + 1
        if r.get("h_index"):
            h_total += r["h_index"]

    await client.close()
    await engine.dispose()

    logger.info("========== 阶段 C 完成 ==========")
    for k, v in stats.items():
        logger.info(f"  - {k}: {v}")
    if stats["ok"]:
        logger.info(f"平均 h-index: {h_total / stats['ok']:.1f}")


def main():
    parser = argparse.ArgumentParser(description="阶段 C: OpenAlex 学术指标补充")
    parser.add_argument("--db", type=str, default=None)
    parser.add_argument("--university", type=str, default=None)
    parser.add_argument("--department", type=str, default=None)
    parser.add_argument("--skip-existing", action="store_true",
                        help="跳过已有 h_index 的教师（增量模式）")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--concurrency", type=int, default=5)
    args = parser.parse_args()

    db_url = (
        f"sqlite+aiosqlite:///{Path(args.db).resolve()}"
        if args.db else settings.DATABASE_URL
    )

    asyncio.run(run(
        db_url,
        university_filter=args.university,
        department_filter=args.department,
        skip_existing=args.skip_existing,
        limit=args.limit,
        dry_run=args.dry_run,
        concurrency=args.concurrency,
    ))


if __name__ == "__main__":
    main()
