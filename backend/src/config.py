"""应用配置管理"""

from __future__ import annotations

import logging
from pathlib import Path
from functools import lru_cache
from pydantic_settings import BaseSettings

_DEFAULT_SECRET = "yantu-dev-secret-change-in-production-2026"


class Settings(BaseSettings):
    """应用配置，从环境变量或 .env 文件读取"""

    # 数据库
    DATABASE_URL: str = ""

    # CORS（生产环境改为实际域名，逗号分隔多个）
    CORS_ORIGINS: str = "http://localhost:3000"

    # JWT
    JWT_SECRET_KEY: str = _DEFAULT_SECRET
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_DAYS: int = 7

    # AI / LLM
    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = "https://api.siliconflow.cn/v1"
    OPENAI_MODEL: str = "Qwen/Qwen2.5-7B-Instruct"

    # 应用
    DEBUG: bool = True

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }

    @property
    def is_production(self) -> bool:
        """是否为生产环境"""
        return not self.DEBUG

    @property
    def database_url(self) -> str:
        """获取数据库 URL"""
        if self.DATABASE_URL:
            url = self.DATABASE_URL
            if url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql+asyncpg://", 1)
            elif url.startswith("postgresql://") and "+asyncpg" not in url:
                url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
            return url
        db_path = Path(__file__).parent.parent.parent / "crawl" / "data" / "large_scale_test.db"
        return f"sqlite+aiosqlite:///{db_path}"

    @property
    def cors_origins(self) -> list[str]:
        """解析 CORS 允许的源"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    def validate_production(self):
        """生产环境检查：在非 DEBUG 模式下验证关键配置"""
        logger = logging.getLogger("yantu")
        if self.JWT_SECRET_KEY == _DEFAULT_SECRET:
            if self.is_production:
                raise RuntimeError("生产环境必须设置 JWT_SECRET_KEY（不能使用默认值）")
            else:
                logger.warning("⚠️  JWT_SECRET_KEY 使用默认值，仅限开发环境")
        if not self.OPENAI_API_KEY:
            logger.info("AI 功能：未配置 OPENAI_API_KEY，将使用 Mock 模式")


@lru_cache
def get_settings() -> Settings:
    """获取全局配置单例"""
    return Settings()
