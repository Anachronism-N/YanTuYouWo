"""
批量数据修复脚本

修复已有通知数据的质量问题：
1. program_type "其他" → 从标题推断更精确的类型
2. publish_date 缺失 → 从标题/正文中提取
3. 标题含日期前缀 → 清洗
4. raw_content 导航噪音 → 清洗
5. 低质量数据标记

用法:
    cd crawl
    .venv/bin/python scripts/batch_fix_data.py --db data/large_scale_test.db
    .venv/bin/python scripts/batch_fix_data.py --db data/large_scale_test.db --dry-run
"""

import argparse
import re
import sqlite3
from datetime import date, datetime
from pathlib import Path


def clean_title(title: str) -> str:
    """移除标题中的日期前缀和噪音"""
    if not title:
        return ""
    # 移除开头的数字序号+日期（如 "162025-06标题"）
    title = re.sub(r"^\d{1,3}(\d{4})[-./](\d{1,2})", r"\1-\2", title)
    # 移除标准日期前缀
    title = re.sub(r"^\d{4}[-./]\d{1,2}[-./]\d{1,2}\s*", "", title)
    title = re.sub(r"^\d{4}[-./]\d{1,2}\s*", "", title)
    title = re.sub(r"^\d{4}年\d{1,2}月\d{1,2}日?\s*", "", title)
    return title.strip()


def extract_date_from_title(title: str):
    """从标题中提取日期"""
    patterns = [
        r"^(\d{4})-(\d{1,2})-(\d{1,2})",
        r"^(\d{4})\.(\d{1,2})\.(\d{1,2})",
        r"^(\d{4})/(\d{1,2})/(\d{1,2})",
        r"^(\d{4})年(\d{1,2})月(\d{1,2})日?",
    ]
    for pattern in patterns:
        m = re.match(pattern, title.strip())
        if m:
            try:
                return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
            except ValueError:
                continue
    return None


def extract_date_from_content(content: str):
    """从正文中提取发布日期"""
    if not content:
        return None
    patterns = [
        r"发布时间[：:]\s*(\d{4})-(\d{1,2})-(\d{1,2})",
        r"发布日期[：:]\s*(\d{4})-(\d{1,2})-(\d{1,2})",
        r"(\d{4})-(\d{1,2})-(\d{1,2})\s*发布",
        r"发布时间[：:]\s*(\d{4})年(\d{1,2})月(\d{1,2})日",
        r"时间[：:]\s*(\d{4})-(\d{1,2})-(\d{1,2})",
    ]
    for pattern in patterns:
        m = re.search(pattern, content[:500])
        if m:
            try:
                return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
            except ValueError:
                continue
    return None


def infer_program_type(title: str) -> str:
    """从标题推断 program_type"""
    if re.search(r"夏令营|暑期学校|暑期营|暑期学术|秋令营|冬令营", title):
        return "夏令营"
    if re.search(r"拟录取|录取.*名单|待录取", title):
        return "拟录取"
    if re.search(r"入营|优营|候补.*名单|复试.*名单", title):
        return "入营名单"
    if re.search(r"推免|推荐免试|预推免|接收.*推免|免试攻读", title):
        return "预推免"
    if re.search(r"直博|直接攻博", title):
        return "直博"
    if re.search(r"硕博连读", title):
        return "硕博连读"
    if re.search(r"招生简章|招生目录|招生计划|招生办法", title):
        return "招生简章"
    if re.search(r"复试|初试|成绩.*公示|分数线|调剂|统考|考核.*博士|博士.*考核|申请.*考核", title):
        return "统考招生"
    return "其他"


