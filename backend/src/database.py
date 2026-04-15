"""数据库连接与会话管理"""

from sqlalchemy import event
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from src.config import get_settings


def _create_engine():
    """创建异步数据库引擎"""
    settings = get_settings()
    url = settings.database_url

    connect_args = {}
    kwargs = {}

    if url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
    else:
        kwargs["pool_size"] = 10
        kwargs["max_overflow"] = 20
        kwargs["pool_recycle"] = 3600

    eng = create_async_engine(
        url,
        echo=False,
        connect_args=connect_args,
        **kwargs,
    )

    # SQLite WAL mode: 防止 "database is locked" 并发写冲突
    if url.startswith("sqlite"):
        @event.listens_for(eng.sync_engine, "connect")
        def _set_sqlite_pragma(dbapi_conn, connection_record):
            cursor = dbapi_conn.cursor()
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA busy_timeout=5000")
            cursor.close()

    return eng


engine = _create_engine()
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncSession:
    """FastAPI 依赖注入：获取数据库会话"""
    async with async_session() as session:
        yield session
