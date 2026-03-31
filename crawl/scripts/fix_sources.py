"""信息源清理与补充脚本

修复阶段二发现的信息源质量问题：
1. 清理混入其他高校的错误URL（如山东大学中混入了北京协和医学院、中南大学的URL）
2. 为未覆盖高校补充正确的研究生院/招生信息源URL
3. 校验所有源URL的域名是否属于对应高校
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path
from datetime import datetime
from urllib.parse import urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from loguru import logger
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession


# ============================================================
# 高校域名映射（用于校验源URL是否属于对应高校）
# ============================================================
UNIVERSITY_DOMAINS = {
    "北京大学": ["pku.edu.cn"],
    "中国人民大学": ["ruc.edu.cn"],
    "清华大学": ["tsinghua.edu.cn"],
    "北京航空航天大学": ["buaa.edu.cn"],
    "北京理工大学": ["bit.edu.cn"],
    "中国农业大学": ["cau.edu.cn"],
    "北京师范大学": ["bnu.edu.cn"],
    "中央民族大学": ["muc.edu.cn"],
    "南开大学": ["nankai.edu.cn"],
    "天津大学": ["tju.edu.cn"],
    "大连理工大学": ["dlut.edu.cn"],
    "吉林大学": ["jlu.edu.cn"],
    "哈尔滨工业大学": ["hit.edu.cn"],
    "复旦大学": ["fudan.edu.cn"],
    "同济大学": ["tongji.edu.cn"],
    "上海交通大学": ["sjtu.edu.cn"],
    "华东师范大学": ["ecnu.edu.cn"],
    "南京大学": ["nju.edu.cn"],
    "东南大学": ["seu.edu.cn"],
    "浙江大学": ["zju.edu.cn"],
    "中国科学技术大学": ["ustc.edu.cn"],
    "厦门大学": ["xmu.edu.cn"],
    "山东大学": ["sdu.edu.cn"],
    "中国海洋大学": ["ouc.edu.cn"],
    "武汉大学": ["whu.edu.cn"],
    "华中科技大学": ["hust.edu.cn"],
    "湖南大学": ["hnu.edu.cn"],
    "中南大学": ["csu.edu.cn"],
    "中山大学": ["sysu.edu.cn"],
    "华南理工大学": ["scut.edu.cn"],
    "四川大学": ["scu.edu.cn"],
    "重庆大学": ["cqu.edu.cn"],
    "电子科技大学": ["uestc.edu.cn"],
    "西安交通大学": ["xjtu.edu.cn"],
    "西北工业大学": ["nwpu.edu.cn"],
    "兰州大学": ["lzu.edu.cn"],
    "国防科技大学": ["nudt.edu.cn"],
    "东北大学": ["neu.edu.cn"],
    "西北农林科技大学": ["nwafu.edu.cn", "nwsuaf.edu.cn"],
    "哈尔滨工业大学": ["hit.edu.cn"],
}

# ============================================================
# 未覆盖高校的补充信息源（手动整理的高质量URL）
# ============================================================
SUPPLEMENT_SOURCES = {
    "中央民族大学": [
        {"url": "https://grs.muc.edu.cn/yjsyzsw/tzgg.htm", "type": "招生", "note": "研究生院-招生通知"},
        {"url": "https://grs.muc.edu.cn/yjsyzsw/sszs.htm", "type": "招生", "note": "研究生院-硕士招生"},
    ],
    "天津大学": [
        {"url": "http://yzb.tju.edu.cn/xwzx/tkss_xw/", "type": "招生", "note": "研招办-推免硕士"},
        {"url": "http://yzb.tju.edu.cn/xwzx/zxxx/", "type": "通知", "note": "研招办-最新消息"},
        {"url": "https://gs.tju.edu.cn/zsgz.htm", "type": "招生", "note": "研究生院-招生工作"},
    ],
    "哈尔滨工业大学": [
        {"url": "http://yzb.hit.edu.cn/8822/list.htm", "type": "招生", "note": "研招办-硕士招生"},
        {"url": "http://yzb.hit.edu.cn/8823/list.htm", "type": "招生", "note": "研招办-博士招生"},
        {"url": "http://yzb.hit.edu.cn/8821/list.htm", "type": "通知", "note": "研招办-通知公告"},
    ],
    "山东大学": [
        {"url": "https://www.yz.sdu.edu.cn/tzgg.htm", "type": "通知", "note": "研招办-通知公告"},
        {"url": "https://www.yz.sdu.edu.cn/sszs.htm", "type": "招生", "note": "研招办-硕士招生"},
        {"url": "https://www.yz.sdu.edu.cn/bszs.htm", "type": "招生", "note": "研招办-博士招生"},
    ],
    "西北农林科技大学": [
        {"url": "https://yz.nwafu.edu.cn/tzgg.htm", "type": "通知", "note": "研招办-通知公告"},
        {"url": "https://yz.nwafu.edu.cn/sszs.htm", "type": "招生", "note": "研招办-硕士招生"},
        {"url": "https://yz.nwafu.edu.cn/bszs.htm", "type": "招生", "note": "研招办-博士招生"},
    ],
    "兰州大学": [
        {"url": "https://yz.lzu.edu.cn/shuoshizhaosheng/", "type": "招生", "note": "研招办-硕士招生"},
        {"url": "https://yz.lzu.edu.cn/boshizhaosheng/", "type": "招生", "note": "研招办-博士招生"},
        {"url": "https://yz.lzu.edu.cn/tongzhigonggao/", "type": "通知", "note": "研招办-通知公告"},
    ],
    "国防科技大学": [
        {"url": "https://www.nudt.edu.cn/yssz/yjszs/index.htm", "type": "招生", "note": "研究生招生"},
        {"url": "https://www.nudt.edu.cn/xwgg/xyxw/index.htm", "type": "新闻", "note": "学校新闻"},
    ],
}


def _get_domain_root(url: str) -> str:
    """提取URL的根域名（如 cs.sdu.edu.cn → sdu.edu.cn）"""
    try:
        netloc = urlparse(url).netloc
        parts = netloc.split(".")
        # 处理 edu.cn 结尾的域名
        if len(parts) >= 3 and parts[-2] == "edu" and parts[-1] == "cn":
            return ".".join(parts[-3:])
        return ".".join(parts[-2:])
    except Exception:
        return ""


async def fix_sources(db_path: str):
    """修复信息源质量问题"""
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}", echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        # ============================================================
        # Step 1: 清理错误域名的源URL
        # ============================================================
        logger.info("=" * 60)
        logger.info("Step 1: 清理错误域名的源URL")
        logger.info("=" * 60)

        # 获取所有高校及其源
        rows = await session.execute(text("""
            SELECT u.id, u.name, ds.id as source_id, ds.source_url
            FROM universities u
            JOIN departments d ON u.id = d.university_id
            JOIN department_sources ds ON d.id = ds.department_id
            WHERE ds.is_active = 1
        """))
        all_sources = rows.fetchall()

        invalid_count = 0
        for uni_id, uni_name, source_id, source_url in all_sources:
            valid_domains = UNIVERSITY_DOMAINS.get(uni_name, [])
            if not valid_domains:
                continue

            source_root = _get_domain_root(source_url)
            is_valid = any(domain in source_root or source_root in domain for domain in valid_domains)

            if not is_valid:
                logger.warning(f"  ❌ 域名不匹配: {uni_name} | {source_url} (域名: {source_root})")
                # 停用该源
                await session.execute(text(
                    "UPDATE department_sources SET is_active = 0 WHERE id = :sid"
                ), {"sid": source_id})
                invalid_count += 1

        logger.info(f"  清理了 {invalid_count} 个错误域名的源")

        # ============================================================
        # Step 2: 为未覆盖高校补充信息源
        # ============================================================
        logger.info("=" * 60)
        logger.info("Step 2: 为未覆盖高校补充信息源")
        logger.info("=" * 60)

        supplement_count = 0
        for uni_name, sources in SUPPLEMENT_SOURCES.items():
            # 获取高校ID
            result = await session.execute(text(
                "SELECT id FROM universities WHERE name = :name"
            ), {"name": uni_name})
            uni_row = result.fetchone()
            if not uni_row:
                logger.warning(f"  高校不存在: {uni_name}")
                continue

            uni_id = uni_row[0]

            # 获取或创建一个默认学院（研究生院/研招办）
            result = await session.execute(text(
                "SELECT id FROM departments WHERE university_id = :uid AND name LIKE '%研究生%' LIMIT 1"
            ), {"uid": uni_id})
            dept_row = result.fetchone()

            if not dept_row:
                # 查找任意一个学院
                result = await session.execute(text(
                    "SELECT id FROM departments WHERE university_id = :uid AND is_active = 1 LIMIT 1"
                ), {"uid": uni_id})
                dept_row = result.fetchone()

            if not dept_row:
                # 创建研究生院学院
                now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                await session.execute(text(
                    "INSERT INTO departments (university_id, name, is_active, auto_discovered, discovery_method, created_at, updated_at) "
                    "VALUES (:uid, '研究生院', 1, 1, 'manual_supplement', :now, :now)"
                ), {"uid": uni_id, "now": now})
                result = await session.execute(text("SELECT last_insert_rowid()"))
                dept_id = result.scalar()
                logger.info(f"  创建学院: {uni_name} - 研究生院 (ID={dept_id})")
            else:
                dept_id = dept_row[0]

            # 添加信息源
            for source_info in sources:
                # 检查是否已存在
                result = await session.execute(text(
                    "SELECT id FROM department_sources WHERE department_id = :did AND source_url = :url"
                ), {"did": dept_id, "url": source_info["url"]})
                if result.fetchone():
                    logger.debug(f"  已存在: {uni_name} | {source_info['url']}")
                    continue

                now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                await session.execute(text(
                    "INSERT INTO department_sources (department_id, source_url, source_type, priority, parser_type, is_active, fail_count, created_at, updated_at) "
                    "VALUES (:did, :url, :type, 1, 'auto', 1, 0, :now, :now)"
                ), {"did": dept_id, "url": source_info["url"], "type": source_info["type"], "now": now})
                supplement_count += 1
                logger.info(f"  ✅ 补充源: {uni_name} | [{source_info['type']}] {source_info['url']} ({source_info['note']})")

        logger.info(f"  补充了 {supplement_count} 个信息源")

        # ============================================================
        # Step 3: 清理补充高校的旧爬取状态
        # ============================================================
        logger.info("=" * 60)
        logger.info("Step 3: 清理补充高校的爬取状态")
        logger.info("=" * 60)

        uni_names = list(SUPPLEMENT_SOURCES.keys())
        for uni_name in uni_names:
            result = await session.execute(text(
                "SELECT id FROM universities WHERE name = :name"
            ), {"name": uni_name})
            uni_row = result.fetchone()
            if not uni_row:
                continue

            uni_id = uni_row[0]
            # 清理爬取日志和状态
            await session.execute(text("""
                DELETE FROM crawl_logs WHERE source_id IN (
                    SELECT ds.id FROM department_sources ds
                    JOIN departments d ON ds.department_id = d.id
                    WHERE d.university_id = :uid
                )
            """), {"uid": uni_id})
            await session.execute(text("""
                DELETE FROM crawl_states WHERE source_id IN (
                    SELECT ds.id FROM department_sources ds
                    JOIN departments d ON ds.department_id = d.id
                    WHERE d.university_id = :uid
                )
            """), {"uid": uni_id})
            # 重置fail_count
            await session.execute(text("""
                UPDATE department_sources SET fail_count = 0
                WHERE department_id IN (
                    SELECT id FROM departments WHERE university_id = :uid
                )
            """), {"uid": uni_id})
            logger.info(f"  清理: {uni_name}")

        await session.commit()

        # ============================================================
        # Step 4: 统计修复后的状态
        # ============================================================
        logger.info("=" * 60)
        logger.info("Step 4: 修复后统计")
        logger.info("=" * 60)

        result = await session.execute(text(
            "SELECT COUNT(*) FROM department_sources WHERE is_active = 1"
        ))
        active_sources = result.scalar()

        result = await session.execute(text("""
            SELECT u.name, COUNT(ds.id) as cnt
            FROM universities u
            JOIN departments d ON u.id = d.university_id
            JOIN department_sources ds ON d.id = ds.department_id
            WHERE ds.is_active = 1
            GROUP BY u.id
            ORDER BY cnt DESC
        """))
        for name, cnt in result.fetchall():
            logger.info(f"  {name}: {cnt} 个活跃源")

        logger.info(f"\n  活跃源总数: {active_sources}")

    await engine.dispose()
    logger.info("修复完成！")


async def main():
    import argparse
    parser = argparse.ArgumentParser(description="修复信息源质量问题")
    parser.add_argument("--db", type=str, default="data/large_scale_test.db", help="数据库路径")
    args = parser.parse_args()

    db_path = str(Path(args.db).resolve())

    logger.remove()
    logger.add(sys.stderr, level="INFO", format="{time:HH:mm:ss} | {level: <5} | {message}")

    await fix_sources(db_path)


if __name__ == "__main__":
    asyncio.run(main())
