"""统计业务逻辑"""

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.notice import AdmissionNotice
from src.models.university import University, Department
from src.schemas.common import StatsOverview


async def get_stats_overview(db: AsyncSession) -> StatsOverview:
    """获取首页统计概览"""

    # 学校数量
    school_count_result = await db.execute(select(func.count(University.id)))
    school_count = school_count_result.scalar() or 0

    # 通知数量
    notice_count_result = await db.execute(select(func.count(AdmissionNotice.id)))
    notice_count = notice_count_result.scalar() or 0

    # 学院数量
    dept_count_result = await db.execute(select(func.count(Department.id)))
    department_count = dept_count_result.scalar() or 0

    return StatsOverview(
        school_count=school_count,
        notice_count=notice_count,
        department_count=department_count,
        tutor_count=0,  # Phase 1 暂无导师数据
    )
