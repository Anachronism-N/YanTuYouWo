"""应用配置管理"""

from __future__ import annotations

from pathlib import Path
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """应用配置，从环境变量或 .env 文件读取"""

    # 数据库
    DATABASE_URL: str = ""

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000"

    # 应用
    DEBUG: bool = True

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }

    @property
    def database_url(self) -> str:
        """获取数据库 URL，默认使用爬虫系统的 SQLite 数据库"""
        if self.DATABASE_URL:
            return self.DATABASE_URL
        # 默认使用爬虫系统的数据库（相对于 backend/ 目录）
        db_path = Path(__file__).parent.parent.parent / "crawl" / "data" / "large_scale_test.db"
        return f"sqlite+aiosqlite:///{db_path}"

    @property
    def cors_origins(self) -> list[str]:
        """解析 CORS 允许的源"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]


@lru_cache
def get_settings() -> Settings:
    """获取全局配置单例"""
    return Settings()
