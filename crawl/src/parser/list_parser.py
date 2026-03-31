from __future__ import annotations

"""通知列表页自适应解析器"""

import re
from datetime import datetime
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup, Tag
from loguru import logger


class NoticeListParser:
    """通知列表页自适应解析器

    采用多策略级联解析：
    策略0: 自定义CSS选择器配置（优先级最高）
    策略1: 常见CMS模板匹配（博达站群、正方系统等）
    策略2: 通用启发式规则（日期+链接配对）
    策略3: LLM辅助解析（兜底）
    """

    # 常见日期正则模式
    DATE_PATTERNS = [
        r"(\d{4})-(\d{1,2})-(\d{1,2})",       # 2026-03-25
        r"(\d{4})\.(\d{1,2})\.(\d{1,2})",       # 2026.03.25
        r"(\d{4})/(\d{1,2})/(\d{1,2})",         # 2026/03/25
        r"(\d{4})年(\d{1,2})月(\d{1,2})日?",    # 2026年3月25日
        r"\[(\d{4})-(\d{1,2})-(\d{1,2})\]",     # [2026-03-25]
        r"\((\d{4})-(\d{1,2})-(\d{1,2})\)",     # (2026-03-25)
    ]

    # 综合日期匹配正则（用于启发式解析）
    DATE_REGEX = re.compile(
        r"(\d{4})[-./年](\d{1,2})[-./月](\d{1,2})日?"
    )

    # 最小有效条目数（低于此数认为解析失败）
    # 降低到1，因为有些学院确实只有很少的通知
    MIN_ITEMS = 1

    def parse(self, html: str, url: str, parser_config: dict | None = None) -> list[dict]:
        """
        尝试多种策略解析通知列表，返回 [{"title": ..., "url": ..., "date": ...}]

        Args:
            html: 页面 HTML
            url: 页面 URL（用于解析相对路径）
            parser_config: 自定义解析配置（可选）

        Returns:
            通知条目列表
        """
        # 策略 0：自定义配置
        if parser_config:
            result = self._try_custom_config(html, url, parser_config)
            if result:
                logger.info(f"[解析策略0-自定义配置] 成功: {len(result)} 条 | {url}")
                return self._validate_and_clean(result, url)

        # 策略 1：常见 CMS 模板匹配
        result = self._try_cms_templates(html, url)
        if result:
            logger.info(f"[解析策略1-CMS模板] 成功: {len(result)} 条 | {url}")
            return self._validate_and_clean(result, url)

        # 策略 2：通用启发式规则
        result = self._try_heuristic(html, url)
        if result:
            logger.info(f"[解析策略2-启发式] 成功: {len(result)} 条 | {url}")
            return self._validate_and_clean(result, url)

        logger.warning(f"所有自动解析策略失败: {url}")
        return []

    async def parse_with_llm_fallback(self, html: str, url: str, parser_config: dict | None = None) -> list[dict]:
        """
        带LLM兜底的解析方法。先尝试自动解析，失败后使用LLM。

        Args:
            html: 页面 HTML
            url: 页面 URL
            parser_config: 自定义解析配置

        Returns:
            通知条目列表
        """
        # 先尝试自动解析
        result = self.parse(html, url, parser_config)
        if result:
            return result

        # 策略 3：LLM 兜底解析
        result = await self._try_llm_parse(html, url)
        if result:
            logger.info(f"[解析策略3-LLM兜底] 成功: {len(result)} 条 | {url}")
            return self._validate_and_clean(result, url)

        logger.warning(f"所有解析策略（含LLM）均失败: {url}")
        return []

    def _try_custom_config(self, html: str, url: str, config: dict) -> list[dict]:
        """
        使用自定义 CSS 选择器配置解析。

        config 格式：
        {
            "item_selector": ".news_list li",
            "title_selector": "a",
            "date_selector": "span.date",
            "link_attr": "href"
        }
        """
        try:
            soup = BeautifulSoup(html, "lxml")
            items = soup.select(config["item_selector"])
            results = []

            for item in items:
                title_el = item.select_one(config.get("title_selector", "a"))
                date_el = item.select_one(config.get("date_selector", "span"))

                if not title_el:
                    continue

                title = title_el.get_text(strip=True)
                link = title_el.get(config.get("link_attr", "href"), "")
                date_str = date_el.get_text(strip=True) if date_el else ""

                if title and link:
                    results.append({
                        "title": title,
                        "url": urljoin(url, link),
                        "date": self._parse_date(date_str),
                    })

            return results if len(results) >= self.MIN_ITEMS else []
        except Exception as e:
            logger.debug(f"自定义配置解析失败: {e}")
            return []

    def _try_cms_templates(self, html: str, url: str) -> list[dict]:
        """
        匹配常见高校 CMS 系统的 HTML 结构模板。

        覆盖的CMS系统：
        - 博达站群系统（~30% 高校使用）
        - 正方教务系统（~15%）
        - WordPress（~10%）
        - 其他常见模板
        """
        soup = BeautifulSoup(html, "lxml")

        # ===== 卡片式列表解析（<a> 包裹整个条目） =====
        # 常见于现代CMS：<ul class="news-simplelist"> <li class="item"> <a href="..."> <div class="d">日期</div> <div class="t">标题</div> </a> </li>
        card_selectors = [
            "ul.list li.item",
            ".news-simplelist li.item",
            ".news-simplelist li",
            "ul.newlist li",
            ".newlist1 ul.list li",
        ]
        for card_sel in card_selectors:
            card_items = soup.select(card_sel)
            if len(card_items) >= self.MIN_ITEMS:
                results = []
                for card in card_items:
                    a_tag = card.find("a", href=True)
                    if not a_tag:
                        continue
                    # 标题：优先从 .t / h3 / h4 中提取
                    title_el = a_tag.find(class_=re.compile(r"^t$|title", re.I)) or a_tag.find(["h3", "h4", "h5"])
                    if title_el:
                        title = title_el.get_text(strip=True)
                    else:
                        title = a_tag.get("title") or a_tag.get_text(strip=True)
                    href = a_tag["href"]
                    if not title or len(title) < 4:
                        continue
                    # 日期：从 .d / .date / .time 中提取，支持分离式日期
                    date_str = self._extract_card_date(a_tag) or self._extract_card_date(card)
                    results.append({
                        "title": title,
                        "url": urljoin(url, href),
                        "date": self._parse_date(date_str) if date_str else None,
                    })
                if len(results) >= self.MIN_ITEMS:
                    logger.debug(f"卡片式列表模板匹配成功: {len(results)} 条")
                    return results

        # ===== WP站群系统专用解析（嵌套表格结构） =====
        # 结构: table.wp_article_list_table > tr > td > table > tr > td > a + td(日期)
        wp_tables = soup.select("table.wp_article_list_table")
        if wp_tables:
            results = []
            for wp_table in wp_tables:
                for inner_table in wp_table.find_all("table"):
                    a_tag = inner_table.find("a", href=True)
                    if not a_tag:
                        continue
                    title = a_tag.get("title") or a_tag.get_text(strip=True)
                    href = a_tag["href"]
                    if not title or len(title) < 4:
                        continue
                    # 在内部表格中查找日期
                    date_str = ""
                    for td in inner_table.find_all("td"):
                        td_text = td.get_text(strip=True)
                        if self.DATE_REGEX.search(td_text) and not td.find("a"):
                            date_str = td_text
                            break
                    results.append({
                        "title": title,
                        "url": urljoin(url, href),
                        "date": self._parse_date(date_str),
                    })
            if len(results) >= self.MIN_ITEMS:
                logger.debug(f"WP站群系统模板匹配成功: {len(results)} 条")
                return results

        # ===== 模板列表 =====
        # 每个模板定义：容器选择器 → 条目选择器 → 标题选择器 → 日期选择器
        templates = [
            # 博达站群系统（最常见）
            {"container": "ul.news_list, ul.list_item, ul.news-list, .list-news ul, .news_ul, ul.n_listxx, ul.list, ul.txtList, ul.cols_list",
             "item": "li", "title": "a", "date": "span, .date, .time, em"},
            # 博达站群 - div列表形式
            {"container": ".list_box, .news_box, .list-box, .news-box",
             "item": ".list_item, .news_item, .list-item, .news-item",
             "title": "a", "date": "span, .date, .time"},
            # 通用列表
            {"container": ".list ul, .news-list ul, .tzgg-list ul, .notice-list ul, .list_con ul",
             "item": "li", "title": "a", "date": "span, .date, .time"},
            # 表格形式
            {"container": "table.list, table.news_list, .list-table table, table.winstyle",
             "item": "tr", "title": "a", "date": "td:last-child, span.date"},
            # WordPress 风格
            {"container": ".entry-list, .post-list, article.post, .wp-block-post-template",
             "item": "article, .entry, .post, li",
             "title": "a.entry-title, h2 a, h3 a, .post-title a",
             "date": "time, .entry-date, .post-date, .date"},
            # 正方系统
            {"container": ".list_main, .main_list, .zf-list",
             "item": "li, .item", "title": "a", "date": "span, .date"},
            # 通用 div+a 结构
            {"container": ".content_list, .article-list, .info-list, .notice_list, .gonggao_list",
             "item": "li, .item, .row", "title": "a", "date": "span, .date, .time, em"},
            # 带 class=c* 的博达系统（如 class="c75249"）
            {"container": "[class^='c'] ul, div[id^='line'] ul",
             "item": "li", "title": "a", "date": "span"},
            # dl/dt/dd 列表结构
            {"container": "dl",
             "item": "dd, dt", "title": "a", "date": "span, .date, .time, em"},
            # div 列表 - 每个 div 是一条通知
            {"container": ".news_content, .list-content, .main-content, .right-content",
             "item": "li, .item, .news-item, .list-item, div.row",
             "title": "a", "date": "span, .date, .time, em"},
            # 通用 ul 列表（无特定class）
            {"container": "#content ul, .content ul, .main ul, .right ul, .body ul",
             "item": "li", "title": "a", "date": "span, .date, .time, em"},
            # 通知公告专用
            {"container": ".tzgg, .gg_list, .notice, .announcement, .bulletin",
             "item": "li, .item, div", "title": "a", "date": "span, .date, .time, em"},
            # 卡片式布局（a标签内含h4标题，常见于研究生院等现代网站）
            {"container": ".nyrCon, .nyRight, .content-area, .article-area, .main-area",
             "item": "li, .item, div", "title": "a", "date": "span, .date, .time, em, p"},
        ]

        for template in templates:
            containers = soup.select(template["container"])
            # 遍历所有容器，选择结果数量最多的（避免导航项被优先选中）
            best_results = []
            for container in containers:
                items = container.select(template["item"])
                results = []
                for item in items:
                    # 尝试多个标题选择器
                    title_selectors = template["title"].split(", ")
                    title_el = None
                    for sel in title_selectors:
                        title_el = item.select_one(sel.strip())
                        if title_el:
                            break

                    if not title_el:
                        continue

                    # 优先使用 title 属性（完整标题），其次使用链接文本
                    title = title_el.get("title") or title_el.get_text(strip=True)
                    link = title_el.get("href", "")

                    # 尝试多个日期选择器
                    date_str = ""
                    date_selectors = template["date"].split(", ")
                    for sel in date_selectors:
                        date_el = item.select_one(sel.strip())
                        if date_el:
                            candidate = date_el.get_text(strip=True)
                            if self.DATE_REGEX.search(candidate):
                                date_str = candidate
                                break

                    # 如果日期选择器没找到，在整个item文本中搜索日期
                    if not date_str:
                        item_text = item.get_text()
                        date_match = self.DATE_REGEX.search(item_text)
                        if date_match:
                            date_str = date_match.group(0)

                    if title and link and len(title) >= 4:
                        results.append({
                            "title": title,
                            "url": urljoin(url, link),
                            "date": self._parse_date(date_str),
                        })

                if len(results) >= self.MIN_ITEMS and len(results) > len(best_results):
                    best_results = results

            if best_results:
                return best_results

        return []

    def _try_heuristic(self, html: str, url: str) -> list[dict]:
        """
        启发式规则：查找日期+链接配对。

        核心思路：通知列表页的共性是"日期 + 标题链接"的重复结构。
        通过查找所有 <a> 标签，在其父元素或兄弟元素中寻找日期，
        将日期+链接配对为一条通知。

        改进策略：
        1. 先找到所有包含日期的容器元素
        2. 在容器中查找最近的 <a> 标签
        3. 支持日期在链接前面或后面的情况
        """
        soup = BeautifulSoup(html, "lxml")
        results = []
        seen_urls = set()

        # 方法A：从 <a> 标签出发，在父/兄弟元素中找日期
        for a_tag in soup.find_all("a", href=True):
            title = a_tag.get_text(strip=True)
            href = a_tag["href"]

            # 过滤：标题长度合理
            if not title or len(title) < 4 or len(title) > 200:
                continue

            # 过滤：不是导航/功能链接
            if href.startswith(("javascript:", "mailto:", "#", "tel:")):
                continue

            full_url = urljoin(url, href)
            if full_url in seen_urls:
                continue

            # 在父元素中查找日期
            date_str = self._find_date_near_element(a_tag)
            if date_str:
                seen_urls.add(full_url)
                results.append({
                    "title": title,
                    "url": full_url,
                    "date": self._parse_date(date_str),
                })

        # 去重并验证
        if len(results) >= self.MIN_ITEMS:
            return results

        # 方法B：如果方法A结果不足，尝试更宽松的匹配
        # 查找所有 <li> 中包含 <a> 的元素
        results_b = []
        seen_urls_b = set()
        for li in soup.find_all("li"):
            a_tag = li.find("a", href=True)
            if not a_tag:
                continue

            title = a_tag.get_text(strip=True)
            href = a_tag["href"]

            # 如果 <a> 文本过长（卡片式列表），优先从内部 heading 提取标题
            if len(title) > 200:
                heading = a_tag.find(["h2", "h3", "h4", "h5"])
                if heading:
                    title = heading.get_text(strip=True)
                else:
                    # 截取前200字符作为标题
                    title = title[:200]

            if not title or len(title) < 4 or href.startswith(("javascript:", "mailto:", "#")):
                continue

            full_url = urljoin(url, href)
            if full_url in seen_urls_b:
                continue

            # 在 li 的文本中查找日期
            li_text = li.get_text()
            date_match = self.DATE_REGEX.search(li_text)
            date_str = date_match.group(0) if date_match else None

            if date_str:
                seen_urls_b.add(full_url)
                results_b.append({
                    "title": title,
                    "url": full_url,
                    "date": self._parse_date(date_str),
                })

        if len(results_b) >= self.MIN_ITEMS:
            return results_b

        # 方法C：卡片式列表 - <a> 包裹整个条目（标题+日期+摘要）
        # 常见于现代CMS：<a href="..."><h2>标题</h2><span class="date">日期</span><p>摘要</p></a>
        results_c = []
        seen_urls_c = set()
        for a_tag in soup.find_all("a", href=True):
            href = a_tag["href"]
            if href.startswith(("javascript:", "mailto:", "#", "tel:")):
                continue

            # 在 <a> 内部查找标题元素（h2/h3/h4/h5）
            heading = a_tag.find(["h2", "h3", "h4", "h5"])
            if not heading:
                continue

            title = heading.get_text(strip=True)
            if not title or len(title) < 4 or len(title) > 200:
                continue

            full_url = urljoin(url, href)
            if full_url in seen_urls_c:
                continue

            # 在 <a> 内部查找日期
            date_str = None
            # 先查找专门的日期容器
            date_el = a_tag.find(class_=re.compile(r"date|time|wl-date", re.I))
            if date_el:
                date_match = self.DATE_REGEX.search(date_el.get_text())
                if date_match:
                    date_str = date_match.group(0)

            # 如果没找到日期容器，在整个 <a> 文本中搜索
            if not date_str:
                a_text = a_tag.get_text()
                date_match = self.DATE_REGEX.search(a_text)
                if date_match:
                    date_str = date_match.group(0)

            if date_str:
                seen_urls_c.add(full_url)
                results_c.append({
                    "title": title,
                    "url": full_url,
                    "date": self._parse_date(date_str),
                })

        if len(results_c) >= self.MIN_ITEMS:
            logger.debug(f"方法C（卡片式列表）匹配: {len(results_c)} 条")
            return results_c

        # 方法D：宽松模式 - <li> 中的 <a> 文本过长时，从内部 heading 提取标题
        results_d = []
        seen_urls_d = set()
        for li in soup.find_all("li"):
            a_tag = li.find("a", href=True)
            if not a_tag:
                continue

            href = a_tag["href"]
            if href.startswith(("javascript:", "mailto:", "#")):
                continue

            # 优先从 <a> 内部的 heading 提取标题
            heading = a_tag.find(["h2", "h3", "h4", "h5"])
            if heading:
                title = heading.get_text(strip=True)
            else:
                title = a_tag.get_text(strip=True)

            if not title or len(title) < 4 or len(title) > 200:
                continue

            full_url = urljoin(url, href)
            if full_url in seen_urls_d:
                continue

            # 在 li 或 a 的文本中查找日期
            li_text = li.get_text()
            date_match = self.DATE_REGEX.search(li_text)
            date_str = date_match.group(0) if date_match else None

            if date_str:
                seen_urls_d.add(full_url)
                results_d.append({
                    "title": title,
                    "url": full_url,
                    "date": self._parse_date(date_str),
                })

        if len(results_d) >= self.MIN_ITEMS:
            logger.debug(f"方法D（宽松heading模式）匹配: {len(results_d)} 条")
            return results_d

        # 方法E：无日期宽松模式 - 有些列表页确实没有日期，但有明确的列表结构
        # 只在有明确列表容器的情况下使用，避免误匹配导航链接
        results_e = []
        seen_urls_e = set()
        list_containers = soup.select(
            "ul.list, ul.news_list, .list_box ul, .news_box ul, "
            ".content_list ul, .article-list ul, .notice_list ul, "
            ".newlist1 ul, div.list ul, .main-list ul"
        )
        for container in list_containers:
            for li in container.find_all("li", recursive=False):
                a_tag = li.find("a", href=True)
                if not a_tag:
                    continue
                title = a_tag.get("title") or a_tag.get_text(strip=True)
                href = a_tag["href"]
                if not title or len(title) < 4 or len(title) > 200:
                    continue
                if href.startswith(("javascript:", "mailto:", "#")):
                    continue
                full_url = urljoin(url, href)
                if full_url in seen_urls_e:
                    continue
                seen_urls_e.add(full_url)
                results_e.append({
                    "title": title,
                    "url": full_url,
                    "date": None,
                })

        if len(results_e) >= 5:  # 无日期模式需要更多条目才算有效列表
            logger.debug(f"方法E（无日期宽松模式）匹配: {len(results_e)} 条")
            return results_e

        return []

    def _extract_card_date(self, container: Tag) -> str | None:
        """从卡片式列表的容器中提取日期，支持分离式日期格式。
        
        支持的格式：
        - 标准格式：2023-12-05
        - 分离式：<div class="d-d">05</div><div class="d-m">2023-12</div>
        - 年月日分离：<span class="year">2023</span><span class="month">12</span><span class="day">05</span>
        """
        # 先尝试标准日期
        text = container.get_text()
        match = self.DATE_REGEX.search(text)
        if match:
            return match.group(0)
        
        # 尝试分离式日期：年月 + 日
        month_el = container.find(class_=re.compile(r"d-m|month|news-m", re.I))
        day_el = container.find(class_=re.compile(r"d-d|day", re.I))
        if month_el and day_el:
            month_text = month_el.get_text(strip=True)  # 如 "2023-12"
            day_text = day_el.get_text(strip=True)      # 如 "05"
            # 尝试组合
            ym_match = re.search(r"(\d{4})[-./](\d{1,2})", month_text)
            if ym_match and day_text.isdigit():
                return f"{ym_match.group(1)}-{ym_match.group(2)}-{day_text}"
        
        # 尝试年+月+日分离
        year_el = container.find(class_=re.compile(r"year", re.I))
        if year_el and month_el and day_el:
            y = year_el.get_text(strip=True)
            m = month_el.get_text(strip=True)
            d = day_el.get_text(strip=True)
            if y.isdigit() and m.isdigit() and d.isdigit():
                return f"{y}-{m}-{d}"
        
        return None

    def _find_date_near_element(self, element: Tag) -> str | None:
        """在元素的父级（最多向上3级）和兄弟元素中查找日期字符串"""
        # 向上查找最多3级父元素
        current = element
        for _ in range(3):
            parent = current.parent
            if not parent or parent.name in ("body", "html", "[document]"):
                break

            # 检查父元素的直接子文本节点和子元素
            for child in parent.children:
                if child is current:
                    continue
                if hasattr(child, "get_text"):
                    text = child.get_text(strip=True)
                elif isinstance(child, str):
                    text = child.strip()
                else:
                    continue

                if text:
                    match = self.DATE_REGEX.search(text)
                    if match:
                        return match.group(0)

            # 检查前后兄弟元素
            for sibling in current.next_siblings:
                if hasattr(sibling, "get_text"):
                    text = sibling.get_text(strip=True)
                elif isinstance(sibling, str):
                    text = sibling.strip()
                else:
                    continue
                if text:
                    match = self.DATE_REGEX.search(text)
                    if match:
                        return match.group(0)
                    break

            for sibling in current.previous_siblings:
                if hasattr(sibling, "get_text"):
                    text = sibling.get_text(strip=True)
                elif isinstance(sibling, str):
                    text = sibling.strip()
                else:
                    continue
                if text:
                    match = self.DATE_REGEX.search(text)
                    if match:
                        return match.group(0)
                    break

            current = parent

        return None

    async def _try_llm_parse(self, html: str, url: str) -> list[dict]:
        """
        使用 LLM 解析通知列表页（兜底策略）。

        为控制成本，先精简 HTML：
        1. 移除 script, style, footer, header 等无关标签
        2. 只保留结构性标签
        3. 截断到前 3000 字符
        """
        try:
            from src.parser.content_extractor import simplify_html
            from src.llm.client import llm_client

            simplified = simplify_html(html, max_length=3000)
            results = await llm_client.parse_notice_list(simplified, url)

            if not results or not isinstance(results, list):
                return []

            # 规范化 LLM 返回的结果
            normalized = []
            for item in results:
                if not isinstance(item, dict):
                    continue
                title = item.get("title", "").strip()
                item_url = item.get("url", "").strip()
                date_str = item.get("date", "")

                if not title or not item_url:
                    continue

                # 处理相对路径
                if not item_url.startswith("http"):
                    item_url = urljoin(url, item_url)

                normalized.append({
                    "title": title,
                    "url": item_url,
                    "date": self._parse_date(str(date_str)) if date_str else None,
                })

            return normalized if len(normalized) >= self.MIN_ITEMS else []

        except Exception as e:
            logger.error(f"LLM 列表解析异常: {e}")
            return []

    def _validate_and_clean(self, items: list[dict], base_url: str) -> list[dict]:
        """
        验证和清理解析结果。

        - 去重（按URL）
        - 过滤无效URL
        - 过滤标题过短/过长的条目
        - 过滤导航链接（如"首页"、"上一页"等）
        """
        # 导航/分页链接关键词
        nav_keywords = {
            "首页", "上一页", "下一页", "末页", "尾页",
            "更多", "more", "返回", "back", "home",
            "第一页", "最后一页", "跳转",
            # 常见导航栏目名
            "学院简介", "学院概况", "师资队伍", "科学研究",
            "人才培养", "招生信息", "招生就业", "专业介绍",
            "本科生教育", "研究生教育", "博士后", "留学生",
            "党建工作", "学生工作", "院务公开", "联系我们",
            "学科建设", "实验室", "下载中心", "相关下载",
            "教学管理", "培养方案", "课程大纲", "专业设置",
        }

        seen_urls = set()
        cleaned = []
        base_domain = urlparse(base_url).netloc

        for item in items:
            title = item.get("title", "").strip()
            item_url = item.get("url", "").strip()

            # 过滤空值
            if not title or not item_url:
                continue

            # 过滤标题过短或过长
            if len(title) < 4 or len(title) > 300:
                continue

            # 过滤导航链接
            if title.lower() in nav_keywords or title in nav_keywords:
                continue

            # 过滤非HTTP链接
            if not item_url.startswith("http"):
                continue

            # URL去重
            if item_url in seen_urls:
                continue
            seen_urls.add(item_url)

            cleaned.append({
                "title": title,
                "url": item_url,
                "date": item.get("date"),
            })

        return cleaned

    def _parse_date(self, date_str: str) -> str | None:
        """解析日期字符串为 YYYY-MM-DD 格式"""
        if not date_str:
            return None

        for pattern in self.DATE_PATTERNS:
            match = re.search(pattern, date_str)
            if match:
                year, month, day = match.groups()
                try:
                    dt = datetime(int(year), int(month), int(day))
                    return dt.strftime("%Y-%m-%d")
                except ValueError:
                    continue

        return None

    def detect_pagination(self, html: str, current_url: str) -> list[str]:
        """
        检测列表页的分页链接，返回所有分页URL。

        支持的分页模式：
        1. 博达站群: list2.htm, list3.htm, ...
        2. 正方系统: ?page=2, ?page=3, ...
        3. 通用分页: /page/2, /page/3, ...
        4. 带页码参数: ?p=2, ?pageNum=2, ?pageIndex=2
        5. 数字分页链接: 1, 2, 3, ... 或 [1] [2] [3] ...

        Args:
            html: 当前页面 HTML
            current_url: 当前页面 URL

        Returns:
            所有分页 URL 列表（不含当前页，按页码顺序排列）
        """
        soup = BeautifulSoup(html, "lxml")
        page_urls = []
        seen = set()

        # 方法1: 查找分页容器中的链接
        pagination_selectors = [
            ".pagination", ".page", ".pager", ".pages", ".page-bar",
            ".page_bar", ".fanye", ".fy", "#page", "#pagination",
            ".page_div", ".page-list", ".page_list", ".wp_paging",
            "div[class*='page']", "div[id*='page']",
        ]

        pagination_container = None
        for sel in pagination_selectors:
            pagination_container = soup.select_one(sel)
            if pagination_container:
                break

        # 如果没找到分页容器，尝试在页面底部查找分页链接
        if not pagination_container:
            # 查找包含"下一页"/"末页"等文本的区域
            for text_pattern in ["下一页", "末页", "尾页", "Next", "Last"]:
                el = soup.find("a", string=re.compile(text_pattern))
                if el and el.parent:
                    pagination_container = el.parent
                    break

        if pagination_container:
            for a_tag in pagination_container.find_all("a", href=True):
                href = a_tag["href"]
                if href.startswith(("javascript:", "#", "mailto:")):
                    continue
                full_url = urljoin(current_url, href)
                text = a_tag.get_text(strip=True)

                # 排除"首页"、"上一页"等
                if text in ("首页", "上一页", "前一页", "Previous", "Prev", "First"):
                    continue

                if full_url != current_url and full_url not in seen:
                    seen.add(full_url)
                    page_urls.append(full_url)

        # 方法2: 基于URL模式推断分页（博达站群 list.htm → list2.htm, list3.htm ...）
        if not page_urls:
            page_urls = self._infer_pagination_urls(current_url, html)

        return page_urls

    def _infer_pagination_urls(self, current_url: str, html: str) -> list[str]:
        """
        基于URL模式推断分页URL。

        博达站群常见模式：
        - /list.htm → /list2.htm, /list3.htm, ...
        - /list1.htm → /list2.htm, /list3.htm, ...

        Args:
            current_url: 当前页面URL
            html: 当前页面HTML

        Returns:
            推断出的分页URL列表
        """
        page_urls = []

        # 博达站群模式: list.htm → list{n}.htm
        boda_match = re.match(r"(.*/)(list\d*)(\.htm.*)$", current_url)
        if boda_match:
            base = boda_match.group(1)
            suffix = boda_match.group(3)

            # 从HTML中查找总页数
            soup = BeautifulSoup(html, "lxml")
            total_pages = self._detect_total_pages(soup)

            if total_pages and total_pages > 1:
                for i in range(2, min(total_pages + 1, 11)):  # 最多爬10页
                    page_url = f"{base}list{i}{suffix}"
                    page_urls.append(page_url)
            else:
                # 无法确定总页数，尝试前5页
                for i in range(2, 6):
                    page_url = f"{base}list{i}{suffix}"
                    page_urls.append(page_url)

        return page_urls

    def _detect_total_pages(self, soup: BeautifulSoup) -> int | None:
        """
        从页面中检测总页数。

        常见模式：
        - "共X页" / "共 X 页"
        - "1/X" 格式
        - 分页链接中的最大数字

        Args:
            soup: BeautifulSoup 对象

        Returns:
            总页数，无法确定返回 None
        """
        page_text = soup.get_text()

        # 模式1: "共X页"
        match = re.search(r"共\s*(\d+)\s*页", page_text)
        if match:
            return int(match.group(1))

        # 模式2: "1/X" 或 "第1页/共X页"
        match = re.search(r"1\s*/\s*(\d+)", page_text)
        if match:
            return int(match.group(1))

        # 模式3: 分页容器中的最大数字链接
        pagination_selectors = [
            ".pagination", ".page", ".pager", ".pages",
            ".page_bar", ".fanye", "#page",
        ]
        for sel in pagination_selectors:
            container = soup.select_one(sel)
            if container:
                max_page = 0
                for a_tag in container.find_all("a"):
                    text = a_tag.get_text(strip=True)
                    if text.isdigit():
                        max_page = max(max_page, int(text))
                if max_page > 1:
                    return max_page

        return None


# 全局解析器实例
notice_list_parser = NoticeListParser()
