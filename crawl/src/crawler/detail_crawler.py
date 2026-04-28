"""详情页爬虫 - 爬取通知详情页并提取结构化信息"""

from __future__ import annotations

import re
from datetime import datetime, date
from typing import Optional

from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.notice import AdmissionNotice
from src.utils.http_client import http_client
from src.parser.content_extractor import extract_content_with_images
from src.storage.snapshot import save_snapshot
from src.processor.rule_filter import relevance_score, infer_program_type
from src.llm.client import llm_client


async def process_notice(
    item: dict,
    session: AsyncSession,
    university_id: int,
    department_id: Optional[int] = None,
    source_id: Optional[int] = None,
) -> Optional[AdmissionNotice]:
    """
    处理单条通知：爬取详情页 → 分类 → 提取 → 入库。

    流程：
    1. 请求详情页HTML
    2. 提取正文内容
    3. LLM分类（中等置信度需要确认，高置信度跳过）
    4. LLM结构化提取
    5. 保存HTML快照
    6. 数据校验
    7. 入库

    Args:
        item: 通知条目 {"title": ..., "url": ..., "date": ..., "relevance_score": ...}
        session: 数据库会话
        university_id: 高校 ID
        department_id: 学院 ID（可选）
        source_id: 信息源 ID（可选）

    Returns:
        入库的通知对象，失败返回 None
    """
    title = item.get("title", "")
    url = item.get("url", "")
    score = item.get("relevance_score", 0)

    logger.info(f"处理通知: [{score:.2f}] {title}")

    try:
        # 0. 快速跳过旧通知（2020年之前的通知大概率不是当前有效的推免信息）
        notice_date = item.get("date", "")
        if notice_date:
            try:
                year = int(notice_date[:4])
                if year < 2023:
                    logger.debug(f"跳过旧通知({year}年): {title}")
                    return None
            except (ValueError, IndexError):
                pass

        # 1. 请求详情页（支持反爬降级）
        detail_html = await _fetch_with_fallback(url)
        if not detail_html:
            logger.warning(f"详情页请求失败: {url}")
            return None

        # 2. 提取正文和图片
        content, images = extract_content_with_images(detail_html, url)

        # 2.5 内容质量检查（图片多的通知文字可以少一些）
        content_len = len(content) if content else 0
        has_images = len(images) >= 1
        chinese_words = re.findall(r"[\u4e00-\u9fa5]+", content or "")
        useful_len = sum(len(w) for w in chinese_words if len(w) > 3)

        if content_len < 50 and not has_images:
            logger.warning(f"正文过短且无图片({content_len}字): {url}")
            return None
        if useful_len < 80 and not has_images:
            logger.warning(f"有效内容不足且无图片({useful_len}字有效中文): {title}")
            return None
        if useful_len < 20 and not has_images:
            logger.warning(f"正文几乎为空({useful_len}字): {title}")
            return None

        # 2.6 导航菜单检测（有图片时跳过此检查）
        if not has_images and content:
            lines = [l.strip() for l in content.split("\n") if l.strip()]
            if len(lines) >= 5:
                short_count = sum(1 for l in lines[:15] if len(l) <= 10 and not re.search(r"\d{4}", l))
                has_sentence = any(len(l) > 20 and re.search(r"[，。、；]", l) for l in lines[:15])
                if short_count >= 10 and not has_sentence:
                    logger.warning(f"正文疑似导航菜单，拒绝入库: {title}")
                    return None

            # 2.7 无标点菜单拼接检测
            first_200 = content[:200]
            cn_in_200 = len(re.findall(r"[\u4e00-\u9fa5]", first_200))
            has_punct_200 = bool(re.search(r"[，。、；：！？,.;:!?（）\(\)]", first_200))
            if cn_in_200 > 30 and not has_punct_200:
                logger.warning(f"正文无标点(疑似菜单拼接)，拒绝入库: {title}")
                return None

        # 3. LLM 分类（只有包含强相关关键词的高置信度通知才跳过分类）
        # 检查标题是否包含推免相关的强关键词
        import re as _re
        has_strong_keyword = bool(_re.search(
            r"推免|推荐免试|夏令营|预推免|直博|硕博连读|招生简章|招生目录|复试.*名单|拟录取",
            title,
        ))
        skip_classify = score >= 0.5 and has_strong_keyword
        if not skip_classify:
            is_relevant = await llm_client.classify(title, content)
            if not is_relevant:
                logger.info(f"LLM 判定不相关，跳过: {title}")
                return None

        # 4. LLM 结构化提取
        extracted = await llm_client.extract(content)
        if not extracted:
            logger.warning(f"LLM 提取失败: {title}")
            return None

        # 5. 保存 HTML 快照
        snapshot_path = save_snapshot(detail_html, url)

        # 6. 数据校验与补全
        extracted = _validate_and_fix(extracted, title, item.get("date"))

        # 7. 计算置信度
        confidence = _calculate_confidence(extracted, score)

        # 8. 推断 program_type（纠正 LLM 的"其他"分类）
        final_program_type = infer_program_type(
            title, extracted.get("program_type")
        )

        # 9. 尝试从标题补全缺失的 publish_date
        publish_date = _parse_date(item.get("date"))
        if not publish_date:
            publish_date = _extract_date_from_title(title)

        # 10. 构建通知对象
        notice = AdmissionNotice(
            university_id=university_id,
            department_id=department_id,
            source_id=source_id,
            title=_clean_title(title),
            source_url=url,
            publish_date=publish_date,
            program_type=final_program_type,
            year=_parse_int(extracted.get("year")),
            target_degree=extracted.get("target_degree"),
            disciplines=extracted.get("disciplines"),
            quota=extracted.get("quota"),
            requirements=extracted.get("requirements"),
            registration_start=_parse_date(extracted.get("registration_start")),
            registration_end=_parse_date(extracted.get("registration_end")),
            camp_start=_parse_date(extracted.get("camp_start")),
            camp_end=_parse_date(extracted.get("camp_end")),
            registration_url=extracted.get("registration_url"),
            contact=extracted.get("contact"),
            summary=extracted.get("summary"),
            raw_content=content[:10000],
            images=images[:20] if images else None,
            raw_html_path=snapshot_path,
            llm_model="Qwen/Qwen2.5-32B-Instruct",
            llm_confidence=confidence,
            relevance_score=score,
            status="pending" if confidence < 0.7 else "published",
        )

        session.add(notice)
        # flush入库（带重试，处理database is locked）
        for attempt in range(3):
            try:
                await session.flush()
                break
            except Exception as flush_err:
                if attempt < 2:
                    logger.warning(f"入库flush重试({attempt+1}/3): {title} - {flush_err}")
                    try:
                        session.expunge(notice)
                    except Exception:
                        pass
                    import asyncio as _asyncio
                    await _asyncio.sleep(1)
                    session.add(notice)
                else:
                    logger.error(f"入库flush最终失败: {title} - {flush_err}")
                    try:
                        session.expunge(notice)
                    except Exception:
                        pass
                    return None

        logger.info(
            f"✅ 通知入库: {title} (ID={notice.id}, "
            f"type={notice.program_type}, confidence={confidence:.2f})"
        )
        return notice

    except Exception as e:
        logger.error(f"处理通知异常: {title} - {e}")
        return None


