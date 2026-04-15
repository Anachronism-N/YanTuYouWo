"""
LLM 辅助批量数据修复

用 LLM 修复已有通知数据：
1. 对 program_type="其他" 的条目：用 LLM 重新分类，或判定为"非招生内容"删除
2. 对 publish_date 缺失的条目：用 LLM 从正文中提取发布日期
3. 对正文开头有导航菜单噪音的条目：用正则更彻底清洗

用法:
    .venv/bin/python scripts/llm_fix_data.py --db data/large_scale_test.db
    .venv/bin/python scripts/llm_fix_data.py --db data/large_scale_test.db --dry-run
"""

import argparse
import asyncio
import json
import re
import sqlite3
from datetime import date
from pathlib import Path


# 共用的分类 prompt
RECLASSIFY_PROMPT = """请判断以下高校通知属于哪种类型，并提取发布日期。

通知标题：{title}
通知正文（前300字）：{content}

请以JSON格式返回：
{{
  "type": "类型",
  "date": "YYYY-MM-DD或null",
  "is_admission": true/false
}}

type 取值规则：
- "夏令营"：含夏令营/暑期学校/暑期营/秋令营/冬令营
- "预推免"：含推免/推荐免试/接收推免/免试攻读（非夏令营）
- "直博"：含直博/直接攻博
- "硕博连读"：含硕博连读
- "招生简章"：招生简章/招生目录/招生计划
- "入营名单"：入营名单/优营名单/复试名单
- "拟录取"：拟录取名单公示
- "统考招生"：统考/复试/初试成绩/分数线/调剂/考研/申请-考核制博士
- "其他"：以上都不匹配的招生相关内容

is_admission 判断规则：
- true：与研究生招生相关（包括统考/推免/夏令营等所有招生类型）
- false：与招生完全无关（如科研新闻、行政通知、本科教务、学生活动、课程通知等）

date：从正文中提取发布日期，格式YYYY-MM-DD。优先找"发布时间""更新时间"等字段。

只返回JSON，不要其他文字。"""

DATE_EXTRACT_PROMPT = """请从以下通知内容中提取发布日期。

标题：{title}
正文（前500字）：{content}

请返回日期，格式为 YYYY-MM-DD。
如果找不到明确的发布日期，返回 "null"。
只返回日期或null，不要其他文字。"""


async def llm_call(client, prompt: str, task: str = "classify") -> str:
    """调用 LLM"""
    import asyncio as _asyncio
    for attempt in range(3):
        try:
            response = await _asyncio.wait_for(
                client.chat.completions.create(
                    model="Qwen/Qwen2.5-7B-Instruct",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=200,
                    temperature=0.1,
                ),
                timeout=30.0,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            if attempt < 2:
                await _asyncio.sleep(2 ** attempt)
            else:
                return ""


def parse_json(text: str):
    """从LLM响应解析JSON"""
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    if "```" in text:
        m = re.search(r"```(?:json)?\s*\n?(.*?)\n?\s*```", text, re.DOTALL)
        if m:
            try:
                return json.loads(m.group(1).strip())
            except json.JSONDecodeError:
                pass
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(0))
        except json.JSONDecodeError:
            pass
    return None


