from __future__ import annotations

"""高校与学院数据模型"""

from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Integer, Boolean, DateTime, Text, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base


class University(Base):
    """高校表"""

    __tablename__ = "universities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, comment="高校名称")
    short_name: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, comment="简称")
    level: Mapped[str] = mapped_column(String(20), nullable=False, comment="层次: 985/211/双一流/普通")
    province: Mapped[str] = mapped_column(String(20), nullable=False, comment="所在省份")
    city: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, comment="所在城市")
    homepage_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True, comment="官网首页")
    graduate_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True, comment="研究生院/研招网 URL")
    dept_list_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True, comment="院系列表页 URL")
    chsi_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, comment="研招网院校 ID")
    auto_discovered: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否全自动发现")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)

    # 关系
    departments: Mapped[List["Department"]] = relationship(back_populates="university", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<University(id={self.id}, name='{self.name}', level='{self.level}')>"


class Department(Base):
    """学院表"""

    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    university_id: Mapped[int] = mapped_column(Integer, ForeignKey("universities.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="学院名称")
    chsi_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True, comment="研招网中的招生单位名称")
    homepage_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True, comment="学院官网首页")
    discipline_category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, comment="学科门类")
    auto_discovered: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否全自动发现")
    discovery_method: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True, comment="发现方式: nav_keyword/url_pattern/playwright/llm/search_engine"
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否启用爬取")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)

    # 关系
    university: Mapped["University"] = relationship(back_populates="departments")
    sources: Mapped[List["DepartmentSource"]] = relationship(back_populates="department", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Department(id={self.id}, name='{self.name}')>"


class DepartmentSource(Base):
    """学院信息源表 - 一个学院可能有多个信息发布页"""

    __tablename__ = "department_sources"
    __table_args__ = (
        UniqueConstraint("department_id", "source_url", name="uq_dept_source_url"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    department_id: Mapped[int] = mapped_column(Integer, ForeignKey("departments.id"), nullable=False)
    source_url: Mapped[str] = mapped_column(String(500), nullable=False, comment="信息源 URL")
    source_type: Mapped[str] = mapped_column(
        String(50), nullable=False, default="学院通知", comment="类型: 学院通知/学院招生/研究生院/研招办"
    )
    priority: Mapped[int] = mapped_column(Integer, default=1, comment="优先级（1 最高）")
    parser_type: Mapped[str] = mapped_column(
        String(50), default="auto", comment="解析器类型: auto/css_selector/llm"
    )
    parser_config: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True, comment="解析配置")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否启用")
    last_success_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, comment="上次成功爬取时间")
    fail_count: Mapped[int] = mapped_column(Integer, default=0, comment="连续失败次数")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)

    # 关系
    department: Mapped["Department"] = relationship(back_populates="sources")

    def __repr__(self) -> str:
        return f"<DepartmentSource(id={self.id}, url='{self.source_url[:50]}...')>"
