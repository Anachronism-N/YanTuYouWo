"""端到端探针：对可达招生列表页跑完整链路（解析→过滤→详情→LLM分类/提取）。

测量夏令营/预推免爬取的真实质量：
- 列表解析覆盖率（解析出多少条）
- 规则过滤精度（高相关里有多少真推免、多少噪声）
- LLM 端到端提取质量（program_type/日期/字段）

只对每页 Top N 条做详情+LLM，控制耗时与成本。
用法： python scripts/e2e_probe.py [--no-llm] [--top N]
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
logger.add(sys.stderr, level="ERROR")

from src.utils.http_client import http_client
from src.parser.list_parser import notice_list_parser
from src.processor.rule_filter import batch_filter, infer_program_type

# 已验证可从本机访问的研招办/招生页
SOURCES = [
    ("南京大学", "通知", "https://grawww.nju.edu.cn/905/list.htm"),
    ("东南大学", "通知", "https://yzb.seu.edu.cn/"),
    ("天津大学", "通知", "https://yzb.tju.edu.cn/"),
    ("厦门大学", "通知", "https://gs.xmu.edu.cn/"),
    ("山东大学", "通知", "https://www.yz.sdu.edu.cn/"),
    ("重庆大学", "通知", "http://yz.cqu.edu.cn/"),
    ("华东师大", "通知", "https://yjsy.ecnu.edu.cn/"),
    ("北京理工", "通知", "https://grd.bit.edu.cn/"),
    ("北航", "通知", "https://yzb.buaa.edu.cn/"),
    ("同济大学", "通知", "https://yz.tongji.edu.cn/"),
]


async def probe_source(name: str, stype: str, url: str, do_llm: bool, top_n: int) -> dict:
    res = {"name": name, "url": url}
    html, st = await http_client.fetch(url, return_status=True)
    if not html:
        res["error"] = f"fetch空 st={st}"
        return res
    items = notice_list_parser.parse(html, url)
    res["parsed"] = len(items)
    if not items:
        res["error"] = "解析为空"
        return res
    scored = batch_filter(items, source_type=stype)
    res["passed"] = len(scored)
    res["high"] = sum(1 for i in scored if i["relevance_score"] >= 0.5)
    res["items"] = scored[:top_n]

    if do_llm and scored:
        from src.crawler.detail_crawler import process_notice, _fetch_with_fallback
        from src.parser.content_extractor import extract_content_with_images
        from src.llm.client import llm_client
        e2e = []
        # 只对 top 高相关条目做详情+LLM
        for it in scored[: min(top_n, 3)]:
            entry = {"title": it["title"][:60], "score": round(it["relevance_score"], 2)}
            dh = await _fetch_with_fallback(it["url"])
            if not dh:
                entry["detail"] = "详情抓取失败"
                e2e.append(entry)
                continue
            content, _imgs = extract_content_with_images(dh, it["url"])
            entry["content_len"] = len(content)
            if len(content) < 50:
                entry["detail"] = f"正文过短({len(content)})"
                e2e.append(entry)
                continue
            rel = await llm_client.classify(it["title"], content)
            entry["llm_relevant"] = rel
            if rel:
                ex = await llm_client.extract(content)
                entry["program_type"] = ex.get("program_type")
                entry["reg_end"] = ex.get("registration_end")
                entry["camp_start"] = ex.get("camp_start")
            e2e.append(entry)
            await asyncio.sleep(0.3)
        res["e2e"] = e2e
    return res


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-llm", action="store_true", help="跳过详情+LLM，只测解析+过滤")
    ap.add_argument("--top", type=int, default=5)
    ap.add_argument("--only", type=str, default="", help="只测指定高校（逗号分隔）")
    args = ap.parse_args()

    only = {s.strip() for s in args.only.split(",") if s.strip()}
    sources = [(n, t, u) for n, t, u in SOURCES if not only or n in only]
    print(f"=== 端到端探针（{len(sources)}源, LLM={'OFF' if args.no_llm else 'ON'}, top={args.top}）===\n")
    agg = {"parsed": 0, "passed": 0, "high": 0}
    for name, stype, url in sources:
        r = await probe_source(name, stype, url, do_llm=not args.no_llm, top_n=args.top)
        if "error" in r:
            print(f"[FAIL] {name}: {r['error']}")
            continue
        agg["parsed"] += r["parsed"]
        agg["passed"] += r["passed"]
        agg["high"] += r["high"]
        print(f"[{name}] 解析{r['parsed']} 过滤{r['passed']} 高相关{r['high']}")
        for it in r.get("items", []):
            pt = infer_program_type(it["title"])
            mark = "★" if pt in ("夏令营", "预推免") else " "
            print(f"   {mark}[{it['relevance_score']:.1f}] ({pt}) {it['title'][:46]}")
        for e in r.get("e2e", []):
            print(f"      ↳ LLM: rel={e.get('llm_relevant')} type={e.get('program_type')} reg_end={e.get('reg_end')} camp={e.get('camp_start')} clen={e.get('content_len')}")
        print()
        await asyncio.sleep(0.5)

    print(f"=== 汇总: 解析{agg['parsed']} 过滤{agg['passed']} 高相关{agg['high']} ===")
    await http_client.close()


if __name__ == "__main__":
    asyncio.run(main())
