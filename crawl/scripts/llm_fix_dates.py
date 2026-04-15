"""
LLM 批量补全报名时间和活动时间

对缺少 registration_start/end 和 camp_start/end 的通知，
用 LLM 从正文中提取这些时间字段。

用法:
    .venv/bin/python scripts/llm_fix_dates.py --db data/large_scale_test.db
    .venv/bin/python scripts/llm_fix_dates.py --db data/large_scale_test.db --limit 20
"""

import argparse
import asyncio
import json
import re
import sqlite3
import sys
from datetime import date
from pathlib import Path

EXTRACT_DATES_PROMPT = """从以下高校招生通知中提取时间信息。

标题：{title}
正文（前800字）：{content}

请提取以下日期字段，以JSON格式返回：
{{
  "registration_start": "报名/申请开始日期(YYYY-MM-DD)或null",
  "registration_end": "报名/申请截止日期(YYYY-MM-DD)或null",
  "camp_start": "活动/面试/夏令营开始日期(YYYY-MM-DD)或null",
  "camp_end": "活动/面试/夏令营结束日期(YYYY-MM-DD)或null"
}}

规则：
- 寻找"报名时间""申请时间""网上报名""材料提交截止"等字样，提取报名起止日期
- 寻找"活动时间""面试时间""夏令营时间""举办时间"等字样，提取活动起止日期
- 日期格式必须为YYYY-MM-DD
- 如果原文只有月日，根据标题或正文中的年份推断完整日期
- 找不到的填null
- 只返回JSON"""


def parse_date(s):
    if not s or s == "null" or s == "None":
        return None
    s = str(s).strip().strip('"')
    m = re.match(r"(\d{4})-(\d{1,2})-(\d{1,2})", s)
    if m:
        try:
            return date(int(m.group(1)), int(m.group(2)), int(m.group(3))).isoformat()
        except ValueError:
            pass
    return None


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", required=True)
    parser.add_argument("--limit", type=int, default=0)
    args = parser.parse_args()

    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from openai import AsyncOpenAI
    from src.config import settings

    client = AsyncOpenAI(
        api_key=settings.SILICONFLOW_API_KEY,
        base_url=settings.SILICONFLOW_BASE_URL,
    )

    conn = sqlite3.connect(str(args.db))
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # 只处理缺少时间字段的条目
    cur.execute("""SELECT id, title, SUBSTR(raw_content, 1, 1000) as content
        FROM admission_notices
        WHERE registration_start IS NULL AND registration_end IS NULL
          AND camp_start IS NULL AND camp_end IS NULL
          AND raw_content IS NOT NULL AND LENGTH(raw_content) > 100""")
    rows = cur.fetchall()
    if args.limit:
        rows = rows[:args.limit]

    print(f"处理 {len(rows)} 条缺少时间的通知...")
    fixed = 0
    errors = 0

    for i, row in enumerate(rows):
        prompt = EXTRACT_DATES_PROMPT.format(
            title=row["title"],
            content=(row["content"] or "")[:800],
        )
        try:
            resp = await asyncio.wait_for(
                client.chat.completions.create(
                    model="Qwen/Qwen2.5-7B-Instruct",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=200,
                    temperature=0.1,
                ),
                timeout=20.0,
            )
            text = resp.choices[0].message.content.strip()

            # Parse JSON
            parsed = None
            try:
                parsed = json.loads(text)
            except json.JSONDecodeError:
                m = re.search(r"\{.*\}", text, re.DOTALL)
                if m:
                    try:
                        parsed = json.loads(m.group(0))
                    except json.JSONDecodeError:
                        pass

            if parsed and isinstance(parsed, dict):
                updates = {}
                for field in ["registration_start", "registration_end", "camp_start", "camp_end"]:
                    val = parse_date(parsed.get(field))
                    if val:
                        updates[field] = val

                if updates:
                    set_parts = [f"{k}=?" for k in updates]
                    vals = list(updates.values()) + [row["id"]]
                    cur.execute(
                        f"UPDATE admission_notices SET {','.join(set_parts)} WHERE id=?",
                        vals,
                    )
                    fixed += 1
            else:
                errors += 1
        except Exception:
            errors += 1

        if (i + 1) % 20 == 0:
            print(f"  进度: {i+1}/{len(rows)}, 补全: {fixed}, 错误: {errors}")
            conn.commit()

        await asyncio.sleep(0.3)

    conn.commit()

    # Report
    cur.execute("SELECT COUNT(*) FROM admission_notices")
    total = cur.fetchone()[0]
    for f in ["registration_start", "registration_end", "camp_start", "camp_end"]:
        cur.execute(f"SELECT COUNT(*) FROM admission_notices WHERE {f} IS NOT NULL")
        cnt = cur.fetchone()[0]
        print(f"  {f:22s}: {cnt}/{total} ({cnt*100/total:.1f}%)")

    cur.execute("""SELECT COUNT(*) FROM admission_notices
        WHERE registration_start IS NOT NULL OR camp_start IS NOT NULL""")
    has_any = cur.fetchone()[0]
    print(f"\n有时间范围: {has_any}/{total} ({has_any*100/total:.1f}%)")
    print(f"本次补全: {fixed}, 错误: {errors}")

    conn.close()


if __name__ == "__main__":
    asyncio.run(main())
