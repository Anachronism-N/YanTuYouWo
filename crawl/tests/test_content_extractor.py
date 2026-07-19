"""正文提取器回归测试。

重点锁定文档级缺口的修复状态：微信公众号文章正文/图片提取。
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.parser.content_extractor import extract_content, extract_content_with_images, _clean_text


def test_wechat_article_extraction():
    """微信公众号文章：js_content 选择器 + data-src 图片提取（文档曾记为缺口）"""
    html = """<html><body>
    <div id="js_article" style="display:none"></div>
    <div id="img-content">
      <h1 class="rich_media_title">2026年XX大学暑期夏令营通知</h1>
      <div class="rich_media_meta">XX大学研究生院</div>
      <div id="js_content" class="rich_media_content">
        <p>为促进优秀大学生了解我校，拟于2026年7月举办暑期夏令营。</p>
        <p>一、报名时间：2026年5月1日至2026年6月15日。</p>
        <p>二、活动时间：2026年7月10日至7月13日。</p>
        <img data-src="http://mmbiz.qpic.cn/mmbiz_jpg/abc123/640" />
        <p>欢迎报名参加！</p>
      </div>
      <script>var msg=1</script>
    </div></body></html>"""
    text, imgs = extract_content_with_images(html, "https://mp.weixin.qq.com/s/abc")
    assert "暑期夏令营" in text
    assert "2026年5月1日" in text
    assert "var msg" not in text  # script 被剥离
    assert len(imgs) == 1
    assert "mmbiz.qpic.cn" in imgs[0]["url"]
    print(f"  ✅ 微信文章提取（正文{len(text)}字 + {len(imgs)}图）")


def test_boda_cms_vsb_content():
    """博达站群 vsb_content 容器"""
    html = """<html><body><div id="vsb_content">
    <p>各学院拟举办2026年优秀大学生夏令营。</p>
    <p>报名时间：2026-06-01 至 2026-06-20。</p>
    </div></body></html>"""
    text = extract_content(html)
    assert "优秀大学生夏令营" in text
    assert "2026-06-20" in text
    print("  ✅ 博达站群 vsb_content")


def test_zoom_selector():
    """#zoom 是大量高校详情页的主内容容器"""
    html = """<html><body>
    <div class="header">导航菜单链接</div>
    <div id="zoom">
      <p>为促进全国高校优秀大学生之间的学术交流，我院拟于2026年7月举办优秀大学生暑期夏令营活动。</p>
      <p>活动时间：2026年7月5日至7月9日。地点：本校。欢迎全国各高校优秀本科生报名参加。</p>
    </div>
    <div class="footer">版权所有技术支持</div></body></html>"""
    text = extract_content(html)
    assert "暑期夏令营" in text
    assert "2026年7月5日" in text
    assert "导航菜单" not in text  # header 在 #zoom 外，不应进入正文
    print("  ✅ #zoom 选择器（高校详情页常见）")

def test_strip_nav_noise():
    """面包屑/导航/页脚噪音应被剥离"""
    html = """<html><body>
    <header><nav>首页 &gt; 招生 &gt; 正文</nav></header>
    <div class="news_content"><p>夏令营报名开始，截止2026年6月15日。</p></div>
    <footer>版权所有 XX大学 联系我们 技术支持：某公司</footer>
    </body></html>"""
    text = extract_content(html)
    assert "夏令营报名" in text
    assert "版权所有" not in text
    assert "技术支持" not in text
    print("  ✅ 导航/页脚噪音剥离")


def test_inline_elements_not_split():
    """行内元素（span）不应被拆成换行（'2025\\n年' 旧 bug）"""
    text = _clean_text("报名\n截止\n2025\n年\n8\n月\n19\n日")
    # 日期数字与年月日应合并
    assert "2025" in text and "年" in text
    # 不应出现单个数字独占一行的情况
    assert "\n8\n月" not in text and "8\n月" not in text
    print("  ✅ 行内日期不被换行拆散")


def test_table_preserves_rows():
    """表格应保留行列结构（同行单元格空格连、行末换行），而非拼成 blob"""
    html = """<html><body><div class="news_content"><table>
    <tr><td>院系代码</td><td>院系名称</td><td>报名时间</td></tr>
    <tr><td>001</td><td>建筑学院</td><td>7月10日-7月31日</td></tr>
    <tr><td>002</td><td>机械工程学院</td><td>7月9日-8月10日</td></tr>
    </table></div></body></html>"""
    text = extract_content(html)
    # 每行应独立成行（不被短行合并拼成一坨）
    lines = [l for l in text.split("\n") if l.strip()]
    assert any("001" in l and "建筑学院" in l for l in lines), f"行未保留: {lines}"
    assert any("002" in l and "机械工程学院" in l for l in lines), f"行未保留: {lines}"
    # 不应是 "001建筑学院002机械工程学院" 这样全部粘一起
    assert "001建筑学院002" not in text.replace(" ", "")
    print("  ✅ 表格保留行列结构（不拼成 blob）")


if __name__ == "__main__":
    print("=== 正文提取器测试 ===")
    test_wechat_article_extraction()
    test_boda_cms_vsb_content()
    test_zoom_selector()
    test_strip_nav_noise()
    test_inline_elements_not_split()
    test_table_preserves_rows()
    print("\n🎉 所有正文提取测试通过!")
