"""专门针对5所未覆盖高校的快速爬取脚本

直接爬取指定URL，不依赖数据库中的源配置。
可以和主爬取进程并行运行。
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from loguru import logger


# 5所未覆盖高校的目标URL
TARGETS = [
    {
        "university": "天津大学",
        "urls": [
            "https://yzb.tju.edu.cn/xwzx/tkss_xw/",
            "https://yzb.tju.edu.cn/xwzx/zxxx/",
            "https://yzb.tju.edu.cn/xwzx/tztg/",
        ],
    },
    {
        "university": "哈尔滨工业大学",
        "urls": [
            "https://yzb.hit.edu.cn/8822/list.htm",
            "https://yzb.hit.edu.cn/8823/list.htm",
            "https://yzb.hit.edu.cn/8824/list.htm",
        ],
    },
    {
        "university": "山东大学",
        "urls": [
            "http://www.yz.sdu.edu.cn/index/tzgg.htm",
            "http://www.yz.sdu.edu.cn/sszs/zsjz.htm",
            "http://www.yz.sdu.edu.cn/index/zstz.htm",
        ],
    },
    {
        "university": "西北农林科技大学",
        "urls": [
            "https://yz.nwafu.edu.cn/tzgg/index.htm",
            "https://yz.nwafu.edu.cn/zsxx/ssszs/index.htm",
        ],
    },
    {
        "university": "兰州大学",
        "urls": [
            "https://yz.lzu.edu.cn/tongzhigonggao/",
            "https://yz.lzu.edu.cn/shuoshizhaosheng/",
        ],
    },
]


async def test_crawl():
    """测试爬取5所高校的列表页"""
    from src.utils.http_client import http_client
    from src.parser.list_parser import NoticeListParser
    from src.processor.rule_filter import batch_filter

    parser = NoticeListParser()

    for target in TARGETS:
        uni = target["university"]
        logger.info(f"\n{'='*60}")
        logger.info(f"  {uni}")
        logger.info(f"{'='*60}")

        for url in target["urls"]:
            logger.info(f"\n--- {url} ---")

            # 请求页面
            html, status = await http_client.fetch(url, return_status=True)

            # 反爬检测
            if status in (412, 202) and html and len(html) < 5000:
                logger.warning(f"  疑似反爬拦截({status})")
                # 尝试Playwright
                try:
                    from src.crawler.detail_crawler import _fetch_with_playwright
                    html = await _fetch_with_playwright(url, wait_time=5000)
                    if html:
                        logger.info(f"  Playwright渲染成功: {len(html)} chars")
                except Exception as e:
                    logger.error(f"  Playwright失败: {e}")
                    continue

            if not html:
                logger.warning(f"  请求失败(status={status})")
                # 尝试Playwright降级
                try:
                    from src.crawler.detail_crawler import _fetch_with_playwright
                    html = await _fetch_with_playwright(url)
                    if html:
                        logger.info(f"  Playwright渲染成功: {len(html)} chars")
                except Exception as e:
                    logger.error(f"  Playwright失败: {e}")
                    continue

            if not html:
                logger.error(f"  无法获取页面内容")
                continue

            logger.info(f"  页面大小: {len(html)} chars")

            # 解析列表页
            items = parser.parse(html, url)
            logger.info(f"  解析条目: {len(items)} 条")

            if not items:
                continue

            # 打印前5个条目的标题
            for i, item in enumerate(items[:5]):
                logger.info(f"    [{i+1}] {item.get('title', 'N/A')}")

            # 规则过滤
            filtered = batch_filter(items, source_type="招生")
            logger.info(f"  过滤后: {len(filtered)} 条")

            for item in filtered[:5]:
                score = item.get("relevance_score", 0)
                title = item.get("title", "N/A")
                logger.info(f"    [{score:.2f}] {title}")

    await http_client.close()
    logger.info("\n测试完成！")


async def main():
    logger.remove()
    logger.add(sys.stderr, level="INFO", format="{time:HH:mm:ss} | {level: <5} | {message}")

    await test_crawl()


if __name__ == "__main__":
    asyncio.run(main())
