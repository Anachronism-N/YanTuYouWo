"""进度中心业务逻辑"""

from __future__ import annotations

from datetime import date, datetime, timedelta
from sqlalchemy import select, func, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.progress import Plan, Task, Achievement
def _parse_date(s: str) -> date:
    try:
        return date.fromisoformat(s)
    except (ValueError, TypeError):
        raise ValueError(f"日期格式错误: {s}，应为 YYYY-MM-DD")


from src.schemas.progress import (
    PlanItem, PlanListResponse,
    TaskItem, TaskListResponse,
    AchievementItem, AchievementListResponse,
    ProgressStatsResponse,
)


# ──── 规划 ────

def _plan_to_item(plan: Plan) -> PlanItem:
    return PlanItem(
        id=plan.id,
        title=plan.title,
        description=plan.description,
        start_date=plan.start_date.isoformat(),
        end_date=plan.end_date.isoformat(),
        status=plan.status,
        created_at=plan.created_at.isoformat() if plan.created_at else "",
        updated_at=plan.updated_at.isoformat() if plan.updated_at else "",
    )


async def get_plans(db: AsyncSession, user_id: int) -> PlanListResponse:
    """获取用户规划列表"""
    result = await db.execute(
        select(Plan).where(Plan.user_id == user_id).order_by(desc(Plan.created_at))
    )
    plans = result.scalars().all()
    return PlanListResponse(total=len(plans), items=[_plan_to_item(p) for p in plans])


