"""日志配置模块 - 使用 loguru"""

import sys
from loguru import logger

from src.config import settings


def setup_logger():
    """配置全局日志"""
    # 移除默认处理器
    logger.remove()

    # 控制台输出
    logger.add(
        sys.stderr,
        level=settings.LOG_LEVEL,
        format=(
            "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
            "<level>{level: <8}</level> | "
            "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | "
            "<level>{message}</level>"
        ),
        colorize=True,
    )

    # 文件输出（按天轮转）
    logger.add(
        "data/logs/crawl_{time:YYYY-MM-DD}.log",
        level="DEBUG",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} | {message}",
        rotation="00:00",  # 每天午夜轮转
        retention="30 days",  # 保留 30 天
        compression="gz",  # 压缩旧日志
        encoding="utf-8",
    )

    # 错误日志单独记录
    logger.add(
        "data/logs/error_{time:YYYY-MM-DD}.log",
        level="ERROR",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} | {message}",
        rotation="00:00",
        retention="60 days",
        compression="gz",
        encoding="utf-8",
    )

    return logger


_initialized = False


def ensure_logger():
    """确保日志已初始化（延迟初始化，避免导入时阻塞）"""
    global _initialized
    if not _initialized:
        setup_logger()
        _initialized = True
