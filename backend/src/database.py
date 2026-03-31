"""数据库连接与会话管理"""

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from src.config import get_settings


def _create_engine():
    """创建异步数据库引擎"""
    settings = get_settings()
    url = settings.database_url

    connect_args = {}
    if url.startswith("sqlite"):
        # SQLite 需要允许多线程访问
        connect_args["check_same_thread"] = False

    return create_async_engine(
        url,
        echo=settings.DEBUG,
        connect_args=connect_args,
    )


engine = _create_engine()
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncSession:
    """FastAPI 依赖注入：获取数据库会话"""
    async with async_session() as session:
        yield session
