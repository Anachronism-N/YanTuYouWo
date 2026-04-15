"""导师 API 路由"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.schemas.tutor import TutorDetail, TutorListResponse
from src.services import tutor_service

router = APIRouter(prefix="/tutors", tags=["导师"])


@router.get("", response_model=TutorListResponse)
async def list_tutors(
    university: str | None = Query(None),
    discipline: str | None = Query(None),
    keyword: str | None = Query(None),
    is_recruiting: bool | None = Query(None),
    province: str | None = Query(None),
    sort: str = Query("name"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """获取导师列表（公开）"""
    return await tutor_service.get_tutors(
        db, university=university, discipline=discipline,
        keyword=keyword, is_recruiting=is_recruiting,
        province=province, sort=sort, page=page, size=size,
    )


@router.get("/{tutor_id}", response_model=TutorDetail)
async def get_tutor(
    tutor_id: int,
    db: AsyncSession = Depends(get_db),
):
    """获取导师详情（公开）"""
    detail = await tutor_service.get_tutor_detail(db, tutor_id)
    if not detail:
        raise HTTPException(status_code=404, detail="导师不存在")
    return detail
