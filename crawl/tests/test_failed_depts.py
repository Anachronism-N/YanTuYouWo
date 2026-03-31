"""
测试之前失败的学院 - 验证优化效果
"""
import asyncio
import sys
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from loguru import logger
from src.discovery.notice_page_locator import locate_notice_pages, is_non_department_entity
from src.utils.http_client import http_client

# 配置日志
LOG_FILE = Path(__file__).resolve().parent.parent / "data" / "test_failed_depts.log"
logger.remove()
logger.add(sys.stderr, level="INFO")
logger.add(str(LOG_FILE), level="DEBUG", mode="w")

# 之前失败的15个学院
FAILED_DEPTS = [
    # 非学院实体（应被跳过）
    ("西北农林科技大学", "中国科学院院士", ""),
    ("厦门大学", "学部院系", ""),
    ("大连理工大学", "科学技术研究院", ""),
    # 有URL但定位失败的12个
    ("东北大学", "江河建筑学院", "http://www.jz.neu.edu.cn/"),
    ("中南大学", "土木工程学院", "https://civil.csu.edu.cn/"),
    ("中山大学", "先进制造学院", "https://am.sysu.edu.cn/"),
    ("中山大学", "管理学院", "https://bus.sysu.edu.cn/"),
    ("中国海洋大学", "海洋生物多样性与进化研究所", "https://iemb.ouc.edu.cn/"),
    ("华南理工大学", "海洋科学与工程学院", "http://www2.scut.edu.cn/marine"),
    ("吉林大学", "物理学院", "https://phy.jlu.edu.cn/"),
    ("山东大学", "基础医学院", "https://www.bms.sdu.edu.cn/"),
    ("浙江大学", "公共管理学院", "http://www.spa.zju.edu.cn/"),
    ("清华大学", "创新创业与战略系", "https://www.sem.tsinghua.edu.cn/ies"),
    ("西安交通大学", "物理学院", "https://www.xjtu.edu.cn/xynr.jsp?urltype=tree.TreeTempUrl&wbtreeid=2067"),
    ("西安交通大学", "崇实书院", "https://www.xjtu.edu.cn/bksy/cssy.htm"),
]


async def main():
    start = datetime.now()
    logger.info("=" * 60)
    logger.info("🔍 测试之前失败的学院 - 验证优化效果")
    logger.info("=" * 60)

    success = 0
    partial = 0
    failed = 0
    skipped = 0
    results_detail = []

    for uni, dept, url in FAILED_DEPTS:
        logger.info(f"\n--- {uni} - {dept} ---")

        # 检查非学院实体
        if is_non_department_entity(dept):
            logger.info(f"  ⏭️  跳过非学院实体: {dept}")
            skipped += 1
            results_detail.append((uni, dept, "SKIPPED", []))
            continue

        if not url:
            logger.info(f"  ❌ 无URL")
            failed += 1
            results_detail.append((uni, dept, "FAILED", []))
            continue

        try:
            results = await locate_notice_pages(
                dept_homepage=url,
                dept_name=dept,
                university_name=uni,
            )
            if results:
                has_admission = any(r.get("type") == "招生" for r in results)
                if has_admission:
                    success += 1
                    status = "SUCCESS"
                else:
                    partial += 1
                    status = "PARTIAL"
                for r in results:
                    logger.info(f"  ✅ [{r['type']}] {r['url']} (方法={r['method']}, 分数={r.get('validation_score', '?')})")
                results_detail.append((uni, dept, status, results))
            else:
                logger.info(f"  ❌ 未找到通知页")
                failed += 1
                results_detail.append((uni, dept, "FAILED", []))
        except Exception as e:
            logger.error(f"  ❌ 异常: {e}")
            failed += 1
            results_detail.append((uni, dept, "ERROR", []))

    elapsed = (datetime.now() - start).total_seconds()

    logger.info(f"\n{'='*60}")
    logger.info(f"📊 测试结果汇总")
    logger.info(f"{'='*60}")
    logger.info(f"⏱️  耗时: {elapsed:.1f}s ({elapsed/60:.1f}min)")
    logger.info(f"✅ 成功（含招生页）: {success}")
    logger.info(f"⚠️  部分（仅通知/新闻）: {partial}")
    logger.info(f"❌ 失败: {failed}")
    logger.info(f"⏭️  跳过: {skipped}")
    effective = success + partial + failed
    coverage = (success + partial) / max(effective, 1) * 100
    logger.info(f"📊 覆盖率: {success+partial}/{effective} ({coverage:.1f}%)")

    logger.info(f"\n--- 详细结果 ---")
    for uni, dept, status, _ in results_detail:
        emoji = {"SUCCESS": "✅", "PARTIAL": "⚠️", "FAILED": "❌", "SKIPPED": "⏭️", "ERROR": "💥"}.get(status, "?")
        logger.info(f"  {emoji} {status:8s} {uni} - {dept}")

    await http_client.close()


if __name__ == "__main__":
    asyncio.run(main())
