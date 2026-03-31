"""
阶段一完整测试 - 高校学院 URL 库构建

测试维度：
1. 数据完整性：985 列表、省份映射、已知域名
2. 纯函数单元测试：URL 工具、学院名称判断、覆盖率校验
3. 网络集成测试：真实请求 2-3 所高校
4. 鲁棒性测试：异常输入、空数据、边界情况
5. 数据库入库测试：完整流程验证
"""

import asyncio
import sys
import os
import traceback
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
        logger.info(f"测试结果: {self.passed}/{total} 通过, {self.failed} 失败")
        if self.errors:
            logger.error("失败项:")
            for e in self.errors:
                logger.error(f"  - {e}")
        logger.info(f"{'='*60}\n")
        return self.failed == 0


result = TestResult()


# ============================================================
# 1. 数据完整性测试
# ============================================================

def test_data_integrity():
    """测试静态数据的完整性和一致性"""
    logger.info("\n📋 [1/5] 数据完整性测试")

    from src.discovery.chsi_crawler import UNIVERSITIES_985, UNIVERSITY_PROVINCES
    from src.discovery.university_discover import KNOWN_DOMAINS

    # 1.1 985 高校数量
    result.check(
        "985 高校数量 = 39",
        len(UNIVERSITIES_985) == 39,
        f"实际: {len(UNIVERSITIES_985)}"
    )

    # 1.2 无重复高校
    unique_count = len(set(UNIVERSITIES_985))
    result.check(
        "985 列表无重复",
        unique_count == len(UNIVERSITIES_985),
        f"唯一: {unique_count}, 总计: {len(UNIVERSITIES_985)}"
    )

    # 1.3 省份映射完整性 - 每所 985 都有省份
    missing_provinces = [u for u in UNIVERSITIES_985 if u not in UNIVERSITY_PROVINCES]
    result.check(
        "所有 985 高校都有省份映射",
        len(missing_provinces) == 0,
        f"缺失: {missing_provinces}" if missing_provinces else f"全部 {len(UNIVERSITY_PROVINCES)} 所已映射"
    )

    # 1.4 已知域名完整性 - 每所 985 都有域名
    missing_domains = [u for u in UNIVERSITIES_985 if u not in KNOWN_DOMAINS]
    result.check(
        "所有 985 高校都有已知域名",
        len(missing_domains) == 0,
        f"缺失: {missing_domains}" if missing_domains else f"全部 {len(KNOWN_DOMAINS)} 所已映射"
    )

    # 1.5 域名格式校验
    from src.utils.url_utils import is_valid_url
    invalid_domains = []
    for name, url in KNOWN_DOMAINS.items():
        if not is_valid_url(url):
            invalid_domains.append(f"{name}: {url}")
        if not url.endswith(".edu.cn"):
            invalid_domains.append(f"{name}: {url} (非 .edu.cn)")
    result.check(
        "所有已知域名格式合法",
        len(invalid_domains) == 0,
        f"异常: {invalid_domains}" if invalid_domains else "全部合法"
    )

    # 1.6 省份映射没有多余项
    extra_provinces = [u for u in UNIVERSITY_PROVINCES if u not in UNIVERSITIES_985]
    result.check(
        "省份映射无多余项",
        len(extra_provinces) == 0,
        f"多余: {extra_provinces}" if extra_provinces else "无多余"
    )

    # 1.7 已知域名没有多余项
    extra_domains = [u for u in KNOWN_DOMAINS if u not in UNIVERSITIES_985]
    result.check(
        "已知域名无多余项",
        len(extra_domains) == 0,
        f"多余: {extra_domains}" if extra_domains else "无多余"
    )


# ============================================================
# 2. 纯函数单元测试
# ============================================================

