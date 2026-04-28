"""
初始化 / 迁移导师相关表结构。

用途：
  - 新数据库：创建 `tutors` / `faculty_page_sources` / `tutor_crawl_logs` 三张表
  - 已有数据库：使用 `Base.metadata.create_all` 幂等创建；对旧版 `tutors` 表补齐新增列

用法：
  python scripts/init_tutor_tables.py                       # 使用 settings.DATABASE_URL
  python scripts/init_tutor_tables.py --db data/xxx.db      # 指定 SQLite 文件
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

from loguru import logger
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.models import Base  # noqa: E402
from src.models.tutor import Tutor, FacultyPageSource, TutorCrawlLog  # noqa: E402,F401
from src.config import settings  # noqa: E402


# 新增/补充到 tutors 表的列定义
# 仅用于老版数据库（existed before tier 字段）的渐进式迁移
_NEW_TUTOR_COLUMNS: list[tuple[str, str]] = [
    ("crawl_tier", "VARCHAR(20) DEFAULT 'tier3'"),
    ("profile_completeness", "INTEGER DEFAULT 0"),
    ("crawl_source", "VARCHAR(50)"),
    ("external_ids", "JSON"),
    ("last_crawled_at", "DATETIME"),
    ("h_index", "INTEGER"),
    ("i10_index", "INTEGER"),
    ("citation_count", "INTEGER"),
    ("recent_papers", "JSON"),
    ("papers", "JSON"),
    ("coauthors", "JSON"),
    ("topics", "JSON"),
    ("yearly_stats", "JSON"),
    ("recruiting_requirements", "TEXT"),
]


async def migrate(db_url: str) -> None:
    logger.info(f"连接数据库: {db_url}")
    engine = create_async_engine(db_url, echo=False)

    # Step 1: 创建缺失表（幂等）
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("✅ tutors / faculty_page_sources / tutor_crawl_logs 表已就绪")

    # Step 2: 对已存在的 tutors 表补列（SQLite）
    async with engine.begin() as conn:
        # 先查现有列
        result = await conn.execute(text("PRAGMA table_info(tutors)"))
        existing_cols = {row[1] for row in result.fetchall()}

        for col_name, col_def in _NEW_TUTOR_COLUMNS:
            if col_name not in existing_cols:
                sql = f"ALTER TABLE tutors ADD COLUMN {col_name} {col_def}"
                try:
                    await conn.execute(text(sql))
                    logger.info(f"  + 新增列 tutors.{col_name}")
                except Exception as e:
                    logger.warning(f"  ! 添加列 tutors.{col_name} 失败: {e}")

        # faculty_page_sources 的列检查（如果表已在老版本创建过）
        result = await conn.execute(text("PRAGMA table_info(faculty_page_sources)"))
        fp_cols = {row[1] for row in result.fetchall()}
        for col_name, col_def in [
            ("validation_score", "INTEGER"),
            ("discovery_method", "VARCHAR(50)"),
            ("last_tutor_count", "INTEGER DEFAULT 0"),
        ]:
            if col_name not in fp_cols:
                try:
                    await conn.execute(
                        text(f"ALTER TABLE faculty_page_sources ADD COLUMN {col_name} {col_def}")
                    )
                    logger.info(f"  + 新增列 faculty_page_sources.{col_name}")
                except Exception as e:
                    logger.warning(f"  ! {e}")

    await engine.dispose()
    logger.info("✅ 迁移完成")


def main():
    parser = argparse.ArgumentParser(description="初始化/迁移导师相关数据库表")
    parser.add_argument("--db", type=str, default=None, help="SQLite 文件路径（可选）")
    args = parser.parse_args()

    if args.db:
        db_path = Path(args.db).resolve()
        db_url = f"sqlite+aiosqlite:///{db_path}"
    else:
        db_url = settings.DATABASE_URL

    asyncio.run(migrate(db_url))


if __name__ == "__main__":
    main()
