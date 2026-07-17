"""真实列表页探针：测量非-LLM 链路（抓取+解析+规则过滤）的覆盖率与精度。

无需 API key。对若干代表性 985 高校的招生/通知列表页执行：
1. httpx 抓取（含编码检测/反爬降级）
2. 自适应列表解析
3. 规则过滤 + program_type 推断
输出每页：解析条目数、过滤通过数、高相关数、夏令营/预推免命中情况。

用法：
    python scripts/probe_list_pages.py
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

from src.utils.http_client import http_client
from src.parser.list_parser import notice_list_parser
from src.processor.rule_filter import batch_filter, infer_program_type

# 代表性 985 高校招生/通知列表页（已验证可从本机访问）
PROBE_URLS = [
    ("南京大学", "研究生院", "通知", "https://grawww.nju.edu.cn/905/list.htm"),
    ("南开大学", "研招办", "通知", "https://yzb.nankai.edu.cn/"),
    ("中国人民大学", "研究生院", "通知", "https://grs.ruc.edu.cn/"),
    ("武汉大学", "研究生院", "通知", "https://gs.whu.edu.cn/"),
    ("中国科学技术大学", "招生办", "通知", "https://zsb.ustc.edu.cn/"),
    ("中山大学", "研究生院", "通知", "https://graduate.sysu.edu.cn/"),
]


async def probe_one(uni: str, dept: str, stype: str, url: str) -> dict:
    """探索单个列表页，返回指标字典。"""
    result = {"uni": uni, "dept": dept, "type": stype, "url": url}
    try:
        html, status = await http_client.fetch(url, return_status=True)
    except Exception as e:
        result["error"] = f"fetch失败: {type(e).__name__}: {str(e)[:120]}"
        return result

    if not html:
        result["error"] = f"fetch失败: 空响应(status={status})"
        return result
    result["status"] = status
    result["html_len"] = len(html)

    try:
        items = notice_list_parser.parse(html, url)
    except Exception as e:
        result["error"] = f"解析异常: {type(e).__name__}: {str(e)[:120]}"
        return result
    result["parsed"] = len(items)

    if not items:
        # 尝试 LLM 之外的兜底：打印前若干 <a> 帮助诊断
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "lxml")
        links = [(a.get_text(strip=True), a.get("href", "")) for a in soup.find_all("a", href=True)]
        result["total_a"] = len(links)
        result["sample_a"] = [{"t": t[:40], "h": h[:60]} for t, h in links[:5] if len(t) > 2]
        return result

    scored = batch_filter(items, source_type=stype)
    result["passed"] = len(scored)
    result["high_rel"] = sum(1 for i in scored if i["relevance_score"] >= 0.5)
    # 统计夏令营/预推免相关命中
    sc = pa = 0
    for it in scored:
        pt = infer_program_type(it["title"])
        if pt == "夏令营":
            sc += 1
        elif pt == "预推免":
            pa += 1
    result["summer_camp"] = sc
    result["pre_admission"] = pa
    result["top"] = [
        {"score": round(i["relevance_score"], 2), "title": i["title"][:50], "date": i.get("date")}
        for i in scored[:5]
    ]
    return result


async def main():
    print(f"=== 真实列表页探针（{len(PROBE_URLS)} 个源）===\n")
    rows = []
    for uni, dept, stype, url in PROBE_URLS:
        r = await probe_one(uni, dept, stype, url)
        rows.append(r)
        if "error" in r:
            print(f"[FAIL] {uni}/{dept}: {r['error']}")
        else:
            print(
                f"[OK] {uni}/{dept}({stype}): 解析{r.get('parsed',0)} 过滤{r.get('passed',0)} "
                f"高相关{r.get('high_rel',0)} 夏令营{r.get('summer_camp',0)} 预推免{r.get('pre_admission',0)}"
            )
            for t in r.get("top", []):
                print(f"      - [{t['score']}] {t['title']}  {t['date']}")
        await asyncio.sleep(0.5)

    # 汇总
    ok = [r for r in rows if "error" not in r]
    print(f"\n=== 汇总 ===")
    print(f"成功抓取: {len(ok)}/{len(rows)}")
    print(f"总解析条目: {sum(r.get('parsed',0) for r in ok)}")
    print(f"总过滤通过: {sum(r.get('passed',0) for r in ok)}")
    print(f"总高相关: {sum(r.get('high_rel',0) for r in ok)}")
    print(f"夏令营命中: {sum(r.get('summer_camp',0) for r in ok)}")
    print(f"预推免命中: {sum(r.get('pre_admission',0) for r in ok)}")


if __name__ == "__main__":
    asyncio.run(main())
