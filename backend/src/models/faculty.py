"""导师爬取支持表 — 师资页 URL 库 + 爬取日志

与 `DepartmentSource`/`CrawlLog` 的关系类似：
  - `FacultyPageSource` 存储每个学院的师资/导师列表页 URL（多源），由爬虫阶段 A 填充
  - `TutorCrawlLog`     记录每位导师的爬取细节（耗时、字段数、错误）
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, Boolean, DateTime, Text, ForeignKey, JSON, Index, UniqueConstraint, Float
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base


class FacultyPageSource(Base):
    """学院师资页来源表

    一个学院可能有多个师资列表页（博导名录、全体教师、按方向分组等），都记录下来。
    """

    __tablename__ = "faculty_page_sources"
    __table_args__ = (
        UniqueConstraint("department_id", "source_url", name="uq_faculty_source_url"),
        Index("idx_faculty_source_dept", "department_id"),
        Index("idx_faculty_source_active", "is_active"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    department_id: Mapped[int] = mapped_column(Integer, ForeignKey("departments.id"), nullable=False)
    source_url: Mapped[str] = mapped_column(String(500), nullable=False, comment="师资页 URL")
    source_type: Mapped[str] = mapped_column(
        String(50), default="faculty_list",
        comment="类型: faculty_list(师资名录) / advisor_list(博导名录) / research_group(研究组) / by_discipline(按学科)",
    )
    priority: Mapped[int] = mapped_column(Integer, default=1, comment="优先级（1 最高）")
    parser_type: Mapped[str] = mapped_column(
        String(50), default="auto", comment="解析器类型: auto/css_selector/llm",
    )
    parser_config: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True, comment="自定义解析配置（CSS 选择器等）",
    )
    validation_score: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True, comment="定位阶段的验证评分 0-100",
    )
    discovery_method: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True,
        comment="发现方式: nav_keyword/url_pattern/playwright/llm/path_guess/graduate_fallback",
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_success_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_tutor_count: Mapped[int] = mapped_column(Integer, default=0, comment="上次解析到的教师数")
    fail_count: Mapped[int] = mapped_column(Integer, default=0, comment="连续失败次数")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)


class TutorCrawlLog(Base):
    """导师爬取日志 — 每次爬取每位导师记录一条"""

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
    stage: Mapped[str] = mapped_column(
        String(30), comment="阶段: A_locate/B1_list/B2_profile/C_enrich",
    )
    status: Mapped[str] = mapped_column(
        String(20), default="success",
        comment="success/failed/partial/anti_crawl",
    )
    tier_assigned: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    completeness: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    fields_extracted: Mapped[Optional[list]] = mapped_column(
        JSON, nullable=True, comment="成功提取的字段名列表",
    )
    duration_seconds: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    llm_model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
