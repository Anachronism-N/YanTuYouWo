"""院校业务逻辑"""

from __future__ import annotations

from sqlalchemy import select, func, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.university import University, Department
from src.models.notice import AdmissionNotice
from src.schemas.school import SchoolItem, SchoolDetail, SchoolListResponse, DepartmentItem


async def get_schools(
    db: AsyncSession,
    *,
    level: str | None = None,
    province: str | None = None,
    keyword: str | None = None,
    sort: str = "name",
    page: int = 1,
    size: int = 20,
) -> SchoolListResponse:
    """获取院校列表（分页、筛选、排序）"""

    # 子查询：每个学校的学院数量
    dept_count_subq = (
        select(
            Department.university_id,
            func.count(Department.id).label("dept_count"),
        )
        .group_by(Department.university_id)
        .subquery()
    )

    # 子查询：每个学校的通知数量
    notice_count_subq = (
        select(
            AdmissionNotice.university_id,
            func.count(AdmissionNotice.id).label("notice_count"),
        )
        .group_by(AdmissionNotice.university_id)
        .subquery()
    )

    # 主查询
    query = (
        select(
            University,
            func.coalesce(dept_count_subq.c.dept_count, 0).label("dept_count"),
            func.coalesce(notice_count_subq.c.notice_count, 0).label("notice_count"),
        )
        .outerjoin(dept_count_subq, University.id == dept_count_subq.c.university_id)
        .outerjoin(notice_count_subq, University.id == notice_count_subq.c.university_id)
    )

    # 筛选
    conditions = []
    if level:
        conditions.append(University.level == level)
    if province:
        conditions.append(University.province == province)
    if keyword:
        conditions.append(
            or_(
                University.name.contains(keyword),
                University.short_name.contains(keyword),
            )
        )

    if conditions:
        from sqlalchemy import and_
        query = query.where(and_(*conditions))

    # 统计总数
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # 排序
    if sort == "notice_count":
        query = query.order_by(desc("notice_count"), University.name)
    else:
        query = query.order_by(University.name)

    # 分页
    offset = (page - 1) * size
    query = query.offset(offset).limit(size)

    result = await db.execute(query)
    rows = result.all()

    items = [
        SchoolItem(
            id=uni.id,
            name=uni.name,
            short_name=uni.short_name or uni.name[:2],
            level=uni.level,
            province=uni.province,
            city=uni.city or "",
            homepage_url=uni.homepage_url or "",
            logo_url=None,
            department_count=dept_count,
            notice_count=notice_count,
        )
        for uni, dept_count, notice_count in rows
    ]

    return SchoolListResponse(total=total, items=items)


async def get_school_detail(db: AsyncSession, school_id: int) -> SchoolDetail | None:
    """获取院校详情（含学院列表）"""

    # 查询学校
    uni_result = await db.execute(
        select(University).where(University.id == school_id)
    )
    uni = uni_result.scalar_one_or_none()
    if not uni:
        return None

    # 查询学院列表及其通知数量
    dept_notice_subq = (
        select(
            AdmissionNotice.department_id,
            func.count(AdmissionNotice.id).label("notice_count"),
        )
        .where(AdmissionNotice.department_id.isnot(None))
        .group_by(AdmissionNotice.department_id)
        .subquery()
    )

    dept_query = (
        select(
            Department,
            func.coalesce(dept_notice_subq.c.notice_count, 0).label("notice_count"),
        )
        .outerjoin(dept_notice_subq, Department.id == dept_notice_subq.c.department_id)
        .where(Department.university_id == school_id)
        .order_by(Department.name)
    )
    dept_result = await db.execute(dept_query)
    dept_rows = dept_result.all()

    departments = [
        DepartmentItem(
            id=dept.id,
            name=dept.name,
            discipline_category=dept.discipline_category or "未分类",
            notice_count=notice_count,
            homepage_url=dept.homepage_url or "",
        )
        for dept, notice_count in dept_rows
    ]

    # 统计总通知数
    notice_count_result = await db.execute(
        select(func.count(AdmissionNotice.id)).where(AdmissionNotice.university_id == school_id)
    )
    total_notices = notice_count_result.scalar() or 0

    return SchoolDetail(
        id=uni.id,
        name=uni.name,
        short_name=uni.short_name or uni.name[:2],
        level=uni.level,
        province=uni.province,
        city=uni.city or "",
        homepage_url=uni.homepage_url or "",
        logo_url=None,
        department_count=len(departments),
        notice_count=total_notices,
        graduate_url=uni.graduate_url or "",
        departments=departments,
        description=None,
    )


async def get_school_departments(db: AsyncSession, school_id: int) -> list[DepartmentItem]:
    """获取院校下的学院列表"""
    detail = await get_school_detail(db, school_id)
    if not detail:
        return []
    return detail.departments


async def get_school_notices(
    db: AsyncSession,
    school_id: int,
    page: int = 1,
    size: int = 20,
):
    """获取院校下的通知列表"""
    from src.services.notice_service import get_notices
    uni_result = await db.execute(select(University.name).where(University.id == school_id))
    uni_name = uni_result.scalar_one_or_none()
    if not uni_name:
        from src.schemas.notice import NoticeListResponse
        return NoticeListResponse(total=0, items=[], filters={})
    return await get_notices(db, university=uni_name, page=page, size=size)
