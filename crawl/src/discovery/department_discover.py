"""学院 URL 自动发现 - 从高校官网提取学院列表"""

from __future__ import annotations

import re
import asyncio
from typing import Optional

from bs4 import BeautifulSoup
from loguru import logger

from src.utils.http_client import http_client
from src.utils.url_utils import normalize_url, is_valid_url, get_domain
from src.discovery.anti_crawl_fallback import (
    detect_anti_crawl,
    get_fallback_departments,
)


async def discover_departments_from_page(
    dept_list_url: str,
    homepage_url: str,
    university_name: str,
) -> list[dict]:
    """
    从院系列表页提取所有学院的名称和 URL。

    Args:
        dept_list_url: 院系列表页 URL
        homepage_url: 高校官网首页（用于域名校验）
        university_name: 高校名称

    Returns:
        [{"name": "计算机学院", "url": "https://cs.xxx.edu.cn"}]
    """
    logger.info(f"从院系列表页提取学院: {university_name}")

    html = await http_client.fetch(dept_list_url)
    if not html:
        # 如果获取失败，尝试兜底数据
        fallback = get_fallback_departments(university_name)
        if fallback:
            return fallback
        return []

    # 反爬检测
    anti_crawl = detect_anti_crawl(html)
    if anti_crawl:
        logger.warning(f"{university_name}: 院系列表页被反爬拦截 ({anti_crawl})")
        fallback = get_fallback_departments(university_name)
        if fallback:
            return fallback
        return []

    # 策略 1：尝试从 JS 变量中提取学院数据（如浙大 CMS）
    departments = _extract_departments_from_js(html, dept_list_url)
    if departments:
        logger.info(f"{university_name}: 从 JS 变量提取到 {len(departments)} 个学院")
        return departments

    # 策略 2：从 <a> 标签中提取
    soup = BeautifulSoup(html, "lxml")
    departments = []
    seen_names = set()

    # 获取高校域名用于过滤
    uni_domain = get_domain(homepage_url)
    base_domain = ".".join(uni_domain.split(".")[-3:])  # 如 pku.edu.cn

    # 遍历所有链接
    for a_tag in soup.find_all("a", href=True):
        text = a_tag.get_text(strip=True)
        href = a_tag["href"]

        # 过滤条件
        if not text or len(text) < 2 or len(text) > 50:
            continue

        # 判断是否像学院名称
        if not _is_department_name(text):
            continue

        # 规范化 URL
        full_url = normalize_url(href, dept_list_url)
        if not is_valid_url(full_url):
            continue

        # 去重
        if text in seen_names:
            continue
        seen_names.add(text)

        departments.append({
            "name": text,
            "url": full_url,
        })

    # 策略 3：如果提取到的学院数过少（≤3），可能找到的是二级导航页
    # 尝试在页面中查找"教学科研机构"、"学院设置"等子链接并深入
    if len(departments) <= 3:
        sub_depts = await _drill_down_dept_page(html, dept_list_url, homepage_url, university_name)
        if len(sub_depts) > len(departments):
            departments = sub_depts

    logger.info(f"{university_name}: 从列表页提取到 {len(departments)} 个学院")

    # URL 补全：为缺少 URL 的学院尝试通过子域名猜测补全
    missing_count = sum(1 for d in departments if not d.get("url"))
    if missing_count > 0:
        departments = await fill_missing_department_urls(departments, homepage_url, university_name)

    return departments


