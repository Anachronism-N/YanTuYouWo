"""
导师个人主页 LLM 结构化提取器 — 阶段 B2 核心模块

输入：教师个人主页 URL
输出：Tier 1 完整画像（biography / education / experience / publications / projects / awards / recruiting_*）

策略：
  1. 抓取 HTML（含反爬降级）
  2. 抽取主内容（剥离导航/页脚/脚本）
  3. 调用 LLM 结构化提取（JSON Mode + 三级容错）
  4. 字段校验 + 完整度评分
"""

from __future__ import annotations

import asyncio
import json
import re
from typing import Any

from bs4 import BeautifulSoup
from loguru import logger
from openai import AsyncOpenAI

from src.config import settings
from src.utils.http_client import http_client
from src.discovery.anti_crawl_fallback import detect_anti_crawl
from src.parser.content_extractor import extract_content


# ============================================================
# Prompt 模板
# ============================================================

_EXTRACT_PROMPT = """你是学术信息结构化提取助手。以下是 {university} {department} {name} 教授的个人主页正文（已清洗）。

请提取并返回 JSON 格式（未提及的字段填 null 或空数组）：

{{
  "title": "职称（教授/副教授/讲师/特聘教授/研究员等，按页面实际描述）",
  "research_areas": ["研究方向1", "研究方向2"],
  "email": "邮箱（如 user@university.edu.cn，无则 null）",
  "phone": "电话（如 +86-10-xxxxxxxx，无则 null）",
  "office_address": "办公室地址（如有），无则 null",
  "biography": "100-300 字的个人简介摘要（中文），不要复制原文长段，提炼核心",
  "education": [
    {{"year": "2005-2010", "degree": "博士", "school": "清华大学", "major": "计算机科学"}}
  ],
  "experience": [
    {{"year": "2015-至今", "title": "教授", "organization": "北京大学计算机学院"}}
  ],
  "publications": [
    {{"title": "论文标题", "venue": "CVPR 2024", "authors": "作者列表（可只列前 3 + et al）", "year": 2024}}
  ],
  "projects": [
    {{"title": "项目名", "funder": "国家自然科学基金", "role": "主持", "year": "2022-2025"}}
  ],
  "awards": ["奖项 1（含年份）", "奖项 2"],
  "recruiting_info": "招生方向描述（自由文本，无明确表述时为 null）",
  "recruiting_requirements": "招生要求/对学生的具体要求（如 GPA、英语水平等），无则 null",
  "is_recruiting": true
}}

要求：
1. **不要编造**：原文中没有的信息一律填 null/空数组
2. **publications 最多 10 篇代表作**，按重要性/年份倒序
3. **research_areas 必须是 2-15 字的研究领域名词**，不要句子片段
4. **biography 必须是单段中文文本**，不要列表、不要分行
5. **如果原文是英文**，biography 用中文翻译概括
6. **education / experience / projects 数组项最多 8 个**

主页正文：
{content}

请直接输出 JSON，不要解释。
"""


# ============================================================
# HTML → 主内容抽取
# ============================================================

def _extract_profile_text(html: str, base_url: str = "") -> str:
    """从教师主页 HTML 中抽取适合喂给 LLM 的文本。

    策略：
      1. 复用 `parser.content_extractor.extract_content`（已有的正文提取器）
      2. 兜底：去掉 script/style/nav/footer 后取整页文本
      3. 截断到 6000 字符（控制 token 用量）
    """
    if not html:
        return ""
    try:
        text = extract_content(html, base_url=base_url)
        if text and len(text) > 200:
            return text[:6000]
    except Exception as e:
        logger.debug(f"主内容抽取失败，回退原始: {e}")

    # 兜底
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "nav", "header", "footer", "noscript"]):
        tag.decompose()
    text = soup.get_text(" ", strip=True)
    return text[:6000]


# ============================================================
# LLM 调用
# ============================================================