def _validate_and_fix(extracted: dict, title: str, list_date: str | None) -> dict:
    """
    校验和补全LLM提取的数据。

    - 校验日期格式
    - 补全缺失的年份
    - 校验program_type枚举值
    - 校验target_degree枚举值
    """
    # 校验 program_type
    valid_types = {"夏令营", "预推免", "直博", "硕博连读", "招生简章", "入营名单", "拟录取", "招生宣讲", "其他"}
    if extracted.get("program_type") not in valid_types:
        # 尝试从标题推断
        if "夏令营" in title:
            extracted["program_type"] = "夏令营"
        elif "预推免" in title or "推免" in title or "推荐免试" in title:
            extracted["program_type"] = "预推免"
        elif "直博" in title:
            extracted["program_type"] = "直博"
        elif "硕博连读" in title:
            extracted["program_type"] = "硕博连读"
        else:
            extracted["program_type"] = "其他"

    # 校验 target_degree
    valid_degrees = {"硕士", "博士", "硕博"}
    if extracted.get("target_degree") not in valid_degrees:
        # 尝试从标题推断
        if "博士" in title and "硕士" in title:
            extracted["target_degree"] = "硕博"
        elif "博士" in title or "直博" in title:
            extracted["target_degree"] = "博士"
        elif "硕士" in title:
            extracted["target_degree"] = "硕士"
        else:
            extracted["target_degree"] = "硕博"  # 默认

    # 补全年份
    if not extracted.get("year"):
        import re
        # 从标题中提取年份
        year_match = re.search(r"(20\d{2})", title)
        if year_match:
            extracted["year"] = int(year_match.group(1))
        elif list_date:
            # 从列表页日期推断
            try:
                extracted["year"] = int(list_date[:4])
            except (ValueError, TypeError):
                extracted["year"] = datetime.now().year

    # 校验日期格式
    for date_field in ["registration_start", "registration_end", "camp_start", "camp_end"]:
        val = extracted.get(date_field)
        if val and not _parse_date(val):
            extracted[date_field] = None  # 无效日期置空

    # 确保 disciplines 是列表
    if extracted.get("disciplines") and not isinstance(extracted["disciplines"], list):
        extracted["disciplines"] = [str(extracted["disciplines"])]
    # disciplines 如果是 "null" 字符串，置空
    if extracted.get("disciplines") == "null" or extracted.get("disciplines") == ["null"]:
        extracted["disciplines"] = None

    # 确保 contact 是字符串（LLM 可能返回列表）
    contact = extracted.get("contact")
    if isinstance(contact, list):
        extracted["contact"] = ", ".join(str(c) for c in contact)
    elif contact and not isinstance(contact, str):
        extracted["contact"] = str(contact)

    # 确保 requirements 是字符串
    req = extracted.get("requirements")
    if isinstance(req, list):
        extracted["requirements"] = "; ".join(str(r) for r in req)
    elif req and not isinstance(req, str):
        extracted["requirements"] = str(req)

    # 确保 quota 是字符串
    quota = extracted.get("quota")
    if quota and not isinstance(quota, str):
        extracted["quota"] = str(quota)

    return extracted


