from __future__ import annotations

"""导师与师资页数据模型 — 供爬虫侧写入，表结构与 backend 一致"""

from datetime import datetime
from typing import Optional
from sqlalchemy import (
    String, Integer, Boolean, DateTime, Text, ForeignKey, JSON, Index,
    UniqueConstraint, Float,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base


class Tutor(Base):
    """导师表（与 backend/src/models/tutor.py 字段一致）"""

    __tablename__ = "tutors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    university_id: Mapped[int] = mapped_column(Integer, ForeignKey("universities.id"), nullable=False)
    department_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("departments.id"), nullable=True,
    )

    # 基础信息
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="姓名")
    title: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    research_areas: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    homepage_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    discipline: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # 招生信息
    is_recruiting: Mapped[bool] = mapped_column(Boolean, default=True)
    recruiting_info: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    recruiting_requirements: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # 详细内容
    biography: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    education: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    experience: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    publications: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    projects: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    awards: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    # 联系方式
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    office_address: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # 质量控制
    source_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    crawl_tier: Mapped[str] = mapped_column(String(20), default="tier3")
    profile_completeness: Mapped[int] = mapped_column(Integer, default=0)
    crawl_source: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    external_ids: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    last_crawled_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # 学术指标
    paper_count: Mapped[int] = mapped_column(Integer, default=0)
    project_count: Mapped[int] = mapped_column(Integer, default=0)
    h_index: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    i10_index: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    citation_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    recent_papers: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    # AMiner 级深度数据
    papers: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    coauthors: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    topics: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    yearly_stats: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    view_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)

    __table_args__ = (
        Index("idx_tutor_university", "university_id"),
        Index("idx_tutor_department", "department_id"),
        Index("idx_tutor_discipline", "discipline"),
        Index("idx_tutor_tier", "crawl_tier"),
        Index("idx_tutor_recruiting", "is_recruiting"),
        UniqueConstraint("department_id", "name", "homepage_url", name="uq_tutor_dept_name_home"),
    )

    def __repr__(self) -> str:
        return f"<Tutor(id={self.id}, name='{self.name}', tier='{self.crawl_tier}')>"


class FacultyPageSource(Base):
    """学院师资页来源表 — 类似 DepartmentSource 但用于导师列表页"""

    __tablename__ = "faculty_page_sources"
    __table_args__ = (
        UniqueConstraint("department_id", "source_url", name="uq_faculty_source_url"),
        Index("idx_faculty_source_dept", "department_id"),
        Index("idx_faculty_source_active", "is_active"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    department_id: Mapped[int] = mapped_column(Integer, ForeignKey("departments.id"), nullable=False)
    source_url: Mapped[str] = mapped_column(String(500), nullable=False)
    source_type: Mapped[str] = mapped_column(String(50), default="faculty_list")
    priority: Mapped[int] = mapped_column(Integer, default=1)
    parser_type: Mapped[str] = mapped_column(String(50), default="auto")
    parser_config: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    validation_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    discovery_method: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_success_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_tutor_count: Mapped[int] = mapped_column(Integer, default=0)
    fail_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)

    def __repr__(self) -> str:
        return (
            f"<FacultyPageSource(dept={self.department_id}, "
            f"type='{self.source_type}', url='{self.source_url[:40]}...')>"
        )


class TutorCrawlLog(Base):
    """导师爬取日志"""

    __tablename__ = "tutor_crawl_logs"
    __table_args__ = (
        Index("idx_tutor_crawl_log_tutor", "tutor_id"),
        Index("idx_tutor_crawl_log_time", "crawl_time"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tutor_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("tutors.id"), nullable=True)
    faculty_source_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("faculty_page_sources.id"), nullable=True,
    )
    crawl_time: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    stage: Mapped[str] = mapped_column(String(30))
    status: Mapped[str] = mapped_column(String(20), default="success")
    tier_assigned: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    completeness: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    fields_extracted: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    duration_seconds: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    llm_model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
