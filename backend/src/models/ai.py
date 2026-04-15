"""AI 功能数据模型 — 简历草稿、面试会话"""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, DateTime, ForeignKey, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base


class ResumeDraft(Base):
    """简历草稿表 — 每个用户只保留最新一份"""

    __tablename__ = "resume_drafts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True, comment="完整简历 JSON")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)


class InterviewSession(Base):
    """模拟面试会话表"""

    __tablename__ = "interview_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    config: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True, comment="面试配置")
    messages: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=list, comment="对话历史")
    status: Mapped[str] = mapped_column(String(20), default="active", comment="active/ended")
    report: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True, comment="评估报告")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    __table_args__ = (
        Index("idx_interview_user", "user_id"),
    )
