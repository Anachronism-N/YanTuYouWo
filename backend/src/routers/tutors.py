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
    university: str | None = Query(None, description="学校名（模糊）"),
    department: str | None = Query(None, description="学院名（模糊）"),
    discipline: str | None = Query(None, description="学科门类"),
    keyword: str | None = Query(None, description="关键词（姓名/学校/学院/职称/方向）"),
    research_area: str | None = Query(None, description="研究方向（模糊）"),
    is_recruiting: bool | None = Query(None, description="是否招生"),
    province: str | None = Query(None, description="省份"),
    crawl_tier: str | None = Query(None, description="数据完整度: tier1/tier2/tier3"),
    has_h_index: bool | None = Query(None, description="是否有 h-index 学术指标"),
    sort: str = Query(
        "completeness",
        description="排序: completeness / paper_count / view_count / citation_count / h_index / name",
    ),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """获取导师列表（公开）

    默认按 `tier 优先 + 完整度` 排序，确保高质量画像优先展示。
    """
    return await tutor_service.get_tutors(
        db,
        university=university, department=department,
        discipline=discipline, keyword=keyword,
        research_area=research_area,
        is_recruiting=is_recruiting, province=province,
        crawl_tier=crawl_tier,
        has_h_index=has_h_index,
        sort=sort, page=page, size=size,
    )


@router.get("/stats")
async def tutor_stats(db: AsyncSession = Depends(get_db)) -> dict:
    """导师库总览统计 — 用于前端动态填充筛选选项 / 仪表盘"""
    return await tutor_service.get_tutor_stats(db)


@router.get("/{tutor_id}", response_model=TutorDetail)
async def get_tutor(
    tutor_id: int,
    db: AsyncSession = Depends(get_db),
):
    """获取导师详情（公开）

    根据 `crawl_tier` 决定前端渲染模板：
      - tier1: 完整画像（简介/教育/工作/论文/项目/获奖/招生）
      - tier2: 基础卡片（姓名/职称/方向/邮箱/外链）
      - tier3: 占位 + 跳转院校师资页
    """
    detail = await tutor_service.get_tutor_detail(db, tutor_id)
    if not detail:
        raise HTTPException(status_code=404, detail="导师不存在")
    return detail
