"""
快速测试反爬降级策略

只测试四川大学和兰州大学，验证反爬检测和兜底数据是否正常工作。
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from loguru import logger

from src.discovery.university_discover import (
    discover_homepage,
    discover_graduate_url,
    discover_dept_list_url,
    clear_homepage_cache,
    is_anti_crawl_blocked,
    get_anti_crawl_type,
)
from src.discovery.department_discover import (
    discover_departments_from_page,
    discover_departments_from_homepage,
)
from src.utils.http_client import http_client


async def test_anti_crawl_fallback():
    """测试反爬降级策略"""

    # 清除缓存
    clear_homepage_cache()

    test_universities = ["四川大学", "兰州大学"]

    for name in test_universities:
        print(f"\n{'='*60}")
        print(f"🏫 {name}")
        print(f"{'='*60}")

        start = datetime.now()

        # Step 1: 发现官网
        homepage = await discover_homepage(name)
        print(f"  官网: {homepage}")

        if not homepage:
            print(f"  ❌ 未找到官网")
            continue

        # Step 2: 发现研究生院
        graduate_url = await discover_graduate_url(homepage, name)
        print(f"  研究生院: {graduate_url}")

        # 检查反爬状态
        blocked = is_anti_crawl_blocked(homepage)
        anti_type = get_anti_crawl_type(homepage)
        print(f"  反爬拦截: {blocked} (类型: {anti_type})")

        # Step 3: 发现院系列表页
        dept_list_url = await discover_dept_list_url(homepage, name)
        print(f"  院系列表页: {dept_list_url}")

        # Step 4: 提取学院
        departments = []
        method = "none"

        if dept_list_url:
            departments = await discover_departments_from_page(dept_list_url, homepage, name)
            method = "dept_list_page"

        if not departments:
            departments = await discover_departments_from_homepage(homepage, name)
            method = "homepage_nav"

        if not departments:
            method = "none"

        elapsed = (datetime.now() - start).total_seconds()

        print(f"\n  📊 结果:")
        print(f"    学院数: {len(departments)}")
        print(f"    策略: {method}")
        print(f"    耗时: {elapsed:.1f}s")

        if departments:
            print(f"    学院列表 (前10个):")
            for dept in departments[:10]:
                url_str = dept.get('url', '')[:50]
                print(f"      - {dept['name']}: {url_str}")
            if len(departments) > 10:
                print(f"      ... 还有 {len(departments) - 10} 个")

    await http_client.close()

    print(f"\n{'='*60}")
    print("✅ 反爬降级测试完成")
    print(f"{'='*60}")


if __name__ == "__main__":
    asyncio.run(test_anti_crawl_fallback())