def test_pure_functions():
    """测试不依赖网络的纯函数"""
    logger.info("\n🔧 [2/5] 纯函数单元测试")

    # --- 2.1 URL 工具 ---
    from src.utils.url_utils import normalize_url, get_domain, get_base_url, is_valid_url, is_same_domain

    # normalize_url 基本功能
    result.check(
        "normalize_url: 相对路径解析",
        normalize_url("/yjsy/", "https://www.pku.edu.cn") == "https://www.pku.edu.cn/yjsy",
        normalize_url("/yjsy/", "https://www.pku.edu.cn")
    )

    result.check(
        "normalize_url: 移除 fragment",
        "#" not in normalize_url("https://example.com/page#section"),
        normalize_url("https://example.com/page#section")
    )

    result.check(
        "normalize_url: 移除尾部斜杠",
        normalize_url("https://example.com/path/") == "https://example.com/path",
        normalize_url("https://example.com/path/")
    )

    result.check(
        "normalize_url: 保留根路径",
        normalize_url("https://example.com/") == "https://example.com/",
        normalize_url("https://example.com/")
    )

    # get_domain
    result.check(
        "get_domain: 提取域名",
        get_domain("https://www.pku.edu.cn/path") == "www.pku.edu.cn",
        get_domain("https://www.pku.edu.cn/path")
    )

    # get_base_url
    result.check(
        "get_base_url: 提取基础 URL",
        get_base_url("https://www.pku.edu.cn/path/page") == "https://www.pku.edu.cn",
        get_base_url("https://www.pku.edu.cn/path/page")
    )

    # is_valid_url
    result.check("is_valid_url: 有效 HTTPS", is_valid_url("https://www.pku.edu.cn"))
    result.check("is_valid_url: 有效 HTTP", is_valid_url("http://example.com"))
    result.check("is_valid_url: 无效 javascript:", not is_valid_url("javascript:void(0)"))
    result.check("is_valid_url: 无效空字符串", not is_valid_url(""))
    result.check("is_valid_url: 无效相对路径", not is_valid_url("/path/to/page"))

    # is_same_domain
    result.check(
        "is_same_domain: 同域名",
        is_same_domain("https://www.pku.edu.cn/a", "https://www.pku.edu.cn/b")
    )
    result.check(
        "is_same_domain: 不同域名",
        not is_same_domain("https://www.pku.edu.cn", "https://www.tsinghua.edu.cn")
    )

    # --- 2.2 _extract_chsi_id ---
    from src.discovery.chsi_crawler import _extract_chsi_id

    result.check(
        "_extract_chsi_id: schId 参数",
        _extract_chsi_id("https://yz.chsi.com.cn/sch/view.do?schId=abc123") == "abc123",
        _extract_chsi_id("https://yz.chsi.com.cn/sch/view.do?schId=abc123")
    )
    result.check(
        "_extract_chsi_id: .dhtml 路径",
        _extract_chsi_id("https://yz.chsi.com.cn/sch/12345.dhtml") == "12345",
        _extract_chsi_id("https://yz.chsi.com.cn/sch/12345.dhtml")
    )
    result.check(
        "_extract_chsi_id: 无法提取返回空",
        _extract_chsi_id("https://example.com/unknown") == "",
    )

    # --- 2.3 _is_department_name ---
    from src.discovery.department_discover import _is_department_name

    # 正面用例
    positive_cases = [
        "计算机科学与技术学院", "数学系", "物理学院", "化学研究所",
        "生命科学研究院", "人工智能研究中心", "前沿科学实验室",
        "元培学院", "致远书院", "医学部",
        "School of Computer Science", "College of Engineering",
    ]
    for case in positive_cases:
        result.check(f"_is_department_name 正面: '{case}'", _is_department_name(case))

    # 负面用例
    negative_cases = [
        "首页", "登录", "搜索", "更多", "关于我们",
        "图书馆", "校医院", "后勤集团", "党委办公室",
        "新闻中心", "通知公告", "招生办", "就业指导",
        "校友会", "工会", "团委",
    ]
    for case in negative_cases:
        result.check(f"_is_department_name 负面: '{case}'", not _is_department_name(case))

    # --- 2.4 verify_coverage ---
    from src.discovery.department_discover import verify_coverage

    # 完全匹配
    cov = verify_coverage(
        ["计算机学院", "数学学院", "物理学院"],
        [{"name": "计算机学院"}, {"name": "数学学院"}, {"name": "物理学院"}]
    )
    result.check(
        "verify_coverage: 完全匹配",
        cov["coverage_rate"] == 1.0,
        f"覆盖率: {cov['coverage_rate']}"
    )

    # 模糊匹配：核心词提取后包含关系
    cov = verify_coverage(
        ["计算机学院"],
        [{"name": "计算机科学与技术学院"}]
    )
    result.check(
        "verify_coverage: 模糊匹配（核心词提取）",
        cov["coverage_rate"] == 1.0,
        f"覆盖率: {cov['coverage_rate']}, 未匹配: {cov.get('unmatched_chsi', [])}"
    )

    # 部分匹配
    cov = verify_coverage(
        ["计算机学院", "数学学院", "物理学院"],
        [{"name": "计算机学院"}]
    )
    result.check(
        "verify_coverage: 部分匹配",
        0 < cov["coverage_rate"] < 1.0,
        f"覆盖率: {cov['coverage_rate']}, 未匹配: {cov['unmatched_chsi']}"
    )

    # 空列表
    cov = verify_coverage([], [{"name": "计算机学院"}])
    result.check(
        "verify_coverage: 空研招网列表",
        cov["coverage_rate"] == 0,
        f"覆盖率: {cov['coverage_rate']}"
    )

    # 多发现
    cov = verify_coverage(
        ["计算机学院"],
        [{"name": "计算机学院"}, {"name": "人工智能学院"}]
    )
    result.check(
        "verify_coverage: 多发现的学院",
        len(cov["extra_discovered"]) == 1,
        f"多发现: {cov['extra_discovered']}"
    )


