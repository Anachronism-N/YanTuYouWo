"""进度中心 Pydantic 模型 — 对齐前端 TypeScript 类型"""

from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field


# ──── 规划 ────

class PlanItem(BaseModel):
    id: int
    title: str
    description: str | None = None
    start_date: str
    end_date: str
    status: str = "active"
    created_at: str = ""
    updated_at: str = ""


class PlanListResponse(BaseModel):
    total: int
    items: list[PlanItem]


class PlanCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    start_date: str
    end_date: str


class PlanUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: Optional[str] = None


# ──── 任务 ────

class TaskItem(BaseModel):
    id: int
    title: str
    description: str | None = None
    plan_id: int | None = None
    priority: str = "medium"
    status: str = "todo"
    due_date: str | None = None
    completed_at: str | None = None
    tags: list[str] = []
    source: str = "manual"
    created_at: str = ""


class TaskListResponse(BaseModel):
    total: int
    items: list[TaskItem]


class TaskCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    plan_id: int | None = None
    priority: str = "medium"
    due_date: str | None = None
    tags: list[str] = []
    source: str = "manual"


class TaskUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    plan_id: Optional[int] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[str] = None
    tags: Optional[list[str]] = None


# ──── 成果 ────

class AchievementItem(BaseModel):
    id: int
    title: str
    description: str | None = None
    type: str
    date: str
    proof_urls: list[str] = []
    importance: int = 3
    tags: list[str] = []
    created_at: str = ""


class AchievementListResponse(BaseModel):
    total: int
    items: list[AchievementItem]


class AchievementCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    type: str
    date: str
    proof_urls: list[str] = []
    importance: int = Field(default=3, ge=1, le=5)
    tags: list[str] = []


# ──── 统计 ────

class ProgressStatsResponse(BaseModel):
    total_tasks: int = 0
    completed_tasks: int = 0
    in_progress_tasks: int = 0
    overdue_tasks: int = 0
    completion_rate: float = 0.0
    streak_days: int = 0
    total_achievements: int = 0
    weekly_completed: int = 0
