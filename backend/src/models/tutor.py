"""导师数据模型 — 与爬虫系统共享"""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, Boolean, DateTime, Text, ForeignKey, JSON, Index, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base


class Tutor(Base):
    """导师表"""

    __tablename__ = "tutors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    university_id: Mapped[int] = mapped_column(Integer, ForeignKey("universities.id"), nullable=False)
    department_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("departments.id"), nullable=True)

    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="姓名")
    title: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    research_areas: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    homepage_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    discipline: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    is_recruiting: Mapped[bool] = mapped_column(Boolean, default=True)
    recruiting_info: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    recruiting_requirements: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    biography: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    education: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    experience: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    publications: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    projects: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    awards: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    office_address: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    source_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # 爬虫质量控制字段
    crawl_tier: Mapped[str] = mapped_column(String(20), default="tier3")
    profile_completeness: Mapped[int] = mapped_column(Integer, default=0)
    crawl_source: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    external_ids: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    last_crawled_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # 学术指标（C 阶段补充：OpenAlex 等外部数据源）
    paper_count: Mapped[int] = mapped_column(Integer, default=0)
    project_count: Mapped[int] = mapped_column(Integer, default=0)
    h_index: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    i10_index: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    citation_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    recent_papers: Mapped[Optional[list]] = mapped_column(
        JSON, nullable=True, comment="保留旧字段：近期 5 篇代表作（向后兼容）"
    )
    # ─── AMiner 级深度数据 ───
    papers: Mapped[Optional[list]] = mapped_column(
        JSON, nullable=True,
        comment="完整论文列表（最多 50 篇）[{title, venue, authors, year, citations, abstract, doi, url}]",
    )
    coauthors: Mapped[Optional[list]] = mapped_column(
        JSON, nullable=True,
        comment="主要合作者 [{name, openalex_id, works_together_count, last_year}]",
    )
    topics: Mapped[Optional[list]] = mapped_column(
        JSON, nullable=True,
        comment="研究主题分布 [{name, level, score, works_count}]",
    )
    yearly_stats: Mapped[Optional[list]] = mapped_column(
        JSON, nullable=True,
        comment="年度统计 [{year, works_count, cited_by_count}]",
    )

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
        return f"<Tutor(id={self.id}, name='{self.name}')>"
