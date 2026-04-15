"""进度中心 API 路由"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.dependencies import get_current_user
from src.models.user import User
from src.schemas.progress import (
    PlanItem, PlanListResponse, PlanCreateRequest, PlanUpdateRequest,
    TaskItem, TaskListResponse, TaskCreateRequest, TaskUpdateRequest,
    AchievementListResponse, AchievementCreateRequest,
    ProgressStatsResponse,
)
from src.services import progress_service
from src.schemas.common import IdResponse

router = APIRouter(prefix="/progress", tags=["进度中心"])


# ──── 统计 ────

@router.get("/stats", response_model=ProgressStatsResponse)
async def get_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取进度统计"""
    return await progress_service.get_progress_stats(db, current_user.id)


# ──── 规划 ────

@router.get("/plans", response_model=PlanListResponse)
async def list_plans(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取规划列表"""
    return await progress_service.get_plans(db, current_user.id)


@router.post("/plans", status_code=201, response_model=IdResponse)
async def create_plan(
    body: PlanCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """创建规划"""
    try:
        plan = await progress_service.create_plan(
            db, current_user.id,
            title=body.title, description=body.description, start_date=body.start_date, end_date=body.end_date,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"id": plan.id}


@router.put("/plans/{plan_id}", response_model=PlanItem)
async def update_plan(
    plan_id: int,
    body: PlanUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新规划"""
    plan = await progress_service.update_plan(
        db, current_user.id, plan_id, **body.model_dump(exclude_unset=True)
    )
    if not plan:
        raise HTTPException(status_code=404, detail="规划不存在")
    return progress_service._plan_to_item(plan)


# ──── 任务 ────

@router.get("/tasks", response_model=TaskListResponse)
async def list_tasks(
    plan_id: int | None = Query(None),
    status: str | None = Query(None),
    priority: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取任务列表"""
    return await progress_service.get_tasks(db, current_user.id, plan_id=plan_id, status=status, priority=priority)


@router.post("/tasks", status_code=201, response_model=IdResponse)
async def create_task(
    body: TaskCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """创建任务"""
    try:
        task = await progress_service.create_task(
            db, current_user.id,
            title=body.title, description=body.description, plan_id=body.plan_id,
            priority=body.priority, due_date=body.due_date, tags=body.tags, source=body.source,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"id": task.id}


@router.put("/tasks/{task_id}", response_model=TaskItem)
async def update_task(
    task_id: int,
    body: TaskUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新任务"""
    task = await progress_service.update_task(
        db, current_user.id, task_id, **body.model_dump(exclude_unset=True)
    )
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return progress_service._task_to_item(task)


# ──── 成果 ────

@router.get("/achievements", response_model=AchievementListResponse)
async def list_achievements(
    type: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取成果列表"""
    return await progress_service.get_achievements(db, current_user.id, type=type)


@router.post("/achievements", status_code=201, response_model=IdResponse)
async def create_achievement(
    body: AchievementCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """创建成果"""
    try:
        a = await progress_service.create_achievement(
            db, current_user.id,
            title=body.title, type=body.type, description=body.description,
            achievement_date=body.date, proof_urls=body.proof_urls, importance=body.importance, tags=body.tags,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"id": a.id}