async def discover_departments_from_homepage(
    homepage_url: str,
    university_name: str,
) -> list[dict]:
    """
    从高校首页导航栏提取学院链接（备用策略）。

    Args:
        homepage_url: 高校官网首页
        university_name: 高校名称

    Returns:
        [{"name": "计算机学院", "url": "https://cs.xxx.edu.cn"}]
    """
    logger.debug(f"从首页导航提取学院: {university_name}")

    html = await http_client.fetch(homepage_url)
    if not html:
        # 如果获取失败，尝试兜底数据
        fallback = get_fallback_departments(university_name)
        if fallback:
            return fallback
        return []

    # 反爬检测
    anti_crawl = detect_anti_crawl(html)
    if anti_crawl:
        logger.warning(f"{university_name}: 首页被反爬拦截 ({anti_crawl})")
        fallback = get_fallback_departments(university_name)
        if fallback:
            return fallback
        return []
    departments = _extract_departments_from_js(html, homepage_url)
    if departments:
        logger.info(f"{university_name}: 从首页 JS 变量提取到 {len(departments)} 个学院")
        return departments

    soup = BeautifulSoup(html, "lxml")
    departments = []
    seen_names = set()

    # 查找导航区域
    nav_areas = soup.find_all(["nav", "div"], class_=re.compile(
        r"nav|menu|header|dropdown", re.I
    ))

    # 如果没找到导航区域，搜索整个页面
    search_areas = nav_areas if nav_areas else [soup]

    for area in search_areas:
        for a_tag in area.find_all("a", href=True):
            text = a_tag.get_text(strip=True)
            href = a_tag["href"]

            if not text or len(text) < 2 or len(text) > 50:
                continue

            if not _is_department_name(text):
                continue

            full_url = normalize_url(href, homepage_url)
            if not is_valid_url(full_url):
                continue

            if text in seen_names:
                continue
            seen_names.add(text)

            departments.append({
                "name": text,
                "url": full_url,
            })

    logger.debug(f"{university_name}: 从首页导航提取到 {len(departments)} 个学院")

    # 如果静态解析失败，尝试从 JS 变量中提取（某些 CMS 将导航数据嵌入 script 中）
    if not departments:
        # 尝试访问已知的院系子页面（某些 CMS 在子页面中包含完整学院数据）
        js_dept_urls = _find_js_dept_page_urls(html, homepage_url)
        for js_url in js_dept_urls:
            sub_html = await http_client.fetch(js_url)
            if sub_html:
                departments = _extract_departments_from_js(sub_html, js_url)
                if departments:
                    logger.info(f"{university_name}: 从子页面 JS 变量提取到 {len(departments)} 个学院")
                    break

    # 如果仍然失败，尝试 Playwright 动态渲染
    if not departments and _is_spa_page(html):
        logger.info(f"{university_name}: 检测到 SPA 页面，尝试 Playwright 动态渲染")
        departments = await _discover_departments_playwright(homepage_url, university_name)

    # URL 补全：为缺少 URL 的学院尝试通过子域名猜测补全
    if departments:
        missing_count = sum(1 for d in departments if not d.get("url"))
        if missing_count > 0:
            departments = await fill_missing_department_urls(departments, homepage_url, university_name)

    return departments


