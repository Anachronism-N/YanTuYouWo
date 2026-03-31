"""
阶段2信息源优化脚本

诊断并修复 department_sources 表中的URL质量问题：
1. 清理噪声学院名称（阶段1遗留的新闻标题等）
2. 修复指向单篇文章的URL（应指向列表页）
3. 删除指向不相关栏目的信息源（党建、基层党建等）
4. 删除重复的信息源
5. 对缺少招生类信息源的学院重新定位
6. 验证所有信息源URL的有效性

用法：
    python scripts/optimize_sources.py --db data/test_phase2_locate.db              # 诊断模式（只报告问题）
    python scripts/optimize_sources.py --db data/test_phase2_locate.db --fix        # 修复模式（自动修复）
    python scripts/optimize_sources.py --db data/test_phase2_locate.db --relocate   # 重新定位模式
"""

from __future__ import annotations

import asyncio
import sys
import os
import re
import json
import shutil
from pathlib import Path
from datetime import datetime
from urllib.parse import urlparse, urljoin

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from loguru import logger
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select, delete, update, text

from src.models.base import Base
from src.models.university import University, Department, DepartmentSource
from src.utils.http_client import http_client
from src.utils.url_utils import normalize_url, is_valid_url


# ============================================================
# 问题诊断规则
# ============================================================

# 噪声学院名称模式（阶段1数据噪声）
NOISE_DEPT_PATTERNS = [
    r".*课题组.*招聘.*",
    r".*招聘.*课题组.*",
    r".*荣获.*",
    r".*大赛.*",
    r".*部署启动.*",
    r".*筹建工作.*",
    r".*学子在.*",
    r"^>",                    # 以 > 开头的（如 ">书院生活"）
    r"^■",                    # 以 ■ 开头的（如 "■高瓴人工智能学院"）
    r".*党工委.*",
    r".*领导小组.*",
    r"^中国科学院院士$",
    r"^中国工程院院士$",
]

# 不相关栏目URL特征（这些URL不包含推免信息）
IRRELEVANT_URL_PATTERNS = [
    r"/jicengdangjian",     # 基层党建
    r"/djsz/",              # 党建思政
    r"/djgz/",              # 党建工作
    r"/djdt",               # 党建动态
    r"/djgg",               # 党建公告
    r"/dqzc/djgz",          # 党群组织/党建工作
    r"/dj/",                # 党建
    r"/ghgz/",              # 工会工作
]

# 单篇文章URL特征（应该是列表页而非单篇文章）
ARTICLE_URL_PATTERNS = [
    r"/info/\d+/\d+\.htm",     # /info/1051/11867.htm
    r"/info/\d+\.htm",         # /info/1234.htm
    r"/20\d{2}/\d{2,4}/[a-zA-Z]",  # /2026/0327/c5491a523348/page.htm
    r"/page\.htm$",
    r"/page\.psp$",
]

# 导航页/首页URL特征（不是通知列表页）
NAVIGATION_URL_PATTERNS = [
    r"personnel-training\d*\.html$",  # 人才培养导航页
    r"/main\.htm$",                    # 主页
]


def diagnose_department(dept_name: str) -> list[str]:
    """诊断学院名称问题"""
    issues = []
    if len(dept_name) > 25:
        issues.append(f"名称过长({len(dept_name)}字): 可能是新闻标题")
    for pattern in NOISE_DEPT_PATTERNS:
        if re.match(pattern, dept_name):
            issues.append(f"噪声名称: 匹配模式 {pattern}")
            break
    if dept_name.endswith("、") or dept_name.endswith("，"):
        issues.append(f"名称末尾有标点: '{dept_name[-1]}'")
    return issues