class _ProfileLLM:
    """轻量 LLM 客户端封装（不复用通用 client.py 是因为我们要自己管理 prompt）"""

    def __init__(self):
        self._client: AsyncOpenAI | None = None

    def _get(self) -> AsyncOpenAI:
        if self._client is None:
            self._client = AsyncOpenAI(
                api_key=settings.SILICONFLOW_API_KEY,
                base_url=settings.SILICONFLOW_BASE_URL,
            )
        return self._client

    async def extract(
        self,
        prompt: str,
        *,
        max_tokens: int = 3000,
        retries: int = 2,
    ) -> str | None:
        client = self._get()
        # extract 任务用更大模型
        model = (
            settings.llm_models.get("extract", {}).get("model")
            or "Qwen/Qwen2.5-32B-Instruct"
        )
        for attempt in range(retries + 1):
            try:
                resp = await asyncio.wait_for(
                    client.chat.completions.create(
                        model=model,
                        messages=[{"role": "user", "content": prompt}],
                        max_tokens=max_tokens,
                        temperature=0.1,
                    ),
                    timeout=90.0,
                )
                return resp.choices[0].message.content
            except asyncio.TimeoutError:
                logger.warning(f"LLM extract 超时 (尝试 {attempt + 1}/{retries + 1})")
                if attempt < retries:
                    await asyncio.sleep(2 ** attempt)
            except Exception as e:
                logger.warning(f"LLM extract 失败 (尝试 {attempt + 1}): {e}")
                if attempt < retries:
                    await asyncio.sleep(2 ** attempt)
        return None


_llm = _ProfileLLM()


def _parse_json_safe(text: str) -> dict | None:
    """三级容错 JSON 解析"""
    if not text:
        return None
    text = text.strip()
    # 直接解析
    try:
        return json.loads(text)
    except Exception:
        pass
    # 去 code fence
    cleaned = re.sub(r"^```(?:json)?\s*", "", text)
    cleaned = re.sub(r"\s*```\s*$", "", cleaned)
    try:
        return json.loads(cleaned)
    except Exception:
        pass
    # 提取首个 { ... }
    m = re.search(r"\{.*\}", text, re.S)
    if m:
        try:
            return json.loads(m.group(0))
        except Exception:
            pass
    return None


# ============================================================
# 字段校验
# ============================================================

_VALID_TITLES = {
    "教授", "副教授", "讲师", "助理教授", "特聘教授", "讲座教授",
    "研究员", "副研究员", "助理研究员", "高级工程师", "工程师",
    "院士", "博士生导师", "硕士生导师",
    "Professor", "Associate Professor", "Assistant Professor", "Lecturer",
}


def _validate_extracted(data: dict) -> dict:
    """对 LLM 提取结果做基础校验和清洗"""
    if not isinstance(data, dict):
        return {}

    cleaned: dict = {}

    # 标题
    if data.get("title") and isinstance(data["title"], str):
        t = data["title"].strip()
        if 2 <= len(t) <= 50:
            cleaned["title"] = t

    # research_areas
    areas = data.get("research_areas") or []
    if isinstance(areas, list):
        cleaned_areas: list[str] = []
        for a in areas:
            if isinstance(a, str):
                a = a.strip().rstrip("。.；;,")
                if 2 <= len(a) <= 30 and not re.search(r"@|\d{6,}", a):
                    cleaned_areas.append(a)
        cleaned["research_areas"] = cleaned_areas[:10]

    # 简介
    bio = data.get("biography")
    if isinstance(bio, str):
        bio = bio.strip()
        if len(bio) >= 30:
            cleaned["biography"] = bio[:1000]

    # 邮箱 / 电话 / 办公室
    for k in ("email", "phone", "office_address"):
        v = data.get(k)
        if isinstance(v, str) and v.strip() and v.lower() not in ("null", "none", "n/a"):
            cleaned[k] = v.strip()[:200]

    # education / experience / publications / projects
    for k, max_items in [
        ("education", 8),
        ("experience", 8),
        ("publications", 12),
        ("projects", 10),
    ]:
        items = data.get(k)
        if isinstance(items, list):
            valid = [it for it in items if isinstance(it, (dict, str)) and it]
            cleaned[k] = valid[:max_items]

    # 获奖
    awards = data.get("awards")
    if isinstance(awards, list):
        cleaned["awards"] = [
            a.strip() for a in awards
            if isinstance(a, str) and 3 <= len(a.strip()) <= 200
        ][:15]

    # 招生
    for k in ("recruiting_info", "recruiting_requirements"):
        v = data.get(k)
        if isinstance(v, str) and v.strip() and v.lower() not in ("null", "none", "n/a"):
            cleaned[k] = v.strip()[:1000]

    # is_recruiting
    if isinstance(data.get("is_recruiting"), bool):
        cleaned["is_recruiting"] = data["is_recruiting"]

    return cleaned