async def _discover_departments_playwright(
    url: str,
    university_name: str,
) -> list[dict]:
    """
    使用 Playwright 渲染 SPA 页面后提取学院列表。

    Args:
        url: 页面 URL
        university_name: 高校名称

    Returns:
        [{"name": "计算机学院", "url": "https://cs.xxx.edu.cn"}]
    """
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        logger.warning("Playwright 未安装，跳过动态渲染")
        return []

    departments = []
    seen_names = set()

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            logger.debug(f"Playwright 加载: {url}")
            await page.goto(url, wait_until="networkidle", timeout=30000)

            # 等待页面渲染完成
            await page.wait_for_timeout(2000)

            # 尝试找到并点击"院系"相关的导航链接
            dept_nav_clicked = False
            try:
                dept_nav_selectors = [
                    'a:has-text("院系")',
                    'a:has-text("学院")',
                    'a:has-text("院系设置")',
                    'a:has-text("departments")',
                ]
                for selector in dept_nav_selectors:
                    nav_link = page.locator(selector).first
                    if await nav_link.count() > 0:
                        await nav_link.click()
                        await page.wait_for_load_state("networkidle", timeout=15000)
                        await page.wait_for_timeout(2000)
                        dept_nav_clicked = True
                        logger.debug(f"Playwright 点击导航: {selector}")
                        break
            except Exception:
                pass  # 点击失败不影响后续提取

            # 获取渲染后的 HTML
            html = await page.content()
            logger.debug(f"Playwright 渲染完成: {len(html)} chars"
                         + (" (已导航到院系页)" if dept_nav_clicked else ""))

            # 用 BeautifulSoup 解析渲染后的 HTML
            soup = BeautifulSoup(html, "lxml")

            for a_tag in soup.find_all("a", href=True):
                text = a_tag.get_text(strip=True)
                href = a_tag["href"]

                if not text or len(text) < 2 or len(text) > 50:
                    continue

                if not _is_department_name(text):
                    continue

                full_url = normalize_url(href, url)
                if not is_valid_url(full_url):
                    continue

                if text in seen_names:
                    continue
                seen_names.add(text)

                departments.append({
                    "name": text,
                    "url": full_url,
                })

            await browser.close()

        logger.info(f"{university_name}: Playwright 提取到 {len(departments)} 个学院")

    except Exception as e:
        logger.warning(f"Playwright 渲染失败: {university_name} - {e}")

    return departments


async def _drill_down_dept_page(
    html: str,
    current_url: str,
    homepage_url: str,
    university_name: str,
) -> list[dict]:
    """
    当院系列表页是二级导航页时，深入查找真正的学院列表页。

    很多高校的"机构设置"页面只有分类链接（如"教学科研机构"、"管理服务机构"），
    需要进一步点击才能看到学院列表。
    """
    soup = BeautifulSoup(html, "lxml")

    # 子页面关键词（按优先级排序）
    sub_keywords = [
        "教学科研机构", "教学机构", "学院设置", "学院（部）", "学院(部)",
        "院系设置", "教学单位", "科研机构", "学院",
    ]

    for a_tag in soup.find_all("a", href=True):
        text = a_tag.get_text(strip=True)
        href = a_tag["href"]

        for kw in sub_keywords:
            if kw in text:
                sub_url = normalize_url(href, current_url)
                if not is_valid_url(sub_url) or sub_url == current_url:
                    continue

                logger.debug(f"{university_name}: 深入子页面 '{text}' → {sub_url}")
                sub_html = await http_client.fetch(sub_url)
                if not sub_html:
                    continue

                # 先尝试 JS 变量解析
                depts = _extract_departments_from_js(sub_html, sub_url)
                if depts and len(depts) >= 5:
                    logger.info(f"{university_name}: 从子页面 JS 变量提取到 {len(depts)} 个学院")
                    return depts

                # 再尝试 <a> 标签解析
                sub_soup = BeautifulSoup(sub_html, "lxml")
                depts = []
                seen = set()
                for sub_a in sub_soup.find_all("a", href=True):
                    t = sub_a.get_text(strip=True)
                    h = sub_a["href"]
                    if not t or len(t) < 2 or len(t) > 50:
                        continue
                    if not _is_department_name(t):
                        continue
                    full = normalize_url(h, sub_url)
                    if not is_valid_url(full):
                        continue
                    if t in seen:
                        continue
                    seen.add(t)
                    depts.append({"name": t, "url": full})

                if len(depts) >= 5:
                    logger.info(f"{university_name}: 从子页面 '{text}' 提取到 {len(depts)} 个学院")
                    return depts
                break  # 只尝试第一个匹配的子链接

    return []


