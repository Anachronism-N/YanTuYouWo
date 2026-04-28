"""
添加 211 高校到数据库并运行 Stage 2 + 3

在 39 所 985 基础上，新增纯 211（非 985）高校约 73 所，
总计覆盖 112 所 211 及以上高校。

用法:
    .venv/bin/python scripts/add_211_universities.py --db data/large_scale_test.db
    .venv/bin/python scripts/add_211_universities.py --db data/large_scale_test.db --phase1-only
"""

import argparse
import asyncio
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

# 纯 211（非 985）高校列表 —— 73 所
UNIVERSITIES_211_ONLY = {
    # 北京 (19所)
    "北京交通大学": ("北京", "北京"),
    "北京工业大学": ("北京", "北京"),
    "北京科技大学": ("北京", "北京"),
    "北京化工大学": ("北京", "北京"),
    "北京邮电大学": ("北京", "北京"),
    "北京林业大学": ("北京", "北京"),
    "北京中医药大学": ("北京", "北京"),
    "北京外国语大学": ("北京", "北京"),
    "中国传媒大学": ("北京", "北京"),
    "中国政法大学": ("北京", "北京"),
    "中央财经大学": ("北京", "北京"),
    "对外经济贸易大学": ("北京", "北京"),
    "华北电力大学": ("北京", "北京"),
    "中国矿业大学(北京)": ("北京", "北京"),
    "中国石油大学(北京)": ("北京", "北京"),
    "中国地质大学(北京)": ("北京", "北京"),
    # 天津 (1所)
    "河北工业大学": ("天津", "天津"),
    # 辽宁 (2所)
    "辽宁大学": ("辽宁", "沈阳"),
    "大连海事大学": ("辽宁", "大连"),
    # 吉林 (2所)
    "延边大学": ("吉林", "延吉"),
    "东北师范大学": ("吉林", "长春"),
    # 黑龙江 (3所)
    "哈尔滨工程大学": ("黑龙江", "哈尔滨"),
    "东北农业大学": ("黑龙江", "哈尔滨"),
    "东北林业大学": ("黑龙江", "哈尔滨"),
    # 上海 (5所)
    "上海外国语大学": ("上海", "上海"),
    "上海财经大学": ("上海", "上海"),
    "上海大学": ("上海", "上海"),
    "华东理工大学": ("上海", "上海"),
    "东华大学": ("上海", "上海"),
    # 江苏 (9所)
    "苏州大学": ("江苏", "苏州"),
    "南京航空航天大学": ("江苏", "南京"),
    "南京理工大学": ("江苏", "南京"),
    "中国矿业大学": ("江苏", "徐州"),
    "河海大学": ("江苏", "南京"),
    "江南大学": ("江苏", "无锡"),
    "南京农业大学": ("江苏", "南京"),
    "中国药科大学": ("江苏", "南京"),
    "南京师范大学": ("江苏", "南京"),
    # 浙江 (1所，985已含浙大)
    # 安徽 (2所)
    "安徽大学": ("安徽", "合肥"),
    "合肥工业大学": ("安徽", "合肥"),
    # 福建 (1所)
    "福州大学": ("福建", "福州"),
    # 江西 (1所)
    "南昌大学": ("江西", "南昌"),
    # 山东 (1所)
    "中国石油大学(华东)": ("山东", "青岛"),
    # 河南 (1所)
    "郑州大学": ("河南", "郑州"),
    # 湖北 (5所)
    "武汉理工大学": ("湖北", "武汉"),
    "华中农业大学": ("湖北", "武汉"),
    "华中师范大学": ("湖北", "武汉"),
    "中南财经政法大学": ("湖北", "武汉"),
    "中国地质大学(武汉)": ("湖北", "武汉"),
    # 湖南 (1所)
    "湖南师范大学": ("湖南", "长沙"),
    # 广东 (2所)
    "暨南大学": ("广东", "广州"),
    "华南师范大学": ("广东", "广州"),
    # 广西 (1所)
    "广西大学": ("广西", "南宁"),
    # 海南 (1所)
    "海南大学": ("海南", "海口"),
    # 四川 (3所)
    "西南交通大学": ("四川", "成都"),
    "西南财经大学": ("四川", "成都"),
    "四川农业大学": ("四川", "雅安"),
    # 重庆 (1所)
    "西南大学": ("重庆", "重庆"),
    # 贵州 (1所)
    "贵州大学": ("贵州", "贵阳"),
    # 云南 (1所)
    "云南大学": ("云南", "昆明"),
    # 西藏 (1所)
    "西藏大学": ("西藏", "拉萨"),
    # 陕西 (3所)
    "西安电子科技大学": ("陕西", "西安"),
    "长安大学": ("陕西", "西安"),
    "陕西师范大学": ("陕西", "西安"),
    # 甘肃 (0所，985已含兰大)
    # 青海 (1所)
    "青海大学": ("青海", "西宁"),
    # 宁夏 (1所)
    "宁夏大学": ("宁夏", "银川"),
    # 新疆 (2所)
    "新疆大学": ("新疆", "乌鲁木齐"),
    "石河子大学": ("新疆", "石河子"),
    # 军事院校 (2所)
    "第二军医大学(海军军医大学)": ("上海", "上海"),
    "第四军医大学(空军军医大学)": ("陕西", "西安"),
}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", required=True)
    parser.add_argument("--phase1-only", action="store_true", help="只添加高校,不爬取")
    args = parser.parse_args()

    conn = sqlite3.connect(str(args.db))
    cur = conn.cursor()
    now = datetime.now().isoformat()

    added_unis = 0
    added_depts = 0

    for name, (province, city) in UNIVERSITIES_211_ONLY.items():
        # Check if already exists
        cur.execute("SELECT id FROM universities WHERE name=?", (name,))
        if cur.fetchone():
            continue

        cur.execute(
            """INSERT INTO universities
               (name, short_name, level, province, city, auto_discovered, created_at, updated_at)
               VALUES (?, ?, '211', ?, ?, 1, ?, ?)""",
            (name, name[:4], province, city, now, now),
        )
        uni_id = cur.lastrowid
        added_unis += 1

        # Add a placeholder department (研究生院)
        cur.execute(
            """INSERT INTO departments
               (university_id, name, auto_discovered, is_active, created_at, updated_at)
               VALUES (?, '研究生院', 1, 1, ?, ?)""",
            (uni_id, now, now),
        )
        dept_id = cur.lastrowid
        added_depts += 1

        # Add research admissions URL as source (common patterns)
        short = name.replace("大学", "").replace("(", "").replace(")", "")
        common_urls = [
            f"https://yz.{_guess_domain(name)}/",
            f"https://gs.{_guess_domain(name)}/",
        ]
        for url in common_urls:
            if url and "None" not in url:
                cur.execute(
                    """INSERT OR IGNORE INTO department_sources
                       (department_id, source_url, source_type, priority, parser_type,
                        is_active, fail_count, created_at, updated_at)
                       VALUES (?, ?, '招生', 1, 'auto', 1, 0, ?, ?)""",
                    (dept_id, url, now, now),
                )

        print(f"  + {name} ({province})")

    conn.commit()
    print(f"\n新增: {added_unis}所高校, {added_depts}个学院")

    cur.execute("SELECT COUNT(*) FROM universities")
    total = cur.fetchone()[0]
    cur.execute("SELECT level, COUNT(*) FROM universities GROUP BY level")
    for r in cur.fetchall():
        print(f"  {r[0]}: {r[1]}所")
    print(f"  总计: {total}所")

    conn.close()


