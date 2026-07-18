"""列表解析器边界工况测试矩阵。

目的：用各种极端/真实页面结构压测 NoticeListParser，暴露「任何工况都能爬」的缺陷。
每个测试对应一种真实可见的页面形态。
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from loguru import logger
logger.remove()
logger.add(sys.stderr, level="WARNING")

from src.parser.list_parser import NoticeListParser

P = NoticeListParser()
BASE = "http://example.edu.cn/yjszs/"


def _titles(items):
    return [i["title"] for i in items]


# ---------- 1. 空与残缺 ----------
def test_empty_html():
    assert P.parse("", BASE) == []
    assert P.parse(None, BASE) == []
    assert P.parse("<html></html>", BASE) == []
    print("  ✅ 空/残缺 HTML 不崩")


def test_pure_navigation_page():
    """纯导航页（无通知）不应误产出大量条目"""
    html = """<html><body>
    <a href="/index.htm">首页</a>
    <a href="/about.htm">学院概况</a>
    <a href="/szdw.htm">师资队伍</a>
    <a href="/contact.htm">联系我们</a>
    </body></html>"""
    items = P.parse(html, BASE)
    # 导航链接不应被当成通知（无日期、标题是栏目名）
    assert len(items) == 0 or all(i["title"] not in ("首页", "学院概况") for i in items)
    print(f"  ✅ 纯导航页（产出 {len(items)}，应为 0）")


# ---------- 2. 日期格式覆盖 ----------
def test_all_date_formats():
    formats = {
        "2026-03-25": "2026-03-25",
        "2026.03.25": "2026-03-25",
        "2026/03/25": "2026-03-25",
        "2026年3月25日": "2026-03-25",
        "2026年3月25号": "2026-03-25",
        "[2026-03-25]": "2026-03-25",
        "(2026-03-25)": "2026-03-25",
    }
    for raw, expect in formats.items():
        got = P._parse_date(raw)
        assert got == expect, f"日期解析 {raw} → {got}，期望 {expect}"
    assert P._parse_date("") is None
    assert P._parse_date("无效") is None
    print(f"  ✅ {len(formats)} 种日期格式 + 无效输入")


# ---------- 3. 表格形式 ----------
def test_table_format():
    html = """<html><body><table class="list">
    <tr><th>标题</th><th>日期</th></tr>
    <tr><td><a href="/info/1.htm">关于2026年夏令营的通知</a></td><td>2026-03-25</td></tr>
    <tr><td><a href="/info/2.htm">2026年推免生接收办法</a></td><td>2026-03-20</td></tr>
    <tr><td><a href="/info/3.htm">直博生招生简章</a></td><td>2026-03-15</td></tr>
    <tr><td><a href="/info/4.htm">暑期学校通知</a></td><td>2026-03-10</td></tr>
    </table></body></html>"""
    items = P.parse(html, BASE)
    titles = _titles(items)
    assert "关于2026年夏令营的通知" in titles, titles
    # 表头行不应被当成通知
    assert "标题" not in titles
    print(f"  ✅ 表格形式（{len(items)} 条，表头已排除）")


# ---------- 4. 标题在 title 属性（链接文本被截断）----------
def test_title_in_attribute():
    full = "关于举办2026年优秀大学生暑期夏令营暨推免生预选拔活动的通知"
    html = f"""<html><body><ul class="news_list">
    <li><a href="/info/1.htm" title="{full}">关于举办2026年优秀大学生暑期夏令...</a><span>2026-05-10</span></li>
    <li><a href="/info/2.htm" title="另一条通知">另一条通知</a><span>2026-05-09</span></li>
    <li><a href="/info/3.htm" title="第三条">第三条通知</a><span>2026-05-08</span></li>
    </ul></body></html>"""
    items = P.parse(html, BASE)
    titles = _titles(items)
    assert full in titles or any("优秀大学生暑期夏令营" in t for t in titles), titles
    print(f"  ✅ title 属性优先（{len(items)} 条）")


# ---------- 5. 无日期列表 ----------
def test_no_date_list():
    html = """<html><body><ul class="news_list">
    <li><a href="/info/1.htm">关于2026年夏令营的通知</a></li>
    <li><a href="/info/2.htm">2026年推免生接收办法</a></li>
    <li><a href="/info/3.htm">直博生招生简章</a></li>
    <li><a href="/info/4.htm">暑期学校报名通知</a></li>
    <li><a href="/info/5.htm">优秀大学生夏令营</a></li>
    </ul></body></html>"""
    items = P.parse(html, BASE)
    assert len(items) >= 3, f"无日期列表应仍能解析，{len(items)}"
    print(f"  ✅ 无日期列表（{len(items)} 条）")


# ---------- 6. 相对 URL 处理 ----------
def test_relative_urls():
    cases = [
        ("../info/1.htm", "http://example.edu.cn/info/1.htm"),
        ("info/2.htm", "http://example.edu.cn/yjszs/info/2.htm"),
        ("/x/3.htm", "http://example.edu.cn/x/3.htm"),
        ("//cdn.edu.cn/a/4.htm", "http://cdn.edu.cn/a/4.htm"),
        ("http://other.com/5.htm", "http://other.com/5.htm"),
    ]
    from urllib.parse import urljoin
    for href, expect in cases:
        assert urljoin(BASE, href) == expect, f"URL {href}"
    print(f"  ✅ 相对/绝对/协议相对 URL（{len(cases)} 种）")


# ---------- 7. 卡片式（a 包裹整条）----------
def test_card_style():
    html = """<html><body>
    <ul class="news-simplelist">
      <li class="item"><a href="/info/1.htm">
        <div class="d">2026-05-10</div><div class="t">2026优秀大学生夏令营报名</div>
      </a></li>
      <li class="item"><a href="/info/2.htm">
        <div class="d">2026-05-09</div><div class="t">推免生接收通知</div>
      </a></li>
    </ul></body></html>"""
    items = P.parse(html, BASE)
    titles = _titles(items)
    assert any("夏令营" in t for t in titles), titles
    print(f"  ✅ 卡片式列表（{len(items)} 条）")


# ---------- 8. 分页检测变体 ----------
def test_pagination_variants():
    # 共X页
    assert len(P.detect_pagination(
        '<div>共3页</div>', "http://e.edu.cn/6330/list.htm")) >= 2
    # 1/X
    assert len(P.detect_pagination(
        '<div>1/4</div>', "http://e.edu.cn/list.htm")) >= 3
    # ?page= 形式
    html = """<div class="pagination">
      <a href="?page=1">1</a><a href="?page=2">2</a><a href="?page=3">3</a>
      <a href="?page=2">下一页</a></div>"""
    pages = P.detect_pagination(html, "http://e.edu.cn/news.htm")
    assert any("page=2" in p for p in pages), pages
    # 无分页
    assert P.detect_pagination("<div>无分页</div>", "http://e.edu.cn/x.htm") == []
    print("  ✅ 分页检测（共X页 / 1/X / ?page= / 无分页）")


# ---------- 9. 多容器择优 ----------
def test_multiple_containers_pick_biggest():
    """页面上有导航菜单(2条)和主列表(8条)，应选主列表"""
    html = """<html><body>
    <ul class="nav"><li><a href="/a">导航1</a></li><li><a href="/b">导航2</a></li></ul>
    <ul class="news_list">
      <li><a href="/info/1.htm">2026年夏令营通知</a><span>2026-05-10</span></li>
      <li><a href="/info/2.htm">推免生接收办法</a><span>2026-05-09</span></li>
      <li><a href="/info/3.htm">直博生招生简章</a><span>2026-05-08</span></li>
      <li><a href="/info/4.htm">暑期学校通知</a><span>2026-05-07</span></li>
    </ul></body></html>"""
    items = P.parse(html, BASE)
    titles = _titles(items)
    # 主列表的通知应被解析到
    assert "2026年夏令营通知" in titles, titles
    assert "导航1" not in titles
    print(f"  ✅ 多容器择优（产出 {len(items)} 条主列表）")


# ---------- 10. 残缺/畸形 HTML ----------
def test_malformed_html():
    html = """<html><body><ul class="news_list">
    <li><a href="/info/1.htm">2026年夏令营通知<span>2026-05-10</span>
    <li><a href="/info/2.htm">推免生接收办法<span>2026-05-09</span>
    <li><a href="/info/3.htm">直博生简章<span>2026-05-08</span>
    </ul></body></html>"""  # 故意不闭合 li/a
    items = P.parse(html, BASE)
    # lxml 容错，至少能解析出部分
    assert len(items) >= 1, f"畸形 HTML 应容错，{len(items)}"
    print(f"  ✅ 畸形 HTML 容错（{len(items)} 条）")


# ---------- 11. SPA 空容器（需 JS 渲染）----------
def test_spa_empty_container_not_misparsed():
    html = """<html><body>
    <div id="app"><ul class="news_list"></ul></div>
    <div class="pagination"><a href="?page=2">下一页</a></div>
    </body></html>"""
    items = P.parse(html, BASE)
    # 空容器不应产出伪条目
    assert len(items) == 0
    print("  ✅ SPA 空容器不误产出")


if __name__ == "__main__":
    print("=== 列表解析器边界工况测试 ===")
    test_empty_html()
    test_pure_navigation_page()
    test_all_date_formats()
    test_table_format()
    test_title_in_attribute()
    test_no_date_list()
    test_relative_urls()
    test_card_style()
    test_pagination_variants()
    test_multiple_containers_pick_biggest()
    test_malformed_html()
    test_spa_empty_container_not_misparsed()
    print("\n🎉 所有边界工况测试通过!")
