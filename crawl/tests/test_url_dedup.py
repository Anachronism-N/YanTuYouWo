"""URL 去重键测试 —— 验证 http/https/www/尾斜杠 同页去重。"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from loguru import logger
logger.remove()
logger.add(sys.stderr, level="WARNING")

from src.utils.url_utils import url_dedup_key


def test_http_https_same():
    a = url_dedup_key("https://yzb.seu.edu.cn/2026/0707/c6676a575749/page.htm")
    b = url_dedup_key("http://yzb.seu.edu.cn/2026/0707/c6676a575749/page.htm")
    assert a == b, f"http/https 应判同页: {a} != {b}"
    print("  ✅ http/https 同页去重（真实重复根因）")


def test_www_nonwww_same():
    a = url_dedup_key("https://www.seu.edu.cn/x.htm")
    b = url_dedup_key("https://seu.edu.cn/x.htm")
    assert a == b
    print("  ✅ www/非 www 同页去重")


def test_trailing_slash_same():
    a = url_dedup_key("https://e.edu.cn/yjszs/")
    b = url_dedup_key("https://e.edu.cn/yjszs")
    assert a == b
    print("  ✅ 尾斜杠同页去重")


def test_fragment_ignored():
    a = url_dedup_key("https://e.edu.cn/x.htm#top")
    b = url_dedup_key("https://e.edu.cn/x.htm")
    assert a == b
    print("  ✅ fragment 忽略")


def test_query_order_same():
    a = url_dedup_key("https://e.edu.cn/x?a=1&b=2")
    b = url_dedup_key("https://e.edu.cn/x?b=2&a=1")
    assert a == b
    print("  ✅ query 顺序无关")


def test_different_path_different():
    a = url_dedup_key("https://e.edu.cn/x.htm")
    b = url_dedup_key("https://e.edu.cn/y.htm")
    assert a != b
    print("  ✅ 不同路径不合并")


def test_different_domain_different():
    a = url_dedup_key("https://a.edu.cn/x.htm")
    b = url_dedup_key("https://b.edu.cn/x.htm")
    assert a != b
    print("  ✅ 不同域名不合并")


def test_empty_input():
    assert url_dedup_key("") == ""
    assert url_dedup_key(None) == ""
    print("  ✅ 空/None 输入")


if __name__ == "__main__":
    print("=== URL 去重键测试 ===")
    test_http_https_same()
    test_www_nonwww_same()
    test_trailing_slash_same()
    test_fragment_ignored()
    test_query_order_same()
    test_different_path_different()
    test_different_domain_different()
    test_empty_input()
    print("\n🎉 所有 URL 去重键测试通过!")
