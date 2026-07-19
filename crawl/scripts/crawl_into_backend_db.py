"""向后端 DB 注入真实爬取数据（供浏览器预览）。

不删除已有数据（保留 seed 的用户/社区）；幂等建表 + 仅在无源时播种几个真实可达源 +
运行 NoticeProcessor 爬取，让 admission_notices 有真实夏令营/预推免通知。
"""
from __future__ import annotations

import asyncio
import sys
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
os.environ.setdefault("PYTHONUTF8", "1")
os.environ.setdefault("CRAWL_DELAY_MIN", "0")
os.environ.setdefault("CRAWL_DELAY_MAX", "0.3")
os.environ.setdefault("CRAWL_RETRY_TIMES", "1")

from loguru import logger
logger.remove()
logger.add(sys.stderr, level="WARNING")

DB_PATH = "data/large_scale_test.db"  # 后端默认读取的库

SEEDED = [
    ("南京大学", "江苏", "研究生院", "通知", "https://grawww.nju.edu.cn/905/list.htm"),
    ("东南大学", "江苏", "研究生院", "研招办", "https://yzb.seu.edu.cn/"),
    ("天津大学", "天津", "研究生院", "研招办", "https://yzb.tju.edu.cn/"),
    ("厦门大学", "福建", "研究生院", "通知", "https://gs.xmu.edu.cn/"),
    ("山东大学", "山东", "研究生院", "研招办", "https://www.yz.sdu.edu.cn/"),
    ("重庆大学", "重庆", "研究生院", "研招办", "http://yz.cqu.edu.cn/"),
    ("华东师范大学", "上海", "研究生院", "通知", "https://yjsy.ecnu.edu.cn/"),
    ("北京理工大学", "北京", "研究生院", "研招办", "https://grd.bit.edu.cn/"),
    ("北京航空航天大学", "北京", "研究生院", "研招办", "https://yzb.buaa.edu.cn/"),
    ("同济大学", "上海", "研究生院", "研招办", "https://yz.tongji.edu.cn/"),
    ("武汉大学", "湖北", "研究生院", "通知", "https://gs.whu.edu.cn/"),
    ("中国科学技术大学", "安徽", "招生办", "通知", "https://zsb.ustc.edu.cn/"),
    ("南开大学", "天津", "研招办", "通知", "https://yzb.nankai.edu.cn/"),
    ("大连理工大学", "辽宁", "研究生院", "通知", "https://gs.dlut.edu.cn/"),
    ("湖南大学", "湖南", "研究生院", "通知", "https://gra.hnu.edu.cn/"),
    ("复旦大学", "上海", "研究生院", "通知", "https://gs.fudan.edu.cn/"),
    ("电子科技大学", "四川", "研究生院", "通知", "https://gr.uestc.edu.cn/"),
]


async def main():
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from sqlalchemy import select, func
    from src.models.base import Base
    from src.models.university import University, Department, DepartmentSource
    from src.models.notice import AdmissionNotice
    import src.storage.database as dbm
    from src.processor.notice_processor import NoticeProcessor

    Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    dbm.engine = create_async_engine(f"sqlite+aiosqlite:///{DB_PATH}")
    dbm.async_session = async_sessionmaker(dbm.engine, expire_on_commit=False)
    async with dbm.engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)  # 幂等

    # 幂等播种：按 URL 追加尚不存在的源（已存在的跳过，不重复建校/院）
    async with dbm.async_session() as s:
        existing_urls = {row[0] for row in (await s.execute(select(DepartmentSource.source_url))).all()}
        existing_unis = {row[1] for row in (await s.execute(select(University.id, University.name))).all()}
        added = 0
        for uni, prov, dept, stype, url in SEEDED:
            if url in existing_urls:
                continue
            if uni not in existing_unis:
                u = University(name=uni, level="985", province=prov, auto_discovered=False)
                s.add(u); await s.flush()
                existing_unis.add(uni)
                uni_id = u.id
            else:
                uni_id = (await s.execute(select(University.id).where(University.name == uni))).scalar()
            d = Department(university_id=uni_id, name=dept, is_active=True)
            s.add(d); await s.flush()
            s.add(DepartmentSource(department_id=d.id, source_url=url, source_type=stype,
                                   priority=1, is_active=True, fail_count=0))
            existing_urls.add(url)
            added += 1
        await s.commit()
        print(f"追加 {added} 个新源（共 {len(existing_urls)} 源）")

    print("=== 运行爬取（并发，max_pages=2）===")
    async with dbm.async_session() as session:
        proc = NoticeProcessor(session)
        await proc.process_all(max_pages=2)

    async with dbm.async_session() as s:
        total = (await s.execute(select(func.count(AdmissionNotice.id)))).scalar()
        by_type = (await s.execute(
            select(AdmissionNotice.program_type, func.count(AdmissionNotice.id))
            .group_by(AdmissionNotice.program_type)
        )).all()
    print(f"\n=== admission_notices 总数: {total} ===")
    for pt, c in sorted(by_type, key=lambda x: -x[1]):
        print(f"  {pt or '(空)':8s}: {c}")

    from src.utils.http_client import http_client
    await http_client.close()
    await dbm.engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