async def create_plan(db: AsyncSession, user_id: int, *, title: str, description: str | None, start_date: str, end_date: str) -> Plan:
    """创建新规划"""
    plan = Plan(
        user_id=user_id, title=title, description=description,
        start_date=_parse_date(start_date), end_date=_parse_date(end_date),
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return plan


async def update_plan(db: AsyncSession, user_id: int, plan_id: int, **kwargs) -> Plan | None:
    """更新规划（部分更新）"""
    result = await db.execute(select(Plan).where(and_(Plan.id == plan_id, Plan.user_id == user_id)))
    plan = result.scalar_one_or_none()
    if not plan:
        return None
    for key, value in kwargs.items():
        if value is not None:
            if key in ("start_date", "end_date"):
                value = _parse_date(value)
            setattr(plan, key, value)
    await db.commit()
    await db.refresh(plan)
    return plan


# ──── 任务 ────

def _task_to_item(task: Task) -> TaskItem:
    return TaskItem(
        id=task.id,
        title=task.title,
        description=task.description,
        plan_id=task.plan_id,
        priority=task.priority,
        status=task.status,
        due_date=task.due_date.isoformat() if task.due_date else None,
        completed_at=task.completed_at.isoformat() if task.completed_at else None,
        tags=task.tags or [],
        source=task.source,
        created_at=task.created_at.isoformat() if task.created_at else "",
    )


async def get_tasks(
    db: AsyncSession, user_id: int, *, plan_id: int | None = None, status: str | None = None, priority: str | None = None
) -> TaskListResponse:
    """获取任务列表（支持按 plan_id/status/priority 筛选）"""
    query = select(Task).where(Task.user_id == user_id)
    if plan_id is not None:
        query = query.where(Task.plan_id == plan_id)
    if status:
        query = query.where(Task.status == status)
    if priority:
        query = query.where(Task.priority == priority)
    query = query.order_by(desc(Task.created_at))

    result = await db.execute(query)
    tasks = result.scalars().all()
    return TaskListResponse(total=len(tasks), items=[_task_to_item(t) for t in tasks])


async def create_task(db: AsyncSession, user_id: int, *, title: str, description: str | None = None,
                      plan_id: int | None = None, priority: str = "medium", due_date: str | None = None,
                      tags: list[str] | None = None, source: str = "manual") -> Task:
    """创建新任务"""
    task = Task(
        user_id=user_id, title=title, description=description,
        plan_id=plan_id, priority=priority, tags=tags or [], source=source,
        due_date=_parse_date(due_date) if due_date else None,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


async def update_task(db: AsyncSession, user_id: int, task_id: int, **kwargs) -> Task | None:
    """更新任务（status=done 自动设 completed_at）"""
    result = await db.execute(select(Task).where(and_(Task.id == task_id, Task.user_id == user_id)))
    task = result.scalar_one_or_none()
    if not task:
        return None
    for key, value in kwargs.items():
        if value is not None:
            if key == "due_date":
                value = _parse_date(value)
            setattr(task, key, value)
    if kwargs.get("status") == "done" and task.completed_at is None:
        task.completed_at = datetime.now()
    elif kwargs.get("status") and kwargs["status"] != "done":
        task.completed_at = None
    await db.commit()
    await db.refresh(task)
    return task


# ──── 成果 ────

def _ach_to_item(a: Achievement) -> AchievementItem:
    return AchievementItem(
        id=a.id, title=a.title, description=a.description,
        type=a.type, date=a.date.isoformat(),
        proof_urls=a.proof_urls or [], importance=a.importance,
        tags=a.tags or [],
        created_at=a.created_at.isoformat() if a.created_at else "",
    )


async def get_achievements(db: AsyncSession, user_id: int, *, type: str | None = None) -> AchievementListResponse:
    """获取成果列表（支持按类型筛选）"""
    query = select(Achievement).where(Achievement.user_id == user_id)
    if type:
        query = query.where(Achievement.type == type)
    query = query.order_by(desc(Achievement.date))
    result = await db.execute(query)
    items = result.scalars().all()
    return AchievementListResponse(total=len(items), items=[_ach_to_item(a) for a in items])


async def create_achievement(db: AsyncSession, user_id: int, *, title: str, type: str, description: str | None = None,
                              achievement_date: str, proof_urls: list[str] | None = None,
                              importance: int = 3, tags: list[str] | None = None) -> Achievement:
    """创建成果记录"""
    a = Achievement(
        user_id=user_id, title=title, type=type, description=description,
        date=_parse_date(achievement_date), proof_urls=proof_urls or [],
        importance=importance, tags=tags or [],
    )
    db.add(a)
    await db.commit()
    await db.refresh(a)
    return a


# ──── 统计 ────

async def get_progress_stats(db: AsyncSession, user_id: int) -> ProgressStatsResponse:
    """获取进度统计（汇总任务+打卡+成果）"""
    today = date.today()
    week_ago = today - timedelta(days=7)

    total_r = await db.execute(select(func.count()).where(Task.user_id == user_id))
    total_tasks = total_r.scalar() or 0

    done_r = await db.execute(select(func.count()).where(and_(Task.user_id == user_id, Task.status == "done")))
    completed_tasks = done_r.scalar() or 0

    ip_r = await db.execute(select(func.count()).where(and_(Task.user_id == user_id, Task.status == "in_progress")))
    in_progress_tasks = ip_r.scalar() or 0

    overdue_r = await db.execute(
        select(func.count()).where(and_(Task.user_id == user_id, Task.status != "done", Task.due_date < today))
    )
    overdue_tasks = overdue_r.scalar() or 0

    weekly_r = await db.execute(
        select(func.count()).where(and_(Task.user_id == user_id, Task.status == "done", Task.completed_at >= datetime.combine(week_ago, datetime.min.time())))
    )
    weekly_completed = weekly_r.scalar() or 0

    ach_r = await db.execute(select(func.count()).where(Achievement.user_id == user_id))
    total_achievements = ach_r.scalar() or 0

    # 打卡连续天数 (复用 community_service 的逻辑)
    from src.services.community_service import get_checkin_stats
    checkin_stats = await get_checkin_stats(db, user_id)

    rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0.0

    return ProgressStatsResponse(
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        in_progress_tasks=in_progress_tasks,
        overdue_tasks=overdue_tasks,
        completion_rate=round(rate, 1),
        streak_days=checkin_stats.streak_days,
        total_achievements=total_achievements,
        weekly_completed=weekly_completed,
    )
