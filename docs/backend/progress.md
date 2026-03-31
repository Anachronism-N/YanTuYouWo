# 研途有我 — 后端开发进度

## Phase 1：基础骨架 + 信息查询 API ✅ 已完成

> 完成时间：2026-03-31

### 已实现功能

#### 后端项目骨架
- [x] FastAPI 项目初始化（Python 3.9+ 兼容）
- [x] 项目目录结构：`src/` 下分 `models/`、`schemas/`、`routers/`、`services/`、`utils/`
- [x] 配置管理（`config.py`）— 自动检测爬虫数据库路径
- [x] 异步数据库连接（`database.py`）— aiosqlite
- [x] CORS 配置 — 允许 `localhost:3000` 跨域
- [x] 依赖安装：FastAPI、SQLAlchemy 2.0、Pydantic v2、uvicorn 等

#### 数据模型（复用爬虫系统）
- [x] `University` — 高校信息（39 所 985）
- [x] `Department` — 学院信息（1593 个）
- [x] `DepartmentSource` — 学院信息源 URL
- [x] `AdmissionNotice` — 推免通知（916 条）
- [x] `CrawlLog` / `CrawlState` — 爬取日志与状态

#### API 端点（14 个）

| 状态 | 方法 | 路径 | 说明 |
|---|---|---|---|
| ✅ | GET | `/api/health` | 健康检查 |
| ✅ | GET | `/api/notices` | 通知列表（分页、筛选、排序） |
| ✅ | GET | `/api/notices/latest` | 最新通知 |
| ✅ | GET | `/api/notices/{id}` | 通知详情 |
| ✅ | GET | `/api/schools` | 院校列表（分页、筛选、排序） |
| ✅ | GET | `/api/schools/{id}` | 院校详情（含学院列表） |
| ✅ | GET | `/api/schools/{id}/departments` | 学院列表 |
| ✅ | GET | `/api/schools/{id}/notices` | 院校下的通知 |
| ✅ | GET | `/api/search` | 全站搜索（跨通知+院校） |
| ✅ | GET | `/api/stats/overview` | 首页统计数据 |

#### 筛选功能
- [x] 通知类型筛选（夏令营/预推免/宣讲会/入营名单）
- [x] 学校层次筛选（985/211）
- [x] 省份筛选
- [x] 学校名称筛选
- [x] 学科方向筛选
- [x] 关键词搜索（标题+摘要+学校+学院）
- [x] 状态筛选（报名中/进行中/未开始/已结束）
- [x] 排序（最新发布/即将截止/热度）

#### 前端对接
- [x] 首页 — 统计数据 + 最新通知 + 热门院校 → 真实 API
- [x] 通知列表页 — mock 数据 → `getNotices()` API
- [x] 通知详情页 — mock 数据 → `getNoticeDetail()` API
- [x] 院校列表页 — mock 数据 → `getSchools()` API
- [x] 院校详情页 — mock 数据 → `getSchoolDetail()` + `getSchoolNotices()` API
- [x] 前端编译通过，无错误

### 数据统计
- 39 所高校
- 1593 个学院
- 916 条推免通知
- 数据来源：爬虫系统 SQLite 数据库（`crawl/data/large_scale_test.db`）

### 启动方式

```bash
# 后端
cd backend && pip install -e . && uvicorn src.main:app --reload --port 8000

# 前端
cd frontend && npm run dev
```

---

## Phase 2：用户系统 + 收藏 ⏳ 待开发

## Phase 3：社群 + 进度中心 ⏳ 待开发

## Phase 4：AI 功能接入 ⏳ 待开发
