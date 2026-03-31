"""阶段三核心模块单元测试"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 禁用 loguru 的默认 handler，避免测试时输出过多日志
from loguru import logger
logger.remove()
logger.add(sys.stderr, level="WARNING")


def test_rule_filter():
    """测试规则过滤器"""
    from src.processor.rule_filter import relevance_score, batch_filter

    # 强相关
    assert relevance_score("关于举办2026年优秀大学生夏令营的通知") >= 0.5
    assert relevance_score("2026年推免生接收办法") >= 0.5
    assert relevance_score("关于接收2026年推荐免试研究生的通知") >= 0.5
    assert relevance_score("直博生招生通知") >= 0.5

    # 不相关
    assert relevance_score("食堂招标公告") < 0.2
    assert relevance_score("关于停电的通知") < 0.2
    assert relevance_score("关于2026年考研调剂的通知") < 0.2

    # 批量过滤
    items = [
        {"title": "2026年夏令营通知", "url": "http://a.com/1"},
        {"title": "关于停电的通知", "url": "http://a.com/2"},
        {"title": "推免生接收办法", "url": "http://a.com/3"},
        {"title": "食堂招标", "url": "http://a.com/4"},
    ]
    result = batch_filter(items)
    assert len(result) == 2, f"Expected 2, got {len(result)}"
    assert result[0]["relevance_score"] >= result[1]["relevance_score"]
    print("  ✅ rule_filter")


def test_validate_and_fix():
    """测试数据校验"""
    from src.crawler.detail_crawler import _validate_and_fix

    e = {"program_type": "bad", "year": None, "target_degree": "bad"}
    f = _validate_and_fix(e, "2026年夏令营招生通知", "2026-03-25")
    assert f["program_type"] == "夏令营"
    assert f["year"] == 2026
    assert f["target_degree"] == "硕博"

    e2 = {"program_type": "bad", "year": None, "target_degree": "bad"}
    f2 = _validate_and_fix(e2, "直博生招生通知", None)
    assert f2["program_type"] == "直博"
    assert f2["target_degree"] == "博士"
    print("  ✅ validate_and_fix")


def test_confidence():
    """测试置信度计算"""
    from src.crawler.detail_crawler import _calculate_confidence

    full = {
        "program_type": "夏令营", "year": 2026, "summary": "test",
        "target_degree": "硕博", "registration_start": "2026-04-01",
        "registration_end": "2026-05-01", "disciplines": ["CS"],
        "contact": "a@b.com", "requirements": "985",
    }
    c1 = _calculate_confidence(full, 1.0)
    assert c1 > 0.8, f"Expected >0.8, got {c1}"

    partial = {"program_type": "夏令营", "year": 2026}
    c2 = _calculate_confidence(partial, 0.5)
    assert c2 < 0.5, f"Expected <0.5, got {c2}"
    print(f"  ✅ confidence (full={c1}, partial={c2})")


def test_clean_text():
    """测试正文清理"""
    from src.parser.content_extractor import _clean_text

    dirty = "Hello\n\n\n\n\nWorld\n版权所有 XXX大学\nCopyright 2026\n浏览次数：123"
    clean = _clean_text(dirty)
    assert "版权所有" not in clean
    assert "Hello" in clean
    assert "World" in clean
    assert "浏览次数" not in clean
    print("  ✅ clean_text")


def test_list_parser():
    """测试列表页解析器"""
    from src.parser.list_parser import NoticeListParser

    parser = NoticeListParser()

    # CMS模板解析
    html = """<html><body>
    <ul class="news_list">
    <li><a href="/info/1.htm">关于2026年夏令营的通知</a><span>2026-03-25</span></li>
    <li><a href="/info/2.htm">推免生接收办法公布</a><span>2026-03-20</span></li>
    <li><a href="/info/3.htm">直博生招生简章发布</a><span>2026-03-15</span></li>
    <li><a href="/info/4.htm">优秀大学生暑期学校报名</a><span>2026-03-10</span></li>
    <li><a href="/info/5.htm">硕士研究生招生说明</a><span>2026-03-05</span></li>
    </ul></body></html>"""
    result = parser.parse(html, "http://example.com")
    assert len(result) == 5, f"Expected 5, got {len(result)}"
    assert result[0]["date"] == "2026-03-25"
    assert result[0]["url"] == "http://example.com/info/1.htm"
    print(f"  ✅ list_parser CMS ({len(result)} items)")

    # 启发式解析
    html2 = """<html><body><div class="content">
    <div><a href="/a1.htm">2026年推免生接收通知</a> 2026-03-25</div>
    <div><a href="/a2.htm">夏令营报名开始啦</a> 2026-03-20</div>
    <div><a href="/a3.htm">直博生招生公告发布</a> 2026-03-15</div>
    <div><a href="/a4.htm">暑期学校通知公告</a> 2026-03-10</div>
    </div></body></html>"""
    result2 = parser.parse(html2, "http://example.com")
    assert len(result2) >= 3, f"Expected >=3, got {len(result2)}"
    print(f"  ✅ list_parser heuristic ({len(result2)} items)")


def test_json_parse():
    """测试LLM JSON解析容错"""
    from src.llm.client import LLMClient

    client = LLMClient()

    # 纯JSON
    assert client._parse_json_response('{"a": 1}') == {"a": 1}
    # markdown代码块
    assert client._parse_json_response('```json\n{"a": 1}\n```') == {"a": 1}
    # 嵌入文本中的JSON
    assert client._parse_json_response('Here is the result: {"a": 1} done') == {"a": 1}
    # JSON数组
    assert client._parse_json_response('[{"a": 1}]') == [{"a": 1}]
    # 无效JSON
    assert client._parse_json_response("not json at all") is None
    print("  ✅ json_parse")


def test_date_parse():
    """测试日期解析"""
    from src.parser.list_parser import NoticeListParser

    parser = NoticeListParser()
    assert parser._parse_date("2026-03-25") == "2026-03-25"
    assert parser._parse_date("2026.03.25") == "2026-03-25"
    assert parser._parse_date("2026/03/25") == "2026-03-25"
    assert parser._parse_date("2026年3月25日") == "2026-03-25"
    assert parser._parse_date("[2026-03-25]") == "2026-03-25"
    assert parser._parse_date("(2026-03-25)") == "2026-03-25"
    assert parser._parse_date("") is None
    assert parser._parse_date("invalid") is None
    print("  ✅ date_parse")


def test_pagination_detection():
    """测试翻页检测"""
    from src.parser.list_parser import NoticeListParser

    parser = NoticeListParser()

    # 测试1: 带分页容器的HTML
    html_with_pagination = """<html><body>
    <ul class="news_list">
    <li><a href="/info/1.htm">通知1</a><span>2026-03-25</span></li>
    <li><a href="/info/2.htm">通知2</a><span>2026-03-20</span></li>
    <li><a href="/info/3.htm">通知3</a><span>2026-03-15</span></li>
    </ul>
    <div class="pagination">
        <a href="/list.htm" class="active">1</a>
        <a href="/list2.htm">2</a>
        <a href="/list3.htm">3</a>
        <a href="/list4.htm">4</a>
        <a href="/list2.htm">下一页</a>
        <a href="/list4.htm">末页</a>
    </div>
    </body></html>"""
    pages = parser.detect_pagination(html_with_pagination, "http://example.com/list.htm")
    assert len(pages) >= 3, f"Expected >=3 pages, got {len(pages)}: {pages}"
    assert "http://example.com/list2.htm" in pages
    print(f"  ✅ pagination detection (container, {len(pages)} pages)")

    # 测试2: 博达站群URL模式推断
    html_boda = """<html><body>
    <ul class="news_list">
    <li><a href="/info/1.htm">通知1</a><span>2026-03-25</span></li>
    </ul>
    <span>共3页</span>
    </body></html>"""
    pages2 = parser.detect_pagination(html_boda, "http://example.com/6330/list.htm")
    assert len(pages2) == 2, f"Expected 2 pages, got {len(pages2)}: {pages2}"
    assert "http://example.com/6330/list2.htm" in pages2
    assert "http://example.com/6330/list3.htm" in pages2
    print(f"  ✅ pagination detection (boda infer, {len(pages2)} pages)")

    # 测试3: 无分页的HTML
    html_no_pagination = """<html><body>
    <ul class="news_list">
    <li><a href="/info/1.htm">通知1</a><span>2026-03-25</span></li>
    </ul>
    </body></html>"""
    pages3 = parser.detect_pagination(html_no_pagination, "http://example.com/news.html")
    assert len(pages3) == 0, f"Expected 0 pages, got {len(pages3)}"
    print(f"  ✅ pagination detection (no pagination)")

    # 测试4: 总页数检测
    from bs4 import BeautifulSoup
    soup = BeautifulSoup("<html><body>共5页 当前第1页</body></html>", "lxml")
    total = parser._detect_total_pages(soup)
    assert total == 5, f"Expected 5, got {total}"

    soup2 = BeautifulSoup("<html><body>1/8</body></html>", "lxml")
    total2 = parser._detect_total_pages(soup2)
    assert total2 == 8, f"Expected 8, got {total2}"
    print(f"  ✅ total pages detection")


if __name__ == "__main__":
    print("=== 阶段三核心模块单元测试 ===")
    test_rule_filter()
    test_validate_and_fix()
    test_confidence()
    test_clean_text()
    test_list_parser()
    test_json_parse()
    test_date_parse()
    test_pagination_detection()
    print("\n🎉 所有单元测试通过!")
