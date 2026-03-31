from __future__ import annotations

"""阶段三端到端测试 - 对真实高校网站进行列表页解析和完整流程测试

用法：
    # 仅测试列表页解析（不调用LLM）
    python tests/test_phase3_e2e.py

    # 完整流程测试（含LLM调用，需要API Key）
    python tests/test_phase3_e2e.py --full

    # 指定高校
    python tests/test_phase3_e2e.py --full --university "华南理工大学"
"""
import sys
import os
import asyncio
import argparse

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from loguru import logger
logger.remove()
logger.add(sys.stderr, level="INFO", format="{time:HH:mm:ss} | {level: <5} | {message}")


async def test_list_parse():
    """测试列表页解析：对多个真实高校信息源进行解析"""
    from src.utils.http_client import http_client
    from src.parser.list_parser import notice_list_parser
    from src.processor.rule_filter import batch_filter

    test_urls = [
        ("东北大学/计算机", "http://www.cse.neu.edu.cn/6330/list.htm"),
        ("华南理工/计算机", "http://www2.scut.edu.cn/cs/yjszs_45190/list.htm"),
        ("南开大学/环境", "http://env.nankai.edu.cn/12908/list.htm"),
    ]

    total_success = 0
    for name, url in test_urls:
        print(f"\n{'='*50}")
        print(f"  {name}: {url}")
        print(f"{'='*50}")

        html = await http_client.fetch(url)
        if not html:
            print("  ❌ 请求失败")
            continue

        items = notice_list_parser.parse(html, url)
        print(f"  解析条目数: {len(items)}")

        if items:
            total_success += 1
            for item in items[:3]:
                print(f"    [{item.get('date', '?')}] {item['title'][:50]}")

            scored = batch_filter(items)
            high = [i for i in scored if i.get("relevance_score", 0) >= 0.5]
            mid = [i for i in scored if 0.2 <= i.get("relevance_score", 0) < 0.5]
            print(f"  过滤后: {len(scored)} 条 (高相关: {len(high)}, 中相关: {len(mid)})")
        else:
            print("  ❌ 解析失败")

    await http_client.close()
    print(f"\n{'='*50}")
    print(f"  列表页解析测试: {total_success}/{len(test_urls)} 成功")
    print(f"{'='*50}")
    return total_success > 0


async def test_full_pipeline(university_name: str | None = None):
    """完整流程测试：列表解析 → 过滤 → 详情爬取 → LLM提取"""
    from src.config import settings
    settings.DATABASE_URL = "sqlite+aiosqlite:///data/test_phase3_e2e.db"
    settings.ensure_dirs()

    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
    from sqlalchemy import select
    from src.models.base import Base
    from src.models.notice import AdmissionNotice, CrawlLog, CrawlState
    from src.models.university import University, Department, DepartmentSource
    from src.utils.http_client import http_client

    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    sf = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    # 先尝试从阶段2数据库复制数据
    import shutil
    src_db = "data/test_phase2_locate.db"
    dst_db = "data/test_phase3_e2e.db"
    if os.path.exists(src_db) and not os.path.exists(dst_db):
        shutil.copy2(src_db, dst_db)
        print(f"已复制阶段2数据库: {src_db} → {dst_db}")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with sf() as session:
        # 查找信息源
        query = (
            select(DepartmentSource, Department, University)
            .join(Department, DepartmentSource.department_id == Department.id)
            .join(University, Department.university_id == University.id)
            .where(DepartmentSource.source_type == "招生")
        )
        if university_name:
            query = query.where(University.name == university_name)
        query = query.limit(3)

        result = await session.execute(query)
        rows = result.all()

        if not rows:
            print("未找到招生信息源，跳过完整流程测试")
            await engine.dispose()
            return

        from src.crawler.list_crawler import crawl_source
        from src.crawler.detail_crawler import process_notice

        for source, dept, uni in rows:
            print(f"\n{'='*50}")
            print(f"  {uni.name}/{dept.name}")
            print(f"  {source.source_url}")
            print(f"{'='*50}")

            # 爬取列表页
            log = await crawl_source(source, session, uni.id)
            print(f"  总条目: {log.total_items}, 新增: {log.new_items}, 高相关: {log.relevant_items}")

            if log.error_message:
                print(f"  ⚠️ {log.error_message}")
                continue

            # 处理第一条高相关通知
            new_items = getattr(log, "_new_items_data", [])
            high = [i for i in new_items if i.get("relevance_score", 0) >= 0.5]

            if high:
                item = high[0]
                print(f"\n  处理: [{item['relevance_score']:.2f}] {item['title']}")
                notice = await process_notice(item, session, uni.id, dept.id, source.id)
                if notice:
                    print(f"  ✅ 入库成功!")
                    print(f"     类型: {notice.program_type}, 年份: {notice.year}")
                    print(f"     学位: {notice.target_degree}, 置信度: {notice.llm_confidence}")
                    print(f"     摘要: {notice.summary}")
                    await session.rollback()
                else:
                    print("  ⚠️ 详情页处理失败")
            else:
                print("  无高相关通知，跳过详情页测试")

    await http_client.close()
    await engine.dispose()
    print("\n🎉 完整流程测试完成!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="阶段三端到端测试")
    parser.add_argument("--full", action="store_true", help="运行完整流程测试（含LLM调用）")
    parser.add_argument("--university", "-u", type=str, help="指定高校名称")
    args = parser.parse_args()

    if args.full:
        asyncio.run(test_full_pipeline(args.university))
    else:
        asyncio.run(test_list_parse())