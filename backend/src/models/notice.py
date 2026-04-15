"""推免通知与爬取日志数据模型 — 与爬虫系统共享"""

from __future__ import annotations

from datetime import datetime, date
from typing import Optional
from sqlalchemy import String, Integer, Float, DateTime, Date, Text, ForeignKey, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base


class AdmissionNotice(Base):
    """推免通知表"""

    __tablename__ = "admission_notices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    department_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("departments.id"), nullable=True, comment="外键 → Department"
    )
    university_id: Mapped[int] = mapped_column(Integer, ForeignKey("universities.id"), nullable=False)
    source_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("department_sources.id"), nullable=True, comment="外键 → DepartmentSource"
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False, comment="通知标题")
    source_url: Mapped[str] = mapped_column(String(500), nullable=False, unique=True, comment="原文链接")
    publish_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True, comment="发布日期")
    program_type: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True, comment="类型: 夏令营/预推免/直博/其他"
    )
    year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, comment="招生年份")
    target_degree: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, comment="目标学位: 硕士/博士/硕博")
    disciplines: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, comment="招生学科列表")
    quota: Mapped[Optional[str]] = mapped_column(String(200), nullable=True, comment="招生名额")
    requirements: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="申请条件")
    registration_start: Mapped[Optional[date]] = mapped_column(Date, nullable=True, comment="报名开始")
    registration_end: Mapped[Optional[date]] = mapped_column(Date, nullable=True, comment="报名截止")
    camp_start: Mapped[Optional[date]] = mapped_column(Date, nullable=True, comment="活动开始")
    camp_end: Mapped[Optional[date]] = mapped_column(Date, nullable=True, comment="活动结束")
    registration_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True, comment="报名链接")
    contact: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="联系方式")
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="摘要")
    raw_content: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="原始正文")
    images: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, comment="图片列表 [{url, alt, width, height}]")
    raw_html_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True, comment="原始 HTML 快照文件路径")
    llm_model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, comment="使用的 LLM 模型名称")
    llm_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True, comment="LLM 提取置信度")
    relevance_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True, comment="规则过滤器的相关性评分")
    status: Mapped[str] = mapped_column(
        String(20), default="pending", comment="状态: pending/published/rejected"
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)

    # 索引
    __table_args__ = (
        Index("idx_notice_university", "university_id"),
        Index("idx_notice_department", "department_id"),
        Index("idx_notice_type", "program_type"),
        Index("idx_notice_status", "status"),
        Index("idx_notice_publish_date", "publish_date"),
    )

    def __repr__(self) -> str:
        return f"<AdmissionNotice(id={self.id}, title='{self.title[:30]}...')>"


class CrawlLog(Base):
    """爬取日志表"""

    __tablename__ = "crawl_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("department_sources.id"), nullable=True)
    department_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("departments.id"), nullable=True)
    crawl_time: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    total_items: Mapped[int] = mapped_column(Integer, default=0, comment="列表页总条目数")
    new_items: Mapped[int] = mapped_column(Integer, default=0, comment="新发现条目数")
    relevant_items: Mapped[int] = mapped_column(Integer, default=0, comment="推免相关条目数")
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="错误信息")
    duration_seconds: Mapped[Optional[float]] = mapped_column(Float, nullable=True, comment="耗时（秒）")

    def __repr__(self) -> str:
        return f"<CrawlLog(id={self.id}, source_id={self.source_id}, new_items={self.new_items})>"


class CrawlState(Base):
    """增量爬取状态表"""

    __tablename__ = "crawl_states"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("department_sources.id"), nullable=False, unique=True
    )
    last_crawl_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, comment="上次爬取时间")
    last_notice_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True, comment="上次最新通知的日期")
    last_notice_count: Mapped[int] = mapped_column(Integer, default=0, comment="上次列表页条目数")
    consecutive_no_update: Mapped[int] = mapped_column(Integer, default=0, comment="连续无更新次数")

    def __repr__(self) -> str:
        return f"<CrawlState(source_id={self.source_id}, last_crawl={self.last_crawl_time})>"