# ============================================================
# 3. 网络集成测试（选取 2-3 所高校）
# ============================================================

async def test_network_integration():
    """真实网络请求测试"""
    logger.info("\n🌐 [3/5] 网络集成测试（真实请求）")

    from src.utils.http_client import http_client
    from src.discovery.university_discover import (
        discover_homepage, discover_graduate_url, discover_dept_list_url,
    )
    from src.discovery.department_discover import (
        discover_departments_from_page, discover_departments_from_homepage,
    )

    # 选取 3 所代表性高校测试
    test_universities = [
        {"name": "北京大学", "expected_domain": "pku.edu.cn"},
        {"name": "浙江大学", "expected_domain": "zju.edu.cn"},
        {"name": "武汉大学", "expected_domain": "whu.edu.cn"},
    ]

    for uni in test_universities:
        name = uni["name"]
        logger.info(f"\n  --- 测试高校: {name} ---")

        # 3.1 发现官网首页
        homepage = await discover_homepage(name)
        result.check(
            f"[{name}] 发现官网首页",
            homepage is not None and uni["expected_domain"] in homepage,
            f"URL: {homepage}"
        )

        if not homepage:
            logger.warning(f"  跳过后续测试: {name}")
            continue

        # 3.2 官网首页可访问
        html = await http_client.fetch(homepage, retry=2)
        result.check(
            f"[{name}] 官网首页可访问",
            html is not None and len(html) > 1000,
            f"HTML 长度: {len(html) if html else 0}"
        )

        # 3.3 发现研究生院 URL
        graduate_url = await discover_graduate_url(homepage, name)
        result.check(
            f"[{name}] 发现研究生院 URL",
            graduate_url is not None,
            f"URL: {graduate_url}"
        )

        # 3.4 发现院系列表页
        dept_list_url = await discover_dept_list_url(homepage, name)
        # 院系列表页不一定能找到，记录但不强制要求
        if dept_list_url:
            result.ok(f"[{name}] 发现院系列表页", f"URL: {dept_list_url}")
        else:
            logger.warning(f"  ⚠️ [{name}] 未找到院系列表页（非致命）")

        # 3.5 提取学院列表
        departments = []
        if dept_list_url:
            departments = await discover_departments_from_page(dept_list_url, homepage, name)

        if not departments:
            departments = await discover_departments_from_homepage(homepage, name)

        result.check(
            f"[{name}] 提取到学院列表",
            len(departments) >= 5,
            f"学院数: {len(departments)}" + (f", 前5: {[d['name'] for d in departments[:5]]}" if departments else "")
        )

        # 3.6 学院 URL 格式校验（允许少量学院 URL 为空，某些学院没有独立网站）
        if departments:
            from src.utils.url_utils import is_valid_url
            valid_urls = sum(1 for d in departments if is_valid_url(d.get("url", "")))
            empty_urls = sum(1 for d in departments if not d.get("url"))
            # 至少 90% 的学院有有效 URL
            result.check(
                f"[{name}] 学院 URL 格式合法",
                valid_urls >= len(departments) * 0.9,
                f"合法: {valid_urls}/{len(departments)}" + (f", 空URL: {empty_urls}" if empty_urls else "")
            )

    # 清理
    await http_client.close()


