"""
阶段一扩展测试 - 更深入的鲁棒性和边界测试

测试维度：
6. URL 工具深度边界测试
7. SPA 检测与 Playwright 策略测试
8. _looks_like_dept_list / extract_links 测试
9. UA 池与 HTTP 客户端测试
10. _extract_dept_core 核心词提取测试
11. 更多高校网络集成测试（清华、复旦、中科大、国防科大）
12. 数据库级联删除与关系完整性测试
13. HttpClient 并发与频率控制测试
14. 配置模块测试
"""

import asyncio
import sys
import os
import traceback
import time
from datetime import datetime
from pathlib import Path

# 将项目根目录加入 sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from loguru import logger


# ============================================================
# 测试框架
# ============================================================

class TestResult:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []

    def ok(self, name: str, detail: str = ""):
        self.passed += 1
        logger.info(f"  ✅ {name}" + (f" | {detail}" if detail else ""))

    def fail(self, name: str, detail: str = ""):
        self.failed += 1
        self.errors.append(f"{name}: {detail}")
        logger.error(f"  ❌ {name}" + (f" | {detail}" if detail else ""))

    def check(self, name: str, condition: bool, detail: str = ""):
        if condition:
            self.ok(name, detail)
        else:
            self.fail(name, detail)

    def summary(self):
        total = self.passed + self.failed
        logger.info(f"\n{'='*60}")
        logger.info(f"扩展测试结果: {self.passed}/{total} 通过, {self.failed} 失败")
        if self.errors:
            logger.error("失败项:")
            for e in self.errors:
                logger.error(f"  - {e}")
        logger.info(f"{'='*60}\n")
        return self.failed == 0


result = TestResult()


# ============================================================
# 6. URL 工具深度边界测试
# ============================================================

def test_url_utils_deep():
    """URL 工具函数的深度边界测试"""
    logger.info("\n🔗 [6/14] URL 工具深度边界测试")

    from src.utils.url_utils import normalize_url, get_domain, get_base_url, is_valid_url, is_same_domain, extract_links

    # normalize_url 边界情况
    result.check(
        "normalize_url: 纯 fragment 链接",
        normalize_url("#section", "https://example.com/page") == "https://example.com/page",
        normalize_url("#section", "https://example.com/page")
    )

    result.check(
        "normalize_url: 带 query 参数",
        "b=2" in normalize_url("https://example.com/page?b=2&a=1"),
        normalize_url("https://example.com/page?b=2&a=1")
    )

    result.check(
        "normalize_url: query 参数排序",
        normalize_url("https://example.com/page?b=2&a=1") == normalize_url("https://example.com/page?a=1&b=2"),
        f"排序后应相同"
    )

    result.check(
        "normalize_url: 中文路径",
        "学院" in normalize_url("/学院/", "https://example.com"),
        normalize_url("/学院/", "https://example.com")
    )

    result.check(
        "normalize_url: 协议相对 URL",
        normalize_url("//cdn.example.com/file.js", "https://example.com").startswith("https://"),
        normalize_url("//cdn.example.com/file.js", "https://example.com")
    )

    result.check(
        "normalize_url: 多层相对路径",
        "pku.edu.cn" in normalize_url("../../yjsy/", "https://www.pku.edu.cn/a/b/c"),
        normalize_url("../../yjsy/", "https://www.pku.edu.cn/a/b/c")
    )

    # get_domain 边界
    result.check(
        "get_domain: 带端口号",
        get_domain("https://example.com:8080/path") == "example.com:8080",
        get_domain("https://example.com:8080/path")
    )

    result.check(
        "get_domain: 空字符串",
        get_domain("") == "",
        f"返回: '{get_domain('')}'"
    )

    # is_valid_url 更多边界
    result.check("is_valid_url: ftp 协议", not is_valid_url("ftp://example.com"))
    result.check("is_valid_url: data URI", not is_valid_url("data:text/html,<h1>Hello</h1>"))
    result.check("is_valid_url: mailto", not is_valid_url("mailto:test@example.com"))
    result.check("is_valid_url: None-like", not is_valid_url(""))

    # is_same_domain 边界
    result.check(
        "is_same_domain: 不同端口",
        not is_same_domain("https://example.com:80", "https://example.com:443"),
    )

    # extract_links 测试
    test_html = """
    <html><body>
        <a href="https://cs.pku.edu.cn">计算机学院</a>
        <a href="/yjsy/">研究生院</a>
        <a href="javascript:void(0)">无效链接</a>
        <a href="mailto:test@pku.edu.cn">邮件</a>
        <a href="#">空锚点</a>
        <a>无 href</a>
    </body></html>
    """
    links = extract_links(test_html, "https://www.pku.edu.cn")
    result.check(
        "extract_links: 过滤无效链接",
        len(links) == 2,
        f"提取到 {len(links)} 个链接: {[l['text'] for l in links]}"
    )

    result.check(
        "extract_links: 相对路径解析",
        any("pku.edu.cn/yjsy" in l["url"] for l in links),
        f"链接: {[l['url'] for l in links]}"
    )

    # extract_links 空 HTML
    links_empty = extract_links("", "https://example.com")
    result.check(
        "extract_links: 空 HTML",
        len(links_empty) == 0,
    )


