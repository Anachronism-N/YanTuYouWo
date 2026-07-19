"""重新提取已有通知的正文（让历史数据受益于 content_extractor 的改进）。

每当 content_extractor 改进（如表格保留行列），历史 raw_content 仍是旧版。
本脚本逐条重抓 source_url，用当前提取器重新提取 raw_content，并用
date_inference 重补报名/活动日期。无 LLM 调用，较快。
"""
from __future__ import annotations

import asyncio
import sys
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
os.environ.setdefault("PYTHONUTF8", "1")
os.environ.setdefault("CRAWL_DELAY_MIN", "0")
os.environ.setdefault("CRAWL_DELAY_MAX", "0.3")

from loguru import logger
logger.remove()
logger.add(sys.stderr, level="WARNING")

DB_PATH = "data/large_scale_test.db"


async def main():
    import sqlite3
    import json
    from src.utils.http_client import http_client
    from src.parser.content_extractor import extract_content_with_images
    from src.processor.date_inference import infer_registration_window, infer_camp_window

    db = sqlite3.connect(DB_PATH)
    c = db.cursor()
    rows = c.execute("SELECT id, source_url, title FROM admission_notices").fetchall()
    print(f"重新提取 {len(rows)} 条通知正文")
    updated = 0
    for nid, url, title in rows:
        html = await http_client.fetch(url, retry=1)
        if not html:
            continue
        content, images = extract_content_with_images(html, url)
        if not content or len(content) < 30:
            continue
        # 重补日期
        reg_s, reg_e = infer_registration_window(content, title)
        camp_s, camp_e = infer_camp_window(content, title)
        c.execute(
            "UPDATE admission_notices SET raw_content=?, images=? WHERE id=?",
            (content[:10000], json.dumps(images[:20], ensure_ascii=False) if images else None, nid),
        )
        if reg_e:
            c.execute("UPDATE admission_notices SET registration_end=? WHERE id=? AND registration_end IS NULL", (reg_e.isoformat(), nid))
        if camp_s:
            c.execute("UPDATE admission_notices SET camp_start=? WHERE id=? AND camp_start IS NULL", (camp_s.isoformat(), nid))
        updated += 1
    db.commit()
    db.close()
    print(f"更新 {updated}/{len(rows)} 条")
    await http_client.close()


if __name__ == "__main__":
    asyncio.run(main())
