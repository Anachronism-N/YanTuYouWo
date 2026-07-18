"""正文内容与格式整理边界测试。

压测 content_extractor._clean_text 的格式整理，覆盖真实页面的各种格式残骸：
全角空格、内联统计、表格断裂、编号碎片、HTML 实体、Windows 换行、尾部噪音块。
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from loguru import logger
logger.remove()
logger.add(sys.stderr, level="WARNING")

from src.parser.content_extractor import _clean_text, extract_content


def test_full_width_spaces_normalized():
    """全角空格/不间断空格应被规整，不残留"""
    text = "报名　时间：2026年6月15日\xa0\xa0截止"
    out = _clean_text(text)
    assert "报名" in out and "时间" in out
    assert "　" not in out
    assert "\xa0" not in out
    print("  ✅ 全角/nbsp 空格规整")


def test_inline_publish_time_noise_removed():
    """内联"发布时间：YYYY-MM-DD HH:MM"应被移除"""
    text = "发布时间：2026-07-17 14:30\n正文内容开始\n夏令营报名"
    out = _clean_text(text)
    assert "发布时间" not in out
    assert "夏令营报名" in out
    print("  ✅ 内联发布时间噪音移除")


def test_view_count_noise_removed():
    text = "正文段落一。\n浏览次数：1234\n点击次数：5678\n正文段落二。"
    out = _clean_text(text)
    assert "浏览次数" not in out
    assert "点击次数" not in out
    assert "正文段落一" in out and "正文段落二" in out
    print("  ✅ 浏览/点击次数噪音移除")


def test_share_edit_noise_removed():
    text = "正文内容。\n编辑：张三\n分享到：微信 微博\n更多正文。"
    out = _clean_text(text)
    assert "分享到" not in out
    assert "编辑" not in out
    print("  ✅ 编辑/分享噪音移除")


def test_prev_next_nav_removed():
    text = "正文结束。\n上一篇：xxx通知\n下一篇：yyy公告\n返回首页\n打印本页"
    out = _clean_text(text)
    assert "上一篇" not in out
    assert "下一篇" not in out
    assert "返回首页" not in out
    assert "打印本页" not in out
    print("  ✅ 上一篇/下一篇/返回/打印 噪音移除")


def test_copyright_footer_removed():
    text = "正文。\n版权所有 XX大学研究生院\nCopyright 2026\nICP备12345678号\n技术支持：某公司"
    out = _clean_text(text)
    assert "版权所有" not in out
    assert "Copyright" not in out
    assert "技术支持" not in out
    print("  ✅ 版权/Copyright/ICP/技术支持 移除")


def test_date_not_split_by_newline():
    """年/月/日与数字不应被换行拆散"""
    text = "截止日期为\n2026\n年\n6\n月\n15\n日。"
    out = _clean_text(text)
    assert "2026年6月15日" in out, f"日期被拆散: {out!r}"
    print("  ✅ 日期不被换行拆散")


def test_numbered_list_preserved():
    """数字编号列表应保留结构"""
    text = "一、报名条件\n1. 在校本科生\n2. 成绩优秀\n二、申请材料"
    out = _clean_text(text)
    assert "一、报名条件" in out
    assert "二、申请材料" in out
    print("  ✅ 编号列表结构保留")


def test_fragmented_numbering_joined():
    """"3.\\n材料审核" 类碎片应被合理合并（不丢内容）"""
    text = "3.\n材料审核\n4.\n面试安排"
    out = _clean_text(text)
    # 内容不应丢失
    assert "材料审核" in out
    assert "面试安排" in out
    print("  ✅ 编号碎片内容不丢失")


def test_windows_newlines_normalized():
    text = "第一段。\r\n第二段。\r\n\r\n第三段。"
    out = _clean_text(text)
    assert "第一段" in out and "第二段" in out and "第三段" in out
    assert "\r" not in out
    print("  ✅ Windows 换行 (\\r\\n) 规整")


def test_excessive_blank_lines_collapsed():
    text = "段一。\n\n\n\n\n\n段二。"
    out = _clean_text(text)
    assert "\n\n\n" not in out  # 最多两个连续换行
    print("  ✅ 多余空行折叠")


def test_leading_nav_fragment_removed():
    """开头"首页\n硕士招生\n"等导航碎片应被移除"""
    text = "首页\n硕士招生\n正文从这里开始，夏令营报名通知。"
    out = _clean_text(text)
    assert "正文从这里开始" in out
    # 开头的导航碎片被清掉
    assert not out.startswith("首页")
    print("  ✅ 开头导航碎片移除")


def test_realistic_messy_notice():
    """综合：接近真实详情页的多种噪音混合"""
    text = """当前位置：首页 > 招生 > 正文
发布时间：2026-07-17 14:30
\xa0\xa0一、报名时间：2026年5月10日至2026年6月20日
二、活动时间：2026年7月5日—7月9日
三、招生方向：人工智能、计算机视觉
浏览次数：1234
编辑：李老师
分享到：微信 微博
上一篇：去年通知
下一篇：待更新
版权所有 XX大学"""
    out = _clean_text(text)
    # 噪音清干净
    for noise in ["当前位置", "发布时间", "浏览次数", "编辑", "分享到", "上一篇", "下一篇", "版权所有"]:
        assert noise not in out, f"残留噪音 {noise}: {out!r}"
    # 正文保留
    assert "报名时间" in out and "2026年6月20日" in out
    assert "招生方向" in out and "人工智能" in out
    print("  ✅ 真实综合噪音混合（全清+正文全留）")


if __name__ == "__main__":
    print("=== 正文内容与格式整理边界测试 ===")
    test_full_width_spaces_normalized()
    test_inline_publish_time_noise_removed()
    test_view_count_noise_removed()
    test_share_edit_noise_removed()
    test_prev_next_nav_removed()
    test_copyright_footer_removed()
    test_date_not_split_by_newline()
    test_numbered_list_preserved()
    test_fragmented_numbering_joined()
    test_windows_newlines_normalized()
    test_excessive_blank_lines_collapsed()
    test_leading_nav_fragment_removed()
    test_realistic_messy_notice()
    print("\n🎉 所有格式整理边界测试通过!")