def _extract_departments_from_js(html: str, base_url: str) -> list[dict]:
    """
    从页面 <script> 标签中的 JS 变量提取学院数据。

    某些高校 CMS（如浙大的 SUDY CMS）将导航菜单和学院列表数据
    嵌入在 <script> 标签的 JavaScript 变量中，而非 <a> 标签。

    支持的模式：
    - list._college = [{title: '...', link: '...', children: [...]}]
    - main._menu = [{name: '...', href: '...', children: [...]}]
    """
    if not html:
        return []

    departments = []
    seen_names = set()

    # 模式 1：list._college（浙大 CMS 院系列表页）
    idx = html.find("_college")
    if idx >= 0:
        # 找到变量赋值的起始位置
        start = html.rfind("=", max(0, idx - 30), idx)
        if start >= 0:
            end = html.find("</script>", start)
            if end >= 0:
                js_text = html[start + 1:end]
                # 提取 title 和 link 对
                titles = re.findall(r"title:\s*'([^']*?)'", js_text)
                links = re.findall(r"link:\s*'([^']*?)'", js_text)

                for title, link in zip(titles, links):
                    if not title or len(title) < 2:
                        continue
                    if not _is_department_name(title):
                        continue
                    if title in seen_names:
                        continue
                    seen_names.add(title)

                    full_url = normalize_url(link, base_url) if link and link != "#" else ""
                    departments.append({
                        "name": title,
                        "url": full_url if is_valid_url(full_url) else "",
                    })

    if departments:
        return departments

    # 模式 2：_menu 中的学院子菜单
    for var_name in ["_menu", "_navMenu"]:
        idx = html.find(var_name)
        if idx < 0:
            continue

        start = html.rfind("=", max(0, idx - 30), idx)
        if start < 0:
            continue
        end = html.find("</script>", start)
        if end < 0:
            continue

        js_text = html[start + 1:end]

        # 提取 name 和 href 对
        names = re.findall(r"name:\s*'([^']*?)'", js_text)
        hrefs = re.findall(r"href:\s*'([^']*?)'", js_text)

        for name, href in zip(names, hrefs):
            if not name or len(name) < 2:
                continue
            if not _is_department_name(name):
                continue
            if name in seen_names:
                continue
            seen_names.add(name)

            full_url = normalize_url(href, base_url) if href and href != "#" else ""
            departments.append({
                "name": name,
                "url": full_url if is_valid_url(full_url) else "",
            })

    return departments


def _find_js_dept_page_urls(html: str, base_url: str) -> list[str]:
    """
    从首页 JS 变量中查找可能包含学院列表的子页面 URL。

    某些 CMS 的首页 JS 菜单中包含"学院（系）"等导航项，
    其 href 指向的子页面中包含完整的学院数据。
    """
    # (优先级, url) - 优先级越小越好
    candidates = []

    # 搜索 _menu 变量中的院系相关链接
    for var_name in ["_menu", "_navMenu", "_columnList"]:
        idx = html.find(var_name)
        if idx < 0:
            continue

        start = html.rfind("=", max(0, idx - 30), idx)
        if start < 0:
            continue
        end = html.find("</script>", start)
        if end < 0:
            continue

        js_text = html[start + 1:end]

        # 查找包含院系关键词的菜单项（按精确度排序）
        # 优先级：院系设置 > 院系 > 学院（系）> 学部 > 学院
        priority_keywords = [
            (0, "院系设置"),
            (1, "院系"),
            (2, "学院（系）"),
            (2, "学院(系)"),
            (3, "学部"),
            (4, "学院"),
        ]

        names = re.findall(r"name:\s*'([^']*?)'", js_text)
        hrefs = re.findall(r"href:\s*'([^']*?)'", js_text)

        for name, href in zip(names, hrefs):
            for priority, kw in priority_keywords:
                if kw in name:
                    full_url = normalize_url(href, base_url)
                    if is_valid_url(full_url):
                        candidates.append((priority, full_url))
                    break

    # 按优先级排序，去重
    candidates.sort(key=lambda x: x[0])
    seen = set()
    urls = []
    for _, url in candidates:
        if url not in seen:
            seen.add(url)
            urls.append(url)

    return urls


