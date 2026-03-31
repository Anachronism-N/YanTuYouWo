"""通知业务逻辑"""

from __future__ import annotations

from datetime import date, datetime
from sqlalchemy import select, func, or_, and_, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.notice import AdmissionNotice
from src.models.university import University, Department
from src.schemas.notice import NoticeItem, NoticeDetail, NoticeListResponse


# 数据库中的 program_type 到前端 program_type_key 的映射
PROGRAM_TYPE_KEY_MAP = {
    "夏令营": "summer_camp",
    "预推免": "pre_admission",
    "宣讲会": "seminar",
    "入营名单": "admission_list",
    "直博": "other",
    "硕博连读": "other",
    "其他": "other",
}


def _compute_notice_status(notice: AdmissionNotice) -> str:
    """根据日期计算通知状态"""
    today = date.today()

    # 如果有报名截止日期
    if notice.registration_end:
        if notice.registration_start and today < notice.registration_start:
            return "not_started"
        if today <= notice.registration_end:
            return "registering"
        return "ended"

    # 如果有活动日期
    if notice.camp_end:
        if notice.camp_start and today < notice.camp_start:
            return "not_started"
        if today <= notice.camp_end:
            return "in_progress"
        return "ended"

    # 无日期信息，根据发布日期推断
    if notice.publish_date:
        days_since = (today - notice.publish_date).days
        if days_since > 180:
            return "ended"

    return "registering"


def _notice_to_item(notice: AdmissionNotice, university: University, department: Department | None) -> NoticeItem:
    """将数据库模型转换为前端 NoticeItem"""
    program_type = notice.program_type or "其他"
    program_type_key = PROGRAM_TYPE_KEY_MAP.get(program_type, "other")

    # 构建标签
    tags = []
    if notice.year:
        tags.append(f"{notice.year}年")
    if university.province:
        tags.append(university.province)
    if program_type != "其他":
        tags.append(program_type)

    return NoticeItem(
        id=notice.id,
        title=notice.title,
        university_name=university.name,
        department_name=department.name if department else "未知学院",
        school_level=university.level,
        program_type=program_type,
        program_type_key=program_type_key,
        target_degree=notice.target_degree or "硕士",
        disciplines=notice.disciplines or [],
        quota=notice.quota,
        registration_start=notice.registration_start.isoformat() if notice.registration_start else None,
        registration_end=notice.registration_end.isoformat() if notice.registration_end else None,
        camp_start=notice.camp_start.isoformat() if notice.camp_start else None,
        camp_end=notice.camp_end.isoformat() if notice.camp_end else None,
        publish_date=notice.publish_date.isoformat() if notice.publish_date else "",
        status=_compute_notice_status(notice),
        summary=notice.summary or notice.title,
        province=university.province,
        city=university.city,
        tags=tags,
        view_count=0,
        intent_count=0,
        application_rule="未知",
    )


def _notice_to_detail(notice: AdmissionNotice, university: University, department: Department | None) -> NoticeDetail:
    """将数据库模型转换为前端 NoticeDetail"""
    item = _notice_to_item(notice, university, department)
    return NoticeDetail(
        **item.model_dump(),
        requirements=notice.requirements,
        registration_url=notice.registration_url,
        official_url=notice.source_url,
        contact=notice.contact,
        raw_content=notice.raw_content or "",
        source_url=notice.source_url,
        created_at=notice.created_at.isoformat() if notice.created_at else "",
        prev_year_quota=None,
    )


