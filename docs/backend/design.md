# 研途有我 — 后端设计文档

## 一、总体架构

### 1.1 技术选型

| 层级 | 技术 | 说明 |
|---|---|---|
| Web 框架 | **FastAPI** | 异步高性能，自动生成 OpenAPI 文档 |
| ORM | **SQLAlchemy 2.0** (async) | 与爬虫系统共享数据模型 |
| 数据库 | **PostgreSQL 16** | 生产环境主库 |
| 数据库（开发） | **SQLite** (aiosqlite) | 本地开发零配置，与爬虫系统共享 |
| 缓存 | **Redis** | 热点数据缓存、会话管理 |
| 认证 | **JWT** (python-jose) | 无状态 Token 认证 |
| 密码 | **bcrypt** (passlib) | 密码哈希 |
| 数据校验 | **Pydantic v2** | 请求/响应模型 |
| 任务队列 | **Celery** (可选，后期) | 异步任务（AI 调用、邮件通知等） |
| AI 调用 | **OpenAI SDK** | GPT-4o / DeepSeek 等 |

### 1.2 目录结构

```
backend/
├── pyproject.toml          # 项目配置与依赖
├── alembic.ini             # 数据库迁移配置
├── alembic/                # 迁移脚本目录
│   └── versions/
├── src/
│   ├── __init__.py
│   ├── main.py             # FastAPI 应用入口
│   ├── config.py           # 配置管理（环境变量）
│   ├── database.py         # 数据库连接与会话管理
│   ├── dependencies.py     # FastAPI 依赖注入（认证、分页等）
│   │
│   ├── models/             # SQLAlchemy 数据模型（与 crawl 共享）
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── university.py   # University, Department, DepartmentSource
│   │   ├── notice.py       # AdmissionNotice, CrawlLog
│   │   ├── user.py         # User, UserProfile, UserSettings
│   │   ├── community.py    # Post, Comment, Checkin
│   │   ├── progress.py     # Plan, Task, Achievement
│   │   └── favorite.py     # Favorite
│   │
│   ├── schemas/            # Pydantic 请求/响应模型
│   │   ├── __init__.py
│   │   ├── auth.py         # LoginRequest, RegisterRequest, TokenResponse
│   │   ├── user.py         # UserProfile, UserSettings
│   │   ├── notice.py       # NoticeItem, NoticeDetail, NoticeQuery
│   │   ├── school.py       # SchoolItem, SchoolDetail, SchoolQuery
│   │   ├── tutor.py        # TutorItem, TutorDetail, TutorQuery
│   │   ├── community.py    # PostItem, CommentItem
│   │   ├── progress.py     # PlanItem, TaskItem
│   │   └── common.py       # PaginatedResponse, StatsOverview
│   │
│   ├── routers/            # API 路由
│   │   ├── __init__.py
│   │   ├── auth.py         # POST /auth/login, /auth/register
│   │   ├── user.py         # GET/PUT /user/profile, /user/settings
│   │   ├── notices.py      # GET /notices, /notices/{id}, /notices/latest
│   │   ├── schools.py      # GET /schools, /schools/{id}, /schools/{id}/departments
│   │   ├── tutors.py       # GET /tutors, /tutors/{id}
│   │   ├── search.py       # GET /search
│   │   ├── stats.py        # GET /stats/overview
│   │   ├── favorites.py    # GET/POST/DELETE /user/favorites
│   │   ├── community.py    # GET/POST /community/posts, /community/qa
│   │   ├── progress.py     # GET/POST/PUT /progress/plans, /progress/tasks
│   │   └── ai.py           # POST /ai/plan, /ai/recommend, /ai/interview, /ai/mental
│   │
│   ├── services/           # 业务逻辑层
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── notice_service.py
│   │   ├── school_service.py
│   │   ├── tutor_service.py
│   │   ├── search_service.py
│   │   ├── user_service.py
│   │   ├── community_service.py
│   │   ├── progress_service.py
│   │   └── ai_service.py
│   │
│   └── utils/              # 工具函数
│       ├── __init__.py
│       ├── security.py     # JWT 生成/验证、密码哈希
│       └── pagination.py   # 分页工具
│
├── tests/                  # 测试
│   ├── conftest.py
│   ├── test_auth.py
│   ├── test_notices.py
│   └── test_schools.py
│
└── .env.example            # 环境变量模板
```

