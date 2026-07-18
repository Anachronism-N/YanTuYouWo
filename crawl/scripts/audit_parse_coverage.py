"""真实页面解析覆盖率审计：抓多源院系/研招办通知页，测解析成功率，定位失败页面。

目的：找出现有 list_parser 解析失败（0 条）的真实页面，为补 CMS 模板提供依据。
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
logger.add(sys.stderr, level="ERROR")

from src.utils.http_client import http_client
from src.parser.list_parser import notice_list_parser
from src.processor.rule_filter import batch_filter

# 多样化院系/研招办通知页（不同 CMS）
URLS = [
    ("南京大学-研究生院", "https://grawww.nju.edu.cn/905/list.htm"),
    ("东南大学-研招办", "https://yzb.seu.edu.cn/"),
    ("天津大学-研招办", "https://yzb.tju.edu.cn/"),
    ("山东大学-研招办", "https://www.yz.sdu.edu.cn/"),
    ("重庆大学-研招办", "http://yz.cqu.edu.cn/"),
    ("华东师大-研究生院", "https://yjsy.ecnu.edu.cn/"),
    ("北京理工-研招办", "https://grd.bit.edu.cn/"),
    ("北航-研招办", "https://yzb.buaa.edu.cn/"),
    ("同济-研招办", "https://yz.tongji.edu.cn/"),
    ("人大-研究生院", "https://grs.ruc.edu.cn/"),
    ("武大-研究生院", "https://gs.whu.edu.cn/"),
    ("中山-研究生院", "https://graduate.sysu.edu.cn/"),
    ("南开-研招办", "https://yzb.nankai.edu.cn/"),
    ("中科大-招办", "https://zsb.ustc.edu.cn/"),
]


async def main():
    print(f"=== 解析覆盖率审计（{len(URLS)} 源）===\n")
    ok = 0
    fail = []
    total_parsed = 0
    for name, url in URLS:
        html, st = await http_client.fetch(url, return_status=True)
        if not html:
            print(f"[FETCH FAIL] {name}")
            fail.append((name, url, "fetch失败"))
            continue
        items = notice_list_parser.parse(html, url)
        n = len(items)
        total_parsed += n
        if n >= 3:
            ok += 1
            print(f"[OK  {n:3d}条] {name}")
        else:
            print(f"[FEW {n:3d}条] {name}  ← 解析不足")
            fail.append((name, url, f"仅{n}条"))
    print(f"\n=== 汇总 ===")
    print(f"成功(≥3条): {ok}/{len(URLS)}")
    print(f"总解析条目: {total_parsed}")
    if fail:
        print(f"待诊断: {len(fail)}")
        for n, u, reason in fail:
            print(f"  - {n}: {reason} | {u}")


if __name__ == "__main__":
    asyncio.run(main())