def _is_spa_page(html: str) -> bool:
    """
    检测页面是否为 SPA（单页应用）或 JS 重度渲染页面。

    特征：
    - 包含 <div id="app"> 或 <div id="root">
    - 包含大量 JavaScript 但 <a> 标签中缺少实质内容
    - 页面中 <a> 标签极少但有大量 JS 代码
    """
    if not html:
        return False

    spa_markers = ['<div id="app"', '<div id="root"', 'window.__NUXT__', 'window.__NEXT_DATA__']
    has_spa_marker = any(marker in html for marker in spa_markers)

    # 检查 <a> 标签中是否缺少学院内容
    soup = BeautifulSoup(html, "lxml")
    a_tags = soup.find_all("a", href=True)
    dept_links = 0
    for a_tag in a_tags:
        text = a_tag.get_text(strip=True)
        if len(text) >= 3 and _is_department_name(text):
            dept_links += 1

    # 传统 SPA 检测
    if has_spa_marker and dept_links < 3:
        return True

    # JS 重度渲染检测：<a> 标签极少（<10）但页面有大量 JS
    if len(a_tags) < 10 and len(html) > 5000:
        script_count = html.count("<script")
        if script_count > 5 and dept_links < 3:
            return True

    return False


def verify_coverage(
    chsi_departments: list[str],
    discovered_departments: list[dict],
) -> dict:
    """
    将自动发现的学院与研招网数据进行交叉校验。

    Args:
        chsi_departments: 研招网获取的招生单位名称列表
        discovered_departments: 自动发现的学院列表

    Returns:
        {
            "total_chsi": 30,
            "total_discovered": 28,
            "matched": 25,
            "coverage_rate": 0.83,
            "unmatched_chsi": ["xxx", "yyy"],
            "extra_discovered": ["zzz"],
        }
    """
    discovered_names = {d["name"] for d in discovered_departments}

    matched = 0
    unmatched_chsi = []

    for chsi_name in chsi_departments:
        # 精确匹配
        if chsi_name in discovered_names:
            matched += 1
            continue

        # 模糊匹配：多种策略
        found = False
        for d_name in discovered_names:
            # 策略 1：子串包含
            if chsi_name in d_name or d_name in chsi_name:
                matched += 1
                found = True
                break
            # 策略 2：去除常见后缀后比较核心词
            chsi_core = _extract_dept_core(chsi_name)
            disc_core = _extract_dept_core(d_name)
            if chsi_core and disc_core and (chsi_core in disc_core or disc_core in chsi_core):
                matched += 1
                found = True
                break

        if not found:
            unmatched_chsi.append(chsi_name)

    # 找出多发现的学院
    chsi_set = set(chsi_departments)
    extra = []
    for d in discovered_departments:
        name = d["name"]
        if name not in chsi_set and not any(c in name or name in c for c in chsi_set):
            extra.append(name)

    coverage = matched / len(chsi_departments) if chsi_departments else 0

    return {
        "total_chsi": len(chsi_departments),
        "total_discovered": len(discovered_departments),
        "matched": matched,
        "coverage_rate": round(coverage, 2),
        "unmatched_chsi": unmatched_chsi,
        "extra_discovered": extra,
    }


def _extract_dept_core(name: str) -> str:
    """
    提取学院名称的核心词（去除常见后缀）。
    例如："计算机学院" → "计算机"，"计算机科学与技术学院" → "计算机科学与技术"
    """
    import re
    # 去除常见后缀（长模式优先，避免短模式误匹配）
    core = re.sub(r"(研究中心|研究所|研究院|实验室|医学部|学院|学部|书院|系)$", "", name)
    # 如果去除后为空（如 "医学部" → ""），说明整个名称就是后缀，保留原名
    if not core.strip() and name:
        return name
    return core.strip()


