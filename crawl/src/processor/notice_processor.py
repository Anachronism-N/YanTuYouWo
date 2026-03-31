"""通知处理编排器 - 串联列表爬取→过滤→详情爬取→入库的完整流程"""

from __future__ import annotations

import asyncio
import time
from datetime import datetime
from typing import Optional

from loguru import logger
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.university import University, Department, DepartmentSource
from src.models.notice import CrawlLog, CrawlState, AdmissionNotice
from src.crawler.list_crawler import crawl_source, should_crawl
from src.crawler.detail_crawler import process_notice


class NoticeProcessor:
    """通知处理编排器

    负责协调整个阶段三的爬取流程：
    1. 获取所有活跃信息源
    2. 判断是否需要爬取（增量爬取）
    3. 爬取列表页并解析
    4. 对新发现的通知，爬取详情页并提取结构化信息
    5. 记录爬取日志
    6. 更新信息源状态
    """

    # 详情页并发处理数（避免对同一域名发起过多请求）
    DETAIL_CONCURRENCY = 3

    def __init__(self, session: AsyncSession):
        self.session = session
        self._start_time: float = 0
        # 统计数据
        self.stats = {
            "total_sources": 0,
            "crawled_sources": 0,
            "skipped_sources": 0,
            "failed_sources": 0,
            "total_new_items": 0,
            "total_processed": 0,
            "total_relevant": 0,
            "total_llm_calls": 0,
        }

    async def process_all(
        self,
        university_name: str | None = None,
        department_name: str | None = None,
        max_sources: int | None = None,
        max_pages: int = 5,
        source_type: str | None = None,
    ):
        """
        处理所有活跃信息源。

        Args:
            university_name: 限定高校名称（可选，用于测试）
            department_name: 限定学院名称（可选，用于测试）
            max_sources: 最大处理信息源数（可选，用于测试）
            max_pages: 每个信息源最大翻页数（默认5）
            source_type: 限定信息源类型（招生/通知/新闻，可选）
        """
        self._start_time = time.time()
        self._max_pages = max_pages

        # 获取活跃信息源
        sources = await self._get_active_sources(university_name, department_name, source_type)
        if max_sources:
            sources = sources[:max_sources]

        self.stats["total_sources"] = len(sources)
        logger.info(f"活跃信息源数: {len(sources)}")

        # 提前提取所有ORM属性到纯Python字典中（只存int/str，不存ORM对象引用）
        # 这是关键：避免commit/rollback后ORM对象属性过期触发同步懒加载（MissingGreenlet）
        source_infos = []
        for source, dept, university in sources:
            try:
                source_infos.append({
                    "source_id": int(source.id),
                    "source_url": str(source.source_url),
                    "uni_name": str(university.name) if university else '?',
                    "dept_name": str(dept.name) if dept else '?',
                })
            except Exception as e:
                logger.warning(f"提取源信息失败: {e}")
                continue

        for i, info in enumerate(source_infos):
            context = f"{info['uni_name']} - {info['dept_name']}"
            logger.info(f"[{i + 1}/{len(source_infos)}] {context} | {info['source_url']}")

            # 判断是否需要爬取
            need_crawl = await should_crawl(info["source_id"], self.session)
            if not need_crawl:
                logger.info(f"  跳过（增量爬取策略）: 连续无更新")
                self.stats["skipped_sources"] += 1
                continue

            # 重新从数据库加载ORM对象（确保是最新状态，避免MissingGreenlet）
            result = await self.session.execute(
                select(DepartmentSource, Department, University)
                .join(Department, DepartmentSource.department_id == Department.id)
                .join(University, Department.university_id == University.id)
                .where(DepartmentSource.id == info["source_id"])
            )
            row = result.first()
            if not row:
                logger.warning(f"  源不存在: ID={info['source_id']}")
                continue

            source, dept, university = row

            # 处理单个信息源
            await self._process_source(source, dept, university)

            # 信息源间延迟，避免对同一域名过于密集
            if i < len(source_infos) - 1:
                await asyncio.sleep(1.0)

        # 输出统计
        self._print_stats()

    async def process_single(
        self,
        source_id: int,
    ):
        """
        处理单个信息源（用于测试或手动触发）。

        Args:
            source_id: 信息源 ID
        """
        self._start_time = time.time()

        result = await self.session.execute(
            select(DepartmentSource, Department, University)
            .join(Department, DepartmentSource.department_id == Department.id)
            .join(University, Department.university_id == University.id)
            .where(DepartmentSource.id == source_id)
        )
        row = result.first()
        if not row:
            logger.error(f"信息源不存在: ID={source_id}")
            return

        source, dept, university = row
        self.stats["total_sources"] = 1
        await self._process_source(source, dept, university)
        self._print_stats()

    async def _process_source(
        self,
        source: DepartmentSource,
        dept: Department | None,
        university: University | None,
    ):
        """处理单个信息源"""
        university_id = university.id if university else 0
        department_id = dept.id if dept else None
        # 提前提取属性值，避免在except块中触发懒加载
        source_url = source.source_url
        source_id = source.id

        try:
            # 1. 爬取列表页（支持翻页）
            max_pages = getattr(self, '_max_pages', 5)
            crawl_log = await crawl_source(
                source, self.session,
                university_id=university_id,
                max_pages=max_pages,
            )

            # 2. 记录爬取日志
            self.session.add(crawl_log)

            # 3. 处理新发现的通知
            new_items = getattr(crawl_log, "_new_items_data", [])
            self.stats["total_new_items"] += len(new_items)

            if new_items:
                logger.info(
                    f"  待处理: {len(new_items)} 条 "
                    f"(高相关 {crawl_log.relevant_items} 条, 中等 {len(new_items) - (crawl_log.relevant_items or 0)} 条)"
                )
                processed_count = await self._process_items_with_concurrency(
                    new_items,
                    university_id=university_id,
                    department_id=department_id,
                    source_id=source.id,
                )
                self.stats["total_processed"] += processed_count

            self.stats["total_relevant"] += crawl_log.relevant_items or 0

            # 4. 更新信息源状态
            if crawl_log.error_message:
                source.fail_count += 1
                self.stats["failed_sources"] += 1
                logger.warning(f"  爬取失败: {crawl_log.error_message}")

                # 解析失败自动恢复：连续失败超过阈值时降低优先级
                if source.fail_count >= 5:
                    logger.warning(f"  连续失败 {source.fail_count} 次，降低优先级")
                    source.priority = max(source.priority + 1, 10)
                if source.fail_count >= 10:
                    logger.warning(f"  连续失败 {source.fail_count} 次，停用信息源")
                    source.is_active = False
            else:
                source.fail_count = 0
                source.last_success_at = datetime.now()
                self.stats["crawled_sources"] += 1

            # 5. 提交事务（带重试）
            for attempt in range(3):
                try:
                    await self.session.commit()
                    break
                except Exception as commit_err:
                    if attempt < 2:
                        logger.warning(f"  commit失败(尝试{attempt+1}/3): {commit_err}")
                        try:
                            await self.session.rollback()
                        except Exception:
                            pass
                        await asyncio.sleep(2)  # 等待数据库锁释放
                    else:
                        logger.error(f"  commit最终失败: {commit_err}")
                        try:
                            await self.session.rollback()
                        except Exception:
                            pass

        except Exception as e:
            logger.error(f"处理信息源异常: {source_url} - {e}")
            try:
                await self.session.rollback()
            except Exception:
                pass
            self.stats["failed_sources"] += 1

    async def _process_items_with_concurrency(
        self,
        items: list[dict],
        university_id: int,
        department_id: int | None,
        source_id: int,
    ) -> int:
        """
        串行处理详情页（SQLite不支持并发写入）。

        按相关性评分排序，优先处理高相关条目。
        每条处理完后做flush，避免session冲突。

        Args:
            items: 新发现的通知条目列表
            university_id: 高校 ID
            department_id: 学院 ID
            source_id: 信息源 ID

        Returns:
            成功处理的通知数量
        """
        processed_count = 0

        # 按相关性评分排序，优先处理高相关条目
        sorted_items = sorted(items, key=lambda x: x.get("relevance_score", 0), reverse=True)

        for i, item in enumerate(sorted_items):
            try:
                # 请求间延迟，避免对同一域名过于密集
                await asyncio.sleep(0.5)
                notice = await process_notice(
                    item, self.session,
                    university_id=university_id,
                    department_id=department_id,
                    source_id=source_id,
                )
                if notice:
                    processed_count += 1
            except Exception as e:
                logger.error(f"  详情页处理异常: {item.get('title', '?')} - {e}")

        return processed_count

    async def _get_active_sources(
        self,
        university_name: str | None = None,
        department_name: str | None = None,
        source_type: str | None = None,
    ) -> list[tuple[DepartmentSource, Department | None, University | None]]:
        """获取所有活跃的信息源（含关联的学院和高校信息）

        所有类型的信息源（招生/通知/新闻）都会参与爬取，
        因为推免信息可能发布在任何类型的信息源中。
        规则过滤器会负责筛选出真正相关的通知。
        """
        query = (
            select(DepartmentSource, Department, University)
            .join(Department, DepartmentSource.department_id == Department.id)
            .join(University, Department.university_id == University.id)
            .where(
                DepartmentSource.is_active == True,
                DepartmentSource.fail_count < 10,
            )
        )

        if university_name:
            query = query.where(University.name == university_name)
        if department_name:
            query = query.where(Department.name == department_name)
        if source_type:
            query = query.where(DepartmentSource.source_type == source_type)

        # 按优先级排序
        # 按优先级排序：招生类型优先，然后通知，最后新闻
        # 同类型内按 priority 字段排序
        from sqlalchemy import case
        type_priority = case(
            (DepartmentSource.source_type == "招生", 0),
            (DepartmentSource.source_type == "通知", 1),
            (DepartmentSource.source_type == "新闻", 2),
            else_=3,
        )
        query = query.order_by(type_priority, DepartmentSource.priority)

        result = await self.session.execute(query)
        return list(result.all())

    def _print_stats(self):
        """输出统计信息"""
        s = self.stats
        elapsed = time.time() - self._start_time if self._start_time else 0
        logger.info(
            f"\n{'='*60}\n"
            f"  阶段三爬取统计\n"
            f"{'='*60}\n"
            f"  信息源总数:     {s['total_sources']}\n"
            f"  成功爬取:       {s['crawled_sources']}\n"
            f"  跳过(无更新):   {s['skipped_sources']}\n"
            f"  失败:           {s['failed_sources']}\n"
            f"  新发现条目:     {s['total_new_items']}\n"
            f"  高相关条目:     {s['total_relevant']}\n"
            f"  成功入库:       {s['total_processed']}\n"
            f"  总耗时:         {elapsed:.1f}s\n"
            f"{'='*60}"
        )
