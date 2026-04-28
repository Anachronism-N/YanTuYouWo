"""通知相关 API 路由"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.schemas.notice import NoticeDetail, NoticeListResponse
from src.services import notice_service

router = APIRouter(prefix="/notices", tags=["通知"])


@router.get("", response_model=NoticeListResponse)
async def list_notices(
    type: str | None = Query(None, description="通知类型: summer_camp/pre_admission/seminar/admission_list"),
    school_level: str | None = Query(None, description="学校层次: 985/211"),
    province: str | None = Query(None, description="省份"),
    university: str | None = Query(None, description="学校名称"),
    discipline: str | None = Query(None, description="学科"),
    keyword: str | None = Query(None, description="关键词"),
    status: str | None = Query(None, description="状态: registering/in_progress/not_started/ended"),
    source_type: str | None = Query(None, description="来源: department/graduate_school/wechat"),
    sort: str = Query("latest", description="排序: latest/deadline/hot"),
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(20, ge=1, le=100, description="每页数量"),
    db: AsyncSession = Depends(get_db),
):
    """获取通知列表（支持分页、筛选、排序）"""
    return await notice_service.get_notices(
        db,
        type=type,
        school_level=school_level,
        province=province,
        university=university,
        discipline=discipline,
        keyword=keyword,
        status=status,
        source_type=source_type,
        sort=sort,
        page=page,
        size=size,
    )


@router.get("/latest", response_model=NoticeListResponse)
async def latest_notices(
    limit: int = Query(10, ge=1, le=50, description="数量"),
    db: AsyncSession = Depends(get_db),
):
    """获取最新通知"""
    return await notice_service.get_latest_notices(db, limit=limit)


@router.get("/{notice_id}", response_model=NoticeDetail)
async def get_notice(
    notice_id: int,
    db: AsyncSession = Depends(get_db),
):
    """获取通知详情"""
    detail = await notice_service.get_notice_detail(db, notice_id)
    if not detail:
        raise HTTPException(status_code=404, detail="通知不存在")
    return detail
