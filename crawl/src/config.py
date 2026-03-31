from __future__ import annotations

"""配置管理模块 - 使用 Pydantic Settings 实现类型安全的配置"""

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """全局配置"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ========== SiliconFlow API ==========
    SILICONFLOW_API_KEY: str = ""
    SILICONFLOW_BASE_URL: str = "https://api.siliconflow.cn/v1"

    # ========== 数据库 ==========
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/yantu_crawl.db"

    # ========== 爬虫配置 ==========
    CRAWL_CONCURRENCY: int = 5  # 最大并发数
    CRAWL_DELAY_MIN: float = 2.0  # 最小请求间隔（秒）
    CRAWL_DELAY_MAX: float = 5.0  # 最大请求间隔（秒）
    CRAWL_RETRY_TIMES: int = 3  # 重试次数
    CRAWL_TIMEOUT: float = 30.0  # 请求超时（秒）

    # ========== 文件存储 ==========
    HTML_SNAPSHOT_DIR: str = "./data/snapshots"

    # ========== 日志 ==========
    LOG_LEVEL: str = "INFO"

    # ========== LLM 模型配置 ==========
    @property
    def llm_models(self) -> dict:
        """LLM 模型选择策略"""
        return {
            # 分类任务：使用最便宜的模型
            "classify": {
                "model": "Qwen/Qwen2.5-7B-Instruct",
                "max_tokens": 10,
                "temperature": 0.1,
            },
            # 信息提取：使用中等模型
            "extract": {
                "model": "Qwen/Qwen2.5-32B-Instruct",
                "max_tokens": 2000,
                "temperature": 0.1,
            },
            # 页面结构分析：使用较强模型
            "analyze": {
                "model": "Qwen/Qwen2.5-32B-Instruct",
                "max_tokens": 1000,
                "temperature": 0.1,
            },
        }

    def ensure_dirs(self):
        """确保必要的目录存在"""
        Path(self.HTML_SNAPSHOT_DIR).mkdir(parents=True, exist_ok=True)
        # 确保数据库目录存在
        db_path = self.DATABASE_URL.replace("sqlite+aiosqlite:///", "")
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)


# 全局配置单例
settings = Settings()
