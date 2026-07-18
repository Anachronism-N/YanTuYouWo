"""HTTP/爬取层边界测试：编码检测、导航页判定、SPA 检测。

这些是「任何工况都能爬」的核心：GB 系编码页、JS 动态页、导航/首页误入。
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from loguru import logger
logger.remove()
logger.add(sys.stderr, level="WARNING")


class _MockResponse:
    """模拟 httpx.Response 的最小接口，供 _detect_encoding 测试"""
    def __init__(self, content: bytes, content_type: str = ""):
        self.content = content
        self.headers = {"content-type": content_type} if content_type else {}


def test_detect_encoding_gbk():
    from src.utils.http_client import HttpClient
    # GB2312 meta
    r = _MockResponse(b'<html><head><meta charset="gb2312"></head><body>x</body></html>')
    assert HttpClient._detect_encoding(r) == "gbk"
    # GBK meta
    r = _MockResponse(b'<html><head><meta http-equiv="Content-Type" content="text/html; charset=gbk"></head></html>')
    assert HttpClient._detect_encoding(r) == "gbk"
    print("  ✅ GB2312/GBK 编码检测")


def test_detect_encoding_utf8_and_unknown():
    from src.utils.http_client import HttpClient
    # UTF-8 meta → 返回 None（httpx 默认即 UTF-8）
    r = _MockResponse(b'<meta charset="utf-8">')
    assert HttpClient._detect_encoding(r) is None
    # 其它编码
    r = _MockResponse(b'<meta charset="big5">')
    assert HttpClient._detect_encoding(r) == "big5"
    # 无 meta、无 header → None
    r = _MockResponse(b'<html><body>no meta</body></html>')
    assert HttpClient._detect_encoding(r) is None
    print("  ✅ UTF-8/big5/无 meta")


def test_detect_encoding_header_overrides():
    from src.utils.http_client import HttpClient
    # header 已声明 charset → 返回 None（交给 httpx 处理）
    r = _MockResponse(b'<meta charset="gbk">', content_type="text/html; charset=utf-8")
    assert HttpClient._detect_encoding(r) is None
    print("  ✅ header charset 优先")


# ---------- 导航页判定 ----------
def test_navigation_page_detection():
    from src.crawler.list_crawler import _is_navigation_page
    # 极小页面无日期 → 导航页
    assert _is_navigation_page("<html><body>small</body></html>") is True
    # 有列表结构 → 非导航页
    html = '<ul class="news_list"><li><a href="/x">通知</a></li></ul>'
    assert _is_navigation_page(html * 5) is False
    print("  ✅ 导航页判定")


def test_js_rendering_detection():
    from src.crawler.list_crawler import _needs_js_rendering
    # Vue/React 标记
    html = '<body data-reactroot><div id="root"></div></body>' + 'x' * 5000
    assert _needs_js_rendering(html) is True
    # 普通页面 → False
    html2 = '<html><body>' + ('<p>内容</p>' * 200) + '</body></html>'
    assert _needs_js_rendering(html2) is False
    print("  ✅ SPA/JS 渲染检测")


def test_http2_graceful_detection():
    """http_client 在无 h2 时应能降级（不崩）"""
    from src.utils.http_client import _http2_available, http_client
    # _http2_available 返回 bool，不抛异常
    assert isinstance(_http2_available(), bool)
    # http_client 实例应记录 _use_http2 标志
    assert hasattr(http_client, "_use_http2")
    assert isinstance(http_client._use_http2, bool)
    print(f"  ✅ HTTP/2 降级检测 (use_http2={http_client._use_http2})")


if __name__ == "__main__":
    print("=== HTTP/爬取层边界测试 ===")
    test_detect_encoding_gbk()
    test_detect_encoding_utf8_and_unknown()
    test_detect_encoding_header_overrides()
    test_navigation_page_detection()
    test_js_rendering_detection()
    test_http2_graceful_detection()
    print("\n🎉 所有 HTTP 层边界测试通过!")