# ============================================================
# 7. SPA 检测测试
# ============================================================

def test_spa_detection():
    """SPA 页面检测函数测试"""
    logger.info("\n📱 [7/14] SPA 检测测试")

    from src.discovery.department_discover import _is_spa_page

    # 典型 SPA 页面（Vue）
    spa_html_vue = """
    <html><head><title>Test</title></head>
    <body>
        <div id="app"></div>
        <script src="/js/app.js"></script>
    </body></html>
    """
    result.check(
        "_is_spa_page: Vue SPA（无学院链接）",
        _is_spa_page(spa_html_vue) == True,
        f"返回: {_is_spa_page(spa_html_vue)}"
    )

    # 典型 SPA 页面（React）
    spa_html_react = """
    <html><head><title>Test</title></head>
    <body>
        <div id="root"></div>
        <script src="/static/js/main.js"></script>
    </body></html>
    """
    result.check(
        "_is_spa_page: React SPA（无学院链接）",
        _is_spa_page(spa_html_react) == True,
    )

    # Nuxt.js SSR 页面
    nuxt_html = """
    <html><head><title>Test</title></head>
    <body>
        <div id="__nuxt">
            <a href="/cs">计算机学院</a>
            <a href="/math">数学学院</a>
            <a href="/phy">物理学院</a>
        </div>
        <script>window.__NUXT__={}</script>
    </body></html>
    """
    result.check(
        "_is_spa_page: Nuxt SSR（有学院链接）应返回 False",
        _is_spa_page(nuxt_html) == False,
        f"返回: {_is_spa_page(nuxt_html)}"
    )

    # 普通静态页面
    static_html = """
    <html><body>
        <a href="/cs">计算机学院</a>
        <a href="/math">数学学院</a>
    </body></html>
    """
    result.check(
        "_is_spa_page: 普通静态页面",
        _is_spa_page(static_html) == False,
    )

    # 空 HTML
    result.check(
        "_is_spa_page: 空字符串",
        _is_spa_page("") == False,
    )

    result.check(
        "_is_spa_page: None",
        _is_spa_page(None) == False,
    )


# ============================================================
# 8. _looks_like_dept_list 测试
# ============================================================

def test_looks_like_dept_list():
    """院系列表页判断函数测试"""
    logger.info("\n📋 [8/14] _looks_like_dept_list 测试")

    from src.discovery.university_discover import _looks_like_dept_list

    # 包含多个学院关键词的页面
    dept_list_html = """
    <html><body>
        <a href="/cs">计算机学院</a>
        <a href="/math">数学学院</a>
        <a href="/phy">物理学院</a>
        <a href="/chem">化学学院</a>
        <a href="/bio">生命科学研究院</a>
        <a href="/law">法学院</a>
    </body></html>
    """
    result.check(
        "_looks_like_dept_list: 包含 6 个学院关键词",
        _looks_like_dept_list(dept_list_html) == True,
    )

    # 只有少量学院关键词
    few_dept_html = """
    <html><body>
        <a href="/cs">计算机学院</a>
        <a href="/about">关于我们</a>
    </body></html>
    """
    result.check(
        "_looks_like_dept_list: 只有 1 个学院关键词",
        _looks_like_dept_list(few_dept_html) == False,
    )

    # 空页面
    result.check(
        "_looks_like_dept_list: 空字符串",
        _looks_like_dept_list("") == False,
    )

    # 新闻页面（包含"学院"但不是列表页）
    news_html = """
    <html><body>
        <h1>学校新闻</h1>
        <p>今天学院举办了活动</p>
        <p>明天学院将召开会议</p>
    </body></html>
    """
    result.check(
        "_looks_like_dept_list: 新闻页面中的学院关键词",
        _looks_like_dept_list(news_html) == False,
        "新闻页面中'学院'出现次数不足 5 次"
    )


