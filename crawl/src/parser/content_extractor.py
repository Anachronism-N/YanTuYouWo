from __future__ import annotations

"""正文提取器 - 从 HTML 中提取干净的正文内容和图片信息"""

import re
from urllib.parse import urljoin
from bs4 import BeautifulSoup, Comment, NavigableString, Tag
from loguru import logger


# 行内元素：不应在提取时引入换行符
_INLINE_TAGS = frozenset({
    "a", "abbr", "b", "bdi", "bdo", "br", "cite", "code", "data",
    "em", "i", "kbd", "mark", "q", "s", "samp", "small", "span",
    "strong", "sub", "sup", "time", "u", "var", "wbr", "font",
})


def extract_content(html: str, base_url: str = "") -> str:
    """
    从通知详情页 HTML 中提取正文内容。

    策略：
    1. 移除无关标签（script, style, nav, header, footer 等）
    2. 查找主内容区域（常见 class/id 模式）
    3. 使用智能文本提取（区分块级元素和行内元素）
    4. 清理噪音文本

    Args:
        html: 原始 HTML
        base_url: 页面基础 URL（用于解析相对路径）

    Returns:
        清理后的纯文本正文
    """
    soup = BeautifulSoup(html, "lxml")
    main_content = _find_main_content(soup)

    text = _smart_get_text(main_content)
    text = _clean_text(text)

    MIN_CONTENT_LEN = 50
    if len(text) < MIN_CONTENT_LEN:
        pdf_content = _extract_pdf_fallback(soup)
        if pdf_content:
            text = pdf_content

    logger.debug(f"正文提取: {len(text)} 字符")
    return text


def extract_content_with_images(html: str, base_url: str = "") -> tuple[str, list[dict]]:
    """
    从 HTML 中提取正文内容和图片信息。

    Returns:
        (text_content, images)
        images: [{"url": "...", "alt": "...", "width": ..., "height": ...}, ...]
    """
    soup = BeautifulSoup(html, "lxml")
    main_content = _find_main_content(soup)

    images = []
    for img in main_content.find_all("img"):
        src = img.get("data-src", "") or img.get("src", "")
        if not src or src.startswith("data:") or len(src) > 2000:
            continue
        if base_url and not src.startswith("http"):
            src = urljoin(base_url, src)
        if not src.startswith("http"):
            continue
        # http → https for WeChat images
        if "mmbiz.qpic.cn" in src and src.startswith("http://"):
            src = "https" + src[4:]
        # Skip tiny icons/emojis (width/height < 30px)
        w = img.get("width", "")
        h = img.get("height", "")
        try:
            if w and int(str(w).replace("px", "")) < 30:
                continue
            if h and int(str(h).replace("px", "")) < 30:
                continue
        except (ValueError, TypeError):
            pass
        # Skip common tracking pixels and icons
        if any(skip in src for skip in [
            "wx_fmt=gif", "/icon/", "/emoji/", "spacer.gif",
            "transparent.png", "pixel.gif", "1x1.",
        ]):
            continue
        images.append({
            "url": src,
            "alt": img.get("alt", ""),
            "width": w or None,
            "height": h or None,
        })

    text = _smart_get_text(main_content)
    text = _clean_text(text)

    MIN_CONTENT_LEN = 50
    if len(text) < MIN_CONTENT_LEN:
        pdf_content = _extract_pdf_fallback(soup)
        if pdf_content:
            text = pdf_content

    logger.debug(f"正文提取: {len(text)} 字符, {len(images)} 张图片")
    return text, images


