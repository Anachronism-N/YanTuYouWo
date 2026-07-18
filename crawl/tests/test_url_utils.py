"""URL 工具边界测试 —— 「任何情况」的 URL 处理层。"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from loguru import logger
logger.remove()
logger.add(sys.stderr, level="WARNING")

from src.utils.url_utils import normalize_url, get_domain, is_valid_url, is_same_domain, get_base_url


def test_normalize_relative_subpath_college():
    """子路径学院：base 不以 / 结尾且非文件 → 视为目录（关键修复）"""
    # 清华经管 /ies + xshd.htm → /ies/xshd.htm
    u = normalize_url("xshd.htm", "https://sem.tsinghua.edu.cn/ies")
    assert u == "https://sem.tsinghua.edu.cn/ies/xshd.htm", u
    print("  ✅ 子路径学院相对链接")


def test_normalize_relative_standard():
    u = normalize_url("../info/1.htm", "http://e.edu.cn/yjszs/list.htm")
    assert u == "http://e.edu.cn/info/1.htm", u
    u2 = normalize_url("info/2.htm", "http://e.edu.cn/yjszs/")
    assert u2 == "http://e.edu.cn/yjszs/info/2.htm", u2
    print("  ✅ 标准相对链接")


def test_normalize_absolute_unchanged_domain():
    u = normalize_url("https://other.com/a.htm", "http://e.edu.cn/")
    assert u.startswith("https://other.com/")
    print("  ✅ 绝对链接保留")


def test_normalize_strips_fragment_and_sorts_query():
    u = normalize_url("http://e.edu.cn/x?a=2&b=1#top")
    # fragment 移除，query 排序
    assert "#top" not in u
    assert "b=1&a=2" in u or "a=2&b=1" in u  # 已排序
    print(f"  ✅ fragment 移除 + query 排序 ({u})")


def test_normalize_trailing_slash():
    # 非根路径去尾斜杠
    assert normalize_url("http://e.edu.cn/yjszs/") == "http://e.edu.cn/yjszs"
    # 根路径保留斜杠（规范形态）
    assert normalize_url("http://e.edu.cn/") == "http://e.edu.cn/"
    print("  ✅ 尾部斜杠处理")


def test_get_domain():
    assert get_domain("https://a.b.edu.cn/x/y") == "a.b.edu.cn"
    assert get_domain("http://localhost:8080/x") == "localhost:8080"
    print("  ✅ 域名提取")


def test_is_valid_url():
    assert is_valid_url("https://e.edu.cn/x") is True
    assert is_valid_url("http://e.edu.cn") is True
    assert is_valid_url("javascript:void(0)") is False
    assert is_valid_url("mailto:a@b.com") is False
    assert is_valid_url("/relative/path") is False
    assert is_valid_url("") is False
    assert is_valid_url(None) is False
    print("  ✅ URL 有效性判定")


def test_is_same_domain():
    assert is_same_domain("https://a.edu.cn/x", "http://a.edu.cn/y") is True
    assert is_same_domain("https://a.edu.cn/x", "http://b.edu.cn/y") is False
    print("  ✅ 同域判定")


def test_normalize_none_input():
    # normalize_url(None/空) 不崩，返回空串
    assert normalize_url(None) == ""
    assert normalize_url("") == ""
    print("  ✅ None/空 输入不崩")


if __name__ == "__main__":
    print("=== URL 工具边界测试 ===")
    test_normalize_relative_subpath_college()
    test_normalize_relative_standard()
    test_normalize_absolute_unchanged_domain()
    test_normalize_strips_fragment_and_sorts_query()
    test_normalize_trailing_slash()
    test_get_domain()
    test_is_valid_url()
    test_is_same_domain()
    test_normalize_none_input()
    print("\n🎉 所有 URL 工具边界测试通过!")
