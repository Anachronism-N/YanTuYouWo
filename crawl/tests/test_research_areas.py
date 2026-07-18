"""研究方向泛化回归测试。

验证 LLM 抽取的具体方向能被映射到用户常搜的宽泛类别，解决
docs 记载的「research_area=人工智能 命中 0」痛点。
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.tutor.research_areas import categorize_area, broaden_research_areas


def test_categorize_specific_to_broad():
    assert "人工智能" in categorize_area("深度学习")
    assert "人工智能" in categorize_area("强化学习与决策")
    assert "计算机视觉" in categorize_area("基于深度学习的图像识别")
    assert "计算机视觉" in categorize_area("目标检测与跟踪")
    assert "自然语言处理" in categorize_area("大语言模型对齐")
    assert "网络安全" in categorize_area("隐私保护与联邦学习")
    assert "数据挖掘" in categorize_area("推荐系统算法")
    assert "机器人" in categorize_area("移动机器人 SLAM 导航")
    print("  ✅ 具体方向 → 宽泛类别")


def test_broaden_keeps_specific_and_adds_category():
    out = broaden_research_areas(["深度学习", "图像识别", "目标检测"])
    # 具体项保留
    assert "深度学习" in out and "图像识别" in out and "目标检测" in out
    # 宽泛类别追加
    assert "人工智能" in out
    assert "计算机视觉" in out
    # 具体在前，类别在后
    assert out.index("深度学习") < out.index("人工智能")
    print(f"  ✅ 保留具体 + 追加类别 ({out})")


def test_broaden_dedup():
    out = broaden_research_areas(["机器学习", "深度学习", "神经网络"])
    # 三个都归「人工智能」，但「人工智能」只出现一次
    assert out.count("人工智能") == 1
    print("  ✅ 去重")


def test_broaden_empty_and_no_match():
    assert broaden_research_areas([]) == []
    assert broaden_research_areas(None) == []
    # 无匹配关键词时，原样返回
    out = broaden_research_areas(["高等数学教学"])
    assert out == ["高等数学教学"]
    print("  ✅ 空输入 / 无匹配保留原样")


def test_ai_search_would_now_match():
    """模拟后端子串检索：'人工智能' 现在能命中具体方向导师"""
    areas = broaden_research_areas(["图神经网络", "图表示学习"])
    assert "人工智能" in areas, areas
    # 后端若按子串匹配 research_areas，搜「人工智能」即可命中
    assert any("人工智能" == a for a in areas)
    print("  ✅ '人工智能' 检索可命中（痛点修复）")


if __name__ == "__main__":
    print("=== 研究方向泛化测试 ===")
    test_categorize_specific_to_broad()
    test_broaden_keeps_specific_and_adds_category()
    test_broaden_dedup()
    test_broaden_empty_and_no_match()
    test_ai_search_would_now_match()
    print("\n🎉 所有研究方向泛化测试通过!")