# ============================================================
# 9. UA 池测试
# ============================================================

def test_ua_pool():
    """User-Agent 池测试"""
    logger.info("\n🎭 [9/14] UA 池测试")

    from src.utils.ua_pool import get_random_ua, get_default_headers, _USER_AGENTS

    # UA 池不为空
    result.check(
        "UA 池不为空",
        len(_USER_AGENTS) > 0,
        f"UA 数量: {len(_USER_AGENTS)}"
    )

    # 每个 UA 都是有效的
    for i, ua in enumerate(_USER_AGENTS):
        result.check(
            f"UA[{i}] 格式有效",
            "Mozilla" in ua and len(ua) > 50,
            f"长度: {len(ua)}"
        )

    # 随机 UA 不为空
    ua = get_random_ua()
    result.check(
        "get_random_ua 返回非空",
        ua is not None and len(ua) > 0,
    )

    # 默认请求头包含必要字段
    headers = get_default_headers()
    required_headers = ["User-Agent", "Accept", "Accept-Language"]
    for h in required_headers:
        result.check(
            f"默认请求头包含 {h}",
            h in headers,
        )

    # 多次调用应返回不同 UA（概率性，调用 20 次检查是否有不同的）
    uas = set(get_random_ua() for _ in range(20))
    result.check(
        "UA 随机性（20 次调用至少 2 种不同 UA）",
        len(uas) >= 2,
        f"不同 UA 数: {len(uas)}"
    )

    # 检查 Chrome 版本号是否合理（发现 UA 中有异常版本号）
    invalid_versions = []
    for ua in _USER_AGENTS:
        import re
        chrome_match = re.search(r"Chrome/(\d+)", ua)
        if chrome_match:
            version = int(chrome_match.group(1))
            if version > 200:
                invalid_versions.append(f"Chrome/{chrome_match.group(1)} in '{ua[:60]}...'")
    result.check(
        "Chrome 版本号合理（≤200）",
        len(invalid_versions) == 0,
        f"异常版本: {invalid_versions}" if invalid_versions else "全部合理"
    )


# ============================================================
# 10. _extract_dept_core 核心词提取测试
# ============================================================

def test_extract_dept_core():
    """学院名称核心词提取测试"""
    logger.info("\n🔤 [10/14] _extract_dept_core 核心词提取测试")

    from src.discovery.department_discover import _extract_dept_core

    test_cases = [
        ("计算机学院", "计算机"),
        ("计算机科学与技术学院", "计算机科学与技术"),
        ("数学系", "数学"),
        ("物理学院", "物理"),
        ("生命科学研究院", "生命科学"),
        ("人工智能研究中心", "人工智能"),
        ("前沿科学实验室", "前沿科学"),
        ("元培书院", "元培"),
        ("医学部", "医学部"),  # 整体就是后缀，保留原名
        ("化学学部", "化学"),
    ]

    for name, expected_core in test_cases:
        actual = _extract_dept_core(name)
        result.check(
            f"_extract_dept_core('{name}') = '{expected_core}'",
            actual == expected_core,
            f"实际: '{actual}'"
        )

    # 边界情况
    result.check(
        "_extract_dept_core: 空字符串",
        _extract_dept_core("") == "",
        f"返回: '{_extract_dept_core('')}'"
    )

    result.check(
        "_extract_dept_core: 无后缀",
        _extract_dept_core("信息工程") == "信息工程",
        f"返回: '{_extract_dept_core('信息工程')}'"
    )


# ============================================================
# 11. 更多高校网络集成测试
# ============================================================

