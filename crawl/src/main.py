"""
研途有我 - 爬虫系统主入口

用法：
    python -m src.main init-db      # 初始化数据库
    python -m src.main discover     # 运行阶段一+二：自动发现高校学院 + 定位信息页
    python -m src.main crawl        # 运行阶段三：爬取推免信息
    python -m src.main schedule     # 启动定时调度器
    python -m src.main test-llm     # 测试 LLM 连接
"""

import asyncio
import sys

from loguru import logger

from src.config import settings


async def cmd_init_db():
    """初始化数据库"""
    from src.storage.database import init_db

    settings.ensure_dirs()
    logger.info("初始化数据库...")
    await init_db()
    logger.info("✅ 数据库初始化完成")


async def cmd_test_llm():
    """测试 LLM 连接"""
    from src.llm.client import llm_client

    logger.info("测试 LLM 连接...")
    logger.info(f"API Base URL: {settings.SILICONFLOW_BASE_URL}")
    logger.info(f"API Key: {settings.SILICONFLOW_API_KEY[:10]}...")

    try:
        # 测试分类功能
        result = await llm_client.classify(
            title="2026年计算机学院推免夏令营招生通知",
            content="为选拔优秀大学生，我院将于2026年7月举办推免夏令营..."
        )
        logger.info(f"分类测试结果: {'相关' if result else '不相关'} ✅")

        # 测试提取功能
        extract_result = await llm_client.extract(
            "北京大学计算机学院2026年推免夏令营招生通知\n"
            "报名时间：2026年4月1日至5月15日\n"
            "活动时间：2026年7月1日至7月5日\n"
            "招收硕士和博士研究生，名额30人\n"
            "要求GPA排名前20%"
        )
        logger.info(f"提取测试结果: {extract_result}")
        logger.info("✅ LLM 连接测试通过")
    except Exception as e:
        logger.error(f"❌ LLM 连接测试失败: {e}")


async def cmd_discover():
    """运行自动发现流程（阶段一 + 阶段二）"""
    from scripts.run_discovery import main as discovery_main
    await discovery_main()


async def cmd_crawl():
    """运行爬取流程（阶段三）"""
    from scripts.run_crawl import main as crawl_main
    await crawl_main()


async def cmd_schedule():
    """启动定时调度器"""
    logger.info("⏰ 启动定时调度器...")
    logger.info("（此功能将在后续开发中实现）")
    # TODO: 实现 APScheduler 定时调度


def main():
    """主入口"""
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    command = sys.argv[1]

    commands = {
        "init-db": cmd_init_db,
        "test-llm": cmd_test_llm,
        "discover": cmd_discover,
        "crawl": cmd_crawl,
        "schedule": cmd_schedule,
    }

    if command not in commands:
        print(f"未知命令: {command}")
        print(__doc__)
        sys.exit(1)

    logger.info(f"=== 研途有我爬虫系统 - {command} ===")
    asyncio.run(commands[command]())


if __name__ == "__main__":
    main()