def parse_date_str(s):
    """解析日期字符串"""
    if not s or s == "null":
        return None
    s = s.strip().strip('"')
    m = re.match(r"(\d{4})-(\d{1,2})-(\d{1,2})", s)
    if m:
        try:
            return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        except ValueError:
            return None
    return None


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", required=True)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int, default=0, help="限制处理条数(0=全部)")
    args = parser.parse_args()

    db_path = Path(args.db)
    if not db_path.exists():
        print(f"数据库不存在: {db_path}")
        return

    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from openai import AsyncOpenAI
    from src.config import settings
    client = AsyncOpenAI(
        api_key=settings.SILICONFLOW_API_KEY,
        base_url=settings.SILICONFLOW_BASE_URL,
    )

    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    stats = {"total": 0, "reclassified": 0, "deleted": 0, "date_fixed": 0, "errors": 0}

    # ── 阶段1：重分类 "其他" 类型 ──
    cur.execute("""SELECT id, title, SUBSTR(raw_content, 1, 500) as content
        FROM admission_notices WHERE program_type = '其他'""")
    others = cur.fetchall()
    stats["total"] = len(others)
    if args.limit:
        others = others[:args.limit]

    print(f"阶段1: 重分类 {len(others)} 条 \"其他\" 类型...")
    to_delete = []
    to_update = []

    for i, row in enumerate(others):
        nid, title, content = row["id"], row["title"], row["content"] or ""
        prompt = RECLASSIFY_PROMPT.format(title=title, content=content[:300])
        result = await llm_call(client, prompt)
        parsed = parse_json(result)

        if parsed:
            is_adm = parsed.get("is_admission", True)
            new_type = parsed.get("type", "其他")
            new_date = parse_date_str(parsed.get("date", ""))

            if not is_adm:
                to_delete.append(nid)
                stats["deleted"] += 1
                if (i + 1) <= 50 or (i + 1) % 20 == 0:
                    print(f"  [{i+1}/{len(others)}] 🗑️  非招生: {title[:50]}")
            elif new_type and new_type != "其他":
                changes = {"program_type": new_type}
                if new_date:
                    changes["publish_date"] = new_date.isoformat()
                    stats["date_fixed"] += 1
                to_update.append((nid, changes))
                stats["reclassified"] += 1
                if (i + 1) <= 50 or (i + 1) % 20 == 0:
                    print(f"  [{i+1}/{len(others)}] ✅ {new_type}: {title[:50]}")
            else:
                if new_date:
                    to_update.append((nid, {"publish_date": new_date.isoformat()}))
                    stats["date_fixed"] += 1
        else:
            stats["errors"] += 1

        if (i + 1) % 10 == 0:
            print(f"  进度: {i+1}/{len(others)}")
        await asyncio.sleep(0.3)

    # ── 阶段2：补全缺失日期 ──
    cur.execute("""SELECT id, title, SUBSTR(raw_content, 1, 600) as content
        FROM admission_notices WHERE publish_date IS NULL AND program_type != '其他'""")
    no_dates = cur.fetchall()
    if args.limit:
        no_dates = no_dates[:args.limit]

    print(f"\n阶段2: 补全 {len(no_dates)} 条缺失日期...")
    for i, row in enumerate(no_dates):
        nid, title, content = row["id"], row["title"], row["content"] or ""
        prompt = DATE_EXTRACT_PROMPT.format(title=title, content=content[:500])
        result = await llm_call(client, prompt, "extract")
        d = parse_date_str(result)
        if d:
            to_update.append((nid, {"publish_date": d.isoformat()}))
            stats["date_fixed"] += 1
        if (i + 1) % 10 == 0:
            print(f"  进度: {i+1}/{len(no_dates)}")
        await asyncio.sleep(0.3)

    # ── 输出统计 ──
    print(f"\n{'='*50}")
    print(f"  LLM辅助修复统计")
    print(f"{'='*50}")
    print(f"  \"其他\"类型总数:   {stats['total']}")
    print(f"  重分类:           {stats['reclassified']}")
    print(f"  删除(非招生):     {stats['deleted']}")
    print(f"  日期补全:         {stats['date_fixed']}")
    print(f"  LLM错误:         {stats['errors']}")
    print(f"{'='*50}")

    if args.dry_run:
        print("\n[DRY RUN] 未执行修改")
        return

    # 执行删除
    for nid in to_delete:
        cur.execute("DELETE FROM admission_notices WHERE id = ?", (nid,))

    # 执行更新
    for nid, changes in to_update:
        set_clauses = [f"{k} = ?" for k in changes]
        values = list(changes.values()) + [nid]
        cur.execute(f"UPDATE admission_notices SET {', '.join(set_clauses)} WHERE id = ?", values)

    conn.commit()
    print(f"\n✅ 已执行: 删除 {len(to_delete)} 条, 更新 {len(to_update)} 条")
    conn.close()


if __name__ == "__main__":
    asyncio.run(main())