def _calculate_confidence(extracted: dict, relevance_score: float) -> float:
    """
    计算LLM提取结果的置信度。

    评分维度：
    - 关键字段完整性（program_type, year, summary）
    - 日期字段完整性
    - 规则过滤器的相关性评分
    """
    score = 0.0
    total_weight = 0.0

    # 关键字段（权重高）
    key_fields = [
        ("program_type", 0.2),
        ("year", 0.15),
        ("summary", 0.15),
        ("target_degree", 0.1),
    ]
    for field, weight in key_fields:
        total_weight += weight
        if extracted.get(field):
            score += weight

    # 日期字段（权重中）
    date_fields = [
        ("registration_start", 0.1),
        ("registration_end", 0.1),
    ]
    for field, weight in date_fields:
        total_weight += weight
        if extracted.get(field):
            score += weight

    # 其他字段（权重低）
    optional_fields = [
        ("disciplines", 0.05),
        ("contact", 0.05),
        ("requirements", 0.05),
    ]
    for field, weight in optional_fields:
        total_weight += weight
        if extracted.get(field):
            score += weight

    # 规则过滤器评分的贡献（0.05权重）
    total_weight += 0.05
    score += min(relevance_score, 1.0) * 0.05

    return round(score / total_weight, 2) if total_weight > 0 else 0.0


