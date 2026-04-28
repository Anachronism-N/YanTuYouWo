"""导师业务逻辑 — 使用爬虫系统的真实导师数据"""

from __future__ import annotations

from sqlalchemy import select, func, or_, desc, String, case
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.tutor import Tutor
from src.models.university import University, Department
from src.schemas.tutor import TutorItem, TutorDetail, TutorListResponse


# Tier 排序权重：tier1 > tier2 > tier3
_TIER_ORDER = case(
    (Tutor.crawl_tier == "tier1", 1),
    (Tutor.crawl_tier == "tier2", 2),
    else_=3,
)


def _resolve_tier(tutor: Tutor) -> str:
    """根据真实数据动态修正 tier（避免脏数据）。

    规则：
      - 已有 biography / publications / projects → tier1
      - 已有 homepage_url → tier2
      - 否则 tier3
    """
    stored = getattr(tutor, "crawl_tier", None)
    if stored == "tier1":
        # 二次校验：tier1 必须真有详情
        if tutor.biography or tutor.publications or tutor.projects:
            return "tier1"
        # 标错了 → 降级
        return "tier2" if tutor.homepage_url else "tier3"
    if tutor.homepage_url:
        return "tier2"
    return "tier3"


def _tutor_to_item(tutor: Tutor, uni: University, dept: Department | None) -> TutorItem:
    """将 DB 模型转换为 TutorItem"""
    return TutorItem(
        id=tutor.id,
        name=tutor.name,
        university_name=uni.name,
        department_name=dept.name if dept else "未知学院",
        school_level=uni.level or "其他",
        title=tutor.title or "教师",
        research_areas=tutor.research_areas or [],
        homepage_url=tutor.homepage_url,
        email=tutor.email,
        avatar_url=tutor.avatar_url,
        province=uni.province or "",
        city=uni.city or "",
        discipline=tutor.discipline or "未知",
        is_recruiting=tutor.is_recruiting if tutor.is_recruiting is not None else True,
        recruiting_info=tutor.recruiting_info,
        paper_count=tutor.paper_count or 0,
        project_count=tutor.project_count or 0,
        h_index=tutor.h_index,
        i10_index=getattr(tutor, "i10_index", None),
        citation_count=tutor.citation_count,
        view_count=tutor.view_count or 0,
        crawl_tier=_resolve_tier(tutor),
        profile_completeness=getattr(tutor, "profile_completeness", 0) or 0,
    )


async def get_tutors(
    db: AsyncSession,
    *,
    university: str | None = None,
    department: str | None = None,
    discipline: str | None = None,
    keyword: str | None = None,
    research_area: str | None = None,
    is_recruiting: bool | None = None,
    province: str | None = None,
    crawl_tier: str | None = None,
    has_h_index: bool | None = None,
    sort: str = "completeness",
    page: int = 1,
    size: int = 20,
) -> TutorListResponse:
    """获取导师列表（支持多维筛选 + 分页）"""
    query = (
        select(Tutor, University, Department)
        .join(University, Tutor.university_id == University.id)
        .outerjoin(Department, Tutor.department_id == Department.id)
    )

    if university:
        query = query.where(University.name.contains(university))
    if department:
        query = query.where(Department.name.contains(department))
    if discipline:
        query = query.where(Tutor.discipline == discipline)
    if province:
        query = query.where(University.province == province)
    if is_recruiting is not None:
        query = query.where(Tutor.is_recruiting == is_recruiting)
    if crawl_tier:
        query = query.where(Tutor.crawl_tier == crawl_tier)
    if has_h_index:
        query = query.where(Tutor.h_index.isnot(None))
    if research_area:
        # JSON 模糊匹配（SQLite 用 cast → string）
        query = query.where(Tutor.research_areas.cast(String).contains(research_area))
    if keyword:
        query = query.where(or_(
            Tutor.name.contains(keyword),
            University.name.contains(keyword),
            Department.name.contains(keyword),
            Tutor.title.contains(keyword),
            Tutor.research_areas.cast(String).contains(keyword),
        ))

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0

    # 排序：保证 NULL 在最后
    if sort == "paper_count":
        query = query.order_by(desc(Tutor.paper_count), Tutor.name)
    elif sort == "view_count":
        query = query.order_by(desc(Tutor.view_count), Tutor.name)
    elif sort == "citation_count":
        query = query.order_by(desc(func.coalesce(Tutor.citation_count, 0)), Tutor.name)
    elif sort == "h_index":
        query = query.order_by(desc(func.coalesce(Tutor.h_index, 0)), Tutor.name)
    elif sort == "completeness":
        # tier1 优先 + completeness 降序 + 名字
        query = query.order_by(
            _TIER_ORDER,
            desc(Tutor.profile_completeness),
            Tutor.name,
        )
    elif sort == "name":
        query = query.order_by(Tutor.name)
    else:
        query = query.order_by(_TIER_ORDER, Tutor.name)

    offset = (page - 1) * size
    rows = (await db.execute(query.offset(offset).limit(size))).all()
    items = [_tutor_to_item(t, u, d) for t, u, d in rows]

    return TutorListResponse(total=total, items=items)


