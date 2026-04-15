"""用户、设置、收藏 数据模型"""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, Boolean, DateTime, Text, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base


class User(Base):
    """用户表"""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    username: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    nickname: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    university: Mapped[Optional[str]] = mapped_column(String(200), nullable=True, comment="本科学校")
    major: Mapped[Optional[str]] = mapped_column(String(200), nullable=True, comment="本科专业")
    grade: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, comment="年级")
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="个人简介")
    gpa_rank: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, comment="GPA 排名")
    target_universities: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=list, comment="目标院校 JSON")
    research_interests: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=list, comment="研究兴趣 JSON")
    role: Mapped[str] = mapped_column(String(20), default="user", comment="user / admin")
    is_onboarded: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)

    def __repr__(self) -> str:
        return f"<User(id={self.id}, username='{self.username}')>"


class UserSettings(Base):
    """用户设置表"""

    __tablename__ = "user_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    email_notification: Mapped[bool] = mapped_column(Boolean, default=True)
    favorite_update_notification: Mapped[bool] = mapped_column(Boolean, default=True)
    deadline_reminder_days: Mapped[int] = mapped_column(Integer, default=3)
    interested_disciplines: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=list)
    interested_universities: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=list)

    def __repr__(self) -> str:
        return f"<UserSettings(user_id={self.user_id})>"


class Favorite(Base):
    """收藏表"""

    __tablename__ = "favorites"
    __table_args__ = (
        UniqueConstraint("user_id", "type", "target_id", name="uq_user_favorite"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False, comment="notice / school / tutor")
    target_id: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    def __repr__(self) -> str:
        return f"<Favorite(user_id={self.user_id}, type='{self.type}', target_id={self.target_id})>"
