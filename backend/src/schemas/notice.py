"""通知相关 Pydantic 模型 — 对齐前端 TypeScript 类型"""

from __future__ import annotations

from datetime import date
from typing import Optional, List, Dict
from pydantic import BaseModel


class NoticeItem(BaseModel):
    """通知列表项 — 对齐前端 NoticeItem"""
    id: int
    title: str
    university_name: str
    department_name: str
    school_level: str
    program_type: str
    program_type_key: str
    target_degree: str
    disciplines: list[str]
    quota: str | None = None
    registration_start: str | None = None
    registration_end: str | None = None
    camp_start: str | None = None
    camp_end: str | None = None
    publish_date: str
    status: str
    summary: str
    province: str
    city: str | None = None
    tags: list[str] = []
    view_count: int = 0
    intent_count: int = 0
    application_rule: str = "未知"

    model_config = {"from_attributes": True}


class NoticeDetail(NoticeItem):
    """通知详情 — 对齐前端 NoticeDetail"""
    requirements: str | None = None
    registration_url: str | None = None
    official_url: str | None = None
    contact: str | None = None
    raw_content: str = ""
    source_url: str = ""
    created_at: str = ""
    prev_year_quota: str | None = None

    model_config = {"from_attributes": True}


class NoticeListResponse(BaseModel):
    """通知列表响应 — 对齐前端 NoticeListResponse"""
    total: int
    items: list[NoticeItem]
    filters: dict = {}


class NoticeQueryParams(BaseModel):
    """通知查询参数"""
    type: str | None = None
    school_level: str | None = None
    province: str | None = None
    university: str | None = None
    discipline: str | None = None
    major: str | None = None
    status: str | None = None
    keyword: str | None = None
    sort: str = "latest"
    page: int = 1
    size: int = 20