def _guess_domain(name):
    """猜测高校域名"""
    domains = {
        "北京交通大学": "bjtu.edu.cn", "北京工业大学": "bjut.edu.cn",
        "北京科技大学": "ustb.edu.cn", "北京化工大学": "buct.edu.cn",
        "北京邮电大学": "bupt.edu.cn", "北京林业大学": "bjfu.edu.cn",
        "北京中医药大学": "bucm.edu.cn", "北京外国语大学": "bfsu.edu.cn",
        "中国传媒大学": "cuc.edu.cn", "中国政法大学": "cupl.edu.cn",
        "中央财经大学": "cufe.edu.cn", "对外经济贸易大学": "uibe.edu.cn",
        "华北电力大学": "ncepu.edu.cn",
        "中国矿业大学(北京)": "cumtb.edu.cn", "中国石油大学(北京)": "cup.edu.cn",
        "中国地质大学(北京)": "cugb.edu.cn",
        "河北工业大学": "hebut.edu.cn",
        "辽宁大学": "lnu.edu.cn", "大连海事大学": "dlmu.edu.cn",
        "延边大学": "ybu.edu.cn", "东北师范大学": "nenu.edu.cn",
        "哈尔滨工程大学": "hrbeu.edu.cn",
        "东北农业大学": "neau.edu.cn", "东北林业大学": "nefu.edu.cn",
        "上海外国语大学": "shisu.edu.cn", "上海财经大学": "sufe.edu.cn",
        "上海大学": "shu.edu.cn", "华东理工大学": "ecust.edu.cn", "东华大学": "dhu.edu.cn",
        "苏州大学": "suda.edu.cn", "南京航空航天大学": "nuaa.edu.cn",
        "南京理工大学": "njust.edu.cn", "中国矿业大学": "cumt.edu.cn",
        "河海大学": "hhu.edu.cn", "江南大学": "jiangnan.edu.cn",
        "南京农业大学": "njau.edu.cn", "中国药科大学": "cpu.edu.cn",
        "南京师范大学": "njnu.edu.cn",
        "安徽大学": "ahu.edu.cn", "合肥工业大学": "hfut.edu.cn",
        "福州大学": "fzu.edu.cn", "南昌大学": "ncu.edu.cn",
        "中国石油大学(华东)": "upc.edu.cn",
        "郑州大学": "zzu.edu.cn",
        "武汉理工大学": "whut.edu.cn", "华中农业大学": "hzau.edu.cn",
        "华中师范大学": "ccnu.edu.cn", "中南财经政法大学": "zuel.edu.cn",
        "中国地质大学(武汉)": "cug.edu.cn",
        "湖南师范大学": "hunnu.edu.cn",
        "暨南大学": "jnu.edu.cn", "华南师范大学": "scnu.edu.cn",
        "广西大学": "gxu.edu.cn", "海南大学": "hainanu.edu.cn",
        "西南交通大学": "swjtu.edu.cn", "西南财经大学": "swufe.edu.cn",
        "四川农业大学": "sicau.edu.cn", "西南大学": "swu.edu.cn",
        "贵州大学": "gzu.edu.cn", "云南大学": "ynu.edu.cn",
        "西藏大学": "utibet.edu.cn",
        "西安电子科技大学": "xidian.edu.cn", "长安大学": "chd.edu.cn",
        "陕西师范大学": "snnu.edu.cn",
        "青海大学": "qhu.edu.cn", "宁夏大学": "nxu.edu.cn",
        "新疆大学": "xju.edu.cn", "石河子大学": "shzu.edu.cn",
        "第二军医大学(海军军医大学)": "smmu.edu.cn",
        "第四军医大学(空军军医大学)": "fmmu.edu.cn",
    }
    return domains.get(name)


if __name__ == "__main__":
    main()