### 1.3 架构分层

```
┌─────────────────────────────────────────────────┐
│                  Frontend (Next.js)              │
│         axios → http://localhost:8000/api         │
└────────────────────┬────────────────────────────┘
                     │ HTTP / JSON
┌────────────────────▼────────────────────────────┐
│              FastAPI Application                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ Routers  │→ │ Services │→ │ SQLAlchemy   │   │
│  │ (路由)    │  │ (业务)    │  │ (数据访问)    │   │
│  └──────────┘  └──────────┘  └──────┬───────┘   │
│  ┌──────────┐  ┌──────────┐         │           │
│  │ Schemas  │  │ Deps     │         │           │
│  │ (校验)    │  │ (依赖注入) │         │           │
│  └──────────┘  └──────────┘         │           │
└─────────────────────────────────────┼───────────┘
                                      │
              ┌───────────────────────▼──────────┐
              │     PostgreSQL / SQLite           │
              │  ┌────────────┐ ┌──────────────┐ │
              │  │ universities│ │ admission_   │ │
              │  │ departments │ │ notices      │ │
              │  │ dept_sources│ │ crawl_logs   │ │
              │  └────────────┘ └──────────────┘ │
              │  ┌────────────┐ ┌──────────────┐ │
              │  │ users      │ │ posts        │ │
              │  │ favorites  │ │ comments     │ │
              │  │ plans      │ │ tasks        │ │
              │  └────────────┘ └──────────────┘ │
              └──────────────────────────────────┘
```

---

## 二、开发阶段规划

后端开发分为 **4 个阶段**，每个阶段聚焦一个核心能力，逐步打通前后端。

### Phase 1：基础骨架 + 信息查询 API（优先级最高）

> **目标**：搭建后端项目骨架，打通前端「保研信息」模块的真实数据展示

**涉及前端页面**：
- `/info/notices` — 信息聚合列表
- `/info/notices/[id]` — 通知详情
- `/info/schools` — 院校库列表
- `/info/schools/[id]` — 院校详情
- `/` — 首页统计数据

**API 端点**：

| 方法 | 路径 | 说明 | 认证 |
|---|---|---|---|
| GET | `/api/notices` | 通知列表（分页、筛选、排序） | ❌ |
| GET | `/api/notices/{id}` | 通知详情 | ❌ |
| GET | `/api/notices/latest` | 最新通知 | ❌ |
| GET | `/api/schools` | 院校列表 | ❌ |
| GET | `/api/schools/{id}` | 院校详情（含学院列表） | ❌ |
| GET | `/api/schools/{id}/departments` | 学院列表 | ❌ |
| GET | `/api/schools/{id}/notices` | 院校下的通知 | ❌ |
| GET | `/api/stats/overview` | 首页统计 | ❌ |
| GET | `/api/search` | 全站搜索 | ❌ |

**核心任务**：
1. 初始化 FastAPI 项目骨架（`pyproject.toml`、目录结构、配置管理）
2. 复用爬虫系统的 SQLAlchemy 模型（`University`、`Department`、`DepartmentSource`、`AdmissionNotice`）
3. 创建 Pydantic schemas 对齐前端 TypeScript 类型
4. 实现 `notice_service` + `school_service`（查询、筛选、分页）
5. 实现 `search_service`（跨表关键词搜索）
6. 连接爬虫数据库（开发阶段直接读取 `crawl/data/large_scale_test.db`）
7. 前端 `API_BASE_URL` 指向 `http://localhost:8000/api`，替换 mock 数据

**数据来源**：直接读取爬虫系统已有的 SQLite 数据库，无需额外导入数据。

**交付标准**：
- 前端信息聚合页面展示真实爬取的通知数据
- 院校库展示真实的 985/211 院校信息
- 首页统计数字来自真实数据库
- 搜索功能可用

---

### Phase 2：用户系统 + 收藏

> **目标**：实现用户注册/登录、个人信息管理、收藏功能

**涉及前端页面**：
- `/auth/login` — 登录
- `/auth/register` — 注册
- `/user` — 个人中心
- `/user/settings` — 设置
- `/user/onboarding` — 新手引导
- `/user/favorites` — 收藏列表

**API 端点**：

