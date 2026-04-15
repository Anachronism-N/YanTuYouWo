"""院校相关 Pydantic 模型 — 对齐前端 TypeScript 类型"""

from __future__ import annotations


from pydantic import BaseModel


class DepartmentItem(BaseModel):
    """学院信息 — 对齐前端 DepartmentItem"""
    id: int
    name: str
    discipline_category: str
    notice_count: int = 0
    homepage_url: str = ""

    model_config = {"from_attributes": True}


class SchoolItem(BaseModel):
    """院校列表项 — 对齐前端 SchoolItem"""
    id: int
    name: str
    short_name: str
    level: str
    province: str
    city: str
    homepage_url: str
    logo_url: str | None = None
    department_count: int = 0
    notice_count: int = 0

    model_config = {"from_attributes": True}


class SchoolDetail(SchoolItem):
    """院校详情 — 对齐前端 SchoolDetail"""
    graduate_url: str = ""
    departments: list[DepartmentItem] = []
    description: str | None = None

    model_config = {"from_attributes": True}


class SchoolListResponse(BaseModel):
    """院校列表响应"""
    total: int
    items: list[SchoolItem]


class SchoolQueryParams(BaseModel):
    """院校查询参数"""
    level: str | None = None
    province: str | None = None
    keyword: str | None = None
    sort: str = "name"
    page: int = 1
    size: int = 20
