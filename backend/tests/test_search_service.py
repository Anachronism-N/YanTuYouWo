"""后端搜索服务测试 —— 验证扩展搜索字段（requirements/disciplines）的召回。

之前 search 只匹配 title/summary，关键词只出现在招生学科/申请条件里会漏。
"""
import asyncio
import sys
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
os.environ.setdefault("PYTHONUTF8", "1")

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select
from src.models.base import Base
from src.models.notice import AdmissionNotice
from src.models.university import University
from src.services.search_service import search


async def _setup():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    Session = async_sessionmaker(engine, expire_on_commit=False)
    async with Session() as s:
        u = University(name="测试大学", level="985", province="测试省")
        s.add(u); await s.flush()
        # notice A：关键词只在 requirements（不在 title/summary）
        s.add(AdmissionNotice(
            university_id=u.id, title="研究生招生公告", source_url="http://t/a",
            summary="关于招生的总体说明", requirements="要求精通量子计算与密码学",
            disciplines=["密码学", "量子计算"], program_type="招生简章",
        ))
        # notice B：关键词在 disciplines（JSON）
        s.add(AdmissionNotice(
            university_id=u.id, title="夏令营通知", source_url="http://t/b",
            summary="暑期活动", requirements="成绩优秀",
            disciplines=["生物医学工程"], program_type="夏令营",
        ))
        await s.commit()
    return engine, Session


async def test_search_finds_keyword_in_requirements():
    engine, Session = await _setup()
    try:
        async with Session() as s:
            r = await search(s, keyword="量子计算", type="notice")
            titles = [it["title"] for it in r["items"]]
            assert "研究生招生公告" in titles, f"应在 requirements 命中: {titles}"
        print("[OK] requirements 字段命中")
    finally:
        await engine.dispose()


async def test_search_finds_keyword_in_disciplines():
    engine, Session = await _setup()
    try:
        async with Session() as s:
            r = await search(s, keyword="生物医学工程", type="notice")
            titles = [it["title"] for it in r["items"]]
            assert "夏令营通知" in titles, f"应在 disciplines 命中: {titles}"
        print("[OK] disciplines(JSON) 字段命中")
    finally:
        await engine.dispose()


async def test_search_finds_keyword_in_raw_content():
    """关键词只出现在正文（如学科名在表格/正文里）也应命中"""
    engine, Session = await _setup()
    try:
        async with Session() as s:
            # 插一条关键词只在 raw_content 的通知
            u = (await s.execute(select(University))).scalars().first()
            s.add(AdmissionNotice(
                university_id=u.id, title="某通知", source_url="http://t/c",
                summary="普通摘要", requirements="无",
                raw_content="本通知面向计算机科学与技术、人工智能等专业本科生。",
                program_type="夏令营",
            ))
            await s.commit()
            r = await search(s, keyword="计算机科学与技术", type="notice")
            titles = [it["title"] for it in r["items"]]
            assert "某通知" in titles, f"应在 raw_content 命中: {titles}"
        print("[OK] raw_content 正文命中（学科检索）")
    finally:
        await engine.dispose()


async def test_search_still_matches_title():
    engine, Session = await _setup()
    try:
        async with Session() as s:
            r = await search(s, keyword="夏令营", type="notice")
            assert any("夏令营" in it["title"] for it in r["items"])
        print("[OK] title 命中（回归）")
    finally:
        await engine.dispose()


async def test_search_no_match_returns_empty():
    engine, Session = await _setup()
    try:
        async with Session() as s:
            r = await search(s, keyword="不存在的关键词xyz", type="notice")
            assert r["total"] == 0
        print("[OK] 无匹配返回空")
    finally:
        await engine.dispose()


async def main():
    print("=== 后端搜索服务测试 ===")
    await test_search_finds_keyword_in_requirements()
    await test_search_finds_keyword_in_raw_content()
    await test_search_still_matches_title()
    await test_search_no_match_returns_empty()
    print("\n[PASS] 所有搜索测试通过!")


if __name__ == "__main__":
    asyncio.run(main())