| 方法 | 路径 | 说明 | 认证 |
|---|---|---|---|
| POST | `/api/auth/register` | 注册 | ❌ |
| POST | `/api/auth/login` | 登录 | ❌ |
| GET | `/api/user/profile` | 获取个人信息 | ✅ |
| PUT | `/api/user/profile` | 更新个人信息 | ✅ |
| GET | `/api/user/settings` | 获取设置 | ✅ |
| PUT | `/api/user/settings` | 更新设置 | ✅ |
| GET | `/api/user/favorites` | 收藏列表 | ✅ |
| POST | `/api/user/favorites` | 添加收藏 | ✅ |
| DELETE | `/api/user/favorites` | 取消收藏 | ✅ |
| GET | `/api/user/favorites/check` | 检查是否已收藏 | ✅ |

**核心任务**：
1. 新增 `User` 模型（id, email, password_hash, username, nickname, avatar_url, **role**, ...）
   - `role` 字段：`"user"` | `"admin"`，默认 `"user"`
2. 新增 `Favorite` 模型（user_id, type, target_id）
3. 实现 JWT 认证中间件（`dependencies.py` 中的 `get_current_user`、`require_admin`）
4. 实现 `auth_service`（注册、登录、密码哈希）
5. 实现 `user_service`（个人信息 CRUD、设置 CRUD）
6. 实现 `favorite_service`（收藏 CRUD、检查）
7. 前端对接：登录后 axios 拦截器自动携带 `Authorization: Bearer <token>`

### Phase 2.5：管理员系统（前端已就绪）

> **目标**：实现管理后台的后端 API，支持内容管理和上传

**涉及前端页面**（已实现）：
- `/admin` — 管理仪表盘
- `/admin/notices` — 通知 CRUD 管理
- `/admin/upload` — 内容上传（课程/模板/资料/题目/经验帖）

**API 端点**（需后端实现）：

| 方法 | 路径 | 说明 | 认证 |
|---|---|---|---|
| GET | `/api/admin/stats` | 管理后台统计数据 | ✅ Admin |
| GET | `/api/admin/notices` | 通知列表（含草稿/归档） | ✅ Admin |
| POST | `/api/admin/notices` | 创建通知（手动录入） | ✅ Admin |
| PUT | `/api/admin/notices/{id}` | 编辑通知 | ✅ Admin |
| DELETE | `/api/admin/notices/{id}` | 删除通知 | ✅ Admin |
| PUT | `/api/admin/notices/{id}/status` | 更改通知状态（发布/草稿/归档） | ✅ Admin |
| POST | `/api/admin/upload` | 文件上传（multipart/form-data） | ✅ Admin |
| GET | `/api/admin/uploads` | 已上传内容列表 | ✅ Admin |
| DELETE | `/api/admin/uploads/{id}` | 删除已上传内容 | ✅ Admin |
| GET | `/api/admin/audit-log` | 操作审计日志 | ✅ Admin |

**认证与权限**：
- `require_admin` 装饰器检查 `user.role == "admin"`
- 非 admin 用户访问 `/api/admin/*` 返回 403

**交付标准**：
- 用户可注册、登录
- 登录后可查看/编辑个人信息
- 可收藏通知/院校，收藏列表可查看

---

### Phase 3：社群 + 进度中心

> **目标**：打通社群互动和个人进度管理

**涉及前端页面**：
- `/community` — 社群首页
- `/community/qa` — 问答互助
- `/community/experience` — 经验分享
- `/community/checkin` — 学习打卡
- `/community/create` — 发帖
- `/progress` — 进度中心
- `/progress/plan` — 规划管理
- `/progress/tasks` — 任务追踪
- `/progress/achievements` — 成果记录
- `/progress/checkin` — 打卡日历

**API 端点**：

| 方法 | 路径 | 说明 | 认证 |
|---|---|---|---|
| GET | `/api/community/posts` | 帖子列表 | ❌ |
| GET | `/api/community/posts/{id}` | 帖子详情 | ❌ |
| POST | `/api/community/posts` | 发帖 | ✅ |
| POST | `/api/community/posts/{id}/like` | 点赞 | ✅ |
| GET | `/api/community/posts/{id}/comments` | 评论列表 | ❌ |
| POST | `/api/community/posts/{id}/comments` | 发评论 | ✅ |
| GET | `/api/community/qa` | 问答列表 | ❌ |
| POST | `/api/community/checkin` | 打卡 | ✅ |
| GET | `/api/community/checkin/stats` | 打卡统计 | ✅ |
| GET | `/api/progress/plans` | 规划列表 | ✅ |
| POST | `/api/progress/plans` | 创建规划 | ✅ |
| PUT | `/api/progress/plans/{id}` | 更新规划 | ✅ |
| GET | `/api/progress/tasks` | 任务列表 | ✅ |
| POST | `/api/progress/tasks` | 创建任务 | ✅ |
| PUT | `/api/progress/tasks/{id}` | 更新任务 | ✅ |

