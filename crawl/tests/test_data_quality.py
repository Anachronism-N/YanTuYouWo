"""字段清洗质量测试 —— LLM 返回的脏值清理。"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from loguru import logger
logger.remove()
logger.add(sys.stderr, level="WARNING")

from src.crawler.detail_crawler import _validate_and_fix


def _disc(inp):
    return _validate_and_fix({"disciplines": inp}, "2026年夏令营通知", None).get("disciplines")


def test_disciplines_null_string_dropped():
    assert _disc(["null"]) is None
    assert _disc("null") is None
    assert _disc(None) is None
    print("  ✅ disciplines 纯 null → None")


def test_disciplines_mixed_null_kept_real():
    """列表混入 null/空/无 → 只保留真实学科"""
    assert _disc(["null", "计算机科学"]) == ["计算机科学"]
    assert _disc(["人工智能", "null", "", "无"]) == ["人工智能"]
    print("  ✅ disciplines 混入 null 过滤（保留真实项）")


def test_disciplines_clean_kept():
    assert _disc(["计算机", "软件工程"]) == ["计算机", "软件工程"]
    print("  ✅ 干净 disciplines 原样保留")


def test_contact_list_joined():
    """contact 为列表时合并为字符串"""
    r = _validate_and_fix({"contact": ["a@b.com", "010-1234"]}, "通知", None)
    assert isinstance(r["contact"], str) and "a@b.com" in r["contact"]
    print("  ✅ contact 列表 → 字符串")


def test_quota_stringified():
    r = _validate_and_fix({"quota": 30}, "通知", None)
    assert r["quota"] == "30"
    print("  ✅ quota 数字 → 字符串")


if __name__ == "__main__":
    print("=== 字段清洗质量测试 ===")
    test_disciplines_null_string_dropped()
    test_disciplines_mixed_null_kept_real()
    test_disciplines_clean_kept()
    test_contact_list_joined()
    test_quota_stringified()
    print("\n🎉 所有字段清洗测试通过!")
