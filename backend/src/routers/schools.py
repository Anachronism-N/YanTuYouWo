"""院校相关 API 路由"""

from __future__ import annotations

from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.schemas.school import SchoolDetail, SchoolListResponse, DepartmentItem
from src.schemas.notice import NoticeListResponse
from src.services import school_service, notice_service

router = APIRouter(prefix="/schools", tags=["院校"])


@router.get("", response_model=SchoolListResponse)
async def list_schools(
    level: str | None = Query(None, description="学校层次: 985/211"),
    province: str | None = Query(None, description="省份"),
    keyword: str | None = Query(None, description="关键词"),
    sort: str = Query("name", description="排序: name/notice_count"),
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(20, ge=1, le=100, description="每页数量"),
    db: AsyncSession = Depends(get_db),
):
    """获取院校列表"""
    return await school_service.get_schools(
        db,
        level=level,
        province=province,
        keyword=keyword,
        sort=sort,
        page=page,
        size=size,
    )


@router.get("/{school_id}", response_model=SchoolDetail)
async def get_school(
    school_id: int,
    db: AsyncSession = Depends(get_db),
):
    """获取院校详情"""
    detail = await school_service.get_school_detail(db, school_id)
    if not detail:
        raise HTTPException(status_code=404, detail="院校不存在")
    return detail


@router.get("/{school_id}/departments", response_model=List[DepartmentItem])
async def get_departments(
    school_id: int,
    db: AsyncSession = Depends(get_db),
):
    """获取院校下的学院列表"""
    return await school_service.get_school_departments(db, school_id)


@router.get("/{school_id}/notices", response_model=NoticeListResponse)
async def get_school_notices(
    school_id: int,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """获取院校下的通知列表"""
    # 使用通知服务，按学校 ID 筛选
    from src.models.university import University
    from sqlalchemy import select

    # 先查学校名称
    result = await db.execute(select(University.name).where(University.id == school_id))
    uni_name = result.scalar_one_or_none()
    if not uni_name:
        raise HTTPException(status_code=404, detail="院校不存在")

    return await notice_service.get_notices(
        db,
        university=uni_name,
        page=page,
        size=size,
    )
