"""高校官网 URL 自动发现"""

from __future__ import annotations

import re
import asyncio
from typing import Optional

from bs4 import BeautifulSoup
from loguru import logger

from src.utils.http_client import http_client
from src.utils.url_utils import normalize_url, is_valid_url
from src.discovery.anti_crawl_fallback import (
    detect_anti_crawl,
    playwright_fetch_with_stealth,
    get_fallback_graduate_url,
    get_fallback_dept_list_url,
)


# 常见高校域名后缀
EDU_DOMAIN_SUFFIX = ".edu.cn"

# 已知高校域名映射（加速发现）
KNOWN_DOMAINS = {
    "北京大学": "https://www.pku.edu.cn",
    "清华大学": "https://www.tsinghua.edu.cn",
    "中国人民大学": "https://www.ruc.edu.cn",
    "北京师范大学": "https://www.bnu.edu.cn",
    "北京航空航天大学": "https://www.buaa.edu.cn",
    "北京理工大学": "https://www.bit.edu.cn",
    "中国农业大学": "https://www.cau.edu.cn",
    "中央民族大学": "https://www.muc.edu.cn",
    "南开大学": "https://www.nankai.edu.cn",
    "天津大学": "https://www.tju.edu.cn",
    "大连理工大学": "https://www.dlut.edu.cn",
    "东北大学": "https://www.neu.edu.cn",
    "吉林大学": "https://www.jlu.edu.cn",
    "哈尔滨工业大学": "https://www.hit.edu.cn",
    "复旦大学": "https://www.fudan.edu.cn",
    "上海交通大学": "https://www.sjtu.edu.cn",
    "同济大学": "https://www.tongji.edu.cn",
    "华东师范大学": "https://www.ecnu.edu.cn",
    "南京大学": "https://www.nju.edu.cn",
    "东南大学": "https://www.seu.edu.cn",
    "浙江大学": "https://www.zju.edu.cn",
    "中国科学技术大学": "https://www.ustc.edu.cn",
    "厦门大学": "https://www.xmu.edu.cn",
    "山东大学": "https://www.sdu.edu.cn",
    "中国海洋大学": "https://www.ouc.edu.cn",
    "武汉大学": "https://www.whu.edu.cn",
    "华中科技大学": "https://www.hust.edu.cn",
    "湖南大学": "https://www.hnu.edu.cn",
    "中南大学": "https://www.csu.edu.cn",
    "中山大学": "https://www.sysu.edu.cn",
    "华南理工大学": "https://www.scut.edu.cn",
    "四川大学": "https://www.scu.edu.cn",
    "电子科技大学": "https://www.uestc.edu.cn",
    "重庆大学": "https://www.cqu.edu.cn",
    "西安交通大学": "https://www.xjtu.edu.cn",
    "西北工业大学": "https://www.nwpu.edu.cn",
    "西北农林科技大学": "https://www.nwafu.edu.cn",
    "兰州大学": "https://www.lzu.edu.cn",
    "国防科技大学": "https://www.nudt.edu.cn",
}

# 研究生院 URL 模式
GRADUATE_URL_PATTERNS = [
    "/yjsy", "/yjsb", "/gs", "/graduate", "/grs", "/yzb",
    "/yjszs", "/yz", "/yanjiusheng",
]

# 首页 HTML 缓存（避免 discover_graduate_url 和 discover_dept_list_url 重复请求）
_homepage_cache: dict[str, str | None] = {}

# 记录被反爬拦截的高校（避免重复尝试）
_anti_crawl_detected: dict[str, str] = {}  # homepage_url → 反爬系统名称


def is_anti_crawl_blocked(homepage_url: str) -> bool:
    """检查该高校是否已被标记为反爬拦截"""
    return homepage_url in _anti_crawl_detected


def get_anti_crawl_type(homepage_url: str) -> str | None:
    """获取反爬系统类型"""
    return _anti_crawl_detected.get(homepage_url)