**核心任务**：
1. 新增 `Post`、`Comment`、`Checkin` 模型
2. 新增 `Plan`、`Task`、`Achievement` 模型
3. 实现社群 CRUD 服务
4. 实现进度管理 CRUD 服务
5. 前端对接

---

### Phase 4：AI 功能接入

> **目标**：接入 LLM，打通 AI 辅导模块

**涉及前端页面**：
- `/ai/plan` — 综合规划
- `/ai/recommend` — 择校推荐
- `/ai/tutor-match` — 导师推荐
- `/ai/interview` — 模拟面试
- `/ai/mental` — 心理支持
- `/ai/resume` — 简历工坊

**API 端点**：

| 方法 | 路径 | 说明 | 认证 |
|---|---|---|---|
| POST | `/api/ai/plan/generate` | 生成保研规划 | ✅ |
| POST | `/api/ai/recommend` | 择校推荐 | ✅ |
| POST | `/api/ai/interview/start` | 开始模拟面试 | ✅ |
| POST | `/api/ai/interview/{id}/answer` | 发送面试回答 | ✅ |
| POST | `/api/ai/interview/{id}/end` | 结束面试 | ✅ |
| POST | `/api/ai/mental/chat` | 心理支持对话 | ✅ |
| POST | `/api/ai/resume/draft` | 保存简历草稿 | ✅ |
| GET | `/api/ai/resume/draft` | 获取简历草稿 | ✅ |
| POST | `/api/ai/resume/optimize` | AI 优化简历 | ✅ |
| POST | `/api/ai/resume/export` | 导出简历 PDF | ✅ |
| POST | `/api/ai/recommend/export` | 导出推荐报告 | ✅ |

**核心任务**：
1. 封装 LLM 调用层（支持 OpenAI / DeepSeek 切换）
2. 设计 Prompt 模板（规划、择校、面试、心理等场景）
3. 实现流式响应（SSE）支持
4. 面试会话状态管理
5. 简历数据持久化

---

## 三、数据模型设计

### 3.1 已有模型（来自爬虫系统，直接复用）

| 模型 | 表名 | 说明 |
|---|---|---|
| `University` | `universities` | 高校信息（39 所 985 + 211） |
| `Department` | `departments` | 学院信息 |
| `DepartmentSource` | `department_sources` | 学院信息源 URL |
| `AdmissionNotice` | `admission_notices` | 推免通知（爬取结果） |
| `CrawlLog` | `crawl_logs` | 爬取日志 |
| `CrawlState` | `crawl_states` | 增量爬取状态 |

### 3.2 新增模型

#### User（用户表）

```python
class User(Base):
    __tablename__ = "users"

    id: int                     # 主键
    email: str                  # 邮箱（唯一）
    password_hash: str          # 密码哈希
    username: str               # 用户名（唯一）
    nickname: str               # 昵称
    avatar_url: str | None      # 头像
    university: str | None      # 本科学校
    major: str | None           # 本科专业
    grade: str | None           # 年级
    bio: str | None             # 个人简介
    gpa_rank: str | None        # GPA 排名
    target_universities: list   # 目标院校（JSON）
    research_interests: list    # 研究兴趣（JSON）
    is_onboarded: bool          # 是否完成引导
    created_at: datetime
    updated_at: datetime
```

#### UserSettings（用户设置表）

```python
class UserSettings(Base):
    __tablename__ = "user_settings"

    id: int
    user_id: int                          # FK → users
    email_notification: bool              # 邮件通知
    favorite_update_notification: bool    # 收藏更新提醒
    deadline_reminder_days: int           # 截止日期提前提醒天数
    interested_disciplines: list          # 关注学科（JSON）
    interested_universities: list         # 关注学校（JSON）
```

#### Favorite（收藏表）

