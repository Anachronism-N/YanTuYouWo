"""导师数据模型"""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, Boolean, DateTime, Text, ForeignKey, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base


class Tutor(Base):
    """导师表"""

    __tablename__ = "tutors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    university_id: Mapped[int] = mapped_column(Integer, ForeignKey("universities.id"), nullable=False)
    department_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("departments.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="姓名")
    title: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, comment="职称")
    research_areas: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, comment="研究方向")
    homepage_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True, comment="个人主页")
    email: Mapped[Optional[str]] = mapped_column(String(200), nullable=True, comment="邮箱")
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True, comment="头像")
    discipline: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, comment="学科门类")
    is_recruiting: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否招生")
    recruiting_info: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="招生方向描述")
    biography: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="个人简介")
    education: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, comment="教育经历")
    experience: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, comment="工作经历")
    publications: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, comment="代表论文")
    projects: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, comment="科研项目")
    awards: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, comment="获奖情况")
    recruiting_requirements: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="招生要求")
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    office_address: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    source_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True, comment="数据来源")
    paper_count: Mapped[int] = mapped_column(Integer, default=0)
    project_count: Mapped[int] = mapped_column(Integer, default=0)
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)

    __table_args__ = (
        Index("idx_tutor_university", "university_id"),
        Index("idx_tutor_discipline", "discipline"),
    )
