"""数据模型包"""

from src.models.base import Base
from src.models.university import University, Department, DepartmentSource
from src.models.notice import AdmissionNotice, CrawlLog, CrawlState
from src.models.user import User, UserSettings, Favorite
from src.models.community import Post, Comment, Checkin, PostLike
from src.models.progress import Plan, Task, Achievement
from src.models.tutor import Tutor
from src.models.ai import ResumeDraft, InterviewSession

__all__ = [
    "Base",
    "University", "Department", "DepartmentSource",
    "AdmissionNotice", "CrawlLog", "CrawlState",
    "User", "UserSettings", "Favorite",
    "Post", "Comment", "Checkin", "PostLike",
    "Plan", "Task", "Achievement", "Tutor",
    "ResumeDraft", "InterviewSession",
]
