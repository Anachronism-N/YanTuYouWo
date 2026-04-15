"""导师相关 Pydantic 模型 — 对齐前端 TypeScript 类型"""

from __future__ import annotations

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


class TutorDetail(TutorItem):
    """导师详情 — 对齐前端 TutorDetail"""
    biography: str = ""
    education: list[str] = []
    experience: list[str] = []
    publications: list[str] = []
    projects: list[str] = []
    awards: list[str] = []
    recruiting_requirements: str | None = None
    phone: str | None = None
    office_address: str | None = None
    source_url: str = ""
    created_at: str = ""


class TutorListResponse(BaseModel):
    """导师列表响应"""
    total: int
    items: list[TutorItem]