async def get_notices(
    db: AsyncSession,
    *,
    type: str | None = None,
    school_level: str | None = None,
    province: str | None = None,
    university: str | None = None,
    discipline: str | None = None,
    keyword: str | None = None,
    status: str | None = None,
    sort: str = "latest",
    page: int = 1,
    size: int = 20,
) -> NoticeListResponse:
    """获取通知列表（分页、筛选、排序）"""

    # 基础查询：联表查询通知 + 高校 + 学院
    base_query = (
        select(AdmissionNotice, University, Department)
        .join(University, AdmissionNotice.university_id == University.id)
        .outerjoin(Department, AdmissionNotice.department_id == Department.id)
    )

    # 筛选条件
    conditions = []

    # 通知类型筛选
    if type and type != "all":
        # 前端传的是 key（如 summer_camp），需要映射回中文
        type_map = {v: k for k, v in PROGRAM_TYPE_KEY_MAP.items() if v != "other"}
        if type in type_map:
            conditions.append(AdmissionNotice.program_type == type_map[type])
        elif type == "other":
            conditions.append(
                or_(
                    AdmissionNotice.program_type == "其他",
                    AdmissionNotice.program_type == "直博",
                    AdmissionNotice.program_type == "硕博连读",
                    AdmissionNotice.program_type.is_(None),
                )
            )

    # 学校层次筛选
    if school_level:
        conditions.append(University.level == school_level)

    # 省份筛选
    if province:
        conditions.append(University.province == province)

    # 学校名称筛选
    if university:
        conditions.append(University.name.contains(university))

    # 学科筛选
    if discipline:
        # JSON 字段中搜索（SQLite 使用 LIKE）
        from sqlalchemy import String
        conditions.append(AdmissionNotice.disciplines.cast(String).contains(discipline))

    # 关键词搜索
    if keyword:
        conditions.append(
            or_(
                AdmissionNotice.title.contains(keyword),
                AdmissionNotice.summary.contains(keyword),
                University.name.contains(keyword),
                Department.name.contains(keyword),
            )
        )

    if conditions:
        base_query = base_query.where(and_(*conditions))

    # 统计总数
    count_query = select(func.count()).select_from(base_query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # 排序
    if sort == "latest":
        base_query = base_query.order_by(desc(AdmissionNotice.publish_date), desc(AdmissionNotice.id))
    elif sort == "deadline":
        base_query = base_query.order_by(asc(AdmissionNotice.registration_end), desc(AdmissionNotice.id))
    elif sort == "hot":
        base_query = base_query.order_by(desc(AdmissionNotice.id))

    # 分页
    offset = (page - 1) * size
    base_query = base_query.offset(offset).limit(size)

    result = await db.execute(base_query)
    rows = result.all()

    items = [_notice_to_item(notice, uni, dept) for notice, uni, dept in rows]

    # 如果需要状态筛选，在内存中过滤（因为状态是计算出来的）
    if status:
        items = [item for item in items if item.status == status]

    # 获取可用的筛选选项
    provinces_query = select(University.province).distinct().order_by(University.province)
    provinces_result = await db.execute(provinces_query)
    provinces = [row[0] for row in provinces_result.all() if row[0]]

    universities_query = select(University.name).distinct().order_by(University.name)
    universities_result = await db.execute(universities_query)
    universities_list = [row[0] for row in universities_result.all()]

    return NoticeListResponse(
        total=total,
        items=items,
        filters={
            "provinces": provinces,
            "disciplines": [],
            "universities": universities_list,
        },
    )


async def get_notice_detail(db: AsyncSession, notice_id: int) -> NoticeDetail | None:
    """获取通知详情"""
    query = (
        select(AdmissionNotice, University, Department)
        .join(University, AdmissionNotice.university_id == University.id)
        .outerjoin(Department, AdmissionNotice.department_id == Department.id)
        .where(AdmissionNotice.id == notice_id)
    )
    result = await db.execute(query)
    row = result.first()
    if not row:
        return None

    notice, uni, dept = row
    return _notice_to_detail(notice, uni, dept)


async def get_latest_notices(db: AsyncSession, limit: int = 10) -> NoticeListResponse:
    """获取最新通知"""
    query = (
        select(AdmissionNotice, University, Department)
        .join(University, AdmissionNotice.university_id == University.id)
        .outerjoin(Department, AdmissionNotice.department_id == Department.id)
        .order_by(desc(AdmissionNotice.publish_date), desc(AdmissionNotice.id))
        .limit(limit)
    )
    result = await db.execute(query)
    rows = result.all()

    items = [_notice_to_item(notice, uni, dept) for notice, uni, dept in rows]

    return NoticeListResponse(
        total=len(items),
        items=items,
        filters={},
    )
