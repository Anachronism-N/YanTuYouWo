"""用户相关 Pydantic 模型 — 对齐前端 TypeScript 类型"""

from __future__ import annotations

from typing import Optional
from pydantic import BaseModel


class TargetUniversity(BaseModel):
    university: str
    departments: list[str] = []


class UserProfileResponse(BaseModel):
    """对齐前端 UserProfile"""
    id: int
    username: str
    email: str
    avatar_url: str | None = None
    nickname: str
    role: str = "user"
    university: str | None = None
    major: str | None = None
    grade: str | None = None
    bio: str | None = None
    gpa_rank: str | None = None
    target_universities: list[TargetUniversity] = []
    research_interests: list[str] = []
    is_onboarded: bool = False
    created_at: str = ""


class UserProfileUpdate(BaseModel):
    """用户资料更新（所有字段可选）"""
    nickname: Optional[str] = None
    avatar_url: Optional[str] = None
    university: Optional[str] = None
    major: Optional[str] = None
    grade: Optional[str] = None
    bio: Optional[str] = None
    gpa_rank: Optional[str] = None
    target_universities: Optional[list[TargetUniversity]] = None
    research_interests: Optional[list[str]] = None
    is_onboarded: Optional[bool] = None


class UserSettingsResponse(BaseModel):
    """对齐前端 UserSettings"""
    email_notification: bool = True
    favorite_update_notification: bool = True
    deadline_reminder_days: int = 3
    interested_disciplines: list[str] = []
    interested_universities: list[str] = []


class UserSettingsUpdate(BaseModel):
    """用户设置更新（所有字段可选）"""
    email_notification: Optional[bool] = None
    favorite_update_notification: Optional[bool] = None
    deadline_reminder_days: Optional[int] = None
    interested_disciplines: Optional[list[str]] = None
    interested_universities: Optional[list[str]] = None


class FavoriteRequest(BaseModel):
    type: str
    target_id: int


class FavoriteItemResponse(BaseModel):
    """对齐前端 FavoriteItem"""
    id: int
    type: str
    target_id: int
    title: str = ""
    description: str = ""
    created_at: str = ""
    extra: dict = {}


class FavoriteListResponse(BaseModel):
    total: int
    items: list[FavoriteItemResponse]


class FavoriteCheckResponse(BaseModel):
    is_favorited: bool