def _parse_date(date_str: Optional[str]) -> Optional[date]:
    """安全解析日期字符串"""
    if not date_str:
        return None
    try:
        if isinstance(date_str, date) and not isinstance(date_str, datetime):
            return date_str
        if isinstance(date_str, datetime):
            return date_str.date()
        return datetime.strptime(str(date_str)[:10], "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None


def _parse_int(value) -> Optional[int]:
    """安全解析整数"""
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def _clean_title(title: str) -> str:
    """清洗标题：移除前缀日期和其他噪音"""
    # Remove newlines/tabs first
    title = re.sub(r"[\n\r\t]+", " ", title)
    title = re.sub(r"\s{2,}", " ", title)
    # "18:27:09国防科技大学..." → 移除时间戳前缀
    title = re.sub(r"^\d{2}:\d{2}:\d{2}", "", title)
    # Remove leading bullets/dots
    title = re.sub(r"^[·•▪►◆※►]+\s*", "", title)
    # "12-16吉林大学..." or "09-112024清华大学..." → 移除前缀
    title = re.sub(r"^\d{2}-\d{2,6}", "", title)
    # "132026.03清华大学..." → "清华大学..."
    title = re.sub(r"^\d{1,4}(\d{4})[./]\d{1,2}", "", title)
    # "162025-06标题" → "标题"
    title = re.sub(r"^\d{1,3}(\d{4})[-./](\d{1,2})", r"\1-\2", title)
    # 标准日期前缀
    title = re.sub(r"^\d{4}[-./]\d{1,2}[-./]\d{1,2}\s*", "", title)
    title = re.sub(r"^\d{4}[-./]\d{1,2}\s*", "", title)
    title = re.sub(r"^\d{4}年\d{1,2}月\d{1,2}日?\s*", "", title)
    return title.strip()


def _extract_date_from_title(title: str) -> Optional[date]:
    """从标题中提取日期（用于补全缺失的 publish_date）"""
    patterns = [
        (r"^(\d{4})-(\d{1,2})-(\d{1,2})", None),
        (r"^(\d{4})\.(\d{1,2})\.(\d{1,2})", None),
        (r"^(\d{4})/(\d{1,2})/(\d{1,2})", None),
        (r"^(\d{4})年(\d{1,2})月(\d{1,2})日?", None),
    ]
    for pattern, _ in patterns:
        m = re.match(pattern, title.strip())
        if m:
            try:
                return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
            except (ValueError, TypeError):
                continue
    return None


async def _fetch_with_fallback(url: str) -> Optional[str]:
    """
    请求详情页，支持反爬降级。

    降级策略：
    0. 微信文章直接用 Playwright（httpx 会被反爬拦截）
    1. 先用 httpx 请求
    2. 如果返回 202/412（疑似反爬），尝试 Playwright 渲染
    3. 如果 Playwright 也失败，返回 None

    Args:
        url: 详情页 URL

    Returns:
        HTML 内容，失败返回 None
    """
    # 0. 微信文章直接用 Playwright（httpx 会被微信反爬拦截）
    if "mp.weixin.qq.com" in url:
        logger.info(f"微信文章，直接使用 Playwright: {url}")
        return await _fetch_with_playwright(url, wait_time=8000)

    # 1. 先用 httpx 请求
    result = await http_client.fetch(url, return_status=True)
    if isinstance(result, tuple):
        html, status = result
    else:
        html, status = result, 200

    if html and status == 200:
        return html

    # 2. 检测反爬拦截（202/412）
    if status in (202, 412):
        logger.info(f"疑似反爬拦截({status})，尝试 Playwright 降级: {url}")
        return await _fetch_with_playwright(url)

    # 3. 其他失败情况
    if not html:
        logger.debug(f"httpx 请求失败(status={status})，尝试 Playwright 降级: {url}")
        return await _fetch_with_playwright(url)

    return html


async def _fetch_with_playwright(url: str, wait_time: int = 3000) -> Optional[str]:
    """
    使用 Playwright 渲染页面获取 HTML。

    用于处理：
    1. JS动态渲染的页面
    2. 反爬系统拦截（瑞数等）
    3. 需要浏览器环境的页面

    Args:
        url: 页面 URL
        wait_time: 页面加载后的额外等待时间（毫秒），反爬页面建议设置更长

    Returns:
        渲染后的 HTML，失败返回 None
    """
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        logger.debug("Playwright 未安装，跳过浏览器渲染降级")
        return None

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                viewport={"width": 1920, "height": 1080},
                locale="zh-CN",
            )
            page = await context.new_page()
            page.set_default_timeout(30000)

            try:
                await page.goto(url, wait_until="networkidle", timeout=20000)
            except Exception:
                try:
                    await page.goto(url, wait_until="load", timeout=15000)
                except Exception:
                    pass

            await page.wait_for_timeout(wait_time)

            # Wait for common content selectors (SPA may need time)
            for sel in ["ul.news_list li a", ".list_item a", "article a", ".news-list li a",
                         "table.list a", ".article-list a", ".notice-list a", "li a[href]"]:
                try:
                    await page.wait_for_selector(sel, timeout=3000)
                    break
                except Exception:
                    continue

            # Scroll down to trigger lazy loading
            try:
                await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                await page.wait_for_timeout(1000)
            except Exception:
                pass

            html = await page.content()
            await browser.close()

            if html and len(html) > 500:
                logger.info(f"Playwright 渲染成功: {url} ({len(html)} chars)")
                return html
            else:
                logger.warning(f"Playwright 渲染内容过短: {url}")
                return None

    except Exception as e:
        logger.warning(f"Playwright 渲染失败: {url} - {e}")
        return None