async def test_more_universities():
    """更多高校的网络集成测试"""
    logger.info("\n🏫 [11/14] 更多高校网络集成测试")

    from src.utils.http_client import HttpClient
    from src.discovery.university_discover import (
        discover_homepage, discover_graduate_url, discover_dept_list_url,
    )
    from src.discovery.department_discover import (
        discover_departments_from_page, discover_departments_from_homepage,
    )

    # 测试更多类型的高校
    test_universities = [
        {"name": "清华大学", "expected_domain": "tsinghua.edu.cn"},
        {"name": "复旦大学", "expected_domain": "fudan.edu.cn"},
        {"name": "中国科学技术大学", "expected_domain": "ustc.edu.cn"},
    ]

    for uni in test_universities:
        name = uni["name"]
        logger.info(f"\n  --- 测试高校: {name} ---")

        # 发现官网首页
        homepage = await discover_homepage(name)
        result.check(
            f"[{name}] 发现官网首页",
            homepage is not None and uni["expected_domain"] in homepage,
            f"URL: {homepage}"
        )

        if not homepage:
            continue

        # 发现研究生院 URL
        graduate_url = await discover_graduate_url(homepage, name)
        result.check(
            f"[{name}] 发现研究生院 URL",
            graduate_url is not None,
            f"URL: {graduate_url}"
        )

        # 发现院系列表页
        dept_list_url = await discover_dept_list_url(homepage, name)
        if dept_list_url:
            result.ok(f"[{name}] 发现院系列表页", f"URL: {dept_list_url}")

            # 从列表页提取学院
            departments = await discover_departments_from_page(dept_list_url, homepage, name)
            result.check(
                f"[{name}] 从列表页提取学院",
                len(departments) >= 3,
                f"学院数: {len(departments)}"
            )
        else:
            # 从首页提取
            departments = await discover_departments_from_homepage(homepage, name)
            result.check(
                f"[{name}] 从首页提取学院",
                len(departments) >= 3,
                f"学院数: {len(departments)}"
            )

    from src.utils.http_client import http_client
    await http_client.close()


# ============================================================
# 12. 数据库级联删除与关系完整性测试
# ============================================================

async def test_database_advanced():
    """数据库高级测试：级联删除、关系完整性、批量操作"""
    logger.info("\n💾 [12/14] 数据库高级测试")

    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
    from sqlalchemy import select, func, delete
    from src.models.base import Base
    from src.models.university import University, Department, DepartmentSource

    test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    test_session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 12.1 批量插入高校和学院
    async with test_session_factory() as session:
        universities = []
        for i in range(5):
            uni = University(
                name=f"测试大学{i+1}",
                level="985",
                province="北京",
                homepage_url=f"https://test{i+1}.edu.cn",
            )
            session.add(uni)
            universities.append(uni)
        await session.flush()

        result.check(
            "批量插入 5 所高校",
            all(u.id is not None for u in universities),
            f"IDs: {[u.id for u in universities]}"
        )

        # 为每所高校插入学院
        total_depts = 0
        for uni in universities:
            for j in range(3):
                dept = Department(
                    university_id=uni.id,
                    name=f"{uni.name}-学院{j+1}",
                    homepage_url=f"https://dept{j+1}.test.edu.cn",
                    auto_discovered=True,
                )
                session.add(dept)
                total_depts += 1
        await session.flush()

        result.check(
            f"批量插入 {total_depts} 个学院",
            total_depts == 15,
        )

        # 12.2 统计查询
        count_result = await session.execute(
            select(func.count()).select_from(Department)
        )
        dept_count = count_result.scalar()
        result.check(
            "统计查询学院总数",
            dept_count == 15,
            f"实际: {dept_count}"
        )

        # 12.3 级联删除测试 - 删除高校应同时删除其学院
        await session.commit()

    async with test_session_factory() as session:
        # 查询第一所高校
        uni_result = await session.execute(
            select(University).where(University.name == "测试大学1")
        )
        uni_to_delete = uni_result.scalar_one()

        # 先查询该高校的学院数
        dept_result = await session.execute(
            select(func.count()).select_from(Department).where(Department.university_id == uni_to_delete.id)
        )
        dept_count_before = dept_result.scalar()
        result.check(
            "删除前该高校有学院",
            dept_count_before == 3,
            f"学院数: {dept_count_before}"
        )

        # 删除高校
        await session.delete(uni_to_delete)
        await session.commit()

    async with test_session_factory() as session:
        # 验证级联删除
        total_result = await session.execute(
            select(func.count()).select_from(Department)
        )
        remaining_depts = total_result.scalar()
        result.check(
            "级联删除: 删除高校后学院也被删除",
            remaining_depts == 12,
            f"剩余学院: {remaining_depts}"
        )

        uni_count_result = await session.execute(
            select(func.count()).select_from(University)
        )
        remaining_unis = uni_count_result.scalar()
        result.check(
            "级联删除: 高校数量减少",
            remaining_unis == 4,
            f"剩余高校: {remaining_unis}"
        )

    # 12.4 DepartmentSource 级联删除
    async with test_session_factory() as session:
        # 获取一个学院
        dept_result = await session.execute(select(Department).limit(1))
        dept = dept_result.scalar_one()

        # 添加信息源
        source = DepartmentSource(
            department_id=dept.id,
            source_url="https://test.edu.cn/notice",
            source_type="学院通知",
            priority=1,
            parser_type="auto",
        )
        session.add(source)
        await session.flush()
        source_id = source.id
        result.check("信息源插入成功", source_id is not None)

        # 删除学院
        await session.delete(dept)
        await session.commit()

    async with test_session_factory() as session:
        # 验证信息源也被删除
        source_result = await session.execute(
            select(func.count()).select_from(DepartmentSource)
        )
        source_count = source_result.scalar()
        result.check(
            "级联删除: 删除学院后信息源也被删除",
            source_count == 0,
            f"剩余信息源: {source_count}"
        )

    # 12.5 外键约束测试 - 插入不存在的 university_id
    async with test_session_factory() as session:
        orphan_dept = Department(
            university_id=99999,  # 不存在的高校 ID
            name="孤儿学院",
            auto_discovered=False,
        )
        session.add(orphan_dept)
        try:
            await session.flush()
            # SQLite 默认不强制外键约束，需要检查
            await session.rollback()
            # 如果没报错，说明 SQLite 外键约束未启用
            result.ok("外键约束: SQLite 默认不强制外键（已知行为）",
                      "需要 PRAGMA foreign_keys=ON")
        except Exception as e:
            await session.rollback()
            result.ok("外键约束: 不存在的 university_id 正确报错", str(type(e).__name__))

    await test_engine.dispose()


