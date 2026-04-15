"""收藏业务逻辑"""

from __future__ import annotations

from sqlalchemy import select, func, and_, delete
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import Favorite
from src.models.notice import AdmissionNotice
from src.models.university import University
from src.schemas.user import FavoriteItemResponse, FavoriteListResponse


async def _enrich_favorites_batch(db: AsyncSession, favs: list[Favorite]) -> list[FavoriteItemResponse]:
    """批量填充收藏标题和描述（避免 N+1 查询）"""
    if not favs:
        return []

    notice_ids = [f.target_id for f in favs if f.type == "notice"]
    school_ids = [f.target_id for f in favs if f.type == "school"]

    notice_map: dict[int, tuple[str, str]] = {}
    school_map: dict[int, tuple[str, str, dict]] = {}

    if notice_ids:
        result = await db.execute(
            select(AdmissionNotice.id, AdmissionNotice.title, AdmissionNotice.program_type, University.name)
            .join(University, AdmissionNotice.university_id == University.id)
            .where(AdmissionNotice.id.in_(notice_ids))
        )
        for nid, title, ptype, uni_name in result.all():
            notice_map[nid] = (title, f"{uni_name} · {ptype or '通知'}", {"university": uni_name})

    if school_ids:
        result = await db.execute(
            select(University.id, University.name, University.level, University.province)
            .where(University.id.in_(school_ids))
        )
        for uid, name, level, province in result.all():
            school_map[uid] = (name, f"{level} · {province}", {"level": level, "province": province})

    items = []
    for fav in favs:
        title, desc, extra = "", "", {}
        if fav.type == "notice" and fav.target_id in notice_map:
            title, desc, extra = notice_map[fav.target_id]
        elif fav.type == "school" and fav.target_id in school_map:
            title, desc, extra = school_map[fav.target_id]
        elif fav.type == "tutor":
            title, desc = f"导师 #{fav.target_id}", "导师信息"

        items.append(FavoriteItemResponse(
            id=fav.id, type=fav.type, target_id=fav.target_id,
            title=title, description=desc,
            created_at=fav.created_at.isoformat() if fav.created_at else "",
            extra=extra,
        ))
    return items


async def get_favorites(
    db: AsyncSession,
    user_id: int,
    *,
    type: str | None = None,
    page: int = 1,
    size: int = 20,
) -> FavoriteListResponse:
    """获取用户收藏列表（批量查询，无 N+1）"""
    query = select(Favorite).where(Favorite.user_id == user_id)
    if type:
        query = query.where(Favorite.type == type)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    offset = (page - 1) * size
    query = query.order_by(Favorite.created_at.desc()).offset(offset).limit(size)
    favs = (await db.execute(query)).scalars().all()

    items = await _enrich_favorites_batch(db, favs)
    return FavoriteListResponse(total=total, items=items)


async def add_favorite(
    db: AsyncSession,
    user_id: int,
    type: str,
    target_id: int,
) -> Favorite:
    """添加收藏（已存在则忽略）"""
    existing = await db.execute(
        select(Favorite).where(and_(
            Favorite.user_id == user_id, Favorite.type == type, Favorite.target_id == target_id,
        ))
    )
    fav = existing.scalar_one_or_none()
    if fav:
        return fav

    fav = Favorite(user_id=user_id, type=type, target_id=target_id)
    db.add(fav)
    await db.commit()
    await db.refresh(fav)
    return fav


async def remove_favorite(db: AsyncSession, user_id: int, type: str, target_id: int) -> bool:
    """取消收藏"""
    result = await db.execute(
        delete(Favorite).where(and_(
            Favorite.user_id == user_id, Favorite.type == type, Favorite.target_id == target_id,
        ))
    )
    await db.commit()
    return result.rowcount > 0


async def check_favorite(db: AsyncSession, user_id: int, type: str, target_id: int) -> bool:
    """检查是否已收藏"""
    result = await db.execute(
        select(func.count()).where(and_(
            Favorite.user_id == user_id, Favorite.type == type, Favorite.target_id == target_id,
        ))
    )
    return (result.scalar() or 0) > 0
