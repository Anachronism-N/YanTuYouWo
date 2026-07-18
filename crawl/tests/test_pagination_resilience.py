"""分页健壮性测试：单页失败不应丢失后续页。"""
import sys
import os
import asyncio
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from loguru import logger
logger.remove()
logger.add(sys.stderr, level="WARNING")


def _make_html(items):
    lis = "".join(
        f'<li><a href="/info/{i}.htm">关于2026年夏令营报名的通知{i}</a><span>2026-03-{i:02d}</span></li>'
        for i in items
    )
    return f'<html><body><ul class="news_list">{lis}</ul></body></html>'


def test_failed_middle_page_does_not_lose_later_pages(monkeypatch=None):
    """第2页失败时，第3页应仍被抓到（不因单页失败 break 丢全部后续）"""
    from src.crawler import list_crawler as lc
    from src.parser.list_parser import notice_list_parser

    # 三页：page1=[1,2,3], page2=失败, page3=[7,8,9]
    page_html = {
        "http://e.edu.cn/list.htm": _make_html([1, 2, 3]),
        "http://e.edu.cn/list2.htm": None,  # 模拟失败
        "http://e.edu.cn/list3.htm": _make_html([7, 8, 9]),
    }

    async def fake_fetch(url, return_status=False, **kw):
        h = page_html.get(url)
        if return_status:
            return (h, 200) if h else (None, None)
        return h

    # patch http_client.fetch（两种调用形态）
    lc.http_client.fetch = fake_fetch
    # 隔离 DB：_deduplicate 直接返回（本测试只验证分页逻辑）
    async def fake_dedup(items, session):
        return items
    lc._deduplicate = fake_dedup
    lc._update_crawl_state = lambda *a, **k: asyncio.sleep(0)  # no-op

    class FakeSource:
        id = 1
        department_id = 1
        source_url = "http://e.edu.cn/list.htm"
        source_type = "通知"
        parser_config = None

    # detect_pagination 会从 list.htm 的分页链接找到 list2/list3
    # 这里直接构造：用 _make_html 不含分页链接，故手动注入 detect 结果
    real_detect = notice_list_parser.detect_pagination
    notice_list_parser.detect_pagination = lambda html, url: [
        "http://e.edu.cn/list2.htm", "http://e.edu.cn/list3.htm"
    ]
    try:
        log = asyncio.run(lc.crawl_source(
            FakeSource(), session=None, university_id=1, max_pages=5,
        ))
    finally:
        notice_list_parser.detect_pagination = real_detect

    # 应抓到 page1(1,2,3) + page3(7,8,9) = 6 条；page2 跳过
    assert log.total_items == 6, f"期望 6 条（跳过失败的 page2），实际 {log.total_items}"
    assert log.error_message is None, f"不应有错误: {log.error_message}"
    print(f"  ✅ 单页失败不丢后续页（total={log.total_items}）")


if __name__ == "__main__":
    print("=== 分页健壮性测试 ===")
    test_failed_middle_page_does_not_lose_later_pages()
    print("\n🎉 分页健壮性测试通过!")