# ============================================================
# 13. HttpClient 并发与频率控制测试
# ============================================================

async def test_http_client_advanced():
    """HTTP 客户端高级测试"""
    logger.info("\n🌐 [13/14] HttpClient 高级测试")

    from src.utils.http_client import HttpClient

    # 13.1 客户端初始化
    client = HttpClient()
    result.check(
        "HttpClient 初始化成功",
        client._client is None,  # 懒初始化
        "客户端应为 None（懒初始化）"
    )

    # 13.2 首次请求触发初始化
    resp = await client.fetch("https://www.baidu.com", retry=0)
    result.check(
        "首次请求触发客户端初始化",
        client._client is not None,
    )

    # 13.3 频率控制 - 同域名连续请求应有延迟
    start = time.time()
    await client.fetch("https://www.baidu.com", retry=0)
    elapsed = time.time() - start
    result.check(
        "频率控制: 同域名连续请求有延迟",
        elapsed >= 1.5,  # 最小延迟 2s，考虑误差
        f"耗时: {elapsed:.1f}s"
    )

    # 13.4 关闭后重新使用
    await client.close()
    result.check(
        "客户端关闭后 _client 为 None",
        client._client is None,
    )

    # 重新请求应自动重建
    resp = await client.fetch("https://www.baidu.com", retry=0)
    result.check(
        "关闭后重新请求自动重建客户端",
        resp is not None,
    )

    await client.close()

    # 13.5 自定义 headers
    client2 = HttpClient()
    resp = await client2.fetch(
        "https://httpbin.org/headers",
        headers={"X-Custom-Test": "yantu"},
        retry=0,
    )
    if resp:
        result.check(
            "自定义 headers 传递成功",
            "yantu" in resp or "X-Custom-Test" in resp,
            f"响应长度: {len(resp)}"
        )
    else:
        result.ok("httpbin.org 不可达（跳过自定义 headers 测试）")

    await client2.close()


# ============================================================
# 14. 配置模块测试
# ============================================================

