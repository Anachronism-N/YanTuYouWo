"""翻页功能验证测试"""
from __future__ import annotations
import sys, asyncio, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from loguru import logger
logger.remove()
logger.add(sys.stderr, level="INFO", format="{time:HH:mm:ss} | {level: <5} | {message}")


async def test_pagination():
    from src.utils.http_client import http_client
    from src.parser.list_parser import notice_list_parser
    from src.processor.rule_filter import batch_filter

    # 测试东北大学计算机学院（博达站群，应该有多页）
    url = "http://www.cse.neu.edu.cn/6330/list.htm"
    print(f"\n{'='*60}")
    print(f"  翻页功能验证: {url}")
    print(f"{'='*60}")

    html = await http_client.fetch(url)
    if not html:
        print("请求失败")
        await http_client.close()
        return

    # 解析第一页
    items = notice_list_parser.parse(html, url)
    print(f"第1页: {len(items)} 条")

    # 检测分页
    pages = notice_list_parser.detect_pagination(html, url)
    print(f"检测到 {len(pages)} 个分页链接:")
    for p in pages[:5]:
        print(f"  {p}")

    # 爬取后续页面
    all_items = list(items)
    for i, page_url in enumerate(pages[:4], 2):
        page_html = await http_client.fetch(page_url)
        if not page_html:
            print(f"第{i}页请求失败，停止翻页")
            break
        page_items = notice_list_parser.parse(page_html, page_url)
        if not page_items:
            print(f"第{i}页解析为空，停止翻页")
            break
        all_items.extend(page_items)
        print(f"第{i}页: {len(page_items)} 条")

    print(f"\n总计: {len(all_items)} 条 (之前只有第1页的 {len(items)} 条)")

    # 过滤
    scored = batch_filter(all_items)
    high = [i for i in scored if i.get("relevance_score", 0) >= 0.5]
    mid = [i for i in scored if 0.2 <= i.get("relevance_score", 0) < 0.5]
    print(f"过滤后: {len(scored)} 条 (高相关: {len(high)}, 中相关: {len(mid)})")

    if high:
        print("\n高相关通知:")
        for item in high[:5]:
            print(f"  [{item.get('date', '?')}] [{item['relevance_score']:.2f}] {item['title'][:60]}")

    await http_client.close()
    print(f"\n✅ 翻页功能验证完成!")


if __name__ == "__main__":
    asyncio.run(test_pagination())
