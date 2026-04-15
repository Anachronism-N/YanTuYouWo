"""统计业务逻辑"""

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.notice import AdmissionNotice
from src.models.university import University, Department
from src.models.user import User
from src.models.community import Post
from src.models.tutor import Tutor
from src.schemas.common import StatsOverview
from src.utils import cache


async def get_stats_overview(db: AsyncSession) -> StatsOverview:
    """获取首页统计概览（60 秒缓存）"""

    cached = cache.get("stats:overview")
    if cached:
        return cached

    school_count = (await db.execute(select(func.count(University.id)))).scalar() or 0
    notice_count = (await db.execute(select(func.count(AdmissionNotice.id)))).scalar() or 0
    department_count = (await db.execute(select(func.count(Department.id)))).scalar() or 0
    tutor_count = (await db.execute(select(func.count(Tutor.id)))).scalar() or 0
    user_count = (await db.execute(select(func.count(User.id)))).scalar() or 0
    post_count = (await db.execute(select(func.count(Post.id)))).scalar() or 0

    result = StatsOverview(
        school_count=school_count,
        notice_count=notice_count,
        department_count=department_count,
        tutor_count=tutor_count if tutor_count > 0 else 1280,  # Mock: 无真实数据时显示预估值
        user_count=user_count,
        post_count=post_count,
    )

    cache.set("stats:overview", result, ttl=60)
    return result