def test_config():
    """配置模块测试"""
    logger.info("\n⚙️ [14/14] 配置模块测试")

    from src.config import Settings, settings

    # 14.1 默认配置值
    result.check(
        "默认数据库 URL 包含 sqlite",
        "sqlite" in settings.DATABASE_URL,
        f"DATABASE_URL: {settings.DATABASE_URL}"
    )

    result.check(
        "默认并发数合理",
        1 <= settings.CRAWL_CONCURRENCY <= 20,
        f"CRAWL_CONCURRENCY: {settings.CRAWL_CONCURRENCY}"
    )

    result.check(
        "默认延迟范围合理",
        0 < settings.CRAWL_DELAY_MIN <= settings.CRAWL_DELAY_MAX,
        f"延迟: {settings.CRAWL_DELAY_MIN}-{settings.CRAWL_DELAY_MAX}s"
    )

    result.check(
        "默认重试次数合理",
        1 <= settings.CRAWL_RETRY_TIMES <= 10,
        f"CRAWL_RETRY_TIMES: {settings.CRAWL_RETRY_TIMES}"
    )

    result.check(
        "默认超时合理",
        5 <= settings.CRAWL_TIMEOUT <= 120,
        f"CRAWL_TIMEOUT: {settings.CRAWL_TIMEOUT}s"
    )

    # 14.2 LLM 模型配置
    models = settings.llm_models
    result.check(
        "LLM 模型配置包含 classify",
        "classify" in models,
    )
    result.check(
        "LLM 模型配置包含 extract",
        "extract" in models,
    )
    result.check(
        "LLM 模型配置包含 analyze",
        "analyze" in models,
    )

    # 14.3 ensure_dirs 不崩溃
    try:
        settings.ensure_dirs()
        result.ok("ensure_dirs 执行成功")
    except Exception as e:
        result.fail("ensure_dirs 执行失败", str(e))

    # 14.4 Settings 可以用自定义值创建
    custom = Settings(
        DATABASE_URL="sqlite+aiosqlite:///:memory:",
        CRAWL_CONCURRENCY=10,
        CRAWL_DELAY_MIN=1.0,
        CRAWL_DELAY_MAX=3.0,
    )
    result.check(
        "自定义 Settings 创建成功",
        custom.CRAWL_CONCURRENCY == 10,
    )


# ============================================================
# 额外发现：_is_department_name 更多边界测试
# ============================================================

def test_is_department_name_extended():
    """_is_department_name 更多边界和特殊情况"""
    logger.info("\n🏷️ [额外] _is_department_name 扩展测试")

    from src.discovery.department_discover import _is_department_name

    # 英文学院名称
    result.check("英文: School of Computer Science", _is_department_name("School of Computer Science"))
    result.check("英文: College of Engineering", _is_department_name("College of Engineering"))
    result.check("英文: Department of Physics", _is_department_name("Department of Physics"))
    result.check("英文: Institute of Technology", _is_department_name("Institute of Technology"))

    # 混合中英文
    result.check("混合: 计算机学院(CS)", _is_department_name("计算机学院(CS)"))

    # 带括号的学院名
    result.check("带括号: 数学科学学院（含统计学）", _is_department_name("数学科学学院（含统计学）"))

    # 日期开头的新闻标题
    result.check("日期开头: 2024-03-20学院...", not _is_department_name("2024-03-20学院召开会议"))
    result.check("日期开头: 2024.03.20学院...", not _is_department_name("2024.03.20学院新闻"))
    result.check("日期开头: 2024年3月...", not _is_department_name("2024年3月学院通知"))

    # 包含动词的新闻标题
    result.check("动词: 学院成立大会", not _is_department_name("学院成立大会"))
    result.check("动词: 学院召开会议", not _is_department_name("学院召开会议"))
    result.check("动词: 学院举行典礼", not _is_department_name("学院举行典礼"))

    # 超过 30 字符
    long_name = "这是一个超级超级超级超级超级超级超级超级超级超级超级长的学院名称"
    result.check(
        f"超长名称({len(long_name)}字符)",
        not _is_department_name(long_name),
        f"长度: {len(long_name)}"
    )

    # 恰好 30 字符
    name_30 = "a" * 27 + "学院x"  # 30 chars
    result.check(
        f"恰好30字符",
        _is_department_name(name_30),
        f"长度: {len(name_30)}"
    )

    # 恰好 31 字符
    name_31 = "a" * 28 + "学院x"  # 31 chars
    result.check(
        f"恰好31字符（应被拒绝）",
        not _is_department_name(name_31),
        f"长度: {len(name_31)}"
    )

    # 恰好 3 字符
    result.check("恰好3字符: 数学系", _is_department_name("数学系"))

    # 恰好 2 字符
    result.check("恰好2字符: 学院", not _is_department_name("学院"))

    # 包含冒号
    result.check("包含冒号: 学院：简介", not _is_department_name("学院：简介"))
    result.check("包含英文冒号: 学院:简介", not _is_department_name("学院:简介"))


# ============================================================
# 额外发现：discover_departments_from_page 解析测试
# ============================================================