def diagnose_source_url(url: str, source_type: str) -> list[str]:
    """诊断信息源URL问题"""
    issues = []

    # 检查不相关栏目
    for pattern in IRRELEVANT_URL_PATTERNS:
        if re.search(pattern, url, re.I):
            issues.append(f"不相关栏目: 匹配 {pattern}")
            break

    # 检查单篇文章URL
    for pattern in ARTICLE_URL_PATTERNS:
        if re.search(pattern, url, re.I):
            # 排除 list.htm 结尾的（这是列表页）
            if not url.endswith("list.htm"):
                issues.append(f"单篇文章URL: 匹配 {pattern}")
                break

    # 检查导航页URL
    for pattern in NAVIGATION_URL_PATTERNS:
        if re.search(pattern, url, re.I):
            issues.append(f"导航页URL: 匹配 {pattern}")
            break

    # 检查URL是否以 / 结尾（通常是首页而非列表页）
    parsed = urlparse(url)
    if parsed.path in ("", "/") and source_type == "招生":
        issues.append("URL是网站首页: 可能不是招生列表页")

    return issues


# ============================================================
# 已知问题的修复映射
# ============================================================

# 手动修复映射：{(高校, 学院, 旧URL): 新URL 或 None(删除)}
# 基于大规模实验结果确定的修复方案
MANUAL_FIXES = {
    # 上海交通大学海洋研究院：导航页 → 需要重新定位
    ("上海交通大学", "海洋研究院", "https://soo.sjtu.edu.cn/personnel-training3.html"):
        None,  # 删除，重新定位

    # 上海交通大学中英国际低碳学院：基层党建 → 删除
    ("上海交通大学", "中英国际低碳学院", "http://lcc.sjtu.edu.cn/Data/List/jicengdangjian"):
        None,

    # 北京航空航天大学宇航学院：单篇文章 → 通知列表页
    ("北京航空航天大学", "宇航学院", "http://www.sa.buaa.edu.cn/info/1051/11867.htm"):
        "http://www.sa.buaa.edu.cn/tzgg.htm",

    # 山东大学药学院：单篇文章 → 通知列表页
    ("山东大学", "药学院", "https://www.pharm.sdu.edu.cn/info/1048/21288.htm"):
        None,  # 删除，重新定位

    # 中南大学邓迪国际学院：党建公告 → 删除
    ("中南大学", "邓迪国际学院", "https://dii.csu.edu.cn/djsz/djgg.htm"):
        None,
    ("中南大学", "邓迪国际学院", "https://dii.csu.edu.cn/djsz/djdt.htm"):
        None,

    # 北京师范大学哲学学院：党建工作 → 删除
    ("北京师范大学", "哲学学院", "http://phil.bnu.edu.cn/dqzc/djgz/index.html"):
        None,

    # 北京师范大学国家安全与应急管理学院：党建新闻 → 删除
    ("北京师范大学", "国家安全与应急管理学院", "https://nsem.bnu.edu.cn/dj/xwdt2/index.htm"):
        None,

    # 东南大学生命科学与技术学院：党建动态 → 删除
    ("东南大学", "生命科学与技术学院", "http://ils.seu.edu.cn/djdt/list.htm"):
        None,

    # 湖南大学生物学院：本科生招生 → 需要研究生招生
    ("湖南大学", "生物学院", "http://bio.hnu.edu.cn/swxy/zsjy/bkszs.htm"):
        "http://bio.hnu.edu.cn/swxy/zsjy/yjszs.htm",
}

# 需要清理的噪声学院（整个学院删除）
NOISE_DEPARTMENTS = [
    ("中国农业大学", "中国农业大学动物医学院马翀课题组招聘科研助理"),
    ("中央民族大学", "历史文化学院学子在首都高校中华服饰创意大赛中荣获一等奖"),
    ("复旦大学", ">书院生活"),
    ("西北农林科技大学", "中国科学院院士"),
]

# 需要修正名称的学院
DEPT_NAME_FIXES = {
    ("中国人民大学", "■高瓴人工智能学院"): "高瓴人工智能学院",
    ("中央民族大学", "民大·学院"): "新闻与传播学院",
    ("重庆大学", "重庆大学-辛辛那提大学联合学院、"): "重庆大学-辛辛那提大学联合学院",
    ("哈尔滨工业大学", "农业人工智能学院党委"): "计算学部",
    ("哈尔滨工业大学", "能源科学与工程学院党委"): "能源科学与工程学院",
}

