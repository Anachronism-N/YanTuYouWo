"""夏令营/预推免精度回归测试。

用 2026-07 真实爬取到的 985 高校通知标题，验证 rule_filter 能：
1. 正确识别夏令营/预推免/推免拟录取（真阳性，类型与高分）
2. 把统考/在职/定向/非全/专项博士等非推免渠道归类为「统考招生」
3. 对过期（2018/2019 等）通知降权

这些标题直接来自 scripts/e2e_probe.py 的真实输出，保证回归贴近线上分布。
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from loguru import logger
logger.remove()
logger.add(sys.stderr, level="WARNING")

from src.processor.rule_filter import relevance_score, infer_program_type, batch_filter


# ========== 真阳性：夏令营/预推免（应高分 + 正确类型）==========
SUMMER_CAMP_TITLES = [
    "天津大学2027级优秀大学生暑期夏令营（更新中）",
    "崂山国家实验室2026年“智荟深蓝”夏令营通知",
    "关于举办2026年优秀大学生暑期夏令营的通知",
    "XX学院2027年优秀大学生暑期学校招生简章",
]
PRE_ADMISSION_TITLES = [
    "东南大学各院、系（所）2027年接收推荐免试研究生报名通知汇总",
    "东南大学2027年接收推荐免试研究生报名通知",
    "关于接收2026年推荐免试研究生的通知",
    "XX大学2026年接收外校推免生办法",
]
TUIMIAN_ADMISSION_TITLES = [  # 推免拟录取名单
    "重庆大学2026年拟录取推免硕士（直博）研究生名单公示",
    "重庆大学2026年拟录取推免研究生（含直博生）分学院、专业及专项人数统计",
]

# ========== 假阳性：统考/非推免渠道（应归为「统考招生」）==========
TONGKAO_TITLES = [
    "关于硕士生招生考试（初试）药学综合调整考试大纲的公告",
    "关于硕士生招生考试（初试）宗教学方向调整考试科目的公告",
    "重庆大学2026年硕士研究生招生考试初试合格基本分数线",
    "关于招收2027年硕士研究生初试科目的公告",
    "北航招收2027年学历硕士初试科目考试大纲",
    "东南大学2026年高校思想政治工作骨干在职攻读博士学位研究生拟录取名单公示",
    "东南大学2026年非全日制法律博士研究生拟录取名单公示",
    "同济大学2026年拟录取定向就业博士研究生签订合同通知",
    "天津大学2026年新质生产力专项博士研究生招生简章",
]

# ========== 过期通知（应降权）==========
STALE_PAIRS = [
    # (新鲜标题, 过期标题)
    ("天津大学2027级优秀大学生暑期夏令营", "天津大学2019级研究生招生夏令营活动通知"),
    ("XX大学2026年硕士研究生招生简章", "XX大学2018年硕士研究生招生简章"),
]


def test_summer_camp_detection():
    """夏令营标题：高分 + 类型=夏令营"""
    for t in SUMMER_CAMP_TITLES:
        s = relevance_score(t)
        pt = infer_program_type(t)
        assert s >= 0.5, f"夏令营得分过低 {s}: {t}"
        assert pt == "夏令营", f"类型应为夏令营，实际 {pt}: {t}"
    print(f"  ✅ 夏令营识别 ({len(SUMMER_CAMP_TITLES)} 条)")


def test_pre_admission_detection():
    """预推免标题：高分 + 类型=预推免"""
    for t in PRE_ADMISSION_TITLES:
        s = relevance_score(t)
        pt = infer_program_type(t)
        assert s >= 0.5, f"预推免得分过低 {s}: {t}"
        assert pt == "预推免", f"类型应为预推免，实际 {pt}: {t}"
    print(f"  ✅ 预推免识别 ({len(PRE_ADMISSION_TITLES)} 条)")


def test_tuimian_admission_list():
    """推免拟录取名单：类型=拟录取（不是统考招生）"""
    for t in TUIMIAN_ADMISSION_TITLES:
        pt = infer_program_type(t)
        assert pt == "拟录取", f"推免拟录取应为「拟录取」，实际 {pt}: {t}"
    print(f"  ✅ 推免拟录取识别 ({len(TUIMIAN_ADMISSION_TITLES)} 条)")


def test_tongkao_classification():
    """统考/在职/定向/非全/专项博士：类型=统考招生（非推免）"""
    for t in TONGKAO_TITLES:
        pt = infer_program_type(t)
        assert pt == "统考招生", f"统考类应为「统考招生」，实际 {pt}: {t}"
    print(f"  ✅ 统考/非推免渠道归类 ({len(TONGKAO_TITLES)} 条)")


def test_stale_year_penalty():
    """过期年份（2018/2019 等）应比同款新鲜标题得分更低"""
    for fresh, stale in STALE_PAIRS:
        sf = relevance_score(fresh)
        ss = relevance_score(stale)
        assert sf > ss, f"过期标题未降权: fresh={sf} stale={ss}\n  fresh={fresh}\n  stale={stale}"
    print(f"  ✅ 过期年份降权 ({len(STALE_PAIRS)} 对)")


def test_batch_filter_orders_tuimian_above_tongkao():
    """批量过滤：推免类得分应高于统考类，排序正确"""
    items = [
        {"title": "东南大学2027年接收推荐免试研究生报名通知", "url": "http://a/1"},
        {"title": "关于硕士生招生考试（初试）药学综合调整考试大纲的公告", "url": "http://a/2"},
        {"title": "天津大学2027级优秀大学生暑期夏令营", "url": "http://a/3"},
    ]
    res = batch_filter(items)
    assert len(res) == 3
    titles = [r["title"] for r in res]
    # 推免/夏令营应排在统考前面
    assert titles.index("东南大学2027年接收推荐免试研究生报名通知") < titles.index("关于硕士生招生考试（初试）药学综合调整考试大纲的公告")
    print("  ✅ 推免类排序高于统考类")


def test_date_prefix_not_penalized_as_stale():
    """日期前缀（2025-12-24标题）不应触发过期年份降权"""
    s = relevance_score("2025-12-24重庆大学2026年拟录取推免硕士名单公示")
    # 推免拟录取：推免+1.0，拟录取名单+0.5，招生/硕士/研究生+0.2... 应较高
    assert s >= 1.0, f"日期前缀标题被误降权: {s}"
    print("  ✅ 日期前缀不误判为过期")


def test_title_overrides_llm_misclassification():
    """标题强信号应覆盖 LLM 的误分类（渠道消歧）

    真实场景：LLM 把「在职攻读博士拟录取」判为「拟录取」（推免），
    但标题明确是统考/在职渠道 → 必须纠正为「统考招生」。
    """
    # LLM 说是「拟录取」，但标题是统考/在职 → 统考招生
    assert infer_program_type(
        "东南大学2026年高校思想政治工作骨干在职攻读博士学位研究生拟录取名单公示",
        "拟录取",
    ) == "统考招生"
    # LLM 说是「招生简章」，但标题含初试/考试大纲 → 统考招生
    assert infer_program_type(
        "关于硕士生招生考试（初试）药学综合调整考试大纲的公告",
        "招生简章",
    ) == "统考招生"
    # LLM 说是「拟录取」，标题明确推免 → 仍是拟录取（不被统考覆盖）
    assert infer_program_type(
        "重庆大学2026年拟录取推免硕士（直博）研究生名单公示",
        "拟录取",
    ) == "拟录取"
    # 标题无强渠道信号时，信任 LLM 有效分类
    assert infer_program_type("XX大学2026年研究生招生公告", "招生简章") == "招生简章"
    print("  ✅ 标题强信号覆盖 LLM 渠道误分类")


if __name__ == "__main__":
    print("=== 夏令营/预推免精度回归测试 ===")
    test_summer_camp_detection()
    test_pre_admission_detection()
    test_tuimian_admission_list()
    test_tongkao_classification()
    test_stale_year_penalty()
    test_batch_filter_orders_tuimian_above_tongkao()
    test_date_prefix_not_penalized_as_stale()
    test_title_overrides_llm_misclassification()
    print("\n🎉 所有精度测试通过!")
