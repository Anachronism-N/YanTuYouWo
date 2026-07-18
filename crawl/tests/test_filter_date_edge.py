"""规则过滤/日期推断/分类消歧的对抗性边界测试。

用各种极端与矛盾输入压测，确保不崩、不误判。
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from loguru import logger
logger.remove()
logger.add(sys.stderr, level="WARNING")

from src.processor.rule_filter import relevance_score, infer_program_type, batch_filter, source_type_category
from src.processor.date_inference import infer_registration_window, infer_camp_window


# ---------- 规则过滤：空与极端输入 ----------
def test_filter_empty_and_short():
    assert relevance_score("") == 0.0
    assert relevance_score("a") == 0.0
    assert relevance_score("ab") == 0.0
    assert relevance_score(None) == 0.0
    print("  ✅ 空/过短标题 → 0")


def test_filter_pure_english():
    # 纯英文：无中文招生关键词，应低分
    s = relevance_score("Hello World Welcome")
    assert s == 0.0
    print("  ✅ 纯英文无关标题 → 0")


def test_filter_english_summer_camp():
    # 含英文夏令营关键词但无中文 → 保守低分（当前只匹配中文关键词）
    s = relevance_score("2026 Summer Camp for Excellent Students")
    assert s >= 0.0  # 不崩即可
    print(f"  ✅ 英文夏令营标题不崩 (score={s})")


def test_filter_batch_empty():
    assert batch_filter([]) == []
    assert batch_filter([{"title": "", "url": "x"}]) == []
    print("  ✅ 批量过滤空输入")


# ---------- 矛盾信号 ----------
def test_tuimian_beats_tongkao_when_both_present():
    """标题同时含推免与统考信号 → 推免优先（夏令营最优先）"""
    # 夏令营 + 初试 → 夏令营（夏令营最高优先级）
    assert infer_program_type("2026年夏令营与初试说明") == "夏令营"
    # 推免 + 调剂 → 推免（推免次优先）
    assert infer_program_type("2026年推免生接收与调剂办法") == "预推免"
    print("  ✅ 推免/夏令营优先于统考信号")


def test_infer_program_type_empty():
    assert infer_program_type("") in ("其他", None, "")
    print("  ✅ infer_program_type 空标题不崩")


# ---------- 日期推断：多截止/无效/越界 ----------
def test_multiple_deadlines_returns_a_valid_date():
    """多个截止信号时，返回某个有效日期（不崩、是合法日期）"""
    s, e = infer_registration_window(
        "报名截止2026年6月15日。材料提交截止2026年6月20日。",
        title="2026年夏令营",
    )
    assert e is not None
    # 应是其中之一（取首个报名截止信号）
    from datetime import date
    assert e in (date(2026, 6, 15), date(2026, 6, 20))
    print(f"  ✅ 多截止日返回合法日期 ({e})")


def test_invalid_date_not_returned():
    """非法日期（2月30日、13月）不应返回"""
    s, e = infer_registration_window("报名截止：2026年13月40日", title="2026年")
    assert e is None  # 非法日期应被 _safe_date 过滤
    print("  ✅ 非法日期被过滤")


def test_no_date_in_content():
    s, e = infer_registration_window("正文无任何日期信息。", title="2026年通知")
    assert e is None and s is None
    print("  ✅ 无日期内容 → (None, None)")


def test_year_boundary_dec_jan():
    """跨年区间（12月-次年1月）应能解析为两个不同日期"""
    s, e = infer_registration_window(
        "报名时间：2025年12月20日至2026年1月10日", title="2026年推免"
    )
    from datetime import date
    assert s == date(2025, 12, 20), s
    assert e == date(2026, 1, 10), e
    print("  ✅ 跨年区间解析")


def test_camp_window_md_only_with_year():
    s, e = infer_camp_window("活动时间：7月5日—7月9日", title="2026年暑期夏令营")
    from datetime import date
    assert s == date(2026, 7, 5) and e == date(2026, 7, 9), (s, e)
    print("  ✅ 活动区间（仅月日 + 标题年份）")


# ---------- 源类型分类边界 ----------
def test_source_type_category_edge():
    assert source_type_category("") == "other"
    assert source_type_category("  ") == "other"
    assert source_type_category("某某") == "other"
    # 招生 + 新闻 同时出现 → 招生优先（先判断）
    assert source_type_category("招生新闻") == "admission"
    print("  ✅ source_type_category 边界")


if __name__ == "__main__":
    print("=== 过滤/日期/分类对抗性边界测试 ===")
    test_filter_empty_and_short()
    test_filter_pure_english()
    test_filter_english_summer_camp()
    test_filter_batch_empty()
    test_tuimian_beats_tongkao_when_both_present()
    test_infer_program_type_empty()
    test_multiple_deadlines_returns_a_valid_date()
    test_invalid_date_not_returned()
    test_no_date_in_content()
    test_year_boundary_dec_jan()
    test_camp_window_md_only_with_year()
    test_source_type_category_edge()
    print("\n🎉 所有对抗性边界测试通过!")
