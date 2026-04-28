"""导师爬取模块

三阶段：
  A. `faculty_locator` — 为每个学院定位师资名录页 URL（产出 `FacultyPageSource`）
  B1. `faculty_list_parser` — 解析师资页，抽出 Tier 2 卡片（姓名 / 职称 / 主页）
  B2. `profile_extractor` — LLM 结构化提取 Tier 1 完整画像
  C. `enrichers/*` — OpenAlex / AMiner 等外部数据源补充指标
"""

from __future__ import annotations

from src.tutor.faculty_locator import locate_faculty_pages, validate_faculty_page

__all__ = ["locate_faculty_pages", "validate_faculty_page"]
