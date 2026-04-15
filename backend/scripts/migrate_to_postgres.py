"""
SQLite -> PostgreSQL 数据迁移脚本

将本地 crawl/data/large_scale_test.db 中的数据迁移到远程 PostgreSQL。

用法：
    cd backend
    DATABASE_URL="postgresql+asyncpg://user:pass@host:port/dbname" \
        python scripts/migrate_to_postgres.py

    可选参数：
        --sqlite-path  指定 SQLite 文件路径（默认自动查找）
        --tables       只迁移指定表（逗号分隔）
        --dry-run      只打印统计信息，不实际迁移
"""

import asyncio
import argparse
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text, inspect
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from src.models import Base

TABLE_ORDER = [
    "universities",
    "departments",
    "department_sources",
    "admission_notices",
    "crawl_logs",
    "crawl_states",
    "tutors",
    "users",
    "user_settings",
    "favorites",
    "posts",
    "comments",
    "post_likes",
    "checkins",
    "plans",
    "tasks",
    "achievements",
    "resume_drafts",
    "interview_sessions",
]

BATCH_SIZE = 500


def get_default_sqlite_path() -> Path:
    return Path(__file__).parent.parent.parent / "crawl" / "data" / "large_scale_test.db"


def read_sqlite_table(conn: sqlite3.Connection, table: str) -> tuple[list[str], list[tuple]]:
    cursor = conn.execute(f"PRAGMA table_info({table})")
    columns = [row[1] for row in cursor.fetchall()]
    cursor = conn.execute(f"SELECT * FROM {table}")
    rows = cursor.fetchall()
    return columns, rows


async def create_tables(pg_engine):
    async with pg_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("[OK] PostgreSQL 表结构已创建")


async def insert_batch(session: AsyncSession, table: str, columns: list[str], rows: list[tuple]):
    if not rows:
        return
    col_str = ", ".join(f'"{c}"' for c in columns)
    param_str = ", ".join(f":{c}" for c in columns)
    stmt = text(f'INSERT INTO {table} ({col_str}) VALUES ({param_str})')
    data = [dict(zip(columns, row)) for row in rows]
    await session.execute(stmt, data)


async def reset_sequence(session: AsyncSession, table: str):
    """Reset PostgreSQL auto-increment sequence to max(id) + 1"""
    result = await session.execute(text(f"SELECT MAX(id) FROM {table}"))
    max_id = result.scalar()
    if max_id is not None:
        seq_name = f"{table}_id_seq"
        await session.execute(text(f"SELECT setval('{seq_name}', {max_id})"))


async def migrate(pg_url: str, sqlite_path: Path, tables: list[str] | None, dry_run: bool):
    if not sqlite_path.exists():
        print(f"[ERROR] SQLite 文件不存在: {sqlite_path}")
        sys.exit(1)

    print(f"[INFO] SQLite: {sqlite_path}")
    print(f"[INFO] PostgreSQL: {pg_url.split('@')[1] if '@' in pg_url else '***'}")
    print()

    sqlite_conn = sqlite3.connect(str(sqlite_path))

    all_tables = TABLE_ORDER if tables is None else [t for t in TABLE_ORDER if t in tables]

    table_stats = {}
    for table in all_tables:
        columns, rows = read_sqlite_table(sqlite_conn, table)
        table_stats[table] = (columns, rows)
        print(f"  {table}: {len(rows)} 行, {len(columns)} 列")

    total_rows = sum(len(rows) for _, (_, rows) in table_stats.items())
    print(f"\n  总计: {total_rows} 行")

    if dry_run:
        print("\n[DRY-RUN] 只打印统计，不实际迁移")
        sqlite_conn.close()
        return

    print("\n[INFO] 开始迁移...")

    pg_engine = create_async_engine(pg_url, echo=False, pool_size=5)
    await create_tables(pg_engine)

    session_factory = async_sessionmaker(pg_engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        for table in all_tables:
            columns, rows = table_stats[table]
            if not rows:
                print(f"  {table}: 跳过（空表）")
                continue

            existing = await session.execute(text(f"SELECT COUNT(*) FROM {table}"))
            if existing.scalar() > 0:
                print(f"  {table}: 跳过（目标表已有数据，共 {existing.scalar()} 行）")
                continue

            for i in range(0, len(rows), BATCH_SIZE):
                batch = rows[i:i + BATCH_SIZE]
                await insert_batch(session, table, columns, batch)

            try:
                await reset_sequence(session, table)
            except Exception:
                pass

            print(f"  {table}: 已迁移 {len(rows)} 行")

        await session.commit()

    await pg_engine.dispose()
    sqlite_conn.close()
    print("\n[OK] 迁移完成!")


def main():
    parser = argparse.ArgumentParser(description="SQLite -> PostgreSQL 数据迁移")
    parser.add_argument("--sqlite-path", type=str, default=None, help="SQLite 文件路径")
    parser.add_argument("--tables", type=str, default=None, help="只迁移指定表（逗号分隔）")
    parser.add_argument("--dry-run", action="store_true", help="只打印统计")
    args = parser.parse_args()

    import os
    pg_url = os.environ.get("DATABASE_URL")
    if not pg_url:
        print("[ERROR] 请设置 DATABASE_URL 环境变量")
        print("  例: DATABASE_URL='postgresql+asyncpg://user:pass@host:port/dbname' python scripts/migrate_to_postgres.py")
        sys.exit(1)

    if not pg_url.startswith("postgresql"):
        print(f"[ERROR] DATABASE_URL 必须是 PostgreSQL 连接串，当前: {pg_url[:30]}...")
        sys.exit(1)

    sqlite_path = Path(args.sqlite_path) if args.sqlite_path else get_default_sqlite_path()
    tables = args.tables.split(",") if args.tables else None

    asyncio.run(migrate(pg_url, sqlite_path, tables, args.dry_run))


if __name__ == "__main__":
    main()
