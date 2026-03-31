"""
快速测试之前失败的4个学院 - 验证修复效果
只测试2个已确认能修复的学院
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from loguru import logger
from src.discovery.notice_page_locator import locate_notice_pages
from src.utils.http_client import http_client

logger.remove()
logger.add(sys.stderr, level="INFO")

# 只测试已确认能修复的2个学院
FIXED_DEPTS = [
    ("清华大学", "创新创业与战略系", "https://www.sem.tsinghua.edu.cn/ies"),
    ("西安交通大学", "崇实书院", "https://www.xjtu.edu.cn/bksy/cssy.htm"),
]


async def main():
    success = 0
    for uni, dept, url in FIXED_DEPTS:
        print(f"\n--- {uni} - {dept} ---")
        try:
            results = await locate_notice_pages(
                dept_homepage=url,
                dept_name=dept,
                university_name=uni,
            )
            if results:
                success += 1
                for r in results:
                    print(f"  ✅ [{r['type']}] {r['url']} (方法={r['method']}, 分数={r.get('validation_score', '?')})")
            else:
                print(f"  ❌ 未找到通知页")
        except Exception as e:
            print(f"  ❌ 异常: {e}")

    await http_client.close()
    print(f"\n=== 结果: {success}/{len(FIXED_DEPTS)} 成功 ===")


if __name__ == "__main__":
    asyncio.run(main())
