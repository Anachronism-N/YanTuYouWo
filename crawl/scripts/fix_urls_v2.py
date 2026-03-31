"""第二轮修复：针对5所仍未覆盖高校的精准修复

问题诊断：
1. 天津大学：GB2312编码 → 标题乱码 → 规则过滤器无法匹配（已修复http_client编码检测）
2. 哈尔滨工业大学：8822/8823/8821都是统考通知，没有推免栏目。需要找推免通知URL
3. 山东大学：www.yz.sdu.edu.cn SSL证书错误，需要用HTTP或禁用SSL验证
4. 西北农林科技大学：推免通知在tzgg/index.htm中（通知类型源），等待处理
5. 兰州大学：瑞数反爬，Playwright也无法绕过

修复方案：
- 山东大学：改用HTTP协议
- 哈工大：添加推免相关的URL（需要搜索）
- 兰州大学：标记为需要手动处理
"""

from __future__ import annotations

import asyncio
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from loguru import logger
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession


# 山东大学：改用HTTP协议（SSL证书有问题）
SDU_URL_FIXES = {
    "https://www.yz.sdu.edu.cn/index/tzgg.htm": "http://www.yz.sdu.edu.cn/index/tzgg.htm",
    "https://www.yz.sdu.edu.cn/sszs/zsjz.htm": "http://www.yz.sdu.edu.cn/sszs/zsjz.htm",
    "https://www.yz.sdu.edu.cn/bszs/zsjz.htm": "http://www.yz.sdu.edu.cn/bszs/zsjz.htm",
    "https://www.yz.sdu.edu.cn/index/zstz.htm": "http://www.yz.sdu.edu.cn/index/zstz.htm",
}

# 天津大学：添加推免专栏URL
TJU_EXTRA_SOURCES = [
    {"url": "https://yzb.tju.edu.cn/xwzx/tztg/", "type": "通知"},  # 学院通知
]

# 哈工大：添加推免相关URL（需要从学院页面找）
HIT_EXTRA_SOURCES = [
    {"url": "https://yzb.hit.edu.cn/8824/list.htm", "type": "招生"},  # 博士公告（可能有直博/推免）
]


async def fix_round2(db_path: str):
    """第二轮修复"""
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}", echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        # Step 1: 山东大学URL改为HTTP
        logger.info("=" * 60)
        logger.info("Step 1: 山东大学URL改为HTTP协议")
        logger.info("=" * 60)

        fix_count = 0
        for old_url, new_url in SDU_URL_FIXES.items():
            result = await session.execute(text(
                "UPDATE department_sources SET source_url = :new_url, fail_count = 0 WHERE source_url = :old_url"
            ), {"old_url": old_url, "new_url": new_url})
            if result.rowcount > 0:
                logger.info(f"  ✅ {old_url} → {new_url}")
                fix_count += result.rowcount
        logger.info(f"  修正了 {fix_count} 个URL")

        # Step 2: 清理5所未覆盖高校的爬取状态
        logger.info("=" * 60)
        logger.info("Step 2: 清理爬取状态")
        logger.info("=" * 60)

        uncovered_unis = ["天津大学", "哈尔滨工业大学", "山东大学", "西北农林科技大学", "兰州大学"]
        for uni_name in uncovered_unis:
            result = await session.execute(text(
                "SELECT id FROM universities WHERE name = :name"
            ), {"name": uni_name})
            uni_row = result.fetchone()
            if not uni_row:
                continue
            uid = uni_row[0]

            await session.execute(text("""
                DELETE FROM crawl_logs WHERE source_id IN (
                    SELECT ds.id FROM department_sources ds
                    JOIN departments d ON ds.department_id = d.id
                    WHERE d.university_id = :uid
                )
            """), {"uid": uid})
            await session.execute(text("""
                DELETE FROM crawl_states WHERE source_id IN (
                    SELECT ds.id FROM department_sources ds
                    JOIN departments d ON ds.department_id = d.id
                    WHERE d.university_id = :uid
                )
            """), {"uid": uid})
            await session.execute(text("""
                UPDATE department_sources SET fail_count = 0
                WHERE department_id IN (SELECT id FROM departments WHERE university_id = :uid)
                AND is_active = 1
            """), {"uid": uid})
            logger.info(f"  清理: {uni_name}")

        # Step 3: 添加额外源
        logger.info("=" * 60)
        logger.info("Step 3: 添加额外源")
        logger.info("=" * 60)

        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        extra_sources = {
            "天津大学": TJU_EXTRA_SOURCES,
            "哈尔滨工业大学": HIT_EXTRA_SOURCES,
        }

        for uni_name, sources in extra_sources.items():
            result = await session.execute(text("""
                SELECT d.id FROM departments d
                JOIN universities u ON d.university_id = u.id
                WHERE u.name = :name AND d.is_active = 1
                LIMIT 1
            """), {"name": uni_name})
            dept_row = result.fetchone()
            if not dept_row:
                logger.warning(f"  找不到学院: {uni_name}")
                continue

            dept_id = dept_row[0]
            for src in sources:
                result = await session.execute(text(
                    "SELECT id FROM department_sources WHERE source_url = :url"
                ), {"url": src["url"]})
                if result.fetchone():
                    logger.info(f"  已存在: {src['url']}")
                    continue

                await session.execute(text(
                    "INSERT INTO department_sources (department_id, source_url, source_type, priority, parser_type, is_active, fail_count, created_at, updated_at) "
                    "VALUES (:did, :url, :type, 1, 'auto', 1, 0, :now, :now)"
                ), {"did": dept_id, "url": src["url"], "type": src["type"], "now": now})
                logger.info(f"  ✅ 添加: {uni_name} | {src['url']}")

        await session.commit()

        # 统计
        logger.info("=" * 60)
        logger.info("修复后统计")
        logger.info("=" * 60)

        result = await session.execute(text("""
            SELECT u.name, ds.source_url, ds.source_type, ds.is_active, ds.fail_count
            FROM universities u
            JOIN departments d ON u.id = d.university_id
            JOIN department_sources ds ON d.id = ds.department_id
            WHERE u.name IN ('天津大学','哈尔滨工业大学','山东大学','西北农林科技大学','兰州大学')
            AND ds.is_active = 1
            ORDER BY u.name, ds.source_type
        """))
        for name, url, stype, active, fail in result.fetchall():
            logger.info(f"  {name} | {stype} | {url}")

    await engine.dispose()
    logger.info("第二轮修复完成！")


async def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", type=str, default="data/large_scale_test.db")
    args = parser.parse_args()

    db_path = str(Path(args.db).resolve())

    logger.remove()
    logger.add(sys.stderr, level="INFO", format="{time:HH:mm:ss} | {level: <5} | {message}")

    await fix_round2(db_path)


if __name__ == "__main__":
    asyncio.run(main())
