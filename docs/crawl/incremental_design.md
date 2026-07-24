# 增量爬取设计

> 目标：每次更新只爬「新源 / 有更新的源 / 偶尔回探的源」，不重复爬取已确认无变化或持续失败的源，不重复处理已入库的通知。

---

## 一、三层增量机制

```
┌─ 层1 源级跳过（should_crawl）── 决定「这个源这次要不要爬」
│   综合 源健康度(fail_count) + 更新鲜度(no_update)
│   不爬 → 完全跳过（省掉 SSL/反爬坏源的重试时间）
│
├─ 层2 通知级去重（_deduplicate）── 决定「这条通知要不要处理」
│   按 source_url（规范化去重键，http/https/www 同页）查 DB
│   已存 → 跳过（不重新抓详情/调 LLM）
│
└─ 层3 状态记录（_update_crawl_state）── 爬完更新 CrawlState
    记录 last_notice_date / last_notice_count / consecutive_no_update
    供下次 should_crawl 判定
```

## 二、should_crawl 规则（核心）

| 条件 | 行为 | 理由 |
|------|------|------|
| `fail_count >= 10` | 源已被停用（is_active=0），不进入 | 持续失败 10 次 |
| `fail_count >= 5` | 每 10 次爬 1 次 | 持续失败，给恢复机会但不浪费 |
| `fail_count >= 3` | 每 5 次爬 1 次 | 频繁失败降频 |
| 无 CrawlState + fail<3 | 爬（新源） | 从未爬过 |
| `no_update >= 10` | 每 5 次爬 1 次 | 长期无更新 |
| `no_update >= 5` | 每 3 次爬 1 次 | 连续无更新 |
| `no_update = 0`（有更新） | 爬 | 活跃源，紧跟新通知 |
| 否则 | 爬 | 默认 |

> `每 N 次爬 1 次` 用 `_count_crawls(source_id) % N == 0` 判定（基于该源历史 crawl_logs 总数）。

## 三、运行方式

```bash
# 增量爬取（默认就是增量，无需特殊参数）
DATABASE_URL="sqlite+aiosqlite:///data/large_scale_test.db" \
PYTHONUTF8=1 python scripts/run_crawl.py --max-pages 3
```

- **首次全量**：所有源无状态 → 全部爬，建立 CrawlState。
- **后续增量**：只爬 should_crawl=True 的源；其内只处理 _deduplicate 后的新通知。
- **重复运行安全**：已存通知不会重复入库（source_url 唯一 + 去重键）。

## 四、调度的动态频率（设计意图）

```
新源/活跃源   → 每次都爬（紧跟新通知）
连续无更新源  → 频率递减（每3次→每5次）
持续失败源    → 大幅降频（每5次→每10次），10次失败停用
```

这样高峰期（夏令营 3-6 月、预推免 8-9 月）活跃源紧跟，淡季/坏源不浪费资源。

## 五、测试

`tests/test_incremental_crawl.py`（4 项）：新源爬、失败源降频、无更新降频、活跃源爬。
