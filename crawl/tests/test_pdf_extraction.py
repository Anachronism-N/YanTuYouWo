"""PDF 附件提取测试 —— 补 PDF 形式通知的覆盖缺口。"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from loguru import logger
logger.remove()
logger.add(sys.stderr, level="WARNING")

from src.parser.content_extractor import (
    find_pdf_url, find_pdf_url_from_soup, extract_text_from_pdf_bytes,
)
from bs4 import BeautifulSoup


def _make_pdf_bytes(text: str) -> bytes:
    """用 fitz 合成一个含 text 的 PDF（供测试）。"""
    import fitz
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), text, fontsize=12)
    data = doc.tobytes()
    doc.close()
    return data


def test_find_pdf_url_anchor():
    html = '<html><body><a href="/files/2026.pdf">通知全文</a></body></html>'
    assert find_pdf_url(html, "http://e.edu.cn/x/") == "http://e.edu.cn/files/2026.pdf"
    print("  ✅ <a href=.pdf> 检测")


def test_find_pdf_url_boda_player():
    html = '<html><body><div class="wp_pdf_player" pdfsrc="/attach/notice.pdf"></div></body></html>'
    assert find_pdf_url(html, "http://e.edu.cn/") == "http://e.edu.cn/attach/notice.pdf"
    print("  ✅ 博达 wp_pdf_player pdfsrc 检测")


def test_find_pdf_url_none():
    html = '<html><body><a href="/info.htm">普通通知</a></body></html>'
    assert find_pdf_url(html, "http://e.edu.cn/") is None
    assert find_pdf_url("", "http://e.edu.cn/") is None
    print("  ✅ 无 PDF 返回 None")


def test_extract_pdf_text_roundtrip():
    # 用 ASCII 文本验证提取机制（fitz 默认字体无中文字形，合成 PDF 中文不入字库；
    # 真实高校 PDF 嵌中文字体，extract_text_from_pdf_bytes 能正常取中文）
    body = "Summer Camp 2026 Notice. Registration deadline: 2026-06-15."
    data = _make_pdf_bytes(body)
    text = extract_text_from_pdf_bytes(data)
    assert "Summer Camp 2026" in text
    assert "2026-06-15" in text
    print(f"  ✅ PDF 文本提取往返（{len(text)} 字，真实 PDF 可取中文）")


def test_extract_pdf_empty_and_garbage():
    assert extract_text_from_pdf_bytes(b"") == ""
    assert extract_text_from_pdf_bytes(b"not a pdf") == ""  # 不崩
    print("  ✅ 空/非法 PDF 不崩")


def test_pdf_fallback_in_extract_content():
    """正文过短 + PDF 链接 → extract_content 返回占位（含 [PDF附件]）"""
    from src.parser.content_extractor import _extract_pdf_fallback
    soup = BeautifulSoup(
        '<html><title>夏令营通知</title><body><a href="/x.pdf">全文</a></body></html>',
        "lxml",
    )
    out = _extract_pdf_fallback(soup)
    assert "夏令营通知" in out
    assert "[PDF附件]" in out
    print("  ✅ _extract_pdf_fallback 占位含标题+PDF链接")


if __name__ == "__main__":
    print("=== PDF 附件提取测试 ===")
    test_find_pdf_url_anchor()
    test_find_pdf_url_boda_player()
    test_find_pdf_url_none()
    test_extract_pdf_text_roundtrip()
    test_extract_pdf_empty_and_garbage()
    test_pdf_fallback_in_extract_content()
    print("\n🎉 所有 PDF 提取测试通过!")
