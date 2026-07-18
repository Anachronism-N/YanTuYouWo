"""报名/活动日期推断回归测试。

用贴近真实夏令营/预推免通知的正文片段，验证 date_inference 能在 LLM 漏提时
补全 registration_end / registration_start / camp_start / camp_end。
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import date

from src.processor.date_inference import (
    infer_registration_window,
    infer_camp_window,
)


def test_registration_end_full_date():
    s, e = infer_registration_window("报名截止日期：2026-06-15", title="2026年夏令营")
    assert e == date(2026, 6, 15), e
    print("  ✅ 报名截止(完整日期 YYYY-MM-DD)")


def test_registration_end_chinese_date():
    s, e = infer_registration_window("报名截止时间：2026年6月15日", title="")
    assert e == date(2026, 6, 15), e
    print("  ✅ 报名截止(YYYY年M月D日)")


def test_registration_end_md_only_uses_title_year():
    # 正文只给月日，年份从标题推断
    s, e = infer_registration_window("请于6月15日前完成报名。", title="2026年优秀大学生夏令营")
    assert e == date(2026, 6, 15), e
    print("  ✅ 报名截止(仅月日 + 标题年份补全)")


def test_registration_window_range():
    s, e = infer_registration_window(
        "报名时间：2026年5月1日至2026年6月15日。请按时提交。",
        title="2026年推免预报名通知",
    )
    assert s == date(2026, 5, 1), s
    assert e == date(2026, 6, 15), e
    print("  ✅ 报名区间(起止)")


def test_registration_end_dot_format():
    s, e = infer_registration_window("申请截止：2026.06.20", title="")
    assert e == date(2026, 6, 20), e
    print("  ✅ 报名截止(YYYY.MM.DD)")


def test_registration_end_deadline_english():
    s, e = infer_registration_window("Application deadline: 2026-07-01", title="")
    assert e == date(2026, 7, 1), e
    print("  ✅ 报名截止(英文 deadline)")


def test_camp_window():
    s, e = infer_camp_window(
        "活动时间：2026年7月10日至7月15日。地点：北京。",
        title="2026年暑期夏令营",
    )
    assert s == date(2026, 7, 10), s
    assert e == date(2026, 7, 15), e
    print("  ✅ 活动区间(起止)")


def test_no_false_positive_on_irrelevant_date():
    # 没有截止/报名信号词时，不应把任意日期当报名截止
    s, e = infer_registration_window("会议于2026年3月召开。联系人张老师。", title="2026年学术会议")
    # 没有报名信号 → end 应为 None
    assert e is None, f"误判: {e}"
    print("  ✅ 无截止信号时不误判")


def test_registration_end_jiri_zhi():
    """「即日起至 X月X日」「即日起到 X月X日」截止信号"""
    s, e = infer_registration_window("报名即日起至6月15日。", title="2026年夏令营")
    assert e == date(2026, 6, 15), e
    s2, e2 = infer_registration_window("自即日起到2026年6月20日截止。", title="")
    assert e2 == date(2026, 6, 20), e2
    print("  ✅ 即日起至/到 X月X日")


def test_realistic_summer_camp_snippet():
    """贴近真实夏令营通知的综合片段"""
    content = """
    一、报名时间：2026年5月10日至2026年6月20日，请登录系统报名。
    二、活动安排：夏令营活动时间：2026年7月5日—7月9日，地点：我校。
    三、联系方式：李老师 li@xx.edu.cn
    """
    s, e = infer_registration_window(content, title="XX大学2026年优秀大学生暑期夏令营")
    assert s == date(2026, 5, 10), s
    assert e == date(2026, 6, 20), e
    cs, ce = infer_camp_window(content, title="XX大学2026年优秀大学生暑期夏令营")
    assert cs == date(2026, 7, 5), cs
    assert ce == date(2026, 7, 9), ce
    print("  ✅ 真实夏令营片段(报名区间+活动区间全中)")


if __name__ == "__main__":
    print("=== 日期推断回归测试 ===")
    test_registration_end_full_date()
    test_registration_end_chinese_date()
    test_registration_end_md_only_uses_title_year()
    test_registration_window_range()
    test_registration_end_dot_format()
    test_registration_end_deadline_english()
    test_camp_window()
    test_no_false_positive_on_irrelevant_date()
    test_realistic_summer_camp_snippet()
    print("\n🎉 所有日期推断测试通过!")