# 重复信息源（需要删除的重复项）
DUPLICATE_SOURCES = [
    # 电子科技大学"独立学院"和"学院部门"指向完全相同的URL
    ("电子科技大学", "独立学院"),
    # 中国农业大学重复的学院
    ("中国农业大学", "中国农业大学动物医学院马翀课题组招聘科研助理"),
    # 国防科技大学两个学院指向同一URL
    ("国防科技大学", "军政基础教育学院"),
]


# ============================================================
# 主流程
# ============================================================

async def run_diagnosis(db_path: str):
    """诊断模式：扫描所有信息源，报告问题"""
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}", echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        # 加载所有信息源
        result = await session.execute(
            select(DepartmentSource, Department, University)
            .join(Department, DepartmentSource.department_id == Department.id)
            .join(University, Department.university_id == University.id)
            .order_by(University.name, Department.name, DepartmentSource.source_type)
        )
        rows = result.all()

    await engine.dispose()

    logger.info(f"{'='*70}")
    logger.info(f"📋 信息源诊断报告")
    logger.info(f"{'='*70}")
    logger.info(f"总信息源数: {len(rows)}")

    issues_by_category = {
        "噪声学院": [],
        "不相关栏目": [],
        "单篇文章URL": [],
        "导航页/首页URL": [],
        "重复信息源": [],
        "学院名称问题": [],
    }

    seen_urls = {}  # url -> (uni, dept, type)

    for source, dept, uni in rows:
        # 诊断学院名称
        dept_issues = diagnose_department(dept.name)
        if dept_issues:
            for issue in dept_issues:
                if "噪声" in issue:
                    issues_by_category["噪声学院"].append(
                        f"  {uni.name} / {dept.name}: {issue}"
                    )
                else:
                    issues_by_category["学院名称问题"].append(
                        f"  {uni.name} / {dept.name}: {issue}"
                    )

        # 诊断URL
        url_issues = diagnose_source_url(source.source_url, source.source_type)
        for issue in url_issues:
            if "不相关" in issue:
                issues_by_category["不相关栏目"].append(
                    f"  [{source.source_type}] {uni.name} / {dept.name}: {source.source_url}"
                )
            elif "单篇文章" in issue:
                issues_by_category["单篇文章URL"].append(
                    f"  [{source.source_type}] {uni.name} / {dept.name}: {source.source_url}"
                )
            elif "导航页" in issue or "首页" in issue:
                issues_by_category["导航页/首页URL"].append(
                    f"  [{source.source_type}] {uni.name} / {dept.name}: {source.source_url}"
                )

        # 检查重复
        key = source.source_url
        if key in seen_urls:
            prev = seen_urls[key]
            issues_by_category["重复信息源"].append(
                f"  {source.source_url}\n"
                f"    → {prev[0]} / {prev[1]} ({prev[2]})\n"
                f"    → {uni.name} / {dept.name} ({source.source_type})"
            )
        else:
            seen_urls[key] = (uni.name, dept.name, source.source_type)

    # 输出报告
    total_issues = 0
    for category, items in issues_by_category.items():
        if items:
            logger.info(f"\n{'─'*50}")
            logger.info(f"⚠️  {category} ({len(items)} 个)")
            logger.info(f"{'─'*50}")
            for item in items:
                logger.info(item)
            total_issues += len(items)

    logger.info(f"\n{'='*70}")
    logger.info(f"📊 诊断汇总: 发现 {total_issues} 个问题")
    logger.info(f"{'='*70}")

    return total_issues


