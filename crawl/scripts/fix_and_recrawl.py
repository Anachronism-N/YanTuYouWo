"""全面修复数据源并重新爬取

修复内容：
1. 修复错误的数据源URL（如同济大学指向同济中学的问题）
2. 为低覆盖高校添加正确的研招办通知列表页源
3. 清理低质量数据（标题是栏目名、内容过短、低置信度）
4. 重置失败计数，让之前失败的源可以重新尝试
5. 重新运行爬取

用法：
    # 诊断模式（只报告问题）
    python scripts/fix_and_recrawl.py --db data/large_scale_test.db

    # 修复模式（修复数据源 + 清理低质量数据）
    python scripts/fix_and_recrawl.py --db data/large_scale_test.db --fix

    # 修复 + 重新爬取
    python scripts/fix_and_recrawl.py --db data/large_scale_test.db --fix --recrawl
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from loguru import logger
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select, delete, update, text, func

from src.models.base import Base
from src.models.university import University, Department, DepartmentSource
from src.models.notice import AdmissionNotice, CrawlLog, CrawlState


# ============================================================
# 各高校研招办正确的通知列表页URL
# 这些是经过人工验证的、包含推免/夏令营通知的列表页
# ============================================================

# 需要修复的高校源URL映射
# 格式: {高校名: [(url, source_type, 描述), ...]}
CORRECT_SOURCES = {
    "同济大学": [
        ("https://yz.tongji.edu.cn/zsxw/ggtz.htm", "招生", "研招办-公告通知"),
        ("https://yz.tongji.edu.cn/zsxw/sszs.htm", "招生", "研招办-硕士招生"),
        ("https://yz.tongji.edu.cn/zsxw/bszs.htm", "招生", "研招办-博士招生"),
        ("https://yz.tongji.edu.cn/zsjz.htm", "招生", "研招办-招生简章"),
    ],
    "南京大学": [
        ("https://yzb.nju.edu.cn/47836/list.htm", "招生", "研招办-硕士招生"),
        ("https://yzb.nju.edu.cn/47862/list.htm", "招生", "研招办-博士招生"),
        ("https://yzb.nju.edu.cn/47863/list.htm", "通知", "研招办-通知公告"),
    ],
    "电子科技大学": [
        ("https://yz.uestc.edu.cn/index/zytz.htm", "通知", "研招办-重要通知"),
        ("https://yz.uestc.edu.cn/index/xwzx.htm", "新闻", "研招办-新闻资讯"),
        ("https://yz.uestc.edu.cn/sszs/tzgg.htm", "招生", "研招办-硕士招生通知"),
        ("https://yz.uestc.edu.cn/bszs/tzgg.htm", "招生", "研招办-博士招生通知"),
    ],
    "北京理工大学": [
        ("https://grd.bit.edu.cn/zsgz/zsxx/index.htm", "招生", "研招办-招生信息"),
        ("https://grd.bit.edu.cn/zsgz/ssszs/index.htm", "招生", "研招办-硕士招生"),
        ("https://grd.bit.edu.cn/zsgz/bsszs/index.htm", "招生", "研招办-博士招生"),
    ],
    "北京师范大学": [
        ("https://yz.bnu.edu.cn/list/news", "招生", "研招办-招生新闻"),
        ("https://yz.bnu.edu.cn/list/ssgg", "招生", "研招办-硕士公告"),
        ("https://yz.bnu.edu.cn/list/bsgg", "招生", "研招办-博士公告"),
    ],
    "中央民族大学": [
        ("https://grs.muc.edu.cn/yjsyzsw/tzgg.htm", "通知", "研招办-通知公告"),
        ("https://grs.muc.edu.cn/yjsyzsw/sszs.htm", "招生", "研招办-硕士招生"),
        ("https://grs.muc.edu.cn/yjsyzsw/bszs.htm", "招生", "研招办-博士招生"),
    ],
    "华南理工大学": [
        ("https://yanzhao.scut.edu.cn/open/Master/Zsgg.aspx", "招生", "研招办-硕士招生公告"),
        ("https://yanzhao.scut.edu.cn/open/Doctoral/Zsgg.aspx", "招生", "研招办-博士招生公告"),
    ],
    "四川大学": [
        ("https://yz.scu.edu.cn/sszyml/index", "招生", "研招办-硕士招生"),
        ("https://yz.scu.edu.cn/bszs/index", "招生", "研招办-博士招生"),
    ],
    "厦门大学": [
        ("https://zs.xmu.edu.cn/info/sszsgg/", "招生", "研招办-硕士招生公告"),
        ("https://zs.xmu.edu.cn/info/bszsgg/", "招生", "研招办-博士招生公告"),
    ],
    "重庆大学": [
        ("https://yz.cqu.edu.cn/admission/master/notice/", "招生", "研招办-硕士招生通知"),
        ("https://yz.cqu.edu.cn/admission/doctor/notice/", "招生", "研招办-博士招生通知"),
    ],
    "大连理工大学": [
        ("https://gs.dlut.edu.cn/yjszs/ssszs.htm", "招生", "研招办-硕士招生"),
        ("https://gs.dlut.edu.cn/yjszs/bsszs.htm", "招生", "研招办-博士招生"),
    ],
    "西北农林科技大学": [
        ("https://yz.nwafu.edu.cn/tzgg.htm", "通知", "研招办-通知公告"),
        ("https://yz.nwafu.edu.cn/sszs.htm", "招生", "研招办-硕士招生"),
    ],
    "清华大学": [
        ("https://yz.tsinghua.edu.cn/zsxx/sszs/yjtms.htm", "招生", "研招办-硕士推免"),
        ("https://yz.tsinghua.edu.cn/zsxx/bszs.htm", "招生", "研招办-博士招生"),
    ],
    "北京航空航天大学": [
        ("https://yzb.buaa.edu.cn/info/1002/list.htm", "招生", "研招办-招生信息"),
    ],
    "山东大学": [
        ("https://www.yz.sdu.edu.cn/info/1024/list.htm", "招生", "研招办-招生信息"),
    ],
    "复旦大学": [
        ("https://gsas.fudan.edu.cn/sszsxw/list.htm", "招生", "研招办-硕士招生"),
        ("https://gsas.fudan.edu.cn/bszsxw/list.htm", "招生", "研招办-博士招生"),
    ],
    "兰州大学": [
        ("https://yz.lzu.edu.cn/shuoshizhaosheng/", "招生", "研招办-硕士招生"),
        ("https://yz.lzu.edu.cn/boshizhaosheng/", "招生", "研招办-博士招生"),
        ("https://yz.lzu.edu.cn/tongzhigonggao/", "通知", "研招办-通知公告"),
    ],
    "国防科技大学": [
        ("https://yjszs.nudt.edu.cn/pubweb/homePageList/recruitStudents.view?keyId=2", "招生", "研招办-硕士招生"),
        ("https://yjszs.nudt.edu.cn/pubweb/homePageList/recruitStudents.view?keyId=3", "招生", "研招办-博士招生"),
    ],
    "上海交通大学": [
        ("https://yzb.sjtu.edu.cn/xxgs1/ggtz.htm", "通知", "研招办-公告通知"),
        ("https://yzb.sjtu.edu.cn/xxgs1/sszs.htm", "招生", "研招办-硕士招生"),
    ],
    "哈尔滨工业大学": [
        ("http://yzb.hit.edu.cn/8822/list.htm", "招生", "研招办-招生信息"),
    ],
    "中国农业大学": [
        ("http://yz.cau.edu.cn/col/col41740/index.html", "招生", "研招办-招生信息"),
    ],
    "西安交通大学": [
        ("https://yz.xjtu.edu.cn/notice/sszs.htm", "招生", "研招办-硕士招生"),
        ("https://yz.xjtu.edu.cn/notice/bszs.htm", "招生", "研招办-博士招生"),
    ],
    "西北工业大学": [
        ("https://yzb.nwpu.edu.cn/info/1006/list.htm", "招生", "研招办-招生信息"),
    ],
    "湖南大学": [
        ("https://gra.hnu.edu.cn/zsxx/sszs.htm", "招生", "研招办-硕士招生"),
        ("https://gra.hnu.edu.cn/zsxx/bszs.htm", "招生", "研招办-博士招生"),
    ],
}

# 标题是栏目名的通知（应该删除）
COLUMN_NAME_TITLES = {
    "招生简章", "通知公告", "硕博士招生", "本科生招生", "研究生培养",
    "学工通知", "留学项目招生简章", "博士生招生", "硕士生招生",
    "招生动态", "招生报名", "录取信息", "报考指南",
    "硕士招生", "博士招生", "招生信息", "研究生招生", "招生就业", "招生工作",
    "本科生招生", "博士生招生", "硕士生招生", "硕博士招生",
    "实验室概况", "党的建设", "学院概况", "学院简介",
}


async def diagnose(db_path: str):
    """诊断数据质量问题"""
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}", echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        # 1. 统计各高校通知数
        result = await session.execute(text("""
            SELECT u.name, COUNT(an.id) as cnt
            FROM universities u
            LEFT JOIN admission_notices an ON u.id = an.university_id
            GROUP BY u.id ORDER BY cnt ASC
        """))
        uni_stats = result.fetchall()

        # 2. 统计数据质量
        total = (await session.execute(text("SELECT COUNT(*) FROM admission_notices"))).scalar()
        low_conf = (await session.execute(text("SELECT COUNT(*) FROM admission_notices WHERE llm_confidence < 0.5"))).scalar()
        short_content = (await session.execute(text("SELECT COUNT(*) FROM admission_notices WHERE length(raw_content) < 200"))).scalar()
        type_other = (await session.execute(text("SELECT COUNT(*) FROM admission_notices WHERE program_type = '其他'"))).scalar()

        # 3. 统计标题是栏目名的通知
        column_titles = list(COLUMN_NAME_TITLES)
        placeholders = ",".join(f"'{t}'" for t in column_titles)
        col_name_count = (await session.execute(text(
            f"SELECT COUNT(*) FROM admission_notices WHERE title IN ({placeholders})"
        ))).scalar()

        # 4. 检查错误源
        result = await session.execute(text("""
            SELECT u.name, ds.source_url, ds.is_active, ds.fail_count
            FROM department_sources ds
            JOIN departments d ON ds.department_id = d.id
            JOIN universities u ON d.university_id = u.id
            WHERE u.name = '同济大学'
        """))
        tongji_sources = result.fetchall()

        # 5. 统计失败源
        failed_count = (await session.execute(text(
            "SELECT COUNT(*) FROM department_sources WHERE fail_count > 0 AND is_active = 1"
        ))).scalar()
        disabled_count = (await session.execute(text(
            "SELECT COUNT(*) FROM department_sources WHERE is_active = 0"
        ))).scalar()

    await engine.dispose()

    # 输出诊断报告
    report = f"""
{'='*70}
  🔍 数据质量诊断报告
  时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
{'='*70}

