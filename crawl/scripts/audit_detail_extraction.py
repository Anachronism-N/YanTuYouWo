"""真实详情页内容提取审计：对不同 CMS 的详情页测 extract_content 质量。

找出现有 content_extractor 提取失败/噪音多的 CMS，为补选择器/清洗提供依据。
"""
from __future__ import annotations

import asyncio
import sys
import os
import re
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
os.environ.setdefault("PYTHONUTF8", "1")

from loguru import logger
logger.remove()
logger.add(sys.stderr, level="ERROR")

from src.utils.http_client import http_client
from src.parser.list_parser import notice_list_parser
from src.parser.content_extractor import extract_content


async def audit_source(name: str, list_url: str):
    html, _ = await http_client.fetch(list_url, return_status=True)
    if not html:
        print(f"[{name}] 列表页抓取失败")
        return
    items = notice_list_parser.parse(html, list_url)
    if not items:
        print(f"[{name}] 列表解析为 0")
        return
    # 取前 2 条详情
    for it in items[:2]:
        dh = await http_client.fetch(it["url"], retry=1)
        if not dh:
            print(f"[{name}] 详情抓取失败: {it['url'][:50]}")
            continue
        content = extract_content(dh, it["url"])
        clen = len(content)
        # 噪音指标
        has_breadcrumb = bool(re.search(r"当前位置|首页\s*>|您所在的位置", content[:300]))
        has_view_count = "浏览次数" in content or "点击次数" in content
        has_copyright = "版权所有" in content or "技术支持" in content
        cn = len(re.findall(r"[一-龥]", content))
        noise = sum([has_breadcrumb, has_view_count, has_copyright])
        flag = "⚠️" if (clen < 80 or noise > 0) else "✅"
        print(f"{flag} [{name}] len={clen:5d} 中文={cn:4d} 噪音={noise} | {it['title'][:30]}")
        if clen < 80 or noise > 0:
            print(f"    head: {content[:120]!r}")


async def main():
    SOURCES = [
        ("天津大学", "https://yzb.tju.edu.cn/"),
        ("重庆大学", "http://yz.cqu.edu.cn/"),
        ("山东大学", "https://www.yz.sdu.edu.cn/"),
        ("南京大学", "https://grawww.nju.edu.cn/905/list.htm"),
    ]
    print("=== 真实详情页提取审计 ===\n")
    for name, url in SOURCES:
        await audit_source(name, url)
        await asyncio.sleep(0.3)


if __name__ == "__main__":
    asyncio.run(main())