async def run_fix(db_path: str):
    """修复模式：自动修复已知问题"""
    # 先备份数据库
    backup_path = db_path + f".backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    shutil.copy2(db_path, backup_path)
    logger.info(f"📦 数据库已备份: {backup_path}")

    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}", echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    stats = {
        "deleted_sources": 0,
        "fixed_urls": 0,
        "fixed_dept_names": 0,
        "deleted_departments": 0,
        "deleted_irrelevant": 0,
    }

    async with session_factory() as session:
        # 1. 删除噪声学院及其信息源
        logger.info("\n🧹 步骤1: 清理噪声学院")
        for uni_name, dept_name in NOISE_DEPARTMENTS:
            result = await session.execute(
                select(Department, University)
                .join(University, Department.university_id == University.id)
                .where(University.name == uni_name, Department.name == dept_name)
            )
            row = result.first()
            if row:
                dept, uni = row
                # 删除该学院的所有信息源
                await session.execute(
                    delete(DepartmentSource).where(DepartmentSource.department_id == dept.id)
                )
                # 删除学院
                await session.delete(dept)
                stats["deleted_departments"] += 1
                logger.info(f"  🗑️  删除噪声学院: {uni_name} / {dept_name}")

        # 2. 修正学院名称
        logger.info("\n✏️  步骤2: 修正学院名称")
        for (uni_name, old_name), new_name in DEPT_NAME_FIXES.items():
            result = await session.execute(
                select(Department, University)
                .join(University, Department.university_id == University.id)
                .where(University.name == uni_name, Department.name == old_name)
            )
            row = result.first()
            if row:
                dept, uni = row
                dept.name = new_name
                stats["fixed_dept_names"] += 1
                logger.info(f"  ✏️  {uni_name}: '{old_name}' → '{new_name}'")

        # 3. 应用手动修复映射
        logger.info("\n🔧 步骤3: 修复信息源URL")
        for (uni_name, dept_name, old_url), new_url in MANUAL_FIXES.items():
            result = await session.execute(
                select(DepartmentSource, Department, University)
                .join(Department, DepartmentSource.department_id == Department.id)
                .join(University, Department.university_id == University.id)
                .where(
                    University.name == uni_name,
                    Department.name == dept_name,
                    DepartmentSource.source_url == old_url,
                )
            )
            row = result.first()
            if row:
                source, dept, uni = row
                if new_url is None:
                    await session.delete(source)
                    stats["deleted_sources"] += 1
                    logger.info(f"  🗑️  删除: {uni_name} / {dept_name}: {old_url}")
                else:
                    source.source_url = new_url
                    stats["fixed_urls"] += 1
                    logger.info(f"  🔧 修复: {uni_name} / {dept_name}")
                    logger.info(f"       旧: {old_url}")
                    logger.info(f"       新: {new_url}")

        # 4. 自动删除不相关栏目的信息源
        logger.info("\n🧹 步骤4: 删除不相关栏目信息源")
        all_sources = await session.execute(
            select(DepartmentSource, Department, University)
            .join(Department, DepartmentSource.department_id == Department.id)
            .join(University, Department.university_id == University.id)
        )
        for source, dept, uni in all_sources.all():
            for pattern in IRRELEVANT_URL_PATTERNS:
                if re.search(pattern, source.source_url, re.I):
                    # 检查是否已在手动修复中处理过
                    key = (uni.name, dept.name, source.source_url)
                    if key not in MANUAL_FIXES:
                        await session.delete(source)
                        stats["deleted_irrelevant"] += 1
                        logger.info(f"  🗑️  不相关: {uni.name} / {dept.name}: {source.source_url}")
                    break

        # 5. 删除重复学院的信息源
        logger.info("\n🧹 步骤5: 删除重复信息源")
        for uni_name, dept_name in DUPLICATE_SOURCES:
            result = await session.execute(
                select(Department, University)
                .join(University, Department.university_id == University.id)
                .where(University.name == uni_name, Department.name == dept_name)
            )
            row = result.first()
            if row:
                dept, uni = row
                await session.execute(
                    delete(DepartmentSource).where(DepartmentSource.department_id == dept.id)
                )
                await session.delete(dept)
                stats["deleted_departments"] += 1
                logger.info(f"  🗑️  删除重复: {uni_name} / {dept_name}")

        # 6. 自动修复单篇文章URL → 尝试推断列表页URL
        logger.info("\n🔧 步骤6: 修复单篇文章URL")
        all_sources2 = await session.execute(
            select(DepartmentSource, Department, University)
            .join(Department, DepartmentSource.department_id == Department.id)
            .join(University, Department.university_id == University.id)
        )
        for source, dept, uni in all_sources2.all():
            url = source.source_url
            is_article = False
            for pattern in ARTICLE_URL_PATTERNS:
                if re.search(pattern, url, re.I) and not url.endswith("list.htm"):
                    is_article = True
                    break

            if is_article:
                # 尝试推断列表页URL
                list_url = _infer_list_url_from_article(url)
                if list_url:
                    source.source_url = list_url
                    stats["fixed_urls"] += 1
                    logger.info(f"  🔧 文章→列表: {uni.name} / {dept.name}")
                    logger.info(f"       旧: {url}")
                    logger.info(f"       新: {list_url}")
                else:
                    await session.delete(source)
                    stats["deleted_sources"] += 1
                    logger.info(f"  🗑️  无法推断列表页: {uni.name} / {dept.name}: {url}")

        # 7. 全局URL去重（同一学院内相同URL只保留一个）
        logger.info("\n🧹 步骤7: 全局URL去重")
        all_sources3 = await session.execute(
            select(DepartmentSource, Department, University)
            .join(Department, DepartmentSource.department_id == Department.id)
            .join(University, Department.university_id == University.id)
            .order_by(DepartmentSource.id)  # 保留最早的
        )
        seen_url_keys = {}  # (dept_id, normalized_url) -> source_id
        dedup_count = 0
        for source, dept, uni in all_sources3.all():
            # 规范化URL：去掉协议差异(http/https)和末尾斜杠
            norm_url = _normalize_url_for_dedup(source.source_url)
            key = (dept.id, norm_url)
            if key in seen_url_keys:
                await session.delete(source)
                dedup_count += 1
            else:
                seen_url_keys[key] = source.id

        if dedup_count > 0:
            logger.info(f"  🗑️  删除 {dedup_count} 个学院内重复信息源")
            stats["deleted_sources"] += dedup_count

        # 8. 跨学院URL去重（不同学院指向完全相同URL的，只保留第一个）
        logger.info("\n🧹 步骤8: 跨学院URL去重")
        all_sources4 = await session.execute(
            select(DepartmentSource, Department, University)
            .join(Department, DepartmentSource.department_id == Department.id)
            .join(University, Department.university_id == University.id)
            .order_by(DepartmentSource.id)
        )
        seen_global_urls = {}  # normalized_url -> (source_id, uni_name, dept_name)
        cross_dedup_count = 0
        for source, dept, uni in all_sources4.all():
            norm_url = _normalize_url_for_dedup(source.source_url)
            if norm_url in seen_global_urls:
                prev = seen_global_urls[norm_url]
                # 只有不同学院的才去重
                if prev[1] != uni.name or prev[2] != dept.name:
                    await session.delete(source)
                    cross_dedup_count += 1
                    logger.info(f"  🗑️  跨学院重复: {uni.name}/{dept.name} 与 {prev[1]}/{prev[2]}: {source.source_url}")
            else:
                seen_global_urls[norm_url] = (source.id, uni.name, dept.name)

        if cross_dedup_count > 0:
            stats["deleted_sources"] += cross_dedup_count

        await session.commit()

    await engine.dispose()

    # 输出统计
    logger.info(f"\n{'='*70}")
    logger.info(f"📊 修复统计")
    logger.info(f"{'='*70}")
    logger.info(f"  删除噪声/重复学院: {stats['deleted_departments']}")
    logger.info(f"  修正学院名称: {stats['fixed_dept_names']}")
    logger.info(f"  修复信息源URL: {stats['fixed_urls']}")
    logger.info(f"  删除无效信息源: {stats['deleted_sources']}")
    logger.info(f"  删除不相关栏目: {stats['deleted_irrelevant']}")
    logger.info(f"{'='*70}")

    return stats