async def _fetch_homepage_html(homepage_url: str) -> str | None:
    """获取首页 HTML（带缓存），自动处理 meta refresh 跳转和反爬检测"""
    if homepage_url in _homepage_cache:
        return _homepage_cache[homepage_url]

    result = await http_client.fetch(homepage_url, return_status=True)
    html, status_code = result if isinstance(result, tuple) else (result, None)

    # 反爬检测：同时检查 HTTP 状态码和响应内容
    anti_crawl_type = detect_anti_crawl(html, status_code=status_code)
    if anti_crawl_type:
        logger.warning(f"检测到反爬系统 ({anti_crawl_type}): {homepage_url}")
        _anti_crawl_detected[homepage_url] = anti_crawl_type

        # 瑞数反爬是服务端 TLS 指纹检测，Playwright 也无法绕过，直接跳过
        if anti_crawl_type == "ruishu":
            logger.info(f"瑞数反爬系统无法通过浏览器绕过，将使用兜底数据: {homepage_url}")
            _homepage_cache[homepage_url] = None
            return None

        # 其他类型的反爬，尝试 Playwright 降级
        logger.info(f"尝试 Playwright 浏览器渲染绕过反爬: {homepage_url}")
        pw_html = await playwright_fetch_with_stealth(homepage_url)
        if pw_html:
            logger.info(f"Playwright 渲染成功: {homepage_url} ({len(pw_html)} chars)")
            html = pw_html
            # 清除反爬标记（Playwright 成功了）
            _anti_crawl_detected.pop(homepage_url, None)
        else:
            logger.warning(f"Playwright 渲染也失败，将使用兜底数据: {homepage_url}")
            _homepage_cache[homepage_url] = None
            return None

    # 处理 meta refresh 跳转（如华南理工大学）
    if html and len(html) < 1000:
        import re
        match = re.search(r'<meta[^>]*http-equiv=["\']refresh["\'][^>]*content=["\'][^"\']*(URL|url)=([^"\'\>\s]+)', html, re.I)
        if match:
            redirect_url = normalize_url(match.group(2), homepage_url)
            if is_valid_url(redirect_url):
                logger.debug(f"Meta refresh 跳转: {homepage_url} → {redirect_url}")
                html = await http_client.fetch(redirect_url)

    _homepage_cache[homepage_url] = html
    return html

def clear_homepage_cache():
    """清除首页缓存和反爬标记（测试或重新运行时使用）"""
    _homepage_cache.clear()
    _anti_crawl_detected.clear()


async def discover_homepage(university_name: str) -> Optional[str]:
    """
    自动发现高校官网首页 URL。

    策略：
    1. 已知域名映射（最快）
    2. 研招网院校详情页中提取
    3. 常见域名模式尝试

    Args:
        university_name: 高校名称

    Returns:
        官网首页 URL，失败返回 None
    """
    # 策略 1：已知域名映射
    if university_name in KNOWN_DOMAINS:
        url = KNOWN_DOMAINS[university_name]
        logger.debug(f"已知域名: {university_name} → {url}")
        return url

    # 策略 2：尝试常见域名模式
    # 大部分高校域名是拼音缩写 + .edu.cn
    logger.warning(f"未找到已知域名: {university_name}，需要手动补充")
    return None


async def discover_graduate_url(homepage_url: str, university_name: str) -> Optional[str]:
    """
    从高校官网发现研究生院/研招网 URL。

    Args:
        homepage_url: 高校官网首页
        university_name: 高校名称

    Returns:
        研究生院 URL
    """
    logger.debug(f"查找研究生院 URL: {university_name}")

    html = await _fetch_homepage_html(homepage_url)
    if not html:
        # 反爬拦截时直接使用兜底数据
        if is_anti_crawl_blocked(homepage_url):
            fallback_url = get_fallback_graduate_url(university_name)
            if fallback_url:
                return fallback_url
        return None

    soup = BeautifulSoup(html, "lxml")

    # 策略 1：查找导航链接中的关键词
    keywords = ["研究生院", "研究生", "研招", "graduate"]
    for a_tag in soup.find_all("a", href=True):
        text = a_tag.get_text(strip=True).lower()
        href = a_tag["href"]
        for kw in keywords:
            if kw in text:
                full_url = normalize_url(href, homepage_url)
                if is_valid_url(full_url):
                    logger.debug(f"找到研究生院: {full_url}")
                    return full_url

    # 策略 2：URL 路径模式匹配
    from src.utils.url_utils import get_base_url
    base = get_base_url(homepage_url)
    for pattern in GRADUATE_URL_PATTERNS:
        candidate = f"{base}{pattern}"
        # 尝试访问
        test_html = await http_client.fetch(candidate, retry=1)
        if test_html and len(test_html) > 1000:
            logger.debug(f"URL 模式匹配成功: {candidate}")
            return candidate

    # 策略 3：反爬降级 - 使用内置兜底数据
    if is_anti_crawl_blocked(homepage_url):
        fallback_url = get_fallback_graduate_url(university_name)
        if fallback_url:
            return fallback_url

    logger.warning(f"未找到研究生院 URL: {university_name}")
    return None