def clean_raw_content(content: str) -> str:
    """清洗正文格式"""
    if not content:
        return ""

    # 移除面包屑/导航噪音
    content = re.sub(r"[^\n]*当前位置\s*[：: ]\s*[^\n]*\n(?:[\u4e00-\u9fa5]{2,10}\n){0,5}", "", content, count=1)
    content = re.sub(r"[^\n]*(?:首页|网站首页)\s*[>›»/]\s*[^\n]*\n", "", content, count=1)
    content = re.sub(r"[^\n]*您所在的位置[：:][^\n]*\n", "", content, count=1)
    content = re.sub(r"编辑[：:][^\n]*\n?\s*\d*\s*分享到[：:]?\s*", "", content)
    # 横排导航菜单(如 "EN学院概况学院简介发展历程...")
    content = re.sub(r"^(?:EN)?(?:学院概况|学院简介|发展历程|学院领导|师资队伍|科学研究|人才培养|党建工作|学生工作|招生信息|院友之窗|合作交流|下载中心)(?:[\u4e00-\u9fa5]{2,10}){3,}[^\n]*\n", "", content)
    # "XX招生\n" 栏目名
    content = re.sub(r"^(?:硕士招生|博士招生|MPA招生|MBA招生|本科招生|招生工作|招生信息)\s*\n", "", content)
    # 移除开头的菜单项列表
    content = re.sub(r"^(?:[\u4e00-\u9fa5]{2,10}\n){4,}", "", content)

    # 修复日期拆散
    for _ in range(8):
        content, n1 = re.subn(r"(\d+)\s*\n\s*(年|月|日|号|时|分|秒|点|期|届|级|人|名|个|项|条|篇|次|周|%)", r"\1\2", content)
        content, n2 = re.subn(r"(年|月|日|号|时|分|第)\s*\n\s*(\d)", r"\1\2", content)
        if n1 == 0 and n2 == 0:
            break
    content = re.sub(r"(第)\s*\n\s*(\d+)\s*\n?\s*", r"\1\2", content)

    # 修复标点拆散
    content = re.sub(r"\s*\n\s*([，。、；：！？）》」』】\]\),.;:!?\-])", r"\1", content)
    content = re.sub(r"([（《「『【\[\(])\s*\n\s*", r"\1", content)

    # 拆散的全角括号
    content = re.sub(r"([﹝﹙])\s*\n\s*", r"\1", content)
    content = re.sub(r"\s*\n\s*([﹞﹚])", r"\1", content)

    # 移除噪音文本
    noise = [
        r"点击[：:]\s*\n?\s*次?\s*", r"分享[：:]\s*\n?", r"分享到[：:]?\s*\n?",
        r"编辑[：:]\s*[^\n]{0,20}\s*\n?", r"来源[：:]\s*[^\n]{0,30}\s*\n?",
        r"作者[：:]\s*[^\n]{0,20}\s*\n?", r"发布时间\s*[：:]\s*\d{4}[^\n]*\n?",
        r"阅读次数[：:]\s*\d*\s*", r"浏览次数[：:]\s*\d*\s*",
        r"点击次数[：:]\s*\d*\s*", r"阅读量[：:]\s*\d*\s*",
        r"浏览[：:]\s*\d+\s*次?\s*",
        r"上一篇[：:].*$", r"下一篇[：:].*$",
        r"上一条[：:].*$", r"下一条[：:].*$",
        r"返回首页.*$", r"返回列表.*$", r"打印本页.*$", r"关闭窗口.*$",
        r"版权所有.*$", r"Copyright.*$", r"ICP备\d+号.*$", r"技术支持.*$",
    ]
    for pattern in noise:
        content = re.sub(pattern, "", content, flags=re.MULTILINE)

    # 智能短行合并
    content = re.sub(r"\n{3,}", "\n\n", content)
    lines = [l.strip() for l in content.split("\n")]
    merged: list[str] = []
    prev_empty = False
    for line in lines:
        if not line:
            if not prev_empty:
                merged.append("")
            prev_empty = True
            continue
        prev_empty = False
        if (
            merged and merged[-1] and len(line) <= 4
            and not line.startswith(("•", "-", "·", "●", "◆", "※", "（", "(", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"))
            and not re.match(r"^\d+[\.、）)]", line)
        ):
            merged[-1] += line
        else:
            merged.append(line)
    content = "\n".join(merged)

    content = re.sub(r"\n{3,}", "\n\n", content)
    return content.strip()


def main():
    parser = argparse.ArgumentParser(description="批量修复通知数据质量")
    parser.add_argument("--db", required=True, help="数据库路径")
    parser.add_argument("--dry-run", action="store_true", help="只统计不修改")
    args = parser.parse_args()

    db_path = Path(args.db)
    if not db_path.exists():
        print(f"数据库不存在: {db_path}")
        return

    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    stats = {
        "total": 0,
        "type_fixed": 0,
        "date_fixed": 0,
        "title_fixed": 0,
        "content_fixed": 0,
        "disciplines_fixed": 0,
        "null_fields_fixed": 0,
    }

    cur.execute("SELECT id, title, program_type, publish_date, raw_content, disciplines, summary, contact, requirements, quota FROM admission_notices")
    rows = cur.fetchall()
    stats["total"] = len(rows)

    updates = []

    for row in rows:
        nid = row["id"]
        title = row["title"] or ""
        ptype = row["program_type"]
        pdate = row["publish_date"]
        content = row["raw_content"] or ""

        changes = {}

        # 1. 修复 program_type
        if ptype in (None, "其他", "null", ""):
            new_type = infer_program_type(title)
            if new_type != "其他":
                changes["program_type"] = new_type
                stats["type_fixed"] += 1

        # 1b. 修复 disciplines 中的 null 字符串
        disc = row["disciplines"]
        if disc and ("null" in str(disc)):
            import json
            try:
                d_list = json.loads(disc) if isinstance(disc, str) else disc
                if isinstance(d_list, list):
                    cleaned = [x for x in d_list if x and str(x) not in ("null", "None", "")]
                    if cleaned != d_list:
                        changes["disciplines"] = json.dumps(cleaned, ensure_ascii=False) if cleaned else None
                        stats["disciplines_fixed"] += 1
            except (json.JSONDecodeError, TypeError):
                pass

        # 1c. 修复 "null" 字符串字段
        for field in ["summary", "contact", "requirements", "quota"]:
            val = row[field]
            if val in ("null", "None"):
                changes[field] = None
                stats["null_fields_fixed"] += 1

        # 2. 补全 publish_date
        if not pdate:
            d = extract_date_from_title(title)
            if not d:
                d = extract_date_from_content(content)
            if d:
                changes["publish_date"] = d.isoformat()
                stats["date_fixed"] += 1

        # 3. 清洗标题
        cleaned_title = clean_title(title)
        if cleaned_title != title and cleaned_title:
            changes["title"] = cleaned_title
            stats["title_fixed"] += 1

        # 4. 清洗正文
        if content:
            cleaned_content = clean_raw_content(content)
            if cleaned_content != content and len(cleaned_content) >= 50:
                changes["raw_content"] = cleaned_content
                stats["content_fixed"] += 1

        if changes:
            updates.append((nid, changes))

    # 打印统计
    print(f"\n{'='*50}")
    print(f"  批量数据修复统计")
    print(f"{'='*50}")
    print(f"  通知总数:         {stats['total']}")
    print(f"  program_type 修复: {stats['type_fixed']}")
    print(f"  publish_date 补全: {stats['date_fixed']}")
    print(f"  标题清洗:         {stats['title_fixed']}")
    print(f"  正文清洗:         {stats['content_fixed']}")
    print(f"  disciplines 修复:  {stats['disciplines_fixed']}")
    print(f"  null字段清理:      {stats['null_fields_fixed']}")
    print(f"  总修改记录:       {len(updates)}")
    print(f"{'='*50}")

    if args.dry_run:
        print("\n[DRY RUN] 未执行修改")

        # 打印 type 修复分布
        type_dist = {}
        for _, changes in updates:
            if "program_type" in changes:
                t = changes["program_type"]
                type_dist[t] = type_dist.get(t, 0) + 1
        if type_dist:
            print("\nprogram_type 修复分布:")
            for t, c in sorted(type_dist.items(), key=lambda x: -x[1]):
                print(f"  {t}: {c}")

        return

    # 执行修改
    for nid, changes in updates:
        set_clauses = []
        values = []
        for k, v in changes.items():
            set_clauses.append(f"{k} = ?")
            values.append(v)
        values.append(nid)
        sql = f"UPDATE admission_notices SET {', '.join(set_clauses)} WHERE id = ?"
        cur.execute(sql, values)

    conn.commit()
    print(f"\n✅ 已修复 {len(updates)} 条记录")
    conn.close()


if __name__ == "__main__":
    main()