def _normalize_url_for_dedup(url: str) -> str:
    """规范化URL用于去重比较：统一协议、去掉末尾斜杠"""
    url = url.strip()
    # 统一为https
    url = re.sub(r'^http://', 'https://', url)
    # 去掉末尾斜杠
    url = url.rstrip('/')
    # 去掉www.前缀
    url = re.sub(r'://www\.', '://', url)
    return url.lower()


def _infer_list_url_from_article(article_url: str) -> str | None:
    """
    从单篇文章URL推断列表页URL。

    常见模式：
    - /info/1048/21288.htm → 尝试 /1048/list.htm 或 /tzgg/list.htm
    - /2024/0827/c42706a501086/page.htm → 尝试 /42706/list.htm
    """
    parsed = urlparse(article_url)
    base = f"{parsed.scheme}://{parsed.netloc}"

    # 模式1: /info/XXXX/YYYY.htm → /XXXX/list.htm
    match = re.search(r"/info/(\d+)/\d+\.htm", article_url)
    if match:
        column_id = match.group(1)
        return f"{base}/{column_id}/list.htm"

    # 模式2: /YYYY/MMDD/cXXXXXaYYYYYY/page.htm → /XXXXX/list.htm
    match = re.search(r"/c(\d+)a\d+/page\.htm", article_url)
    if match:
        column_id = match.group(1)
        return f"{base}/{column_id}/list.htm"

    return None


