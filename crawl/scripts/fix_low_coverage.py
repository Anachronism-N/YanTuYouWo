"""
修复低覆盖高校的信息源 URL

为 6 所低覆盖高校（电子科技大学、北京师范大学、华南理工大学、
北京理工大学、厦门大学、中央民族大学）添加经人工验证的正确研招办通知列表页 URL。

用法:
    .venv/bin/python scripts/fix_low_coverage.py --db data/large_scale_test.db
"""

import argparse
import sqlite3
from pathlib import Path


# 人工验证的正确通知列表页 URL
CORRECT_SOURCES = {
    "电子科技大学": [
        # 研招网需要 Playwright 渲染（Vue SPA）
        ("https://yz.uestc.edu.cn/", "招生", "研招办首页（需JS渲染）"),
    ],
    "北京师范大学": [
        ("https://yz.bnu.edu.cn/", "招生", "研招办首页"),
    ],
    "华南理工大学": [
        ("https://yanzhao.scut.edu.cn/open/Master/Zstz_1.aspx", "招生", "研招-硕士通知"),
        ("https://www2.scut.edu.cn/graduate/14563/list.htm", "招生", "研究生院-招生"),
    ],
    "北京理工大学": [
        ("https://grd.bit.edu.cn/zsgz/zsxx/index.htm", "招生", "研究生院-招生信息"),
    ],
    "厦门大学": [
        ("https://gs.xmu.edu.cn/", "招生", "研究生院首页"),
    ],
    "中央民族大学": [
        ("https://grs.muc.edu.cn/yjsyzsw/sszs.htm", "招生", "研究生院-硕士招生"),
    ],
}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", required=True)
    args = parser.parse_args()

    db_path = Path(args.db)
    if not db_path.exists():
        print(f"数据库不存在: {db_path}")
        return

    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()

    for uni_name, sources in CORRECT_SOURCES.items():
        # 获取高校 ID
        cur.execute("SELECT id FROM universities WHERE name = ?", (uni_name,))
        row = cur.fetchone()
        if not row:
            print(f"❌ 未找到高校: {uni_name}")
            continue
        uni_id = row[0]

        # 获取任意一个学院 ID（用于关联）
        cur.execute(
            "SELECT id FROM departments WHERE university_id = ? LIMIT 1",
            (uni_id,),
        )
        dept_row = cur.fetchone()
        if not dept_row:
            print(f"❌ 未找到学院: {uni_name}")
            continue
        dept_id = dept_row[0]

        for url, stype, desc in sources:
            # 检查是否已存在
            cur.execute(
                "SELECT id FROM department_sources WHERE source_url = ?",
                (url,),
            )
            existing = cur.fetchone()
            if existing:
                # 确保它是活跃的
                cur.execute(
                    "UPDATE department_sources SET is_active = 1, fail_count = 0 WHERE id = ?",
                    (existing[0],),
                )
                print(f"  ✅ {uni_name}: 已存在并激活 | {url}")
            else:
                from datetime import datetime
                now = datetime.now().isoformat()
                cur.execute(
                    """INSERT INTO department_sources
                       (department_id, source_url, source_type, priority, parser_type, is_active, fail_count, created_at, updated_at)
                       VALUES (?, ?, ?, 1, 'auto', 1, 0, ?, ?)""",
                    (dept_id, url, stype, now, now),
                )
                print(f"  ➕ {uni_name}: 新增 [{stype}] {url} ({desc})")

    # 重置这些高校所有信息源的爬取状态
    print("\n重置爬取状态...")
    for uni_name in CORRECT_SOURCES:
        cur.execute(
            """DELETE FROM crawl_states WHERE source_id IN (
                SELECT ds.id FROM department_sources ds
                JOIN departments d ON ds.department_id = d.id
                JOIN universities u ON d.university_id = u.id
                WHERE u.name = ?
            )""",
            (uni_name,),
        )
        deleted = cur.rowcount
        print(f"  {uni_name}: 重置 {deleted} 条爬取状态")

    conn.commit()
    print("\n✅ 完成")
    conn.close()


if __name__ == "__main__":
    main()