# ============================================================
# 4. 鲁棒性测试
# ============================================================

async def test_robustness():
    """异常输入和边界情况测试"""
    logger.info("\n🛡️ [4/5] 鲁棒性测试")

    from src.utils.http_client import HttpClient
    from src.discovery.university_discover import discover_homepage
    from src.discovery.department_discover import (
        _is_department_name, discover_departments_from_page, verify_coverage,
    )
    from src.discovery.chsi_crawler import _extract_chsi_id, crawl_chsi_departments

    # 4.1 未知高校名称
    homepage = await discover_homepage("不存在的大学")
    result.check(
        "未知高校返回 None",
        homepage is None,
        f"返回: {homepage}"
    )

    # 4.2 空 URL 的研招网学院获取
    depts = await crawl_chsi_departments("测试大学", "")
    result.check(
        "空 URL 获取学院返回空列表",
        depts == [],
        f"返回: {depts}"
    )

    # 4.3 无效 URL 的学院获取
    depts = await crawl_chsi_departments("测试大学", "https://invalid.nonexistent.url.xyz/")
    result.check(
        "无效 URL 获取学院返回空列表（不崩溃）",
        isinstance(depts, list),
        f"返回类型: {type(depts).__name__}, 长度: {len(depts)}"
    )

    # 4.4 _is_department_name 边界情况
    result.check("_is_department_name 边界: 空字符串", not _is_department_name(""))
    result.check("单字符不是学院", not _is_department_name("系"))  # 太短，但包含关键词
    result.check("双字符不是学院", not _is_department_name("数学"))  # 不含学院后缀且太短
    result.check("超长文本", not _is_department_name("这是一个非常非常长的文本" * 10))

    # 4.5 _extract_chsi_id 边界情况
    result.check("空 URL 提取 ID", _extract_chsi_id("") == "")
    result.check("None-like URL 提取 ID", _extract_chsi_id("not-a-url") == "")

    # 4.6 verify_coverage 边界情况
    cov = verify_coverage([], [])
    result.check(
        "verify_coverage: 双空列表",
        cov["coverage_rate"] == 0 and cov["total_chsi"] == 0,
        f"结果: {cov}"
    )

    # 4.7 normalize_url 边界情况
    from src.utils.url_utils import normalize_url
    result.check(
        "normalize_url: 空字符串",
        normalize_url("") is not None,  # 不崩溃即可
        f"返回: '{normalize_url('')}'"
    )

    # 4.8 HTTP 客户端 - 请求不存在的域名
    client = HttpClient()
    resp = await client.fetch("https://this-domain-does-not-exist-12345.com/", retry=0)
    result.check(
        "HTTP 请求不存在域名返回 None（不崩溃）",
        resp is None,
    )
    await client.close()

    # 4.9 HTTP 客户端 - 请求返回 404
    client = HttpClient()
    resp = await client.fetch("https://www.pku.edu.cn/this-page-does-not-exist-12345", retry=0)
    result.check(
        "HTTP 请求 404 返回 None",
        resp is None,
    )
    await client.close()

    # 4.10 discover_departments_from_page 无效 URL
    depts = await discover_departments_from_page(
        "https://invalid.nonexistent.url.xyz/",
        "https://www.pku.edu.cn",
        "测试大学"
    )
    result.check(
        "无效 URL 提取学院返回空列表（不崩溃）",
        isinstance(depts, list) and len(depts) == 0,
    )


# ============================================================
# 5. 数据库入库测试
# ============================================================