def _is_department_name(text: str) -> bool:
    """
    判断文本是否像学院/系/研究所名称。

    规则：
    - 包含"学院"、"系"、"研究所"、"研究院"、"中心"等关键词
    - 排除明显不是学院的文本
    - 名称长度至少 3 个字符，不超过 30 个字符
    - 排除以日期开头的新闻标题
    """
    import re

    # 长度检查：学院名称至少 3 个字符（如 "数学系"），不超过 30 个字符
    if len(text) < 3 or len(text) > 30:
        return False

    # 排除以日期开头的文本（新闻标题）
    if re.match(r"^\d{4}[-./年]", text):
        return False

    # 排除包含新闻标题特征的文本（动词、冒号等）
    if re.search(r"成立|召开|举行|举办|发布|通报|表彰|：|:", text):
        return False

    # 正面关键词
    positive_keywords = [
        "学院", "学部", "学系", "研究所", "研究院",
        "研究中心", "实验室", "书院", "医学部",
        "school", "college", "institute", "department",
    ]

    # "系" 需要特殊处理：必须在末尾且前面是中文字符（避免 "教务系统" 等误判）
    is_dept_suffix_xi = bool(re.search(r"[\u4e00-\u9fff]系$", text))

    # 负面关键词（排除）
    negative_keywords = [
        "首页", "登录", "注册", "搜索", "更多", "返回",
        "关于", "联系", "地址", "电话", "邮箱", "版权",
        "新闻", "通知", "公告", "招生", "就业", "科研",
        "图书馆", "校医院", "后勤", "保卫", "纪委",
        "党委", "工会", "团委", "校友",
        "系统", "教务",
    ]

    text_lower = text.lower()

    # 先检查正面关键词
    has_positive = False
    for pos in positive_keywords:
        if pos in text_lower:
            has_positive = True
            break

    # "系" 后缀也算正面
    if is_dept_suffix_xi:
        has_positive = True

    # 如果包含正面关键词，则正面优先（"新闻与传播学院" 应被识别为学院）
    if has_positive:
        return True

    # 不包含正面关键词时，检查负面关键词
    for neg in negative_keywords:
        if neg in text_lower:
            return False

    return False


# ============================================================
# URL 补全机制：为缺少 URL 的学院尝试通过子域名猜测补全
# ============================================================

# 常见学院名称 → 子域名缩写映射
_DEPT_SUBDOMAIN_MAP: dict[str, list[str]] = {
    "人工智能": ["ai", "aii"],
    "计算机": ["cs", "cse", "jsj"],
    "软件": ["sw", "se", "software"],
    "数学": ["math", "maths"],
    "物理": ["physics", "phys", "phy"],
    "化学": ["chem", "chemistry"],
    "生命科学": ["life", "lifesc", "bio", "biology"],
    "生物医学工程": ["bme", "bmse"],
    "电子信息": ["eie", "ei", "ee"],
    "电气工程": ["dee", "ee", "eea"],
    "机械工程": ["me", "mech"],
    "材料": ["mse", "mater", "materials"],
    "经济": ["econ", "economics", "sesu"],
    "管理": ["ms", "som", "manage"],
    "法": ["law"],
    "文学": ["chin", "chinese", "wxy"],
    "外国语": ["flc", "sfl", "wyx"],
    "历史": ["history", "hist"],
    "哲学": ["phil", "philosophy"],
    "马克思主义": ["marxism", "marx"],
    "新闻": ["xwxy", "journalism", "sjc"],
    "艺术": ["art", "arts"],
    "体育": ["tyxy", "pe", "sport"],
    "护理": ["nursing"],
    "药": ["pharm", "pharmacy"],
    "公共卫生": ["sph", "gwxy"],
    "口腔": ["dent", "dental", "hxkq"],
    "建筑": ["arch", "acem"],
    "土木": ["ce", "civil"],
    "环境": ["env", "see"],
    "水利": ["wrhes", "water"],
    "核科学": ["nuclear"],
    "大气": ["atmos"],
    "地质": ["geo", "geology"],
    "生态": ["ecology", "eco"],
    "草": ["caoye", "grass"],
    "考古": ["kaogu", "archaeology", "whyc", "arch"],
    "动物医学": ["vet", "dwyx"],
    "纪检监察": ["jiwei", "jjjc"],
    "灾后重建": ["idmr"],
    "碳中和": ["carbon", "cnft"],
    "保密": ["bm", "secrecy"],
    "网络空间安全": ["ccs", "cyber"],
    "空天": ["aero", "aerospace"],
    "国际关系": ["sis", "sir", "pir"],
    "公共管理": ["ggglxy", "spa"],
    "商": ["bs", "business"],
    "信息科学": ["xxxy", "is"],
    "资源环境": ["cere"],
}


