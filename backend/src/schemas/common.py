"""通用响应模型"""

from __future__ import annotations

from typing import Generic, TypeVar
from pydantic import BaseModel

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """分页响应"""
    total: int
    items: list[T]


class IdResponse(BaseModel):
    """创建资源后返回 ID"""
    id: int | str


class DetailResponse(BaseModel):
    """通用操作结果"""
    detail: str


class StatsOverview(BaseModel):
    """首页统计概览"""
    school_count: int
    notice_count: int
    department_count: int
    tutor_count: int
    user_count: int = 0
    post_count: int = 0
