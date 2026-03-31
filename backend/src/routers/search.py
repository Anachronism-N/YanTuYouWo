"""搜索 API 路由"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.services import search_service

router = APIRouter(tags=["搜索"])


@router.get("/search")
async def search(
    keyword: str = Query(..., description="搜索关键词"),
    type: str | None = Query(None, description="搜索类型: notice/school/tutor"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """全站搜索"""
    return await search_service.search(
        db,
        keyword=keyword,
        type=type,
        page=page,
        size=size,
    )