async def fill_missing_department_urls(
    departments: list[dict],
    homepage_url: str,
    university_name: str,
) -> list[dict]:
    """
    为缺少 URL 的学院尝试通过子域名猜测补全。

    策略：根据学院名称中的关键词，构造可能的子域名 URL，
    然后逐个验证是否可访问。

    Args:
        departments: 学院列表（可能部分缺少 url）
        homepage_url: 高校官网首页（用于提取域名后缀）
        university_name: 高校名称

    Returns:
        补全后的学院列表
    """
    from src.utils.url_utils import get_domain

    # 提取域名后缀（如 scu.edu.cn, zju.edu.cn）
    domain = get_domain(homepage_url)
    parts = domain.split(".")
    # 取最后三段作为基础域名（如 scu.edu.cn）
    if len(parts) >= 3:
        base_domain = ".".join(parts[-3:])
    else:
        base_domain = domain

    # 找出缺少 URL 的学院
    missing = [(i, d) for i, d in enumerate(departments) if not d.get("url")]
    if not missing:
        return departments

    logger.info(f"{university_name}: 尝试补全 {len(missing)} 个缺少 URL 的学院")

    for idx, dept in missing:
        dept_name = dept["name"]
        # 根据学院名称生成候选子域名
        candidate_subdomains = _guess_subdomains(dept_name)

        if not candidate_subdomains:
            logger.debug(f"  {dept_name}: 无法猜测子域名")
            continue

        # 构造候选 URL 并验证
        found = False
        for subdomain in candidate_subdomains:
            candidate_url = f"https://{subdomain}.{base_domain}"
            try:
                html = await http_client.fetch(candidate_url, retry=0)
                if html and len(html) > 1000:
                    # 验证页面内容是否与学院相关
                    anti_crawl = detect_anti_crawl(html)
                    if not anti_crawl:
                        departments[idx]["url"] = candidate_url
                        logger.info(f"  ✅ {dept_name}: {candidate_url}")
                        found = True
                        break
                    else:
                        # 被反爬拦截但域名存在，也记录
                        departments[idx]["url"] = candidate_url
                        logger.info(f"  ✅ {dept_name}: {candidate_url} (被反爬拦截但域名存在)")
                        found = True
                        break
            except Exception:
                continue

        if not found:
            logger.debug(f"  ❌ {dept_name}: 所有候选子域名均失败")

    filled = sum(1 for i, _ in missing if departments[i].get("url"))
    logger.info(f"{university_name}: 补全了 {filled}/{len(missing)} 个学院 URL")

    return departments


def _guess_subdomains(dept_name: str) -> list[str]:
    """
    根据学院名称猜测可能的子域名。

    Args:
        dept_name: 学院名称

    Returns:
        候选子域名列表（按可能性排序）
    """
    candidates = []

    # 从映射表中查找
    for keyword, subdomains in _DEPT_SUBDOMAIN_MAP.items():
        if keyword in dept_name:
            candidates.extend(subdomains)

    # 去重并保持顺序
    seen = set()
    result = []
    for c in candidates:
        if c not in seen:
            seen.add(c)
            result.append(c)

    return result
