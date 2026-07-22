# 全量 985 + 211 爬取操作手册

> 目标：爬取全部 985（39）+ 211（112）高校的推免/夏令营等招生信息。
> 这是**多小时的生产级操作**（发现→定位→爬取 + LLM），需断点续跑。

---

## 一、管线总览（三阶段 + 211 扩展）

```
阶段一 run_discovery (phase1)   研招网取 985 → 发现各校学院（~15min，39校/数百院系）
阶段二 run_discovery (phase2)   为每个学院定位通知列表页（最慢，数百院系×分析）
阶段三 run_crawl                爬取所有通知页 → 详情 → LLM 提取入库（最久 + 成本）
add_211_universities            追加 73 所纯 211，重复阶段一/二/三
```

每阶段均已做**断点续跑**（校/院/源已存在则跳过），可中断后重跑继续。

---

## 二、环境准备

```bash
cd crawl
# 凭证：仓库外 ytyw/.env 放 SILICONFLOW_API_KEY（见 config.py 加载策略）
# 依赖：pip install -e . （或 pip install httpx[http2] beautifulsoup4 lxml playwright
#        sqlalchemy[asyncio] aiosqlite loguru pydantic-settings openai pypinyin pymupdf）
# 编码：Windows 设 PYTHONUTF8=1（GBK 控制台会崩在 emoji/中文输出）
```

---

## 三、逐步执行（全部写入 data/large_scale_test.db，后端默认读此库）

### 1. 阶段一+二：发现 985 学院 + 定位通知页
```bash
DATABASE_URL="sqlite+aiosqlite:///data/large_scale_test.db" \
PYTHONUTF8=1 python scripts/run_discovery.py
```
- 阶段一约 15min（39 校 / ~900 院系）。
- 阶段二为数百院系定位通知页，**可能数小时**；可 Ctrl+C 中断后重跑（已完成的跳过）。
- 进度查看：
```bash
python -c "import sqlite3;d=sqlite3.connect('data/large_scale_test.db');c=d.cursor();\
print('校',c.execute('SELECT COUNT(*) FROM universities').fetchone()[0],\
'院',c.execute('SELECT COUNT(*) FROM departments').fetchone()[0],\
'源',c.execute('SELECT COUNT(*) FROM department_sources').fetchone()[0])"
```

### 2. 追加 211 高校（73 所）
```bash
python scripts/add_211_universities.py --db data/large_scale_test.db
# 然后再跑一次 run_discovery 为 211 校发现学院+定位（985 部分会跳过）
DATABASE_URL="sqlite+aiosqlite:///data/large_scale_test.db" PYTHONUTF8=1 python scripts/run_discovery.py
```

### 3. 阶段三：爬取通知（详情 + LLM 提取）
```bash
DATABASE_URL="sqlite+aiosqlite:///data/large_scale_test.db" \
PYTHONUTF8=1 python scripts/run_crawl.py --max-pages 3
```
- 对所有 `department_sources` 爬列表→详情→LLM 分类/提取→入库。
- **并发**：detail 阶段 `_prepare_notice` 并发（DETAIL_CONCURRENCY=3），DB 串行。
- **成本**：每条约 2 次 LLM 调用（classify + extract，Qwen2.5-7B/32B）。
- 可按校/类型分批：`--university "天津大学"` / `--source-type 招生`。
- 中断后重跑：增量状态（CrawlState）自动跳过已爬、无更新的源。

### 4. 导师爬取（可选）
```bash
python scripts/crawl_tutors_into_backend_db.py   # 已含 2 个 CS 院系示例
# 全量需先 run_faculty_discovery.py 定位各院系师资页，再 run_tutor_crawl/profile
```

### 5. 启动预览
```bash
# 终端1
cd backend && set PYTHONUTF8=1 && python -m uvicorn src.main:app --port 8000
# 终端2
cd frontend && corepack pnpm dev
# 打开 http://localhost:3000 ，Ctrl+F5
```

---

## 四、耗时与成本估算（粗略）

| 阶段 | 985（39校） | +211（112校） |
|------|------------|--------------|
| 一 发现学院 | ~15min | +30min |
| 二 定位通知页 | 数小时 | +数小时 |
| 三 爬取+LLM | 数小时 + ~¥数十 | +数倍 |

> 211 多数高校网站结构与 985 相近，复用同一发现/解析/反爬基础设施。

---

## 五、当前进度（本会话）

- 阶段一：**39 校 / 887 院系** 已入库。
- 阶段二：**57 个通知页源**已定位（招生26/通知15/新闻9/研招办7），覆盖 28 院系。
- 阶段三：**63 条真实通知**入库，覆盖 9 校（北大25/东南15/重大6/天大5…），
  含北大物理学院夏令营(conf=1.00)、北大推免复试名单/细则等。

### 实测可用的加速命令（关键）

阶段二默认很慢（每院路径猜测+验证多次 fetch）。实测可用的快速组合：

```bash
# 阶段二（跳过慢的阶段一重建 + 快速模式 + 无频率延迟 + 并发）
DATABASE_URL="sqlite+aiosqlite:///data/large_scale_test.db" \
CRAWL_DELAY_MIN=0 CRAWL_DELAY_MAX=0.3 CRAWL_RETRY_TIMES=1 \
PYTHONUTF8=1 python scripts/run_discovery.py --phase2-only
# 需要更高召回（含 LLM 智能定位）加 USE_LLM_LOCATE=1，但慢很多

# 阶段三爬取
DATABASE_URL="sqlite+aiosqlite:///data/large_scale_test.db" \
CRAWL_DELAY_MIN=0 CRAWL_DELAY_MAX=0.3 CRAWL_RETRY_TIMES=1 \
PYTHONUTF8=1 python scripts/run_crawl.py --max-pages 2
```

每轮 590s 跑一批（断点续跑），重复执行即可推进。当前每轮阶段二约 +30~40 源。

### 本轮修的关键 bug（让大规模可行）

- **http_client 信号量 loop 绑定**：单例 __init__ 创建 Semaphore 绑定导入期 loop，
  并发报 "attached to a different loop"。改为惰性创建（影响所有并发）。
- **run_discovery 幂等+断点续跑**：校/院/源已存在则跳过，支持中断续跑。
- **阶段二并发+as_completed**：慢院不阻塞快院入库，渐进提交。
- **--phase2-only + 快速模式**：跳过慢的阶段一重建与 Playwright/LLM 慢策略。
