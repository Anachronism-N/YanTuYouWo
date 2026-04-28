"""导师相关 Pydantic 模型 — 对齐前端 TypeScript 类型"""

from __future__ import annotations

from typing import Any
from pydantic import BaseModel


class TutorItem(BaseModel):
    """导师列表项 — 对齐前端 TutorItem"""
    id: int
    name: str
    university_name: str
    department_name: str
    school_level: str
    title: str
    research_areas: list[str] = []
    homepage_url: str | None = None
    email: str | None = None
    avatar_url: str | None = None
    province: str
    city: str
    discipline: str
    is_recruiting: bool = True
    recruiting_info: str | None = None
    paper_count: int = 0
    project_count: int = 0
    view_count: int = 0
    # 分级渲染字段
    crawl_tier: str = "tier3"
    profile_completeness: int = 0
    h_index: int | None = None
    i10_index: int | None = None
    citation_count: int | None = None


class TutorDetail(TutorItem):
    """导师详情 — 对齐前端 TutorDetail

    `education` / `experience` / `publications` / `projects` 支持两种形式：
    - 字符串数组（Mock / 简单场景）
    - 对象数组（爬取产出：`{year, degree, school, major}` 等）
    前端自行兼容渲染。
    """
    biography: str = ""
    education: list[Any] = []
    experience: list[Any] = []
    publications: list[Any] = []
    projects: list[Any] = []
    awards: list[str] = []
    recent_papers: list[Any] = []
    # AMiner 级深度数据
    papers: list[Any] = []
    coauthors: list[Any] = []
    topics: list[Any] = []
    yearly_stats: list[Any] = []
    recruiting_requirements: str | None = None
    phone: str | None = None
    office_address: str | None = None
    source_url: str = ""
    crawl_source: str | None = None
    external_ids: dict | None = None
    last_crawled_at: str | None = None
    created_at: str = ""


class TutorListResponse(BaseModel):
    """导师列表响应"""
    total: int
    items: list[TutorItem]
