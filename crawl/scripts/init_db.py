"""初始化数据库 - 创建所有表"""

import asyncio
from loguru import logger


async def main():
    """初始化数据库"""
    from src.storage.database import init_db
    from src.config import settings

    # 确保目录存在
    settings.ensure_dirs()

    logger.info("开始初始化数据库...")
    logger.info(f"数据库 URL: {settings.DATABASE_URL}")

    await init_db()

    logger.info("✅ 数据库初始化完成！所有表已创建。")


if __name__ == "__main__":
    asyncio.run(main())
