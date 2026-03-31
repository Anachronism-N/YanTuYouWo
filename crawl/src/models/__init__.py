"""数据模型包"""

from src.models.base import Base
from src.models.university import University, Department, DepartmentSource
from src.models.notice import AdmissionNotice, CrawlLog, CrawlState

__all__ = [
    "Base",
    "University",
    "Department",
    "DepartmentSource",
    "AdmissionNotice",
    "CrawlLog",
    "CrawlState",
]