async def discover_dept_list_url(homepage_url: str, university_name: str) -> Optional[str]:
    """
    从高校官网发现院系列表页 URL。

    Args:
        homepage_url: 高校官网首页
        university_name: 高校名称

    Returns:
        院系列表页 URL
    """
    logger.debug(f"查找院系列表页: {university_name}")

    html = await _fetch_homepage_html(homepage_url)
    if not html:
        # 反爬拦截时直接使用兜底数据
        if is_anti_crawl_blocked(homepage_url):
            fallback_url = get_fallback_dept_list_url(university_name)
            if fallback_url:
                return fallback_url
        return None

    soup = BeautifulSoup(html, "lxml")

    # 导航关键词（精确匹配，避免 "XX学院" 被误匹配为院系列表页入口）
    dept_keywords = [
        "院系设置", "院系", "院系导航", "组织机构",
        "教学机构", "学术机构", "院系概况", "机构设置",
        "教学科研机构", "学院设置", "学院（部）", "学院(部)",
        "departments", "schools", "colleges",
    ]

    candidates = []  # (优先级, url) - 优先级越小越好
    for a_tag in soup.find_all("a", href=True):
        text = a_tag.get_text(strip=True).lower()
        href = a_tag["href"]
        for i, kw in enumerate(dept_keywords):
            if kw in text:
                full_url = normalize_url(href, homepage_url)
                if is_valid_url(full_url):
                    candidates.append((i, full_url, kw))
                    break

    if candidates:
        # 按优先级排序，返回最佳匹配
        candidates.sort(key=lambda x: x[0])
        best = candidates[0]
        logger.debug(f"找到院系列表页: {best[1]} (关键词: {best[2]})")
        return best[1]

    # 策略 2：从 JS 变量中查找院系列表页（如浙大 CMS）
    from src.discovery.department_discover import _find_js_dept_page_urls
    js_urls = _find_js_dept_page_urls(html, homepage_url)
    if js_urls:
        # 优先选择包含"学院"、"院系"关键词的 URL
        logger.debug(f"从 JS 变量发现 {len(js_urls)} 个候选院系页 URL")
        return js_urls[0]

    # 策略 3：URL 路径模式匹配
    from src.utils.url_utils import get_base_url
    base = get_base_url(homepage_url)
    dept_url_patterns = [
        "/yxsz", "/院系", "/departments", "/schools",
        "/jgsz", "/jxjg", "/colleges", "/yxjj",
        "/jgsz/jxkyjg", "/jgsz/yxsz", "/zzjg/xysz",
    ]
    for pattern in dept_url_patterns:
        candidate = f"{base}{pattern}"
        test_html = await http_client.fetch(candidate, retry=1)
        if test_html and len(test_html) > 3000 and _looks_like_dept_list(test_html):
            logger.debug(f"院系列表 URL 模式匹配: {candidate}")
            return candidate

    # 策略 4：反爬降级 - 使用内置兜底数据
    if is_anti_crawl_blocked(homepage_url):
        fallback_url = get_fallback_dept_list_url(university_name)
        if fallback_url:
            return fallback_url

    logger.warning(f"未找到院系列表页: {university_name}")
    return None


def _looks_like_dept_list(html: str) -> bool:
    """
    判断页面是否像院系列表页。

    检查页面中是否包含多个学院相关关键词的链接。
    """
    import re
    dept_keywords = re.compile(r"学院|学部|研究所|研究院|学系")
    count = len(dept_keywords.findall(html))
    return count >= 5  # 至少包含 5 个学院相关关键词
