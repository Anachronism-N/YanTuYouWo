"""真实管线验证：用生产 process_notice 跑若干真实夏令营/预推免条目，看入库质量。

不走 e2e_probe 的"直接 classify"，而是复用 detail_crawler.process_notice 的
完整逻辑（含 skip_classify 强关键词短路、infer_program_type 纠正），
真实反映生产环境对该条目的处理结果。
"""
from __future__ import annotations

import asyncio
import sys
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
os.environ.setdefault("PYTHONUTF8", "1")

from loguru import logger
logger.remove()
logger.add(sys.stderr, level="WARNING")


async def fetch_items(url: str, stype: str = "通知") -> list[dict]:
    from src.utils.http_client import http_client
    from src.parser.list_parser import notice_list_parser
    from src.processor.rule_filter import batch_filter
    html, _ = await http_client.fetch(url, return_status=True)
    if not html:
        return []
    items = notice_list_parser.parse(html, url)
    return batch_filter(items, source_type=stype)


async def main():
    from src.crawler.detail_crawler import process_notice
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
    from src.models.base import Base
    from src.storage.database import init_db
    import src.storage.database as dbm

    db_path = "data/validate_process.db"
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    if Path(db_path).exists():
        Path(db_path).unlink()
    dbm.engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}")
    dbm.async_session = async_sessionmaker(dbm.engine, expire_on_commit=False)
    await init_db()

    # 真实源：含夏令营/预推免
    targets = [
        ("东南大学", "https://yzb.seu.edu.cn/", "通知"),
        ("天津大学", "https://yzb.tju.edu.cn/", "通知"),
    ]

    rows = []
    async with dbm.async_session() as session:
        for uni, url, stype in targets:
            items = await fetch_items(url, stype)
            # 取该源 top 4 高相关
            for it in items[:4]:
                title = it["title"]
                notice = await process_notice(it, session, university_id=0, source_id=None)
                if notice:
                    rows.append((uni, notice))
                    print(f"[{uni}] ✅ type={notice.program_type} conf={notice.llm_confidence:.2f} "
                          f"reg_end={notice.registration_end} camp={notice.camp_start} | {notice.title[:36]}")
                else:
                    print(f"[{uni}] ❌ 被过滤 | {title[:36]}")
            await session.commit()

    print(f"\n=== 入库 {len(rows)} 条，明细 ===")
    for uni, n in rows:
        print(f"- [{n.program_type}] {n.title}")
        print(f"    日期 publish={n.publish_date} reg={n.registration_start}~{n.registration_end} camp={n.camp_start}~{n.camp_end}")
        print(f"    summary={(n.summary or '')[:60]}")

    from src.utils.http_client import http_client
    await http_client.close()
    await dbm.engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
