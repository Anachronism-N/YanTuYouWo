# 研途有我 (YanTuYouWo) — 项目说明

保研信息聚合平台：爬取 985/211 高校推免/夏令营/预推免通知 + 导师信息，结构化存储，前端展示。

## 仓库结构

```
YanTuYouWo/
├── crawl/       # Python 爬虫（核心数据生产）
├── backend/     # FastAPI 后端（API + 数据清洗）
├── frontend/    # Next.js 前端（展示）
├── docs/        # 设计/进度/优化文档
└── render.yaml  # 部署配置
```

## 爬虫 (crawl/)

三阶段管线 + 增量机制：
- **阶段一** `run_discovery.py`：研招网取高校 → 发现学院（`--phase2-only` 跳过慢的阶段一重建）
- **阶段二**：定位各学院通知列表页（`USE_LLM_LOCATE=1` 启用 LLM 慢策略，默认快速模式）
- **阶段三** `run_crawl.py`：爬通知 → 详情 → LLM 分类/提取 → 入库
- **增量**：`should_crawl`（fail_count + no_update 双重判定）+ `_deduplicate`（URL 去重键）+ `CrawlState`

关键命令（写 `data/large_scale_test.db`，后端默认读此库）：
```bash
cd crawl
# 凭证：仓库外 ytyw/.env 放 SILICONFLOW_API_KEY（config.py 自动加载）
DATABASE_URL="sqlite+aiosqlite:///data/large_scale_test.db" \
CRAWL_DELAY_MIN=0 CRAWL_DELAY_MAX=0.3 PYTHONUTF8=1 \
python scripts/run_discovery.py --phase2-only   # 定位通知页
python scripts/run_crawl.py --max-pages 3        # 增量爬取
python scripts/crawl_tutors_into_backend_db.py   # 导师画像
python scripts/reextract_content.py              # 重提取正文（应用提取器改进）
```

测试：`PYTHONUTF8=1 python -m pytest tests/ -q`（126 项）

## 后端 (backend/)

FastAPI，读 `crawl/data/large_scale_test.db`。端口 8000（本机被 Windows 保留端口占用时用 9999）。
```bash
cd backend && set PYTHONUTF8=1 && python -m uvicorn src.main:app --port 8000
```
- 通知/导师/院校/搜索/社区/用户/AI（LLM 留空则 Mock 降级）API
- `data_clean_service`：API 层实时清洗（标题/正文/日期/图片）

## 前端 (frontend/)

Next.js 16 + pnpm。连后端 `NEXT_PUBLIC_API_BASE_URL`（默认 localhost:8000/api）。
```bash
cd frontend && corepack pnpm install && corepack pnpm dev
```
- `/info/notices` `/info/tutors` `/info/schools` 已对接后端真实数据
- 演示账号：`zhangsan@demo.com` / `test123456`

## 当前状态（2026-07）

- 数据：74 通知 / 14 导师 / 109 院校（39 985 + 70 211）
- 限制：部分 211 学校站 SSL/TLS 被服务器拒绝（IP 封锁，非代码问题）；JS 动态名单页（8%）需 Playwright
- 优化分支：`optimize/summer-camp-pre-admission`（55 提交，待合并 main）

## 文档

- `docs/crawl/design.md` 爬虫设计 / `incremental_design.md` 增量设计
- `docs/crawl/summer_camp_optimization.md` `tutor_optimization.md` `edge_case_testing.md` `full_scale_runbook.md`
- `docs/backend/` `docs/frontend/` 各端设计/进度