📌 各高校通知数（低覆盖高校标红）:
"""
    for name, cnt in uni_stats:
        marker = "  ⚠️" if cnt < 10 else "  ✅" if cnt >= 20 else "  ⚡"
        report += f"  {marker} {name}: {cnt}\n"

    report += f"""
📌 数据质量统计:
  总通知数: {total}
  低置信度(<0.5): {low_conf} ({low_conf/max(total,1)*100:.1f}%)
  内容过短(<200字): {short_content} ({short_content/max(total,1)*100:.1f}%)
  类型为"其他": {type_other} ({type_other/max(total,1)*100:.1f}%)
  标题是栏目名: {col_name_count}

📌 数据源状态:
  失败源(fail_count>0): {failed_count}
  已停用源: {disabled_count}

📌 同济大学源URL（错误示例）:
"""
    for name, url, active, fail in tongji_sources:
        report += f"  {'✅' if active else '❌'} {url} (fail={fail})\n"

    report += f"""
📌 需要修复的高校: {len(CORRECT_SOURCES)} 所
  {', '.join(CORRECT_SOURCES.keys())}

📌 修复计划:
  1. 为 {len(CORRECT_SOURCES)} 所高校添加/替换正确的研招办源URL
  2. 删除标题是栏目名的 {col_name_count} 条低质量通知
  3. 删除低置信度且内容过短的通知
  4. 重置所有失败计数，重新激活被停用的源
  5. 清除增量爬取状态，允许重新爬取
{'='*70}
"""
    logger.info(report)
    return report


async def fix_sources(db_path: str):
    """修复数据源URL"""
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}", echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        fixed_count = 0
        added_count = 0

        for uni_name, sources in CORRECT_SOURCES.items():
            # 获取高校
            result = await session.execute(
                select(University).where(University.name == uni_name)
            )
            university = result.scalar_one_or_none()
            if not university:
                logger.warning(f"高校不存在: {uni_name}")
                continue

            # 获取研招办学院（或创建）
            result = await session.execute(
                select(Department).where(
                    Department.university_id == university.id,
                    Department.name.like("%研究生%") | Department.name.like("%研招%") | Department.name.like("%二级学院%")
                )
            )
            dept = result.scalar_one_or_none()

            if not dept:
                # 尝试获取任意一个学院
                result = await session.execute(
                    select(Department).where(Department.university_id == university.id).limit(1)
                )
                dept = result.scalar_one_or_none()

            if not dept:
                # 创建研招办学院
                dept = Department(
                    university_id=university.id,
                    name="研究生院/研招办",
                    url=sources[0][0].rsplit("/", 1)[0],
                    is_active=True,
                )
                session.add(dept)
                await session.flush()
                logger.info(f"创建学院: {uni_name}/研究生院/研招办")

            # 获取该高校已有的源URL
            result = await session.execute(
                select(DepartmentSource.source_url).join(
                    Department, DepartmentSource.department_id == Department.id
                ).where(Department.university_id == university.id)
            )
            existing_urls = {row[0] for row in result.fetchall()}

            # 添加新源
            for url, source_type, desc in sources:
                if url not in existing_urls:
                    new_source = DepartmentSource(
                        department_id=dept.id,
                        source_url=url,
                        source_type=source_type,
                        is_active=True,
                        priority=0,  # 最高优先级
                        fail_count=0,
                    )
                    session.add(new_source)
                    added_count += 1
                    logger.info(f"添加源: {uni_name} | [{source_type}] {desc} | {url}")
                else:
                    # 确保已有源是激活的
                    await session.execute(
                        update(DepartmentSource).where(
                            DepartmentSource.source_url == url
                        ).values(is_active=True, fail_count=0, priority=0)
                    )
                    fixed_count += 1

        await session.commit()
        logger.info(f"源修复完成: 新增 {added_count} 个, 修复 {fixed_count} 个")

    await engine.dispose()
    return added_count, fixed_count


async def clean_bad_data(db_path: str):
    """清理低质量数据"""
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}", echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        deleted_count = 0

        # 1. 删除标题是栏目名的通知
        column_titles = list(COLUMN_NAME_TITLES)
        for title in column_titles:
            result = await session.execute(
                delete(AdmissionNotice).where(AdmissionNotice.title == title)
            )
            if result.rowcount > 0:
                logger.info(f"删除栏目名通知: '{title}' x {result.rowcount}")
                deleted_count += result.rowcount

        # 2. 删除低置信度 + 内容过短的通知（双重条件，避免误删）
        result = await session.execute(text("""
            DELETE FROM admission_notices
            WHERE llm_confidence < 0.4 AND length(raw_content) < 300
        """))
        if result.rowcount > 0:
            logger.info(f"删除低质量通知(低置信度+短内容): {result.rowcount}")
            deleted_count += result.rowcount

        # 3. 删除标题包含明显非推免内容的通知
        bad_patterns = [
            "美国纽约州立大学%代表来访%",
            "华东师范大学%到访%交流座谈%",
        ]
        for pattern in bad_patterns:
            result = await session.execute(text(
                f"DELETE FROM admission_notices WHERE title LIKE '{pattern}'"
            ))
            if result.rowcount > 0:
                logger.info(f"删除非推免通知(模式: {pattern}): {result.rowcount}")
                deleted_count += result.rowcount

        await session.commit()
        logger.info(f"数据清理完成: 共删除 {deleted_count} 条低质量通知")

    await engine.dispose()
    return deleted_count


async def reset_crawl_state(db_path: str):
    """重置爬取状态，允许重新爬取"""
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}", echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        # 1. 重置所有失败计数
        result = await session.execute(
            update(DepartmentSource).where(
                DepartmentSource.fail_count > 0
            ).values(fail_count=0)
        )
        logger.info(f"重置失败计数: {result.rowcount} 个源")

        # 2. 重新激活被停用的源（排除已知错误的源）
        result = await session.execute(
            update(DepartmentSource).where(
                DepartmentSource.is_active == False,
                ~DepartmentSource.source_url.like("%tjzj.edu.cn%"),  # 排除同济中学
            ).values(is_active=True)
        )
        logger.info(f"重新激活源: {result.rowcount} 个")

        # 3. 停用已知错误的源（同济中学等）
        result = await session.execute(
            update(DepartmentSource).where(
                DepartmentSource.source_url.like("%tjzj.edu.cn%")
            ).values(is_active=False)
        )
        if result.rowcount > 0:
            logger.info(f"停用错误源(同济中学): {result.rowcount} 个")

        # 4. 清除增量爬取状态（让所有源重新爬取）
        result = await session.execute(text("DELETE FROM crawl_states"))
        logger.info(f"清除增量爬取状态: {result.rowcount} 条")

        await session.commit()

    await engine.dispose()


async def recrawl(db_path: str, max_pages: int = 5):
    """重新运行爬取"""
    from scripts.run_crawl import run_crawl

    source_types = ["招生", "通知", "新闻"]

    for source_type in source_types:
        logger.info(f"\n{'='*60}")
        logger.info(f"  重新爬取: [{source_type}] 类信息源")
        logger.info(f"{'='*60}")

        await run_crawl(
            db_path=db_path,
            max_pages=max_pages,
            source_type=source_type,
        )


async def main():
    parser = argparse.ArgumentParser(description="全面修复数据源并重新爬取")
    parser.add_argument("--db", type=str, default="data/large_scale_test.db", help="数据库路径")
    parser.add_argument("--fix", action="store_true", help="执行修复（不加此参数只诊断）")
    parser.add_argument("--recrawl", action="store_true", help="修复后重新爬取")
    parser.add_argument("--max-pages", type=int, default=5, help="每个信息源最大翻页数")
    args = parser.parse_args()

    db_path = str(Path(args.db).resolve())

    # 配置日志
    logger.remove()
    logger.add(sys.stderr, level="INFO", format="{time:HH:mm:ss} | {level: <5} | {message}")

    # 1. 诊断
    await diagnose(db_path)

    if not args.fix:
        logger.info("\n💡 使用 --fix 参数执行修复，使用 --fix --recrawl 修复后重新爬取")
        return

    # 2. 修复数据源
    logger.info("\n" + "="*60)
    logger.info("  步骤1: 修复数据源URL")
    logger.info("="*60)
    added, fixed = await fix_sources(db_path)

    # 3. 清理低质量数据
    logger.info("\n" + "="*60)
    logger.info("  步骤2: 清理低质量数据")
    logger.info("="*60)
    deleted = await clean_bad_data(db_path)

    # 4. 重置爬取状态
    logger.info("\n" + "="*60)
    logger.info("  步骤3: 重置爬取状态")
    logger.info("="*60)
    await reset_crawl_state(db_path)

    # 5. 重新诊断
    logger.info("\n" + "="*60)
    logger.info("  修复后诊断")
    logger.info("="*60)
    await diagnose(db_path)

    # 6. 重新爬取
    if args.recrawl:
        logger.info("\n" + "="*60)
        logger.info("  步骤4: 重新爬取")
        logger.info("="*60)
        await recrawl(db_path, max_pages=args.max_pages)

        # 7. 最终报告
        from scripts.run_large_scale_test import generate_report
        await generate_report(db_path)


if __name__ == "__main__":
    asyncio.run(main())
