from __future__ import annotations

"""正文提取器 - 从 HTML 中提取干净的正文内容"""

import re
from bs4 import BeautifulSoup, Comment
from loguru import logger


def extract_content(html: str) -> str:
    """
    从通知详情页 HTML 中提取正文内容。

    策略：
    1. 移除无关标签（script, style, nav, header, footer 等）
    2. 查找主内容区域（常见 class/id 模式）
    3. 提取纯文本并清理

    Args:
        html: 原始 HTML

    Returns:
        清理后的纯文本正文
    """
    soup = BeautifulSoup(html, "lxml")

    # 移除无关标签
    for tag in soup.find_all(["script", "style", "nav", "header", "footer", "aside", "iframe", "noscript"]):
        tag.decompose()

    # 移除注释
    for comment in soup.find_all(string=lambda text: isinstance(text, Comment)):
        comment.extract()

    # 尝试查找主内容区域（按优先级排列，越靠前越精确）
    content_selectors = [
        # 博达站群系统（精确匹配，优先级最高）
        {"class_": "v_news_content"},
        {"id": "vsb_content"},
        # TRS 系统
        {"class_": "TRS_Editor"},
        {"class_": "news_content"},
        # 博达站群 - 文章正文区域
        {"class_": re.compile(r"^arc[-_]?con$", re.I)},
        {"class_": re.compile(r"^article[-_]?txt$", re.I)},
        {"class_": re.compile(r"^wp[-_]?article[-_]?content$", re.I)},
        # 常见内容区域 id（精确匹配）
        {"id": re.compile(r"^(article[-_]?content|content[-_]?body|content[-_]?area|main[-_]?content|news[-_]?content|detail[-_]?content|vsb_content_\d+)$", re.I)},
        # 常见内容区域 class（使用更精确的模式，避免匹配 text-center 等CSS工具类）
        {"class_": re.compile(r"article[-_]?(content|body|text|detail|p)|content[-_]?(body|area|text|detail)|main[-_]?content|news[-_]?content|detail[-_]?(content|body|text)", re.I)},
        # 宽泛匹配（兜底，但需要内容长度检查）
        {"class_": re.compile(r"^(article|content|detail)$", re.I)},
        {"id": re.compile(r"^(article|content|detail)$", re.I)},
    ]

    # 最小内容长度阈值，低于此值则继续尝试下一个选择器
    MIN_CONTENT_LEN = 50

    main_content = None
    for selector in content_selectors:
        found = soup.find("div", **selector) or soup.find("article", **selector) or soup.find("td", **selector)
        if found:
            text = found.get_text(strip=True)
            if len(text) >= MIN_CONTENT_LEN:
                main_content = found
                break
            else:
                logger.debug(f"选择器 {selector} 匹配到内容过短({len(text)}字)，继续尝试")

    # 如果没找到特定内容区域，使用 body
    if main_content is None:
        main_content = soup.find("body") or soup

    # 提取文本
    text = main_content.get_text(separator="\n", strip=True)

    # 清理文本
    text = _clean_text(text)

    # 如果正文过短，尝试检测PDF嵌入/附件（常见于博达站群系统）
    if len(text) < MIN_CONTENT_LEN:
        pdf_content = _extract_pdf_fallback(soup)
        if pdf_content:
            text = pdf_content

    logger.debug(f"正文提取: {len(text)} 字符")
    return text


def _extract_pdf_fallback(soup: BeautifulSoup) -> str:
    """
    当正文内容过短时，检测PDF嵌入/附件并提取信息。
    
    常见场景：
    - 博达站群的 wp_pdf_player（如哈工大）
    - 直接嵌入的PDF链接
    - iframe嵌入的PDF
    
    Returns:
        包含标题和PDF链接的文本描述，或空字符串
    """
    parts = []
    
    # 提取页面标题
    title_el = soup.find("title")
    page_title = title_el.get_text(strip=True) if title_el else ""
    # 也尝试从h1/h2中提取
    for h_tag in ["h1", "h2", "h3"]:
        h_el = soup.find(h_tag)
        if h_el:
            h_text = h_el.get_text(strip=True)
            if len(h_text) > len(page_title):
                page_title = h_text
            break
    
    if page_title:
        parts.append(f"标题：{page_title}")
    
    # 检测博达站群PDF播放器
    pdf_players = soup.find_all(attrs={"class": "wp_pdf_player"})
    for player in pdf_players:
        pdf_src = player.get("pdfsrc", "")
        if pdf_src:
            parts.append(f"[PDF附件] {pdf_src}")
    
    # 检测直接的PDF链接
    for a_tag in soup.find_all("a", href=True):
        href = a_tag["href"]
        if href.lower().endswith(".pdf"):
            link_text = a_tag.get_text(strip=True) or "PDF文件"
            parts.append(f"[PDF附件] {link_text}: {href}")
    
    # 检测嵌入的object/embed标签
    for tag in soup.find_all(["object", "embed"]):
        src = tag.get("data", "") or tag.get("src", "")
        if ".pdf" in src.lower():
            parts.append(f"[PDF嵌入] {src}")
    
    if len(parts) > 1:  # 至少有标题+一个PDF
        return "\n".join(parts)
    
    return ""


def simplify_html(html: str, max_length: int = 3000) -> str:
    """
    精简 HTML，用于发送给 LLM 分析。

    策略：
    1. 移除 script, style 等无关标签
    2. 只保留结构性标签（a, div, ul, li, h1-h6, span, table, tr, td）
    3. 移除所有属性（除了 href, class, id）
    4. 截断到指定长度

    Args:
        html: 原始 HTML
        max_length: 最大长度

    Returns:
        精简后的 HTML
    """
    soup = BeautifulSoup(html, "lxml")

    # 移除无关标签
    for tag in soup.find_all(["script", "style", "img", "video", "audio", "iframe", "noscript", "svg", "canvas"]):
        tag.decompose()

    # 移除注释
    for comment in soup.find_all(string=lambda text: isinstance(text, Comment)):
        comment.extract()

    # 只保留关键属性
    keep_attrs = {"href", "class", "id"}
    for tag in soup.find_all(True):
        attrs = dict(tag.attrs)
        for attr in attrs:
            if attr not in keep_attrs:
                del tag[attr]

    result = str(soup)

    # 压缩空白
    result = re.sub(r"\s+", " ", result)

    # 截断
    if len(result) > max_length:
        result = result[:max_length] + "..."

    return result


def _clean_text(text: str) -> str:
    """清理提取的文本"""
    # 合并多个空行为一个
    text = re.sub(r"\n{3,}", "\n\n", text)
    # 移除行首尾空白
    lines = [line.strip() for line in text.split("\n")]
    # 移除连续空行，只保留一个
    cleaned_lines = []
    prev_empty = False
    for line in lines:
        if not line:
            if not prev_empty:
                cleaned_lines.append("")
            prev_empty = True
        else:
            cleaned_lines.append(line)
            prev_empty = False
    text = "\n".join(cleaned_lines).strip()
    # 移除常见的页面噪音文本
    noise_patterns = [
        r"版权所有.*$",
        r"Copyright.*$",
        r"ICP备\d+号.*$",
        r"技术支持.*$",
        r"浏览次数[:：]\s*\d+",
        r"点击次数[:：]\s*\d+",
        r"发布时间[:：].*$",
        r"作者[:：].*$",
        r"来源[:：].*$",
    ]
    for pattern in noise_patterns:
        text = re.sub(pattern, "", text, flags=re.MULTILINE)
    # 最终清理
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()