```python
class Favorite(Base):
    __tablename__ = "favorites"

    id: int
    user_id: int                # FK → users
    type: str                   # notice / school / tutor
    target_id: int              # 目标 ID
    created_at: datetime
    # UniqueConstraint(user_id, type, target_id)
```

#### Post（帖子表）

```python
class Post(Base):
    __tablename__ = "posts"

    id: int
    user_id: int                # FK → users
    category: str               # experience / qa / confession / resource
    title: str
    content: str                # Markdown 内容
    tags: list                  # 标签（JSON）
    like_count: int
    comment_count: int
    view_count: int
    is_pinned: bool
    created_at: datetime
    updated_at: datetime
```

#### Comment（评论表）

```python
class Comment(Base):
    __tablename__ = "comments"

    id: int
    post_id: int                # FK → posts
    user_id: int                # FK → users
    content: str
    reply_to_id: int | None     # FK → comments（回复）
    like_count: int
    created_at: datetime
```

#### Plan（规划表）

```python
class Plan(Base):
    __tablename__ = "plans"

    id: int
    user_id: int                # FK → users
    title: str
    description: str | None
    start_date: date
    end_date: date
    status: str                 # active / completed / archived
    created_at: datetime
    updated_at: datetime
```

#### Task（任务表）

```python
class Task(Base):
    __tablename__ = "tasks"

    id: int
    user_id: int                # FK → users
    plan_id: int | None         # FK → plans
    title: str
    description: str | None
    due_date: date | None
    priority: str               # high / medium / low
    status: str                 # todo / in_progress / done
    created_at: datetime
    updated_at: datetime
```

#### Checkin（打卡表）

```python
class Checkin(Base):
    __tablename__ = "checkins"

    id: int
    user_id: int                # FK → users
    date: date                  # 打卡日期
    duration_minutes: int       # 学习时长
    content: str | None         # 打卡内容
    mood: str | None            # 心情
    created_at: datetime
```

---

## 四、前后端对接约定

### 4.1 API 前缀

所有 API 统一前缀 `/api`，前端 `API_BASE_URL = "http://localhost:8000/api"`。

### 4.2 响应格式

```json
// 成功 — 直接返回数据
{
  "total": 100,
  "items": [...]
}

// 错误 — HTTP 状态码 + 错误体
{
  "detail": "错误描述"
}
```

### 4.3 认证方式

- 登录成功返回 JWT Token
- 前端在 axios 拦截器中自动添加 `Authorization: Bearer <token>`
- 后端通过 `Depends(get_current_user)` 注入当前用户
- Token 有效期 7 天，支持刷新

### 4.4 分页约定

```
GET /api/notices?page=1&size=20&sort=latest
```

响应：
```json
{
  "total": 1234,
  "items": [...]
}
```

### 4.5 筛选约定

前端筛选参数直接作为 query params 传递：

```
GET /api/notices?type=summer_camp&province=北京&school_level=985&keyword=计算机
```

### 4.6 CORS 配置

开发环境允许 `http://localhost:3000`（Next.js dev server）跨域访问。

---

## 五、开发环境配置

### 5.1 环境变量 (.env)

```env
# 数据库
DATABASE_URL=sqlite+aiosqlite:///./crawl/data/large_scale_test.db
# DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/yantu

# JWT
JWT_SECRET_KEY=your-secret-key-change-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRE_DAYS=7

# AI
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o

# Redis（可选）
REDIS_URL=redis://localhost:6379/0

# CORS
CORS_ORIGINS=http://localhost:3000
```

### 5.2 启动命令

```bash
# 安装依赖
cd backend && pip install -e ".[dev]"

# 启动开发服务器
uvicorn src.main:app --reload --port 8000

# 运行测试
pytest tests/ -v
```

---

## 六、与爬虫系统的关系

```
crawl/                          backend/
├── src/models/                 ├── src/models/
│   ├── university.py  ←──共享──→  │   ├── university.py
│   ├── notice.py      ←──共享──→  │   ├── notice.py
│   └── base.py        ←──共享──→  │   └── base.py
├── data/
│   └── large_scale_test.db ←── backend 开发阶段直接读取
```

- **Phase 1 开发阶段**：后端直接连接爬虫的 SQLite 数据库（只读查询）
- **生产环境**：迁移到 PostgreSQL，爬虫写入 → 后端读取
- 数据模型文件可以通过 symlink 或 Python package 共享，避免重复定义
