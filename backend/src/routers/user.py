"""用户 API 路由"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.dependencies import get_current_user
from src.models.user import User
from src.schemas.user import (
    UserProfileResponse,
    UserProfileUpdate,
    UserSettingsResponse,
    UserSettingsUpdate,
)
from src.services import user_service

router = APIRouter(prefix="/user", tags=["用户"])


@router.get("/profile", response_model=UserProfileResponse)
async def get_profile(current_user: User = Depends(get_current_user)):
    """获取当前用户个人信息"""
    return user_service.user_to_response(current_user)


@router.put("/profile", response_model=UserProfileResponse)
async def update_profile(
    body: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新当前用户个人信息"""
    updated = await user_service.update_profile(db, current_user, body)
    return user_service.user_to_response(updated)


@router.get("/settings", response_model=UserSettingsResponse)
async def get_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取用户设置"""
    settings = await user_service.get_settings(db, current_user.id)
    return user_service.settings_to_response(settings)


@router.put("/settings", response_model=UserSettingsResponse)
async def update_settings(
    body: UserSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新用户设置"""
    settings = await user_service.update_settings(db, current_user.id, body)
    return user_service.settings_to_response(settings)
