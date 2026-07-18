"""完整端到端验证：播种真实源 → NoticeProcessor.process_all → 查库报告。

走全管线：should_crawl → crawl_source(抓取/解析/翻页/过滤/去重)
→ process_notice(详情/LLM分类/提取/校验/入库) → 提交，含增量状态机。

用法： python scripts/full_pipeline_e2e.py [--max-sources N] [--max-pages P]
"""
from __future__ import annotations

import argparse
import asyncio
import sys
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
os.environ.setdefault("PYTHONUTF8", "1")

from loguru import logger
logger.remove()
logger.add(sys.stderr, level="WARNING")

# 真实可达、含夏令营/预推免内容的研招办源
SEEDED = [
    # (高校, 省份, 学院, 源类型, url)
    ("东南大学", "江苏", "研究生院", "研招办", "https://yzb.seu.edu.cn/"),
    ("天津大学", "天津", "研究生院", "研招办", "https://yzb.tju.edu.cn/"),
    ("山东大学", "山东", "研究生院", "研招办", "https://www.yz.sdu.edu.cn/"),
    ("重庆大学", "重庆", "研究生院", "研招办", "http://yz.cqu.edu.cn/"),
    ("南京大学", "江苏", "研究生院", "通知", "https://grawww.nju.edu.cn/905/list.htm"),
]


async def seed(dbm) -> None:
    from src.models.university import University, Department, DepartmentSource
    async with dbm.async_session() as s:
        for uni_name, prov, dept_name, stype, url in SEEDED:
            u = University(name=uni_name, level="985", province=prov, auto_discovered=False)
            s.add(u)
            await s.flush()
            d = Department(university_id=u.id, name=dept_name, is_active=True)
            s.add(d)
            await s.flush()
            src = DepartmentSource(
                department_id=d.id, source_url=url, source_type=stype,
                priority=1, is_active=True, fail_count=0,
            )
            s.add(src)
        await s.commit()


async def main():
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from src.models.base import Base
    import src.storage.database as dbm
    from src.processor.notice_processor import NoticeProcessor
    from src.models.notice import AdmissionNotice
    from sqlalchemy import select, func

    ap = argparse.ArgumentParser()
    ap.add_argument("--max-sources", type=int, default=0)
    ap.add_argument("--max-pages", type=int, default=3)
    args = ap.parse_args()

    db_path = "data/full_pipeline_e2e.db"
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    if Path(db_path).exists():
        Path(db_path).unlink()
    dbm.engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}")
    dbm.async_session = async_sessionmaker(dbm.engine, expire_on_commit=False)
    async with dbm.engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    print(f"=== 播种 {len(SEEDED)} 个真实源 ===")
    await seed(dbm)

    print(f"=== 运行 NoticeProcessor.process_all (max_pages={args.max_pages}) ===\n")
    async with dbm.async_session() as session:
        proc = NoticeProcessor(session)
        await proc.process_all(max_sources=args.max_sources or None, max_pages=args.max_pages)

    # 查库报告
    print("\n=== 入库结果 ===")
    async with dbm.async_session() as session:
        total = (await session.execute(select(func.count(AdmissionNotice.id)))).scalar()
        print(f"通知总数: {total}")
        if total:
            # program_type 分布
            rows = (await session.execute(
                select(AdmissionNotice.program_type, func.count(AdmissionNotice.id))
                .group_by(AdmissionNotice.program_type)
            )).all()
            print("类型分布:")
            for pt, cnt in sorted(rows, key=lambda x: -x[1]):
                print(f"  {pt or '(空)':8s}: {cnt}")
            # 日期覆盖
            with_date = (await session.execute(
                select(func.count(AdmissionNotice.id)).where(AdmissionNotice.publish_date.isnot(None))
            )).scalar()
            print(f"publish_date 覆盖: {with_date}/{total} ({100*with_date//total}%)")
            # 夏令营/预推免样例
            print("\n夏令营/预推免样例:")
            samples = (await session.execute(
                select(AdmissionNotice).where(AdmissionNotice.program_type.in_(["夏令营", "预推免"]))
                .order_by(AdmissionNotice.relevance_score.desc()).limit(5)
            )).scalars().all()
            for n in samples:
                print(f"  [{n.program_type}] {n.title[:36]} | reg_end={n.registration_end} | conf={n.llm_confidence}")

    from src.utils.http_client import http_client
    await http_client.close()
    await dbm.engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
