"""进度中心数据模型 — 规划、任务、成果"""

from __future__ import annotations

from datetime import datetime, date
from typing import Optional
from sqlalchemy import String, Integer, DateTime, Date, Text, ForeignKey, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base


class Plan(Base):
    """规划表"""

    __tablename__ = "plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active", comment="active/completed/archived")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)

    __table_args__ = (
        Index("idx_plan_user", "user_id"),
    )


class Task(Base):
    """任务表"""

    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    plan_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("plans.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    priority: Mapped[str] = mapped_column(String(20), default="medium", comment="high/medium/low")
    status: Mapped[str] = mapped_column(String(20), default="todo", comment="todo/in_progress/done")
    tags: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=list)
    source: Mapped[str] = mapped_column(String(20), default="manual", comment="ai_generated/manual")
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)

    __table_args__ = (
        Index("idx_task_user", "user_id"),
        Index("idx_task_plan", "plan_id"),
    )


class Achievement(Base):
    """成果记录表"""

    __tablename__ = "achievements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    type: Mapped[str] = mapped_column(String(50), nullable=False, comment="科研/论文/竞赛/英语/面试/实习/其他")
    date: Mapped[date] = mapped_column(Date, nullable=False)
    proof_urls: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=list)
    importance: Mapped[int] = mapped_column(Integer, default=3, comment="1-5")
    tags: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    __table_args__ = (
        Index("idx_achievement_user", "user_id"),
    )