def _find_main_content(soup: BeautifulSoup) -> Tag:
    """查找页面的主内容区域"""
    for tag in soup.find_all(["script", "style", "nav", "header", "footer", "aside", "iframe", "noscript"]):
        tag.decompose()
    for comment in soup.find_all(string=lambda text: isinstance(text, Comment)):
        comment.extract()

    content_selectors = [
        # 微信公众号文章（优先级最高）
        {"id": "js_content"},
        {"class_": "rich_media_content"},
        # 博达站群系统
        {"class_": "v_news_content"},
        {"id": "vsb_content"},
        {"class_": "TRS_Editor"},
        {"class_": "news_content"},
        {"class_": re.compile(r"^arc[-_]?con$", re.I)},
        {"class_": re.compile(r"^article[-_]?txt$", re.I)},
        {"class_": re.compile(r"^wp[-_]?article[-_]?content$", re.I)},
        {"id": re.compile(r"^(article[-_]?content|content[-_]?body|content[-_]?area|main[-_]?content|news[-_]?content|detail[-_]?content|vsb_content_\d+)$", re.I)},
        {"class_": re.compile(r"article[-_]?(content|body|text|detail|p)|content[-_]?(body|area|text|detail)|main[-_]?content|news[-_]?content|detail[-_]?(content|body|text)", re.I)},
        {"class_": re.compile(r"^(article|content|detail)$", re.I)},
        {"id": re.compile(r"^(article|content|detail)$", re.I)},
    ]

    MIN_CONTENT_LEN = 50
    for selector in content_selectors:
        found = soup.find("div", **selector) or soup.find("article", **selector) or soup.find("td", **selector)
        if found:
            text = found.get_text(strip=True)
            if len(text) >= MIN_CONTENT_LEN:
                return found
            else:
                logger.debug(f"选择器 {selector} 匹配到内容过短({len(text)}字)，继续尝试")

    return soup.find("body") or soup


