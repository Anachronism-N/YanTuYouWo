from __future__ import annotations

"""URL 处理工具 - 规范化、去重、域名提取等"""

from urllib.parse import urljoin, urlparse, urlunparse, parse_qs, urlencode


def normalize_url(url: str, base_url: str | None = None) -> str:
    """
    规范化 URL：
    1. 处理相对路径（支持子路径学院如 /ies）
    2. 移除 fragment (#)
    3. 排序 query 参数
    4. 移除尾部斜杠
    """
    if base_url:
        # 修复子路径学院的相对链接解析：
        # 当 base_url 路径不以 / 结尾且不含文件扩展名时，
        # 将其视为目录（添加 /），使相对链接在该目录下解析。
        # 例如：base_url="https://sem.tsinghua.edu.cn/ies"
        #   相对链接 "xshd.htm" → "/ies/xshd.htm"（而非 "/xshd.htm"）
        if url and not url.startswith(("http://", "https://", "/", "#", "javascript:", "mailto:")):
            parsed_base = urlparse(base_url)
            base_path = parsed_base.path
            # 如果路径不以 / 结尾，且最后一段不含 . （不是文件），则添加 /
            if base_path and not base_path.endswith("/"):
                last_segment = base_path.rsplit("/", 1)[-1]
                if "." not in last_segment:
                    base_url = base_url.split("?")[0].split("#")[0] + "/"

        url = urljoin(base_url, url)

    parsed = urlparse(url)

    # 移除 fragment
    parsed = parsed._replace(fragment="")

    # 排序 query 参数
    if parsed.query:
        params = parse_qs(parsed.query, keep_blank_values=True)
        sorted_query = urlencode(sorted(params.items()), doseq=True)
        parsed = parsed._replace(query=sorted_query)

    # 移除尾部斜杠（但保留根路径）
    path = parsed.path.rstrip("/") or "/"
    parsed = parsed._replace(path=path)

    return urlunparse(parsed)


def get_domain(url: str) -> str:
    """提取 URL 的域名"""
    return urlparse(url).netloc


def get_base_url(url: str) -> str:
    """提取 URL 的基础路径（scheme + netloc）"""
    parsed = urlparse(url)
    return f"{parsed.scheme}://{parsed.netloc}"


def is_same_domain(url1: str, url2: str) -> bool:
    """判断两个 URL 是否属于同一域名"""
    return get_domain(url1) == get_domain(url2)


def is_valid_url(url: str) -> bool:
    """判断是否为有效的 HTTP(S) URL"""
    try:
        parsed = urlparse(url)
        return parsed.scheme in ("http", "https") and bool(parsed.netloc)
    except Exception:
        return False


def extract_links(html: str, base_url: str) -> list[dict[str, str]]:
    """
    从 HTML 中提取所有链接。
    返回 [{"url": "...", "text": "..."}]
    """
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(html, "lxml")
    links = []

    for a_tag in soup.find_all("a", href=True):
        href = a_tag["href"].strip()
        if not href or href.startswith(("javascript:", "mailto:", "tel:", "#")):
            continue

        full_url = normalize_url(href, base_url)
        if is_valid_url(full_url):
            text = a_tag.get_text(strip=True)
            links.append({"url": full_url, "text": text})

    return links
