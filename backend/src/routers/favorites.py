"""收藏 API 路由"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.dependencies import get_current_user
from src.models.user import User
from src.schemas.user import (
    FavoriteRequest,
    FavoriteListResponse,
    FavoriteCheckResponse,
)
from src.services import favorite_service

router = APIRouter(prefix="/user/favorites", tags=["收藏"])


@router.get("", response_model=FavoriteListResponse)
async def list_favorites(
    type: str | None = Query(None, description="筛选类型: notice/school/tutor"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取收藏列表"""
    return await favorite_service.get_favorites(
        db, current_user.id, type=type, page=page, size=size
    )


@router.post("", status_code=201)
async def add_favorite(
    body: FavoriteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """添加收藏"""
    if body.type not in ("notice", "school", "tutor"):
        raise HTTPException(status_code=400, detail="type 必须为 notice / school / tutor")
    await favorite_service.add_favorite(db, current_user.id, body.type, body.target_id)
    return {"detail": "收藏成功"}


@router.delete("")
async def remove_favorite(
    body: FavoriteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """取消收藏"""
    await favorite_service.remove_favorite(db, current_user.id, body.type, body.target_id)
    return {"detail": "已取消收藏"}


@router.get("/check", response_model=FavoriteCheckResponse)
async def check_favorite(
    type: str = Query(..., description="类型: notice/school/tutor"),
    target_id: int = Query(..., description="目标 ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """检查是否已收藏"""
    is_favorited = await favorite_service.check_favorite(
        db, current_user.id, type, target_id
    )
    return FavoriteCheckResponse(is_favorited=is_favorited)
