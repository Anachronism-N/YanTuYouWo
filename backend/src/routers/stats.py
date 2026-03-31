"""统计 API 路由"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.schemas.common import StatsOverview
from src.services import stats_service

router = APIRouter(prefix="/stats", tags=["统计"])


@router.get("/overview", response_model=StatsOverview)
async def stats_overview(
    db: AsyncSession = Depends(get_db),
):
    """获取首页统计概览"""
    return await stats_service.get_stats_overview(db)
