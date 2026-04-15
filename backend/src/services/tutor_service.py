"""导师业务逻辑 — DB 优先，无数据时 Mock 降级"""

from __future__ import annotations

from sqlalchemy import select, func, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.tutor import Tutor
from src.models.university import University, Department
from src.schemas.tutor import TutorItem, TutorDetail, TutorListResponse


def _tutor_to_item(tutor: Tutor, uni: University, dept: Department | None) -> TutorItem:
    """将 DB 模型转换为前端 TutorItem"""
    return TutorItem(
        id=tutor.id,
        name=tutor.name,
        university_name=uni.name,
        department_name=dept.name if dept else "未知学院",
        school_level=uni.level,
        title=tutor.title or "教授",
        research_areas=tutor.research_areas or [],
        homepage_url=tutor.homepage_url,
        email=tutor.email,
        avatar_url=tutor.avatar_url,
        province=uni.province,
        city=uni.city or "",
        discipline=tutor.discipline or "未知",
        is_recruiting=tutor.is_recruiting,
        recruiting_info=tutor.recruiting_info,
        paper_count=tutor.paper_count,
        project_count=tutor.project_count,
        view_count=tutor.view_count,
    )


async def get_tutors(
    db: AsyncSession,
    *,
    university: str | None = None,
    discipline: str | None = None,
    keyword: str | None = None,
    is_recruiting: bool | None = None,
    province: str | None = None,
    sort: str = "name",
    page: int = 1,
    size: int = 20,
) -> TutorListResponse:
    """获取导师列表"""
    # 检查 DB 是否有导师数据
    count_r = await db.execute(select(func.count(Tutor.id)))
    db_count = count_r.scalar() or 0

    if db_count == 0:
        return _mock_tutor_list(page, size)

    query = (
        select(Tutor, University, Department)
        .join(University, Tutor.university_id == University.id)
        .outerjoin(Department, Tutor.department_id == Department.id)
    )

    if university:
        query = query.where(University.name.contains(university))
    if discipline:
        query = query.where(Tutor.discipline == discipline)
    if province:
        query = query.where(University.province == province)
    if is_recruiting is not None:
        query = query.where(Tutor.is_recruiting == is_recruiting)
    if keyword:
        query = query.where(or_(
            Tutor.name.contains(keyword),
            University.name.contains(keyword),
        ))

    total_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_q)).scalar() or 0

    if sort == "paper_count":
        query = query.order_by(desc(Tutor.paper_count))
    elif sort == "view_count":
        query = query.order_by(desc(Tutor.view_count))
    else:
        query = query.order_by(Tutor.name)

    offset = (page - 1) * size
    rows = (await db.execute(query.offset(offset).limit(size))).all()

    items = [_tutor_to_item(t, u, d) for t, u, d in rows]
    return TutorListResponse(total=total, items=items)


async def get_tutor_detail(db: AsyncSession, tutor_id: int) -> TutorDetail | None:
    """获取导师详情"""
    count_r = await db.execute(select(func.count(Tutor.id)))
    db_count = count_r.scalar() or 0

    if db_count == 0:
        return _mock_tutor_detail(tutor_id)

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
    tutor.view_count += 1
    await db.commit()

    item = _tutor_to_item(tutor, uni, dept)
    return TutorDetail(
        **item.model_dump(),
        biography=tutor.biography or "",
        education=tutor.education or [],
        experience=tutor.experience or [],
        publications=tutor.publications or [],
        projects=tutor.projects or [],
        awards=tutor.awards or [],
        recruiting_requirements=tutor.recruiting_requirements,
        phone=tutor.phone,
        office_address=tutor.office_address,
        source_url=tutor.source_url or "",
        created_at=tutor.created_at.isoformat() if tutor.created_at else "",
    )


# ════════════════════════════════════════
# Mock 数据 — DB 无导师时使用
# ════════════════════════════════════════

_MOCK_TUTORS = [
    {"id": 1, "name": "张明", "university_name": "清华大学", "department_name": "计算机科学与技术系", "school_level": "985",
     "title": "教授", "research_areas": ["自然语言处理", "大语言模型"], "discipline": "工学",
     "province": "北京", "city": "北京", "paper_count": 86, "project_count": 12, "view_count": 2340,
     "is_recruiting": True, "recruiting_info": "欢迎 NLP/LLM 方向的同学报考"},
    {"id": 2, "name": "李芳", "university_name": "北京大学", "department_name": "信息科学技术学院", "school_level": "985",
     "title": "副教授", "research_areas": ["计算机视觉", "多模态学习"], "discipline": "工学",
     "province": "北京", "city": "北京", "paper_count": 45, "project_count": 8, "view_count": 1560,
     "is_recruiting": True, "recruiting_info": "招收 CV/多模态方向硕博生"},
    {"id": 3, "name": "王强", "university_name": "浙江大学", "department_name": "计算机科学与技术学院", "school_level": "985",
     "title": "教授", "research_areas": ["机器学习", "数据挖掘"], "discipline": "工学",
     "province": "浙江", "city": "杭州", "paper_count": 72, "project_count": 15, "view_count": 1890,
     "is_recruiting": True, "recruiting_info": "欢迎有数学基础的同学"},
    {"id": 4, "name": "赵雪", "university_name": "复旦大学", "department_name": "经济学院", "school_level": "985",
     "title": "教授", "research_areas": ["金融科技", "量化分析"], "discipline": "经济学",
     "province": "上海", "city": "上海", "paper_count": 38, "project_count": 6, "view_count": 980,
     "is_recruiting": True, "recruiting_info": None},
    {"id": 5, "name": "刘洋", "university_name": "上海交通大学", "department_name": "电子信息与电气工程学院", "school_level": "985",
     "title": "副教授", "research_areas": ["强化学习", "机器人"], "discipline": "工学",
     "province": "上海", "city": "上海", "paper_count": 52, "project_count": 9, "view_count": 1230,
     "is_recruiting": False, "recruiting_info": None},
    {"id": 6, "name": "陈静", "university_name": "南京大学", "department_name": "法学院", "school_level": "985",
     "title": "教授", "research_areas": ["知识产权法", "国际法"], "discipline": "法学",
     "province": "江苏", "city": "南京", "paper_count": 28, "project_count": 4, "view_count": 670,
     "is_recruiting": True, "recruiting_info": "欢迎法学保研同学"},
]


def _mock_tutor_list(page: int, size: int) -> TutorListResponse:
    """Mock 导师列表"""
    items = [TutorItem(**{**t, "homepage_url": None, "email": None, "avatar_url": None}) for t in _MOCK_TUTORS]
    total = len(items)
    offset = (page - 1) * size
    return TutorListResponse(total=total, items=items[offset:offset + size])


def _mock_tutor_detail(tutor_id: int) -> TutorDetail | None:
    """Mock 导师详情"""
    for t in _MOCK_TUTORS:
        if t["id"] == tutor_id:
            return TutorDetail(
                **{**t, "homepage_url": None, "email": f"{t['name']}@example.com", "avatar_url": None},
                biography=f"{t['name']}教授，{t['university_name']}{t['department_name']}，研究方向为{'、'.join(t['research_areas'])}。",
                education=[f"{t['university_name']} 博士"],
                experience=[f"{t['university_name']} {t['title']}"],
                publications=[f"论文 {i+1}: {t['research_areas'][0]}相关研究" for i in range(3)],
                projects=[f"项目: {t['research_areas'][0]}方向课题"],
                awards=["优秀教师奖"],
                source_url="#",
                created_at="2026-01-01T00:00:00",
            )
    return None
