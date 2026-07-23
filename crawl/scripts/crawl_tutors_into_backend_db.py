"""向后端 DB 注入真实导师数据（供浏览器预览）。

流程（每院系）：faculty_locator 定位师资页 → faculty_list_parser 解析卡片 →
profile_extractor LLM 画像（限 N 位控成本）→ 写入 tutors 表。
"""
from __future__ import annotations

import asyncio
import sys
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
os.environ.setdefault("PYTHONUTF8", "1")

from loguru import logger
logger.remove()
logger.add(sys.stderr, level="WARNING")

DB_PATH = "data/large_scale_test.db"

# (高校, 省份, 学院名, 学科, 院系首页) —— 已验证 faculty_locator 可定位师资页
DEPTS = [
    ("北京航空航天大学", "北京", "计算机学院", "工学", "https://scse.buaa.edu.cn/"),
    ("北京理工大学", "北京", "计算机学院", "工学", "https://cs.bit.edu.cn/"),
    ("华中科技大学", "湖北", "计算机科学与技术学院", "工学", "http://cs.hust.edu.cn/"),
    ("北京大学", "北京", "信息科学技术学院", "工学", "https://eecs.pku.edu.cn/"),
]
MAX_PROFILES_PER_DEPT = 4  # 每院 LLM 画像上限（控成本/时间）


async def main():
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from sqlalchemy import select, func
    from src.models.base import Base
    from src.models.university import University, Department
    from src.models.tutor import Tutor
    import src.storage.database as dbm
    from src.tutor.faculty_locator import locate_faculty_pages
    from src.tutor.faculty_list_parser import parse_faculty_list
    from src.tutor.profile_extractor import extract_profile, score_tier1_completeness
    from src.tutor.research_areas import broaden_research_areas
    from src.utils.http_client import http_client

    Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    dbm.engine = create_async_engine(f"sqlite+aiosqlite:///{DB_PATH}")
    dbm.async_session = async_sessionmaker(dbm.engine, expire_on_commit=False)
    async with dbm.engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    total_added = 0
    for uni_name, prov, dept_name, disc, dept_home in DEPTS:
        print(f"\n=== {uni_name} {dept_name} ===")
        async with dbm.async_session() as s:
            # 建校/院（幂等）
            uni_id = (await s.execute(select(University.id).where(University.name == uni_name))).scalar()
            if not uni_id:
                u = University(name=uni_name, level="985", province=prov, auto_discovered=False)
                s.add(u); await s.flush(); uni_id = u.id
            d = Department(university_id=uni_id, name=dept_name, is_active=True)
            s.add(d); await s.flush(); dept_id = d.id
            await s.commit()

        # 阶段 A：定位师资页
        sources = await locate_faculty_pages(dept_home, dept_name=dept_name, university_name=uni_name)
        sources = sorted(sources, key=lambda x: x.get("validation_score", 0) or 0, reverse=True)
        if not sources:
            print(f"  未定位到师资页"); continue
        print(f"  定位 {len(sources)} 个师资页候选，取最优")
        added = 0
        for src in sources[:3]:
            url = src.get("url", "")
            if not url:
                continue
            html = await http_client.fetch(url, retry=1)
            if not html:
                continue
            entries = parse_faculty_list(html, url)
            if len(entries) < 3:
                continue
            print(f"  {url[:50]} → {len(entries)} 位教师卡片")
            # 阶段 B2：对前 N 位做 LLM 画像
            for e in entries[:MAX_PROFILES_PER_DEPT]:
                if not e.get("homepage_url"):
                    continue
                # 去重（同人同校）
                async with dbm.async_session() as s:
                    exists = (await s.execute(
                        select(func.count(Tutor.id)).where(
                            Tutor.university_id == uni_id, Tutor.name == e["name"]
                        )
                    )).scalar()
                if exists:
                    continue
                prof = await extract_profile(
                    e["homepage_url"], name=e["name"],
                    university=uni_name, department=dept_name,
                )
                tier = "tier2"
                areas = e.get("research_areas") or []
                bio = None
                if prof["status"] == "ok":
                    d = prof["data"]
                    if d.get("research_areas"):
                        areas = d["research_areas"]
                    bio = d.get("biography")
                    comp = prof["completeness"]
                    tier = "tier1" if comp >= 60 else "tier2"
                areas = broaden_research_areas(areas)
                async with dbm.async_session() as s:
                    s.add(Tutor(
                        university_id=uni_id, department_id=dept_id,
                        name=e["name"], title=e.get("title") or (prof["data"].get("title") if prof["status"]=="ok" else None),
                        research_areas=areas or None,
                        homepage_url=e.get("homepage_url"),
                        email=e.get("email") or (prof["data"].get("email") if prof["status"]=="ok" else None),
                        avatar_url=e.get("photo_url"),
                        discipline=disc,
                        biography=bio,
                        education=prof["data"].get("education") if prof["status"]=="ok" else None,
                        publications=prof["data"].get("publications") if prof["status"]=="ok" else None,
                        awards=prof["data"].get("awards") if prof["status"]=="ok" else None,
                        recruiting_info=prof["data"].get("recruiting_info") if prof["status"]=="ok" else None,
                        crawl_tier=tier,
                        profile_completeness=prof["completeness"] if prof["status"]=="ok" else 0,
                        source_url=url,
                    ))
                    await s.commit()
                added += 1
                print(f"    + {e['name']} ({tier}, comp={prof['completeness'] if prof['status']=='ok' else 0})")
            if added:
                break
        total_added += added
        print(f"  本院新增 {added} 位导师")

    # 汇总
    async with dbm.async_session() as s:
        n = (await s.execute(select(func.count(Tutor.id)))).scalar()
        tier1 = (await s.execute(select(func.count(Tutor.id)).where(Tutor.crawl_tier == "tier1"))).scalar()
    print(f"\n=== tutors 总数: {n}（tier1: {tier1}）===")
    await http_client.close()
    await dbm.engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
