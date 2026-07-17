"""导师爬虫核心逻辑单元测试（无需网络/LLM）。

覆盖：
- OpenAlex：中文姓名→拼音变体、三阶段消歧（机构匹配优先、避免同名名人错配）
- faculty_list_parser：姓名前缀提取（从"李未教授"/"钱德沛教授depeiq@..."剥离）
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from loguru import logger
logger.remove()
logger.add(sys.stderr, level="WARNING")


# ========== OpenAlex：拼音 + 消歧 ==========

def test_pinyin_variants():
    from src.tutor.enrichers.openalex_enricher import _to_pinyin_name
    # 三字名：应产生西式(名 姓) + 中式(姓名连写) 至少两种
    v = _to_pinyin_name("黄永刚")
    assert len(v) >= 2
    # 归一化后应包含姓名全部字母
    norm = "".join(c.lower() for c in v[0] if c.isalpha())
    assert "huang" in norm and "yong" in norm and "gang" in norm, v
    # 两字名
    v2 = _to_pinyin_name("张钹")
    assert len(v2) >= 1
    norm2 = "".join(c.lower() for c in v2[0] if c.isalpha())
    assert "zhang" in norm2 and "bo" in norm2, v2
    # 空名
    assert _to_pinyin_name("") == []
    print("  ✅ openalex 拼音变体")


def test_disambiguate_prefers_institution_match():
    """同名时，目标院校的候选应胜出，避免把同名名人错配给本校教师"""
    from src.tutor.enrichers.openalex_enricher import _disambiguate, _to_pinyin_name
    cands = [
        # 名人：works 极高但不是目标院校
        {"id": "A", "display_name": "Yonggang Huang", "works_count": 695,
         "affiliations": [{"institution": {"display_name": "Northwestern University"}}]},
        # 本校候选：works 低但机构匹配
        {"id": "B", "display_name": "Yonggang Huang", "works_count": 10,
         "affiliations": [{"institution": {"display_name": "Beijing Institute of Technology"}}]},
    ]
    best, method = _disambiguate(
        cands, "黄永刚", ["Beijing Institute of Technology"],
        target_pinyin_candidates=_to_pinyin_name("黄永刚"),
    )
    assert best is not None and best["id"] == "B", f"应选本校候选 B，实际 {best}"
    assert method == "matched_institution"
    print("  ✅ openalex 消歧优先机构匹配（避免同名名人错配）")


def test_disambiguate_no_match_when_no_institution_and_ambiguous():
    """无机构匹配 + 候选众多（>2）+ 名字不精确 → 应拒绝，不强行错配"""
    from src.tutor.enrichers.openalex_enricher import _disambiguate, _to_pinyin_name
    # 4 个候选人，姓氏拼音接近但全名与"李伟"(Wei Li/Li Wei)不精确匹配，都不在目标院校
    cands = [
        {"id": f"c{i}", "display_name": name, "works_count": 30 + i,
         "affiliations": [{"institution": {"display_name": "Other University"}}]}
        for i, name in enumerate(["Wei Zhao", "Wei Sun", "Wei Ma", "Wei Yang"])
    ]
    best, method = _disambiguate(
        cands, "李伟", ["Beihang University"],
        target_pinyin_candidates=_to_pinyin_name("李伟"),
    )
    # 候选>2、无机构匹配、名字相似度<0.6 → 应返回 no_match（而非随意挑一个）
    assert best is None, f"多候选无机构匹配且名字不精确应拒绝，却选了 {best}"
    assert method == "no_match"
    print("  ✅ openalex 消歧拒绝多候选无机构匹配")


def test_restore_abstract_inverted_index():
    """OpenAlex inverted index 还原"""
    from src.tutor.enrichers.openalex_enricher import _restore_abstract
    inv = {"Hello": [0], "world": [1], "OpenAlex": [2]}
    assert _restore_abstract(inv) == "Hello world OpenAlex"
    assert _restore_abstract(None) is None
    assert _restore_abstract({}) is None
    print("  ✅ openalex inverted index 还原")


# ========== faculty_list_parser：姓名提取 ==========

def test_extract_name_prefix_strips_title_and_email():
    """从"姓名+职称+邮箱"拼接文本中剥离出姓名"""
    from src.tutor.faculty_list_parser import _extract_name_prefix
    assert _extract_name_prefix("李未教授") == "李未"
    assert _extract_name_prefix("钱德沛教授depeiq@buaa.edu.cn") == "钱德沛"
    assert _extract_name_prefix("高文职称：教授 中国工程院院士") == "高文"
    assert _extract_name_prefix("蔡朝晖 女 教授") == "蔡朝晖"
    assert _extract_name_prefix("约翰·爱德华·霍普克罗夫特职称：教授") == "约翰·爱德华·霍普克罗夫特"
    # 纯噪音不应返回名字
    assert _extract_name_prefix("全体教师") is None
    assert _extract_name_prefix("") is None
    print("  ✅ 姓名前缀提取（剥离职称/邮箱）")


def test_looks_like_name_surname_whitelist():
    from src.tutor.faculty_list_parser import _looks_like_name
    assert _looks_like_name("李未") is True
    assert _looks_like_name("王蕴红") is True
    assert _looks_like_name("李未教授") is False  # 含职称
    assert _looks_like_name("全体教师") is False  # 噪音
    assert _looks_like_name("首页") is False
    assert _looks_like_name("诸葛孔明") is False  # 4 字 + 复姓不在简单白名单（保守拒绝）
    print("  ✅ 人名判定（姓氏白名单 + 职称/噪音过滤）")


def test_parse_faculty_list_minimal_html():
    """最小师资列表 HTML 应能解析出教师条目"""
    from src.tutor.faculty_list_parser import parse_faculty_list
    html = """<html><body>
    <ul class="news_list">
      <li><a href="/info/1078/2627.htm">李未教授</a><span>教授</span></li>
      <li><a href="/info/1078/8422.htm">郑志明教授</a><span>教授</span></li>
      <li><a href="/info/1078/8362.htm">钱德沛教授depeiq@buaa.edu.cn</a><span>教授</span></li>
      <li><a href="/info/1078/2637.htm">熊璋教授</a><span>教授</span></li>
      <li><a href="/info/1078/5211.htm">李波教授</a><span>教授</span></li>
    </ul></body></html>"""
    entries = parse_faculty_list(html, "https://example.edu/")
    names = [e["name"] for e in entries]
    assert "李未" in names
    assert "钱德沛" in names
    # 不应把"教授"或邮箱当名字
    assert all("教授" not in n for n in names)
    assert all("@" not in n for n in names)
    print(f"  ✅ 师资列表解析（{len(names)} 位，姓名干净）")


if __name__ == "__main__":
    print("=== 导师爬虫核心逻辑单元测试 ===")
    test_pinyin_variants()
    test_disambiguate_prefers_institution_match()
    test_disambiguate_no_match_when_no_institution_and_ambiguous()
    test_restore_abstract_inverted_index()
    test_extract_name_prefix_strips_title_and_email()
    test_looks_like_name_surname_whitelist()
    test_parse_faculty_list_minimal_html()
    print("\n🎉 所有导师单元测试通过!")