async def run_relocate(db_path: str):
    """重新定位模式：对缺少招生类信息源的学院重新运行定位"""
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}", echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    from src.discovery.notice_page_locator import locate_notice_pages

    async with session_factory() as session:
        # 找出缺少招生类信息源的学院
        result = await session.execute(
            select(Department, University)
            .join(University, Department.university_id == University.id)
            .order_by(University.name, Department.name)
        )
        all_depts = result.all()

        # 检查每个学院是否有招生类信息源
        depts_needing_relocation = []
        for dept, uni in all_depts:
            sources_result = await session.execute(
                select(DepartmentSource)
                .where(DepartmentSource.department_id == dept.id)
            )
            sources = sources_result.scalars().all()

            has_admission = any(s.source_type == "招生" for s in sources)
            has_notice = any(s.source_type == "通知" for s in sources)

            if not has_admission or not has_notice:
                depts_needing_relocation.append((dept, uni, sources, has_admission, has_notice))

        logger.info(f"\n{'='*70}")
        logger.info(f"🔍 需要重新定位的学院: {len(depts_needing_relocation)}")
        logger.info(f"{'='*70}")

        relocated = 0
        new_sources_count = 0

        for dept, uni, existing_sources, has_admission, has_notice in depts_needing_relocation:
            if not dept.homepage_url:
                logger.info(f"  ⏭️  {uni.name} / {dept.name}: 无学院URL，跳过")
                continue

            missing = []
            if not has_admission:
                missing.append("招生")
            if not has_notice:
                missing.append("通知")

            logger.info(f"\n  🔍 {uni.name} / {dept.name} (缺少: {', '.join(missing)})")
            logger.info(f"     学院URL: {dept.homepage_url}")

            try:
                new_sources = await locate_notice_pages(
                    dept_homepage=dept.homepage_url,
                    dept_name=dept.name,
                    university_name=uni.name,
                    graduate_url=uni.graduate_url,
                )

                if new_sources:
                    existing_urls = {_normalize_url_for_dedup(s.source_url) for s in existing_sources}
                    added = 0
                    added_by_type = {}  # type -> count，每种类型最多添加2个
                    for source_info in new_sources:
                        src_type = source_info["type"]
                        # 只添加缺少类型的信息源
                        if src_type == "招生" and has_admission:
                            continue
                        if src_type == "通知" and has_notice:
                            continue

                        # 每种类型最多添加2个
                        if added_by_type.get(src_type, 0) >= 2:
                            continue

                        norm_url = _normalize_url_for_dedup(source_info["url"])
                        if norm_url in existing_urls:
                            continue

                        # 验证URL不是不相关栏目
                        is_irrelevant = False
                        for pattern in IRRELEVANT_URL_PATTERNS:
                            if re.search(pattern, source_info["url"], re.I):
                                is_irrelevant = True
                                break
                        if is_irrelevant:
                            continue

                        # 验证URL不是单篇文章
                        is_article = False
                        for pattern in ARTICLE_URL_PATTERNS:
                            if re.search(pattern, source_info["url"], re.I) and not source_info["url"].endswith("list.htm"):
                                is_article = True
                                break
                        if is_article:
                            continue

                        new_source = DepartmentSource(
                            department_id=dept.id,
                            source_url=source_info["url"],
                            source_type=src_type,
                            priority=source_info.get("priority", 5),
                            parser_type="auto",
                        )
                        session.add(new_source)
                        existing_urls.add(norm_url)
                        added += 1
                        added_by_type[src_type] = added_by_type.get(src_type, 0) + 1
                        logger.info(f"     ✅ 新增 [{src_type}]: {source_info['url']}")

                    if added > 0:
                        relocated += 1
                        new_sources_count += added
                else:
                    logger.info(f"     ❌ 未找到新的信息源")

            except Exception as e:
                logger.warning(f"     ❌ 定位异常: {e}")

        await session.commit()

    await http_client.close()
    await engine.dispose()

    logger.info(f"\n{'='*70}")
    logger.info(f"📊 重新定位统计")
    logger.info(f"{'='*70}")
    logger.info(f"  需要重新定位: {len(depts_needing_relocation)} 个学院")
    logger.info(f"  成功补充: {relocated} 个学院")
    logger.info(f"  新增信息源: {new_sources_count} 个")
    logger.info(f"{'='*70}")


