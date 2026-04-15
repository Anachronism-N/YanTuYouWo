"""搜索业务逻辑"""

from __future__ import annotations

from sqlalchemy import select, func, or_, union_all, literal
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.notice import AdmissionNotice
from src.models.university import University


async def search(
    db: AsyncSession,
    *,
    keyword: str,
    type: str | None = None,
    page: int = 1,
    size: int = 20,
) -> dict:
    """全站搜索 — DB 级分页，不再全量加载"""

    subqueries = []

    if not type or type == "notice":
        notice_q = (
            select(
                AdmissionNotice.id.label("id"),
                literal("notice").label("type"),
                AdmissionNotice.title.label("title"),
                func.coalesce(AdmissionNotice.summary, "").label("description"),
            )
            .join(University, AdmissionNotice.university_id == University.id)
            .where(or_(
                AdmissionNotice.title.contains(keyword),
                AdmissionNotice.summary.contains(keyword),
            ))
        )
        subqueries.append(notice_q)

    if not type or type == "school":
        school_q = (
            select(
                University.id.label("id"),
                literal("school").label("type"),
                University.name.label("title"),
                (University.level + " · " + University.province).label("description"),
            )
            .where(or_(
                University.name.contains(keyword),
                University.short_name.contains(keyword),
                University.province.contains(keyword),
            ))
        )
        subqueries.append(school_q)

    if not subqueries:
        return {"total": 0, "items": []}

    combined = union_all(*subqueries).subquery()

    total_r = await db.execute(select(func.count()).select_from(combined))
    total = total_r.scalar() or 0

    offset = (page - 1) * size
    rows = await db.execute(
        select(combined).offset(offset).limit(size)
    )

    items = []
    for row in rows.all():
        url_map = {"notice": f"/info/notices/{row.id}", "school": f"/info/schools/{row.id}"}
        items.append({
            "id": row.id,
            "type": row.type,
            "title": row.title,
            "description": row.description,
            "url": url_map.get(row.type, "#"),
        })

    return {"total": total, "items": items}