def _smart_get_text(element: Tag) -> str:
    """
    智能文本提取：区分块级元素和行内元素。

    行内元素（span, a, b, em 等）之间不插入换行符，
    块级元素（div, p, li, tr 等）之间用换行符分隔。
    这避免了 get_text(separator="\\n") 将 "<p>2025<span>年</span>"
    拆成 "2025\\n年" 的问题。
    """
    parts: list[str] = []

    def _walk(node):
        if isinstance(node, NavigableString):
            text = str(node)
            text = re.sub(r"[\t ]+", " ", text)
            if text.strip():
                parts.append(text)
            return

        if not isinstance(node, Tag):
            return

        tag_name = node.name or ""

        if tag_name == "br":
            parts.append("\n")
            return

        is_block = tag_name not in _INLINE_TAGS

        if is_block and parts and parts[-1] != "\n":
            parts.append("\n")

        for child in node.children:
            _walk(child)

        if is_block and parts and parts[-1] != "\n":
            parts.append("\n")

    _walk(element)
    return "".join(parts)


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
    """清理提取的文本，修复格式问题，去除噪音"""

    # ── 阶段1：修复被换行符拆散的数字/文字 ──
    for _ in range(8):
        text, n1 = re.subn(r"(\d+)\s*\n\s*(年|月|日|号|时|分|秒|点|期|届|级|人|名|个|项|条|篇|次|周|%)", r"\1\2", text)
        text, n2 = re.subn(r"(年|月|日|号|时|分|第)\s*\n\s*(\d)", r"\1\2", text)
        if n1 == 0 and n2 == 0:
            break
    text = re.sub(r"(第)\s*\n\s*(\d+)\s*\n?\s*", r"\1\2", text)

    # 拆散的标点合并
    text = re.sub(r"\s*\n\s*([，。、；：！？）》」』】\]\),.;:!?\-])", r"\1", text)
    text = re.sub(r"([（《「『【\[\(])\s*\n\s*", r"\1", text)
    text = re.sub("\u201c\\s*\\n\\s*", "\u201c", text)
    text = re.sub("\\s*\\n\\s*\u201d", "\u201d", text)
    # "﹝\n2023\n﹞" → "﹝2023﹞"
    text = re.sub(r"([﹝﹙])\s*\n\s*", r"\1", text)
    text = re.sub(r"\s*\n\s*([﹞﹚])", r"\1", text)

    # ── 阶段2：移除导航/面包屑噪音 ──
    text = re.sub(r"[^\n]*当前位置\s*[：: ]\s*[^\n]*\n(?:[\u4e00-\u9fa5]{2,10}\n){0,5}", "", text, count=1)
    text = re.sub(r"[^\n]*(?:首页|网站首页)\s*[>›»/]\s*[^\n]*\n", "", text, count=1)
    text = re.sub(r"[^\n]*您所在的位置[：:][^\n]*\n", "", text, count=1)
    # "编辑：XXX 数字分享到:" 模式
    text = re.sub(r"编辑[：:][^\n]*\n?\s*\d*\s*分享到[：:]?\s*", "", text)
    # "EN学院概况学院简介..." 风格的横排导航菜单（无空格/换行的长串中文菜单项）
    text = re.sub(r"^(?:EN)?(?:学院概况|学院简介|发展历程|学院领导|师资队伍|科学研究|人才培养|党建工作|学生工作|招生信息|院友之窗|合作交流|下载中心)(?:[\u4e00-\u9fa5]{2,10}){3,}[^\n]*\n", "", text)
    # 开头连续短行菜单项（>=4个短行中文条目）
    text = re.sub(r"^(?:[\u4e00-\u9fa5]{2,10}\n){4,}", "", text)
    # "XX招生\n" 栏目名开头
    text = re.sub(r"^(?:硕士招生|博士招生|MPA招生|MBA招生|本科招生|招生工作|招生信息)\s*\n", "", text)

    # ── 阶段3：移除内联噪音文本 ──
    _NOISE = [
        r"点击[：:]\s*\n?\s*次?\s*",
        r"分享[：:]\s*\n?",
        r"分享到[：:]?\s*\n?",
        r"编辑[：:]\s*[^\n]{0,20}\s*\n?",
        r"来源[：:]\s*[^\n]{0,30}\s*\n?",
        r"作者[：:]\s*[^\n]{0,20}\s*\n?",
        r"发布时间\s*[：:]\s*\d{4}[^\n]*\n?",
        r"阅读次数[：:]\s*\d*\s*",
        r"浏览次数[：:]\s*\d*\s*",
        r"点击次数[：:]\s*\d*\s*",
        r"阅读量[：:]\s*\d*\s*",
        r"浏览[：:]\s*\d+\s*次?\s*",
        r"上一篇[：:].*$",
        r"下一篇[：:].*$",
        r"上一条[：:].*$",
        r"下一条[：:].*$",
        r"返回首页.*$",
        r"返回列表.*$",
        r"打印本页.*$",
        r"关闭窗口.*$",
        r"版权所有.*$",
        r"Copyright.*$",
        r"ICP备\d+号.*$",
        r"技术支持.*$",
        r"地\s*址[：:].*$",
        r"邮\s*编[：:]\s*\d{6}.*$",
    ]
    for pattern in _NOISE:
        text = re.sub(pattern, "", text, flags=re.MULTILINE)

    # ── 阶段4：智能短行合并 ──
    text = re.sub(r"\n{3,}", "\n\n", text)
    lines = [line.strip() for line in text.split("\n")]

    merged: list[str] = []
    prev_empty = False
    for line in lines:
        if not line:
            if not prev_empty:
                merged.append("")
            prev_empty = True
            continue
        prev_empty = False

        # 如果上一行以中文/字母/数字结尾，当前行以中文/标点开头，且上行不是段落结尾 → 合并
        if (
            merged
            and merged[-1]
            and len(line) <= 4
            and not line.startswith(("•", "-", "·", "●", "◆", "※", "（", "(", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"))
            and not re.match(r"^\d+[\.、）)]", line)
        ):
            merged[-1] += line
        else:
            merged.append(line)

    text = "\n".join(merged)

    # ── 阶段5：移除连续导航短行块 ──
    final_lines: list[str] = []
    nav_buffer: list[str] = []
    for line in text.split("\n"):
        stripped = line.strip()
        if stripped and len(stripped) <= 6 and re.match(r"^[\u4e00-\u9fa5]+$", stripped):
            nav_buffer.append(line)
        else:
            if len(nav_buffer) >= 4:
                pass  # drop navigation block
            else:
                final_lines.extend(nav_buffer)
            nav_buffer = []
            final_lines.append(line)
    if len(nav_buffer) < 4:
        final_lines.extend(nav_buffer)
    text = "\n".join(final_lines)

    # ── 阶段6：最终清理 ──
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()
