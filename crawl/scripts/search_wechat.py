"""
通过搜狗微信搜索发现各高校的推免公众号文章

搜狗微信搜索 (weixin.sogou.com) 是目前最好的微信公众号文章搜索引擎，
可以按关键词搜索公众号文章，无需登录微信。

用法:
    .venv/bin/python scripts/search_wechat.py --db data/large_scale_test.db
    .venv/bin/python scripts/search_wechat.py --db data/large_scale_test.db --university "清华大学"
"""

import argparse
import asyncio
import re
import sqlite3
import sys
from datetime import datetime
from pathlib import Path
from urllib.parse import quote


async def search_sogou_wechat(query: str, http_client) -> list[dict]:
    """通过搜狗微信搜索获取公众号文章"""
    url = f"https://weixin.sogou.com/weixin?type=2&query={quote(query)}"
    try:
        html = await http_client.fetch(url)
        if not html:
            return []

        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "lxml")
        results = []

        # Sogou WeChat search: find all <a> with relevant keywords
        for a in soup.find_all("a", href=True):
            title = a.get_text(strip=True)
            href = a["href"]
            if len(title) < 12:
                continue
            # Must contain admission-related keywords
            if not any(k in title for k in ["推免", "夏令营", "招生", "保研", "研究生", "直博", "暑期"]):
                continue
            # Fix relative URLs
            if href.startswith("/link?"):
                href = "https://weixin.sogou.com" + href
            results.append({
                "title": title,
                "url": href,
                "account": "",
            })

        # Deduplicate by title
        seen = set()
        unique = []
        for r in results:
            if r["title"] not in seen:
                seen.add(r["title"])
                unique.append(r)

        return unique
    except Exception as e:
        print(f"  搜索失败: {e}")
        return []


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", required=True)
    parser.add_argument("--university", help="只搜索指定高校")
    args = parser.parse_args()

    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from src.utils.http_client import http_client

    conn = sqlite3.connect(str(args.db))
    cur = conn.cursor()

    # Get low-coverage universities
    if args.university:
        universities = [args.university]
    else:
        cur.execute('''SELECT u.name FROM universities u
            LEFT JOIN admission_notices n ON u.id=n.university_id
            GROUP BY u.id HAVING COUNT(n.id) < 10
            ORDER BY COUNT(n.id)''')
        universities = [r[0] for r in cur.fetchall()]

    print(f"搜索 {len(universities)} 所高校的微信推免文章...\n")

    keywords = ["推免", "夏令营", "接收推荐免试"]
    found_total = 0

    for uni in universities:
        print(f"--- {uni} ---")
        for kw in keywords:
            query = f"{uni} {kw} 2025"
            results = await search_sogou_wechat(query, http_client)
            if results:
                print(f"  [{kw}] {len(results)}条结果:")
                for r in results[:3]:
                    print(f"    {r['title'][:50]}")
                    print(f"      {r['account']} | {r['url'][:60]}")
                found_total += len(results)
            await asyncio.sleep(2)
        print()

    print(f"共找到 {found_total} 条微信文章")
    conn.close()


if __name__ == "__main__":
    asyncio.run(main())
