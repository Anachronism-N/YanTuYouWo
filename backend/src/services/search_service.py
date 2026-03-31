"""搜索业务逻辑"""

from __future__ import annotations

from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.notice import AdmissionNotice
from src.models.university import University, Department


async def search(
    db: AsyncSession,
    *,
    keyword: str,
    type: str | None = None,
    page: int = 1,
    size: int = 20,
) -> dict:
    """全站搜索 — 跨通知、院校搜索"""

    items = []
    total = 0

    if not type or type == "notice":
        # 搜索通知
        notice_query = (
            select(AdmissionNotice, University)
            .join(University, AdmissionNotice.university_id == University.id)
            .where(
                or_(
                    AdmissionNotice.title.contains(keyword),
                    AdmissionNotice.summary.contains(keyword),
                )
            )
            .order_by(AdmissionNotice.id.desc())
            .limit(size)
        )
        notice_result = await db.execute(notice_query)
        for notice, uni in notice_result.all():
            items.append({
                "id": notice.id,
                "type": "notice",
                "title": notice.title,
                "description": notice.summary or f"{uni.name} - {notice.program_type or '通知'}",
                "url": f"/info/notices/{notice.id}",
            })

    if not type or type == "school":
        # 搜索院校
        school_query = (
            select(University)
            .where(
                or_(
                    University.name.contains(keyword),
                    University.short_name.contains(keyword),
                    University.province.contains(keyword),
                )
            )
            .order_by(University.name)
            .limit(size)
        )
        school_result = await db.execute(school_query)
        for uni in school_result.scalars().all():
            items.append({
                "id": uni.id,
                "type": "school",
                "title": uni.name,
                "description": f"{uni.level} · {uni.province}{(' · ' + uni.city) if uni.city else ''}",
                "url": f"/info/schools/{uni.id}",
            })

    total = len(items)

    return {
        "total": total,
        "items": items,
    }