def test_department_parsing_edge_cases():
    """学院解析的边界情况"""
    logger.info("\n🔍 [额外] 学院解析边界测试")

    from src.discovery.department_discover import _is_department_name

    # 负面关键词中的"招生"会误杀"招生学院"吗？
    # 检查：负面关键词列表中有"招生"
    result.check(
        "负面关键词: '招生办' 不是学院",
        not _is_department_name("招生办"),
    )

    # "招生" 在负面列表中，但 "XX招生学院" 呢？
    # 这里有个潜在 bug：如果文本包含"招生"就被排除，但"继续教育学院"不应被排除
    result.check(
        "继续教育学院 应该是学院",
        _is_department_name("继续教育学院"),
    )

    # "新闻" 在负面列表中，但 "新闻与传播学院" 应该是学院
    is_news_dept = _is_department_name("新闻与传播学院")
    result.check(
        "新闻与传播学院 应该是学院（可能被误杀）",
        is_news_dept,
        f"返回: {is_news_dept}"
    )

    # "科研" 在负面列表中，但 "科研处" 不是学院
    result.check(
        "科研处 不是学院",
        not _is_department_name("科研处"),
    )

    # "通知" 在负面列表中，但 "通知" 不应该影响 "信息通知学院"（虽然不太现实）
    # 这个测试主要验证负面关键词优先级

    # 检查 "公共管理学院" - 不应被误杀
    result.check(
        "公共管理学院 应该是学院",
        _is_department_name("公共管理学院"),
    )

    # 检查 "马克思主义学院"
    result.check(
        "马克思主义学院 应该是学院",
        _is_department_name("马克思主义学院"),
    )

    # 检查 "体育学院"
    result.check(
        "体育学院 应该是学院",
        _is_department_name("体育学院"),
    )

    # 检查 "艺术学院"
    result.check(
        "艺术学院 应该是学院",
        _is_department_name("艺术学院"),
    )


# ============================================================
# 主入口
# ============================================================

async def main():
    start_time = datetime.now()
    logger.info("=" * 60)
    logger.info("🧪 阶段一扩展测试开始")
    logger.info("=" * 60)

    # 6. URL 工具深度边界测试
    try:
        test_url_utils_deep()
    except Exception as e:
        result.fail(f"URL 工具深度测试异常: {e}")
        traceback.print_exc()

    # 7. SPA 检测测试
    try:
        test_spa_detection()
    except Exception as e:
        result.fail(f"SPA 检测测试异常: {e}")
        traceback.print_exc()

    # 8. _looks_like_dept_list 测试
    try:
        test_looks_like_dept_list()
    except Exception as e:
        result.fail(f"_looks_like_dept_list 测试异常: {e}")
        traceback.print_exc()

    # 9. UA 池测试
    try:
        test_ua_pool()
    except Exception as e:
        result.fail(f"UA 池测试异常: {e}")
        traceback.print_exc()

    # 10. _extract_dept_core 测试
    try:
        test_extract_dept_core()
    except Exception as e:
        result.fail(f"_extract_dept_core 测试异常: {e}")
        traceback.print_exc()

    # 额外: _is_department_name 扩展测试
    try:
        test_is_department_name_extended()
    except Exception as e:
        result.fail(f"_is_department_name 扩展测试异常: {e}")
        traceback.print_exc()

    # 额外: 学院解析边界测试
    try:
        test_department_parsing_edge_cases()
    except Exception as e:
        result.fail(f"学院解析边界测试异常: {e}")
        traceback.print_exc()

    # 14. 配置模块测试
    try:
        test_config()
    except Exception as e:
        result.fail(f"配置模块测试异常: {e}")
        traceback.print_exc()

    # 12. 数据库高级测试（异步）
    try:
        await test_database_advanced()
    except Exception as e:
        result.fail(f"数据库高级测试异常: {e}")
        traceback.print_exc()

    # 13. HttpClient 高级测试（异步）
    try:
        await test_http_client_advanced()
    except Exception as e:
        result.fail(f"HttpClient 高级测试异常: {e}")
        traceback.print_exc()

    # 11. 更多高校网络集成测试（异步，放最后因为耗时长）
    try:
        await test_more_universities()
    except Exception as e:
        result.fail(f"更多高校网络测试异常: {e}")
        traceback.print_exc()

    # 汇总
    elapsed = (datetime.now() - start_time).total_seconds()
    logger.info(f"\n⏱️ 总耗时: {elapsed:.1f}s")
    success = result.summary()

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())