async def get_tutor_detail(db: AsyncSession, tutor_id: int) -> TutorDetail | None:
    """获取导师详情"""
    result = await db.execute(
        select(Tutor, University, Department)
        .join(University, Tutor.university_id == University.id)
        .outerjoin(Department, Tutor.department_id == Department.id)
        .where(Tutor.id == tutor_id)
    )
    row = result.first()
    if not row:
        return None

    tutor, uni, dept = row

    # 先构造响应（避免后续 commit/rollback 影响 ORM 对象）
    item = _tutor_to_item(tutor, uni, dept)
    biography = tutor.biography or ""
    education = tutor.education or []
    experience = tutor.experience or []
    publications = tutor.publications or []
    projects = tutor.projects or []
    awards = tutor.awards or []
    recent_papers = tutor.recent_papers or []
    papers = getattr(tutor, "papers", None) or []
    coauthors = getattr(tutor, "coauthors", None) or []
    topics = getattr(tutor, "topics", None) or []
    yearly_stats = getattr(tutor, "yearly_stats", None) or []
    recruiting_requirements = tutor.recruiting_requirements
    phone = tutor.phone
    office_address = tutor.office_address
    source_url = tutor.source_url or ""
    crawl_source = getattr(tutor, "crawl_source", None)
    external_ids = getattr(tutor, "external_ids", None)
    last_crawled_at = (
        tutor.last_crawled_at.isoformat()
        if getattr(tutor, "last_crawled_at", None) else None
    )
    created_at = tutor.created_at.isoformat() if tutor.created_at else ""

    # 浏览量 +1（写锁冲突时静默跳过，不影响读）
    try:
        tutor.view_count = (tutor.view_count or 0) + 1
        await db.commit()
    except Exception:
        try:
            await db.rollback()
        except Exception:
            pass

    return TutorDetail(
        **item.model_dump(),
        biography=biography,
        education=education,
        experience=experience,
        publications=publications,
        projects=projects,
        awards=awards,
        recent_papers=recent_papers,
        papers=papers,
        coauthors=coauthors,
        topics=topics,
        yearly_stats=yearly_stats,
        recruiting_requirements=recruiting_requirements,
        phone=phone,
        office_address=office_address,
        source_url=source_url,
        crawl_source=crawl_source,
        external_ids=external_ids,
        last_crawled_at=last_crawled_at,
        created_at=created_at,
    )


# ====================================================================
# 统计接口（用于前端动态下拉菜单 / 仪表盘）
# ====================================================================

async def get_tutor_stats(db: AsyncSession) -> dict:
    """导师库总览统计

    返回：
      total: 总人数
      tier_distribution: {tier1: N, tier2: N, tier3: N}
      universities: [{name, count}] (按数量降序)
      provinces: [{name, count}]
      disciplines: [{name, count}]
    """
    # 总人数
    total = (await db.execute(select(func.count(Tutor.id)))).scalar() or 0

    # Tier 分布
    tier_q = await db.execute(
        select(Tutor.crawl_tier, func.count(Tutor.id))
        .group_by(Tutor.crawl_tier)
    )
    tier_dist = {tier: cnt for tier, cnt in tier_q.fetchall() if tier}

    # 学校分布
    uni_q = await db.execute(
        select(University.name, func.count(Tutor.id))
        .join(Tutor, Tutor.university_id == University.id)
        .group_by(University.name)
        .order_by(desc(func.count(Tutor.id)))
        .limit(50)
    )
    universities = [{"name": n, "count": c} for n, c in uni_q.fetchall()]

    # 省份分布
    prov_q = await db.execute(
        select(University.province, func.count(Tutor.id))
        .join(Tutor, Tutor.university_id == University.id)
        .where(University.province.isnot(None))
        .group_by(University.province)
        .order_by(desc(func.count(Tutor.id)))
    )
    provinces = [{"name": n, "count": c} for n, c in prov_q.fetchall()]

    # 学科分布
    disc_q = await db.execute(
        select(Tutor.discipline, func.count(Tutor.id))
        .where(Tutor.discipline.isnot(None))
        .where(Tutor.discipline != "")
        .where(Tutor.discipline != "未知")
        .group_by(Tutor.discipline)
        .order_by(desc(func.count(Tutor.id)))
    )
    disciplines = [{"name": n, "count": c} for n, c in disc_q.fetchall()]

    # 数据完整性指标
    quality_q = await db.execute(
        select(
            func.sum(case((Tutor.email.isnot(None), 1), else_=0)),
            func.sum(case((Tutor.avatar_url.isnot(None), 1), else_=0)),
            func.sum(case((Tutor.h_index.isnot(None), 1), else_=0)),
            func.sum(case((Tutor.biography.isnot(None), 1), else_=0)),
        )
    )
    email_cnt, avatar_cnt, h_cnt, bio_cnt = quality_q.fetchone() or (0, 0, 0, 0)

    return {
        "total": total,
        "tier_distribution": tier_dist,
        "universities": universities,
        "provinces": provinces,
        "disciplines": disciplines,
        "data_quality": {
            "with_email": email_cnt or 0,
            "with_avatar": avatar_cnt or 0,
            "with_h_index": h_cnt or 0,
            "with_biography": bio_cnt or 0,
        },
    }