# ============================================================
# 完整度评分
# ============================================================

def score_tier1_completeness(data: dict) -> int:
    """Tier 1 完整度评分（0-100）"""
    score = 0
    if data.get("biography"):
        score += 20
    if data.get("research_areas"):
        score += 15
    if data.get("email"):
        score += 5
    if data.get("education"):
        score += 10
    if data.get("experience"):
        score += 10
    if data.get("publications"):
        score += 20
    if data.get("projects"):
        score += 8
    if data.get("awards"):
        score += 5
    if data.get("recruiting_info") or data.get("recruiting_requirements"):
        score += 7
    return min(score, 100)


# ============================================================
# 主入口
# ============================================================

async def extract_profile(
    homepage_url: str,
    *,
    name: str,
    university: str = "",
    department: str = "",
) -> dict:
    """
    抓取教师主页并 LLM 结构化提取。

    Returns: {
        "status": "ok" / "fetch_failed" / "no_content" / "llm_failed" / "invalid",
        "data": {...},                # 提取结果（cleaned）
        "completeness": 0-100,
        "raw_text_length": int,
        "raw_response": str | None,   # LLM 原始返回
    }
    """
    # Step 1: 抓 HTML
    html = await http_client.fetch(homepage_url, retry=1)
    if not html or detect_anti_crawl(html):
        # Playwright 降级
        try:
            from playwright.async_api import async_playwright
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()
                try:
                    await page.goto(homepage_url, timeout=20000, wait_until="domcontentloaded")
                    await page.wait_for_timeout(2500)
                    html = await page.content()
                finally:
                    await browser.close()
            if html and detect_anti_crawl(html):
                html = None
        except Exception as e:
            logger.debug(f"Playwright 降级失败 {homepage_url}: {e}")
            html = None

    if not html:
        return {
            "status": "fetch_failed",
            "data": {},
            "completeness": 0,
            "raw_text_length": 0,
            "raw_response": None,
        }

    # Step 2: 抽主内容
    text = _extract_profile_text(html, base_url=homepage_url)
    if len(text) < 200:
        return {
            "status": "no_content",
            "data": {},
            "completeness": 0,
            "raw_text_length": len(text),
            "raw_response": None,
        }

    # Step 3: LLM 提取
    prompt = _EXTRACT_PROMPT.format(
        name=name or "该教师",
        university=university or "",
        department=department or "",
        content=text,
    )
    raw = await _llm.extract(prompt)
    if not raw:
        return {
            "status": "llm_failed",
            "data": {},
            "completeness": 0,
            "raw_text_length": len(text),
            "raw_response": None,
        }

    parsed = _parse_json_safe(raw)
    if not parsed:
        logger.warning(f"LLM 返回非 JSON 格式 {homepage_url}: {raw[:200]}")
        return {
            "status": "invalid",
            "data": {},
            "completeness": 0,
            "raw_text_length": len(text),
            "raw_response": raw[:500] if raw else None,
        }

    cleaned = _validate_extracted(parsed)
    completeness = score_tier1_completeness(cleaned)

    return {
        "status": "ok",
        "data": cleaned,
        "completeness": completeness,
        "raw_text_length": len(text),
        "raw_response": None,
    }