async def run_validate(db_path: str):
    """验证模式：验证所有信息源URL的可访问性"""
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}", echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    from src.discovery.notice_page_locator import validate_notice_list_page

    async with session_factory() as session:
        result = await session.execute(
            select(DepartmentSource, Department, University)
            .join(Department, DepartmentSource.department_id == Department.id)
            .join(University, Department.university_id == University.id)
            .order_by(University.name, Department.name)
        )
        rows = result.all()

    await engine.dispose()

    logger.info(f"\n{'='*70}")
    logger.info(f"🔍 验证所有信息源URL ({len(rows)} 个)")
    logger.info(f"{'='*70}")

    results = {"high": [], "medium": [], "low": [], "failed": []}

    for source, dept, uni in rows:
        try:
            score = await validate_notice_list_page(source.source_url)
            entry = f"  [{source.source_type}] {uni.name} / {dept.name}: {score}/100 | {source.source_url}"

            if score >= 70:
                results["high"].append(entry)
            elif score >= 40:
                results["medium"].append(entry)
            elif score > 0:
                results["low"].append(entry)
            else:
                results["failed"].append(entry)

        except Exception as e:
            results["failed"].append(
                f"  [{source.source_type}] {uni.name} / {dept.name}: ERROR | {source.source_url} ({e})"
            )

    await http_client.close()

    # 输出结果
    logger.info(f"\n✅ 高质量 (≥70分): {len(results['high'])} 个")
    for item in results["high"]:
        logger.info(item)

    logger.info(f"\n⚠️  中等质量 (40-69分): {len(results['medium'])} 个")
    for item in results["medium"]:
        logger.info(item)

    logger.info(f"\n🔶 低质量 (1-39分): {len(results['low'])} 个")
    for item in results["low"]:
        logger.info(item)

    logger.info(f"\n❌ 失败 (0分): {len(results['failed'])} 个")
    for item in results["failed"]:
        logger.info(item)

    total = len(rows)
    good = len(results["high"]) + len(results["medium"])
    logger.info(f"\n{'='*70}")
    logger.info(f"📊 验证汇总: {good}/{total} ({good/max(total,1)*100:.1f}%) 质量合格")
    logger.info(f"{'='*70}")


