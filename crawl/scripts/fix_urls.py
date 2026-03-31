"""修复信息源URL并重新爬取未覆盖高校

修复以下问题：
1. 山东大学：URL路径错误（tzgg.htm → index/tzgg.htm）
2. 西北农林科技大学：URL路径错误（sszs.htm → zsxx/ssszs/index.htm）
3. 国防科技大学：URL指向JS重定向页面，改为研招系统直接URL
4. 哈尔滨工业大学：http需要改为https
5. 兰州大学：瑞数反爬（412），需要Playwright
6. 中央民族大学：研究生院URL可能需要调整
7. 天津大学：URL指向首页
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


# 需要修正的URL映射：{旧URL: 新URL}
URL_FIXES = {
    # 山东大学
    "https://www.yz.sdu.edu.cn/tzgg.htm": "https://www.yz.sdu.edu.cn/index/tzgg.htm",
    "https://www.yz.sdu.edu.cn/sszs.htm": "https://www.yz.sdu.edu.cn/sszs/zsjz.htm",
    "https://www.yz.sdu.edu.cn/bszs.htm": "https://www.yz.sdu.edu.cn/bszs/zsjz.htm",
    # 西北农林科技大学
    "https://yz.nwafu.edu.cn/tzgg.htm": "https://yz.nwafu.edu.cn/tzgg/index.htm",
    "https://yz.nwafu.edu.cn/sszs.htm": "https://yz.nwafu.edu.cn/zsxx/ssszs/index.htm",
    "https://yz.nwafu.edu.cn/bszs.htm": "https://yz.nwafu.edu.cn/zsxx/bsszs/index.htm",
    # 国防科技大学
    "https://www.nudt.edu.cn/yssz/yjszs/index.htm": "http://yjszs.nudt.edu.cn/pubweb/homePageList/newRecruitStudents.view?keyId=33",
    "https://www.nudt.edu.cn/xwgg/xyxw/index.htm": "http://yjszs.nudt.edu.cn/pubweb/homePageList/generalCollectionPage.view?keyId=2",
    # 哈尔滨工业大学（http → https）
    "http://yzb.hit.edu.cn/8822/list.htm": "https://yzb.hit.edu.cn/8822/list.htm",
    "http://yzb.hit.edu.cn/8823/list.htm": "https://yzb.hit.edu.cn/8823/list.htm",
    "http://yzb.hit.edu.cn/8821/list.htm": "https://yzb.hit.edu.cn/8821/list.htm",
    # 天津大学
    "http://yzb.tju.edu.cn/xwzx/tkss_xw/": "https://yzb.tju.edu.cn/xwzx/tkss_xw/",
    "http://yzb.tju.edu.cn/xwzx/zxxx/": "https://yzb.tju.edu.cn/xwzx/zxxx/",
}

# 需要额外添加的源
EXTRA_SOURCES = {
    "国防科技大学": [
        {"url": "http://yjszs.nudt.edu.cn/pubweb/homePageList/newRecruitStudents.view?keyId=36", "type": "招生"},
    ],
    "山东大学": [
        {"url": "https://www.yz.sdu.edu.cn/index/zstz.htm", "type": "招生"},
    ],
    "中央民族大学": [
        {"url": "https://grs.muc.edu.cn/yjsyzsw/bszs.htm", "type": "招生"},
    ],
}

# 需要停用的无效源（首页/导航页/非列表页）
DISABLE_URLS = [
    "http://gs.tju.edu.cn/",
    "https://www.tju.edu.cn/zsjy.htm",
    "https://www.tju.edu.cn/gjjl/hzbx.htm",
    "http://news.tju.edu.cn/",
    "https://www.nudt.edu.cn/zsjy/index.htm",
    "https://www.nudt.edu.cn/xwgg/index.htm",
    "https://www.muc.edu.cn/rcpy/yjspy.htm",
    "https://www.muc.edu.cn/zsjy/zs/bykzs.htm",
    "https://www.muc.edu.cn/rcpy.htm",
    "https://xinchuan.muc.edu.cn/",
    "http://qlyxjxgl.sdu.edu.cn/",
    "https://history.lzu.edu.cn/",
]


async def fix_and_prepare(db_path: str):
    """修复URL并准备重新爬取"""
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}", echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        # Step 1: 修正URL
        logger.info("=" * 60)
        logger.info("Step 1: 修正错误URL")
        logger.info("=" * 60)

        fix_count = 0
        for old_url, new_url in URL_FIXES.items():
            result = await session.execute(text(
                "UPDATE department_sources SET source_url = :new_url, fail_count = 0 WHERE source_url = :old_url"
            ), {"old_url": old_url, "new_url": new_url})
            if result.rowcount > 0:
                logger.info(f"  ✅ {old_url}")
                logger.info(f"     → {new_url}")
                fix_count += result.rowcount
        logger.info(f"  修正了 {fix_count} 个URL")

        # Step 2: 停用无效源
        logger.info("=" * 60)
        logger.info("Step 2: 停用无效源")
        logger.info("=" * 60)

        disable_count = 0
        for url in DISABLE_URLS:
            result = await session.execute(text(
                "UPDATE department_sources SET is_active = 0 WHERE source_url = :url"
            ), {"url": url})
            if result.rowcount > 0:
                logger.info(f"  ❌ 停用: {url}")
                disable_count += result.rowcount
        logger.info(f"  停用了 {disable_count} 个源")

        # Step 3: 添加额外源
        logger.info("=" * 60)
        logger.info("Step 3: 添加额外源")
        logger.info("=" * 60)

        add_count = 0
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        for uni_name, sources in EXTRA_SOURCES.items():
            # 获取学院ID
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
                # 检查是否已存在
                result = await session.execute(text(
                    "SELECT id FROM department_sources WHERE source_url = :url"
                ), {"url": src["url"]})
                if result.fetchone():
                    continue

                await session.execute(text(
                    "INSERT INTO department_sources (department_id, source_url, source_type, priority, parser_type, is_active, fail_count, created_at, updated_at) "
                    "VALUES (:did, :url, :type, 1, 'auto', 1, 0, :now, :now)"
                ), {"did": dept_id, "url": src["url"], "type": src["type"], "now": now})
                add_count += 1
                logger.info(f"  ✅ 添加: {uni_name} | {src['url']}")
        logger.info(f"  添加了 {add_count} 个源")

        # Step 4: 清理7所未覆盖高校的爬取状态和日志
        logger.info("=" * 60)
        logger.info("Step 4: 清理爬取状态")
        logger.info("=" * 60)

        uncovered_unis = ["中央民族大学", "天津大学", "哈尔滨工业大学", "山东大学", "兰州大学", "西北农林科技大学", "国防科技大学"]
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

        # 同时清理低通知数高校（<5条）的状态，让它们重新爬取
        logger.info("=" * 60)
        logger.info("Step 5: 清理低通知数高校的爬取状态")
        logger.info("=" * 60)

        low_unis = await session.execute(text("""
            SELECT u.id, u.name, COUNT(an.id) as cnt
            FROM universities u
            LEFT JOIN admission_notices an ON u.id = an.university_id
            GROUP BY u.id
            HAVING cnt > 0 AND cnt < 5
        """))
        for uid, uname, cnt in low_unis.fetchall():
            await session.execute(text("""
                DELETE FROM crawl_states WHERE source_id IN (
                    SELECT ds.id FROM department_sources ds
                    JOIN departments d ON ds.department_id = d.id
                    WHERE d.university_id = :uid
                )
            """), {"uid": uid})
            logger.info(f"  清理增量状态: {uname} (当前{cnt}条)")

        await session.commit()

        # 统计
        logger.info("=" * 60)
        logger.info("修复后统计")
        logger.info("=" * 60)

        result = await session.execute(text("""
            SELECT u.name, COUNT(ds.id) as cnt
            FROM universities u
            JOIN departments d ON u.id = d.university_id
            JOIN department_sources ds ON d.id = ds.department_id
            WHERE ds.is_active = 1
            AND u.id IN (SELECT id FROM universities WHERE name IN ('中央民族大学','天津大学','哈尔滨工业大学','山东大学','兰州大学','西北农林科技大学','国防科技大学'))
            GROUP BY u.id ORDER BY u.name
        """))
        for name, cnt in result.fetchall():
            logger.info(f"  {name}: {cnt} 个活跃源")

        total = await session.execute(text("SELECT COUNT(*) FROM department_sources WHERE is_active = 1"))
        logger.info(f"  总活跃源: {total.scalar()}")

    await engine.dispose()
    logger.info("修复完成！")


async def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", type=str, default="data/large_scale_test.db")
    args = parser.parse_args()

    db_path = str(Path(args.db).resolve())

    logger.remove()
    logger.add(sys.stderr, level="INFO", format="{time:HH:mm:ss} | {level: <5} | {message}")

    await fix_and_prepare(db_path)


if __name__ == "__main__":
    asyncio.run(main())