async def test_database():
    """数据库入库和查询测试"""
    logger.info("\n💾 [5/5] 数据库入库测试")

    from src.config import settings
    from src.storage.database import init_db, async_session, engine, close_db
    from src.models.base import Base
    from src.models.university import University, Department, DepartmentSource
    from sqlalchemy import select, text

    settings.ensure_dirs()

    # 5.1 使用内存数据库进行测试，避免污染正式数据
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

    test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    test_session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    result.ok("内存测试数据库初始化成功")

    # 5.2 插入高校记录
    async with test_session_factory() as session:
        university = University(
            name="测试大学",
            level="985",
            province="北京",
            homepage_url="https://www.test.edu.cn",
            graduate_url="https://www.test.edu.cn/yjsy",
            dept_list_url="https://www.test.edu.cn/yxsz",
            chsi_id="test123",
            auto_discovered=True,
        )
        session.add(university)
        await session.flush()

        result.check(
            "高校记录插入成功",
            university.id is not None and university.id > 0,
            f"ID: {university.id}"
        )

        # 5.3 插入学院记录
        departments = [
            Department(
                university_id=university.id,
                name="计算机科学与技术学院",
                homepage_url="https://cs.test.edu.cn",
                auto_discovered=True,
                discovery_method="dept_list_page",
            ),
            Department(
                university_id=university.id,
                name="数学科学学院",
                homepage_url="https://math.test.edu.cn",
                auto_discovered=True,
                discovery_method="nav_keyword",
            ),
            Department(
                university_id=university.id,
                name="物理学院",
                homepage_url="https://phy.test.edu.cn",
                auto_discovered=True,
                discovery_method="dept_list_page",
            ),
        ]
        for dept in departments:
            session.add(dept)
        await session.flush()

        result.check(
            "学院记录批量插入成功",
            all(d.id is not None for d in departments),
            f"IDs: {[d.id for d in departments]}"
        )

        # 5.4 查询验证
        query_result = await session.execute(
            select(Department).where(Department.university_id == university.id)
        )
        queried_depts = query_result.scalars().all()
        result.check(
            "查询学院记录数量正确",
            len(queried_depts) == 3,
            f"查询到: {len(queried_depts)} 条"
        )

        # 5.5 关系查询
        query_result = await session.execute(
            select(University).where(University.name == "测试大学")
        )
        queried_uni = query_result.scalar_one_or_none()
        result.check(
            "高校记录查询成功",
            queried_uni is not None and queried_uni.name == "测试大学",
        )

        # 5.6 唯一约束测试 - 先提交当前数据
        await session.commit()

    # 用新 session 测试唯一约束
    async with test_session_factory() as session3:
        duplicate_uni = University(
            name="测试大学",  # 重复名称
            level="985",
            province="北京",
        )
        session3.add(duplicate_uni)
        try:
            await session3.flush()
            result.fail("唯一约束: 重复高校名称应报错")
        except Exception as e:
            await session3.rollback()
            result.ok("唯一约束: 重复高校名称正确报错", str(type(e).__name__))

        # 5.7 插入信息源记录 - 用新 session 查询已提交的数据
    async with test_session_factory() as session4:
            # 重新查询 department
        dept_result = await session4.execute(select(Department).limit(1))
        dept = dept_result.scalar_one_or_none()

        if dept:
            source = DepartmentSource(
                department_id=dept.id,
                source_url="https://cs.test.edu.cn/tzgg",
                source_type="学院通知",
                priority=1,
                parser_type="auto",
            )
            session4.add(source)
            await session4.flush()
            result.check(
                "信息源记录插入成功",
                source.id is not None,
                f"ID: {source.id}"
            )
            await session4.commit()
        else:
            result.fail("信息源测试: 未找到学院记录")

    # 清理
    await test_engine.dispose()
    result.ok("测试数据库清理完成")


# ============================================================
# 主入口
# ============================================================

async def main():
    start_time = datetime.now()
    logger.info("=" * 60)
    logger.info("🧪 阶段一测试开始")
    logger.info("=" * 60)

    # 1. 数据完整性（纯同步）
    try:
        test_data_integrity()
    except Exception as e:
        result.fail(f"数据完整性测试异常: {e}")
        traceback.print_exc()

    # 2. 纯函数单元测试（纯同步）
    try:
        test_pure_functions()
    except Exception as e:
        result.fail(f"纯函数测试异常: {e}")
        traceback.print_exc()

    # 3. 网络集成测试（异步）
    try:
        await test_network_integration()
    except Exception as e:
        result.fail(f"网络集成测试异常: {e}")
        traceback.print_exc()

    # 4. 鲁棒性测试（异步）
    try:
        await test_robustness()
    except Exception as e:
        result.fail(f"鲁棒性测试异常: {e}")
        traceback.print_exc()

    # 5. 数据库入库测试（异步）
    try:
        await test_database()
    except Exception as e:
        result.fail(f"数据库测试异常: {e}")
        traceback.print_exc()

    # 汇总
    elapsed = (datetime.now() - start_time).total_seconds()
    logger.info(f"\n⏱️ 总耗时: {elapsed:.1f}s")
    success = result.summary()

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())
