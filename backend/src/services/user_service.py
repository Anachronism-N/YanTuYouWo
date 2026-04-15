"""用户业务逻辑"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User, UserSettings
from src.schemas.user import UserProfileResponse, UserProfileUpdate, UserSettingsResponse, UserSettingsUpdate


def user_to_response(user: User) -> UserProfileResponse:
    """将 User 模型转换为前端 UserProfile 响应"""
    return UserProfileResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        avatar_url=user.avatar_url,
        nickname=user.nickname,
        role=user.role if hasattr(user, "role") and user.role else "user",
        university=user.university,
        major=user.major,
        grade=user.grade,
        bio=user.bio,
        gpa_rank=user.gpa_rank,
        target_universities=user.target_universities or [],
        research_interests=user.research_interests or [],
        is_onboarded=user.is_onboarded,
        created_at=user.created_at.isoformat() if user.created_at else "",
    )


async def update_profile(
    db: AsyncSession,
    user: User,
    data: UserProfileUpdate,
) -> User:
    """更新用户个人信息"""
    update_data = data.model_dump(exclude_unset=True)
    if "target_universities" in update_data and update_data["target_universities"] is not None:
        update_data["target_universities"] = [
            tu.model_dump() if hasattr(tu, "model_dump") else tu
            for tu in update_data["target_universities"]
        ]

    for key, value in update_data.items():
        setattr(user, key, value)

    await db.commit()
    await db.refresh(user)
    return user


async def get_settings(db: AsyncSession, user_id: int) -> UserSettings:
    """获取用户设置，不存在则创建默认设置"""
    result = await db.execute(
        select(UserSettings).where(UserSettings.user_id == user_id)
    )
    settings = result.scalar_one_or_none()

    if settings is None:
        settings = UserSettings(
            user_id=user_id,
            interested_disciplines=[],
            interested_universities=[],
        )
        db.add(settings)
        await db.commit()
        await db.refresh(settings)

    return settings


def settings_to_response(settings: UserSettings) -> UserSettingsResponse:
    """将 UserSettings 模型转换为响应 schema"""
    return UserSettingsResponse(
        email_notification=settings.email_notification,
        favorite_update_notification=settings.favorite_update_notification,
        deadline_reminder_days=settings.deadline_reminder_days,
        interested_disciplines=settings.interested_disciplines or [],
        interested_universities=settings.interested_universities or [],
    )


async def update_settings(
    db: AsyncSession,
    user_id: int,
    data: UserSettingsUpdate,
) -> UserSettings:
    """更新用户设置"""
    settings = await get_settings(db, user_id)
    update_data = data.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(settings, key, value)

    await db.commit()
    await db.refresh(settings)
    return settings