async def run_summary(db_path: str):
    """输出优化后的信息源汇总"""
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}", echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        result = await session.execute(
            select(DepartmentSource, Department, University)
            .join(Department, DepartmentSource.department_id == Department.id)
            .join(University, Department.university_id == University.id)
            .order_by(University.name, Department.name, DepartmentSource.source_type)
        )
        rows = result.all()

        # 统计
        uni_count = len(set(uni.name for _, _, uni in rows))
        dept_count = len(set((uni.name, dept.name) for _, dept, uni in rows))
        type_counts = {}
        for source, _, _ in rows:
            type_counts[source.source_type] = type_counts.get(source.source_type, 0) + 1

        # 检查覆盖情况
        dept_types = {}
        for source, dept, uni in rows:
            key = (uni.name, dept.name)
            if key not in dept_types:
                dept_types[key] = set()
            dept_types[key].add(source.source_type)

        has_admission = sum(1 for types in dept_types.values() if "招生" in types)
        has_notice = sum(1 for types in dept_types.values() if "通知" in types)
        has_news = sum(1 for types in dept_types.values() if "新闻" in types)

    await engine.dispose()

    logger.info(f"\n{'='*70}")
    logger.info(f"📊 信息源汇总")
    logger.info(f"{'='*70}")
    logger.info(f"  高校数: {uni_count}")
    logger.info(f"  学院数: {dept_count}")
    logger.info(f"  信息源总数: {len(rows)}")
    logger.info(f"  类型分布: {type_counts}")
    logger.info(f"\n  学院覆盖情况:")
    logger.info(f"    有招生类信息源: {has_admission}/{dept_count} ({has_admission/max(dept_count,1)*100:.1f}%)")
    logger.info(f"    有通知类信息源: {has_notice}/{dept_count} ({has_notice/max(dept_count,1)*100:.1f}%)")
    logger.info(f"    有新闻类信息源: {has_news}/{dept_count} ({has_news/max(dept_count,1)*100:.1f}%)")
    logger.info(f"{'='*70}")


async def main():
    import argparse
    parser = argparse.ArgumentParser(description="阶段2信息源优化")
    parser.add_argument("--db", required=True, help="数据库路径")
    parser.add_argument("--fix", action="store_true", help="执行修复")
    parser.add_argument("--relocate", action="store_true", help="重新定位缺失的信息源")
    parser.add_argument("--validate", action="store_true", help="验证所有信息源URL")
    parser.add_argument("--summary", action="store_true", help="输出汇总信息")
    args = parser.parse_args()

    db_path = str(Path(args.db).resolve())
    if not Path(db_path).exists():
        logger.error(f"数据库不存在: {db_path}")
        return

    logger.remove()
    logger.add(sys.stderr, level="INFO", format="{time:HH:mm:ss} | {level: <5} | {message}")

    if args.fix:
        # 先诊断，再修复
        await run_diagnosis(db_path)
        logger.info("\n" + "="*70)
        logger.info("🔧 开始执行修复...")
        logger.info("="*70)
        await run_fix(db_path)
        # 修复后再诊断一次
        logger.info("\n" + "="*70)
        logger.info("📋 修复后重新诊断...")
        logger.info("="*70)
        await run_diagnosis(db_path)
        await run_summary(db_path)
    elif args.relocate:
        await run_relocate(db_path)
        await run_summary(db_path)
    elif args.validate:
        await run_validate(db_path)
    elif args.summary:
        await run_summary(db_path)
    else:
        # 默认：诊断模式
        await run_diagnosis(db_path)
        await run_summary(db_path)


if __name__ == "__main__":
    asyncio.run(main())
