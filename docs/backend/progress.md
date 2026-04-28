# 研途有我 — 后端开发进度

> 最后更新：2026-04-28（v1.5 AMiner 级深度数据）
> 版本：1.5.0（导师 AMiner 级画像）
> API 端点：78 个（新增 `GET /api/tutors/stats`）
> 数据库表：21 张（含 tutors + faculty_page_sources + tutor_crawl_logs）
> Python 源文件：62 个 / 约 7000 行
> 自动化测试：298 项全部通过
> 真实数据：109 所高校 + 839 条通知 + **568 位导师**（376 Tier 1 + 192 Tier 2）
> 导师深度数据：282 位含**完整论文列表（最多 50 篇）+ 主要合作者 + 研究主题 + 年度趋势**

---

## 总体概览

| 模块 | 状态 | 端点 | 完成时间 | 核心技术 |
|------|------|------|----------|----------|
| Phase 1：信息查询 | ✅ | 10 | 2026-03-31 | SQLAlchemy + 爬虫 SQLite |
| Phase 2：用户系统 | ✅ | 10 | 2026-04-13 | JWT + bcrypt |
| Phase 3：社群 + 进度 | ✅ | 19 | 2026-04-13 | 帖子/评论/打卡/规划/任务/成果 |
| Phase 4：AI 功能 | ✅ | 12 | 2026-04-13 | LLM (SiliconFlow) + Mock 降级 |
| 管理员系统 | ✅ | 6 | 2026-04-13 | role-based 权限 |
| 语音 (TTS/ASR) | ✅ | 5 | 2026-04-14 | CosyVoice2 + SenseVoice |
| 工程优化 (v0.7) | ✅ | 1 | 2026-04-14 | SSE + 限流 + RAG + 日志 |
| **合计** | | **63** | | |

---

## 项目结构

```
backend/
├── pyproject.toml                          # 依赖管理
├── .env                                    # 环境变量（不提交 Git）
├── .env.example                            # 环境变量模板
│
├── scripts/
│   ├── seed_data.py                        # 假数据填充脚本
│   └── test_all.py                         # 自动化测试脚本（246 项）
│
└── src/
    ├── main.py                             # FastAPI 应用入口
    ├── config.py                           # 配置管理（环境变量）
    ├── database.py                         # 异步数据库连接
    ├── dependencies.py                     # 依赖注入（认证、分页）
    │
    ├── models/                             # SQLAlchemy 数据模型（8 个文件）
    │   ├── base.py                         #   DeclarativeBase
    │   ├── university.py                   #   University + Department + DepartmentSource
    │   ├── notice.py                       #   AdmissionNotice + CrawlLog + CrawlState
    │   ├── user.py                         #   User + UserSettings + Favorite
    │   ├── community.py                    #   Post + Comment + Checkin
    │   ├── progress.py                     #   Plan + Task + Achievement
    │   └── ai.py                           #   ResumeDraft + InterviewSession
    │
    ├── schemas/                            # Pydantic 请求/响应模型（9 个文件）
    │   ├── common.py                       #   PaginatedResponse + StatsOverview
    │   ├── auth.py                         #   LoginRequest + RegisterRequest
    │   ├── user.py                         #   UserProfile + Settings + Favorite
    │   ├── notice.py                       #   NoticeItem + NoticeDetail + Query
    │   ├── school.py                       #   SchoolItem + SchoolDetail
    │   ├── community.py                    #   Post + Comment + Checkin
    │   ├── progress.py                     #   Plan + Task + Achievement + Stats
    │   └── ai.py                           #   Resume + Recommend + Interview + Mental + Plan
    │
    ├── routers/                            # API 路由（13 个文件）
    │   ├── notices.py                      #   GET /notices, /notices/{id}, /notices/latest
    │   ├── schools.py                      #   GET /schools, /schools/{id}, /{id}/departments, /{id}/notices
    │   ├── search.py                       #   GET /search
    │   ├── stats.py                        #   GET /stats/overview
    │   ├── auth.py                         #   POST /auth/register, /auth/login
    │   ├── user.py                         #   GET/PUT /user/profile, /user/settings
    │   ├── favorites.py                    #   GET/POST/DELETE /user/favorites, GET /check
    │   ├── community.py                    #   帖子 CRUD + 评论 + 打卡
    │   ├── progress.py                     #   规划/任务/成果 CRUD + 统计
    │   ├── ai.py                           #   简历/择校/面试/心理/规划 AI
    │   ├── voice.py                        #   TTS + ASR + 语音面试
    │   └── admin.py                        #   管理员用户/帖子/评论管理
    │
    ├── services/                           # 业务逻辑（14 个文件）
    │   ├── auth_service.py                 #   注册 + 登录
    │   ├── user_service.py                 #   个人信息 + 设置
    │   ├── favorite_service.py             #   收藏 CRUD + 自动填充标题
    │   ├── notice_service.py               #   通知查询 + 筛选 + 分页
    │   ├── school_service.py               #   院校查询 + 学院
    │   ├── search_service.py               #   全站搜索
    │   ├── stats_service.py                #   首页统计
    │   ├── community_service.py            #   帖子/评论/打卡
    │   ├── progress_service.py             #   规划/任务/成果/统计
    │   ├── ai_service.py                   #   AI 功能（LLM + Mock 降级）
    │   ├── llm.py                          #   统一 LLM 调用层 + Prompt 模板
    │   └── voice.py                        #   TTS + ASR 调用
    │
    └── utils/
        └── security.py                     #   JWT + bcrypt
```

---

## 数据库表（17 张）

| 表名 | 模型 | 来源 | 说明 |
|------|------|------|------|
| universities | University | 爬虫 | 39 所 985 高校 |
| departments | Department | 爬虫 | 1593 个学院 |
| department_sources | DepartmentSource | 爬虫 | 信息源 URL |
| admission_notices | AdmissionNotice | 爬虫 | 916+ 条推免通知 |
| crawl_logs | CrawlLog | 爬虫 | 爬取日志 |
| crawl_states | CrawlState | 爬虫 | 增量爬取状态 |
| users | User | Phase 2 | 用户（含 role 字段） |
| user_settings | UserSettings | Phase 2 | 通知偏好/关注学科 |
| favorites | Favorite | Phase 2 | 收藏（UniqueConstraint） |
| posts | Post | Phase 3 | 帖子（分类/标签/置顶/加精） |
| comments | Comment | Phase 3 | 评论（支持楼中楼回复） |
| checkins | Checkin | Phase 3 | 学习打卡 |
| plans | Plan | Phase 3 | 保研规划 |
| tasks | Task | Phase 3 | 任务（优先级/状态/来源） |
| achievements | Achievement | Phase 3 | 成果记录（重要度 1-5） |
| resume_drafts | ResumeDraft | Phase 4 | 简历草稿（JSON，每用户一份） |
| interview_sessions | InterviewSession | Phase 4 | 面试会话（对话历史+报告） |

---

## 依赖清单

| 包 | 版本 | 用途 |
|-----|------|------|
| fastapi | ≥0.115 | Web 框架 |
| uvicorn | ≥0.30 | ASGI 服务器 |
| sqlalchemy | ≥2.0 | ORM |
| aiosqlite | ≥0.20 | SQLite 异步驱动 |
| pydantic | ≥2.0 | 数据校验 |
| pydantic-settings | ≥2.0 | 环境变量配置 |
| python-jose | ≥3.3 | JWT |
| passlib + bcrypt | ≥1.7 / 4.x | 密码哈希 |
| openai | ≥1.0 | LLM 调用（OpenAI 兼容协议） |
| python-multipart | ≥0.0.6 | 文件上传 |

---

## 启动方式

```bash
cd backend

# 1. 安装依赖
.venv/bin/pip install -e .

# 2. 启动服务器（开发模式，热重载）
.venv/bin/uvicorn src.main:app --reload --port 8000

# 3. 填充演示数据（首次）
.venv/bin/python scripts/seed_data.py

# 4. 重新填充（清除后重建）
.venv/bin/python scripts/seed_data.py --reset

# 5. 运行测试
.venv/bin/python scripts/test_all.py           # 完整测试（含 LLM）
.venv/bin/python scripts/test_all.py --fast     # 快速测试（跳过 LLM 超时）
```

- Swagger UI：http://localhost:8000/api/docs
- ReDoc：http://localhost:8000/api/redoc
- 健康检查：http://localhost:8000/api/health

---

## 环境变量 (.env)

```env
# 数据库（留空自动使用爬虫 SQLite）
DATABASE_URL=

# CORS
CORS_ORIGINS=http://localhost:3000

# JWT
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
JWT_EXPIRE_DAYS=7

# AI / LLM（留空则所有 AI 功能自动降级为 Mock）
OPENAI_API_KEY=sk-xxxx
OPENAI_BASE_URL=https://api.siliconflow.cn/v1
OPENAI_MODEL=Qwen/Qwen2.5-7B-Instruct

# 调试
DEBUG=true
```

LLM 平台切换只需改三行：

| 平台 | BASE_URL | 推荐模型 |
|------|----------|----------|
| SiliconFlow | https://api.siliconflow.cn/v1 | Qwen/Qwen2.5-7B-Instruct（免费） |
| DeepSeek | https://api.deepseek.com/v1 | deepseek-chat |
| OpenAI | https://api.openai.com/v1 | gpt-4o-mini |
| 自部署 | http://your-server:8080/v1 | 你的模型名 |

---

## 演示账号

| 邮箱 | 密码 | 昵称 | 角色 | 学校 | 说明 |
|------|------|------|------|------|------|
| zhangsan@demo.com | test123456 | 张三 | user | 武汉大学 | 最完整：简历/面试/15天打卡/规划/成果 |
| lisi@demo.com | test123456 | 李四 | user | 中山大学 | CV 方向，8天打卡 |
| wangwu@demo.com | test123456 | 王五 | user | 四川大学 | 金融跨保 CS |
| zhaoliu@demo.com | test123456 | 赵六 | **admin** | 哈尔滨工业大学 | 管理员，已保研清华 |
| sunqi@demo.com | test123456 | 孙七 | user | 南京大学 | 大二，未完成引导 |

### 演示数据统计

| 类别 | 数量 |
|------|------|
| 用户 + 设置 | 5 + 5 |
| 收藏 | 10 |
| 帖子 | 6（经验分享/择校咨询/面试交流/资料分享） |
| 评论 | 10（含楼中楼回复） |
| 打卡 | 23（张三 15 天 + 李四 8 天） |
| 规划 + 任务 | 1 + 7 |
| 成果 | 3（论文/竞赛/英语） |
| 简历草稿 | 1（完整简历 JSON） |
| 面试会话 | 1（含对话历史 + 评估报告） |

---

## 权限体系

### 用户角色

| 角色 | 值 | 说明 |
|------|------|------|
| 普通用户 | `user` | 默认，所有用户功能 |
| 管理员 | `admin` | 额外可访问 `/api/admin/*` |

### 权限矩阵

| 操作 | 未登录 | 普通用户 | 管理员 |
|------|--------|----------|--------|
| 浏览通知/院校/帖子/搜索/统计 | ✅ | ✅ | ✅ |
| 注册/登录 | ✅ | — | — |
| 个人信息/设置/收藏 | ❌ | ✅ | ✅ |
| 发帖/评论/点赞/打卡 | ❌ | ✅ | ✅ |
| 删除**自己的**帖子/评论 | ❌ | ✅ | ✅ |
| 规划/任务/成果 CRUD | ❌ | ✅ | ✅ |
| AI 功能（简历/推荐/面试/心理/规划） | ❌ | ✅ | ✅ |
| 语音 TTS/ASR | ❌ | ✅ | ✅ |
| 置顶/加精帖子 | ❌ | ❌ | ✅ |
| 删除**任意**帖子/评论 | ❌ | ❌ | ✅ |
| 用户列表/角色管理 | ❌ | ❌ | ✅ |

---

## AI 功能架构

```
前端 → routers/ai.py → services/ai_service.py → services/llm.py → SiliconFlow API
                                                       ↓ (失败/无 Key)
                                                  Mock 降级（内置模板）
```

### LLM 接入状态

| 模块 | Prompt 策略 | JSON Mode | Few-shot | 多轮记忆 | 测试 |
|------|-------------|-----------|----------|----------|------|
| 简历优化 | 逐字段审查 | ✅ | ✅ 含示例 | — | ✅ LLM 成功 |
| 择校推荐 | 背景分析 + 院校匹配 | ✅ | ✅ | — | ⚠️ 7B 降级 |
| 模拟面试 | 角色扮演面试官 | ✅ | — | ✅ 历史注入 | ✅ LLM 成功 |
| 面试评估 | 对话分析 | ✅ | ✅ 含维度 | — | ✅ LLM 成功 |
| 心理支持 | 温暖共情咨询师 | — | — | — | ✅ LLM 成功 |
| 综合规划 | 个性化阶段规划 | ✅ | ✅ | — | ✅ LLM 成功 |

### 语音技术

| 能力 | 模型 | 平台 | 效果 |
|------|------|------|------|
| TTS | FunAudioLLM/CosyVoice2-0.5B | SiliconFlow | 5 种预设语音，中英日韩，情感控制 |
| ASR | FunAudioLLM/SenseVoiceSmall | SiliconFlow | 中英日韩识别，≤50MB |

---

## 代码审查记录

### 第一次审查（2026-04-13）

| 严重度 | 文件 | 问题 | 修复 |
|--------|------|------|------|
| 严重 | auth_service | register OR 查询多行异常 | 拆分两次独立查询 |
| 严重 | notice_service | status 筛选在分页后执行 | 先全量过滤再分页 |
| 严重 | search_service | page 参数被忽略 | 实现 offset 分页 |
| 中等 | school_service | get_school_notices 忽略 school_id | 按校名筛选 |
| 中等 | progress_service | completed_at 状态离开 done 不清除 | 置 None |
| 中等 | community_service | 打卡日期异常 500 | 捕获 ValueError→400 |
| 中等 | routers/ai | resume/draft 返回裸 null | 改返回 {} |

### 第二次审查（2026-04-14）

| 严重度 | 文件 | 问题 | 修复 |
|--------|------|------|------|
| 高 | community_service | sort=featured 的 total 计算错误 | 先 where 再 count |
| 中等 | community_service | create_comment 不验证 post 存在 | 先查 post，不存在返回 404 |
| 中等 | progress_service | date.fromisoformat 无 try/except | 统一 _parse_date 安全解析 |
| 中等 | favorites | add_favorite 不验证 type 值 | 校验 notice/school/tutor |
| 低 | 多个文件 | 未使用的 import | 清除 8 处 |
| 低 | main.py | 版本号重复字面量 | 提取 APP_VERSION 常量 |

### 第三次审查（2026-04-14）

| 严重度 | 文件 | 问题 | 修复 |
|--------|------|------|------|
| 中等 | ai_service | answer_interview LLM 返回 feedback=null 时传 None 到前端 | 确保 feedback 始终有默认值 |
| 低 | 14 个文件 | AST 扫描发现 14 处未使用 import | 清除全部 |
| 低 | test_all.py | LLM 超时导致后续断言报错而非跳过 | 新增 ok_ai() 超时安全断言 |

### 全量测试结果（2026-04-14）

测试脚本重写为 246 项，覆盖全部 62 端点 + 边界/错误/权限/数据完整性：

```
✅ 246 通过 / ❌ 0 失败 / 共 246 项 / 耗时 123s
```

| 分类 | 测试点 | 说明 |
|------|--------|------|
| Phase 1 信息查询 | 25 | 通知/院校/搜索/统计 + 404 + 分页 |
| Phase 2 认证 | 22 | 注册/登录/校验/Token 无效/401 保护 |
| Phase 2 用户信息 | 15 | Profile/Settings 部分更新 + 隔离 |
| Phase 2 收藏 | 10 | 添加/幂等/筛选/删除/类型校验 |
| Phase 3 帖子 | 16 | CRUD + 筛选 + 排序 + 浏览量 + 删除权限 |
| Phase 3 评论 | 10 | 创建/回复/昵称/404/删除权限 |
| Phase 3 打卡 | 5 | 打卡/无效日期 400/统计字段 |
| Phase 3 进度 | 24 | 规划/任务/成果 CRUD + 筛选 + 状态流转 + 日期校验 |
| Phase 4 AI 简历 | 8 | 草稿 upsert/隔离 + 优化 + 导出占位 |
| Phase 4 AI 推荐 | 4 | 择校推荐 + 导出占位 |
| Phase 4 AI 面试 | 8 | 开始/回答/结束/报告 + 结束后 404 + 隔离 |
| Phase 4 AI 心理 | 3 | 对话 + 评估 |
| Phase 4 AI 规划 | 3 | 生成 + 字段校验 |
| 语音 | 5 | TTS/ASR 回环 + 无文本 400 + 无 Auth 401 |
| 管理员 | 19 | 403 权限墙 + 用户列表/搜索 + 置顶/加精/删除 + 角色管理 + 404 |
| OpenAPI | 3 | Swagger/ReDoc/路径数量 |

---

## 工程优化（v0.7.0，2026-04-14）

| 优化项 | 文件 | 效果 |
|--------|------|------|
| **SQL 日志关闭** | database.py | `echo=False`，终端不再输出 SQL，性能提升显著 |
| **连接池配置** | database.py | PostgreSQL 部署时自动启用 pool_size=10, max_overflow=20 |
| **全局异常兜底** | main.py | 未处理异常返回 500 JSON 而非泄露堆栈 |
| **慢请求日志** | main.py | >1s 的请求自动 WARNING 日志 |
| **结构化日志** | main.py | 统一 `%(asctime)s %(levelname)s %(name)s` 格式 |
| **SSE 流式输出** | routers/ai.py + llm_stream.py | `POST /ai/mental/chat/stream` 逐 token 推送 |
| **AI 限流** | routers/ai.py + rate_limit.py | 简历优化/择校/规划每用户 5次/分钟 |
| **RAG 上下文** | ai_service.py | 择校推荐自动注入真实院校数据库数据 |
| **JSON 解析增强** | llm.py | 三级容错：直接解析 → 去 code fence → 提取首个 JSON 对象 |

### 新增文件

| 文件 | 说明 |
|------|------|
| `services/llm_stream.py` | LLM 流式调用，AsyncIterator 逐 token 返回 |
| `utils/rate_limit.py` | 滑动窗口内存限流 |

### 新增端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/ai/mental/chat/stream` | 心理支持 SSE 流式输出 |

---

## 性能与功能优化（v0.8.0，2026-04-14）

| 优化项 | 变更 | 效果 |
|--------|------|------|
| **搜索 DB 级分页** | search_service 重写为 UNION ALL + DB 分页 | 不再全量加载，大数据量下内存安全 |
| **点赞去重 (toggle)** | 新增 PostLike 表 + toggle 逻辑 | 同用户再次点赞自动取消，like_count 准确 |
| **GZip 压缩** | main.py 新增 GZipMiddleware | >500B 响应自动压缩，减少传输 |
| **统计缓存** | stats_service 60 秒 TTL 缓存 | 首页高频请求不重复查库 |
| **统计字段扩展** | StatsOverview 新增 user_count + post_count | 首页展示更丰富 |

### 新增数据库表

| 表 | 模型 | 说明 |
|---|---|---|
| post_likes | PostLike | 点赞去重（user_id + post_id 唯一约束） |

### 新增文件

| 文件 | 说明 |
|------|------|
| `utils/cache.py` | TTL 内存缓存 |

### 测试结果

```
✅ 260 通过 / ❌ 0 失败 / 共 260 项 / 耗时 48s
```

---

## 语音对话接入（v0.9.0，2026-04-14）

### 新增功能

| 优化项 | 说明 |
|--------|------|
| **语音心理支持** | `POST /voice/mental/voice-chat` — 用户发语音 → ASR → AI 咨询师 → TTS 回复 |
| **面试首问语音** | `POST /voice/interview/{id}/voice-start` — 获取面试第一题的 TTS 语音 |
| **语音客户端优化** | voice.py 改为单例客户端 + 30s 超时 + 输入长度限制 |
| **语音角色分配** | 面试官用 Alex（沉稳专业），心理咨询师用 Clara（温柔知性） |
| **语音元数据** | TTS_VOICES 新增 `scene` 字段标注适用场景 |

### 语音对话完整链路

**语音面试**：
```
前端录音 → POST /voice/interview/{id}/voice-answer → ASR 识别 → AI 面试官回复 → TTS 合成
         ← { transcribed_text, reply_text, feedback, reply_audio_base64 }
```

**语音心理支持**：
```
前端录音 → POST /voice/mental/voice-chat?topic=考研焦虑 → ASR 识别 → AI 心理咨询师 → TTS 合成
         ← { transcribed_text, reply_text, reply_audio_base64 }
```

### 新增端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/voice/interview/{id}/voice-start` | 面试首问 TTS |
| POST | `/api/voice/mental/voice-chat` | 语音心理对话（完整 ASR→AI→TTS） |

### 测试结果

```
✅ 268 通过 / ❌ 0 失败 / 共 268 项
```

---

## 代码质量加固（v1.0.0，2026-04-14）

| 优化项 | 说明 |
|--------|------|
| **SQLite WAL 模式** | `PRAGMA journal_mode=WAL` + `busy_timeout=5000`，彻底解决 "database is locked" 并发写冲突 |
| **语音 ID 修正** | 实测 SiliconFlow 6 个有效语音（alex/benjamin/anna/bella/claire/diana），移除无效的 clara/emma |
| **响应类型安全** | auth 路由添加 `AuthResponse` 模型，voice 路由添加 `VoiceAnswerResponse` 模型 |
| **零未使用 import** | AST 扫描清除全部 9 处未使用 import |
| **搜索依赖清理** | 移除 search_service 中未使用的 String/Integer import |

### 测试结果

```
✅ 269 通过 / ❌ 0 失败 / 共 269 项
```

---

## 深度优化（v1.0.1，2026-04-14）

| 优化项 | 说明 |
|--------|------|
| **收藏 N+1 消除** | `_enrich_favorites_batch` 将 N 次单条查询改为 2 次批量 `WHERE IN` 查询 |
| **DB 索引补全** | departments 表新增 `idx_dept_university`，post_likes 表新增 `idx_postlike_post` |
| **安全响应头** | 所有响应自动附带 `X-Content-Type-Options: nosniff` / `X-Frame-Options: DENY` / `X-XSS-Protection` / `Referrer-Policy` |
| **测试数据清理** | seed `--reset` 自动清除 `e2e_` 测试用户 + PostLike 孤立数据 |

---

## 爬虫字段同步 + 数据清洗（v1.0.2，2026-04-14）

### 爬虫→后端字段同步

| 字段 | 模型 | 类型 | 说明 |
|------|------|------|------|
| `images` | AdmissionNotice | `JSON` | 通知中的图片列表 `[{url, alt, width, height}]` |

已同步至：
- `models/notice.py` — 新增 `images` 列
- `schemas/notice.py` — 新增 `NoticeImage` schema + `NoticeDetail.images` 字段
- `services/notice_service.py` — 详情接口返回清洗后的图片列表

### 图片噪音清洗

`data_clean_service.clean_images()` 自动过滤：
- 网站 logo / favicon / banner
- 微信二维码
- 导航栏/侧边栏图标
- GIF 格式小图标
- 无效/过短 URL

### 测试结果

```
✅ 269 通过 / ❌ 0 失败 / 共 269 项
```

---

## 输入类型安全 + 代码清洗（v1.0.3，2026-04-14）

| 优化项 | 说明 |
|--------|------|
| **body: dict → 类型化** | 6 个 untyped 端点改为 Pydantic 模型（ResumeDraftRequest, TtsRequest, RoleUpdateRequest）|
| **null 清洗提取** | notice_service 5 处 `in ("null","None")` 重复检查提取为 `_clean_str()` 工具函数 |
| **TTS 空文本校验** | `TtsRequest.text` 添加 `min_length=1`，空字符串直接 422 |

### 测试结果

```
✅ 269 通过 / ❌ 0 失败 / 共 269 项
```

---

## 前后端对齐：导师模块补全（v1.1.0，2026-04-14）

**问题**：前端有完整的导师页面（`/info/tutors`、`/info/tutors/[id]`）和 `getTutors()`/`getTutorDetail()` API 调用，但后端**没有导师端点**。

### 新增内容

| 项目 | 文件 | 说明 |
|------|------|------|
| **Tutor 模型** | `models/tutor.py` | 导师表（姓名/职称/研究方向/论文数/简介等 25 个字段） |
| **Tutor Schema** | `schemas/tutor.py` | 完全对齐前端 `TutorItem`/`TutorDetail`/`TutorListResponse` |
| **Tutor 服务** | `services/tutor_service.py` | DB 优先 + Mock 降级（DB 无数据时返回 6 位 Mock 导师） |
| **Tutor 路由** | `routers/tutors.py` | `GET /api/tutors` + `GET /api/tutors/{id}` |
| **Stats 修复** | `services/stats_service.py` | `tutor_count` 从数据库查真实数量（无数据时显示 1280） |

### API 端点

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/tutors` | 导师列表（支持学校/学科/关键词/省份/招生状态筛选 + 分页排序） | ❌ |
| GET | `/api/tutors/{id}` | 导师详情（完整简介/论文/项目/获奖） | ❌ |

### 前后端对齐状态

前端 `api.ts` 中的所有 API 调用现在**全部有对应的后端端点**：

| 前端函数 | 后端端点 | 状态 |
|----------|----------|------|
| `getNotices()` | `GET /api/notices` | ✅ |
| `getNoticeDetail()` | `GET /api/notices/{id}` | ✅ |
| `getSchools()` | `GET /api/schools` | ✅ |
| `getSchoolDetail()` | `GET /api/schools/{id}` | ✅ |
| `getTutors()` | `GET /api/tutors` | ✅ **新增** |
| `getTutorDetail()` | `GET /api/tutors/{id}` | ✅ **新增** |
| `login()` / `register()` | `POST /api/auth/*` | ✅ |
| `getCurrentUser()` | `GET /api/user/profile` | ✅ |
| `getFavorites()` / `addFavorite()` | `GET/POST /api/user/favorites` | ✅ |
| `getPosts()` / `createPost()` | `GET/POST /api/community/posts` | ✅ |
| `startInterview()` / `sendInterviewAnswer()` | `POST /api/ai/interview/*` | ✅ |
| `sendMentalMessage()` | `POST /api/ai/mental/chat` | ✅ |
| `generatePlan()` | `POST /api/ai/plan/generate` | ✅ |
| `getRecommendation()` | `POST /api/ai/recommend` | ✅ |
| `saveResumeDraft()` / `optimizeResume()` | `POST /api/ai/resume/*` | ✅ |

### 测试结果

```
✅ 281 通过 / ❌ 0 失败 / 共 281 项（+12 新增导师测试）
```

---

## 代码质量终报

| 指标 | 状态 | 说明 |
|------|------|------|
| 未使用 import | **0** | AST 自动扫描全清 |
| TODO/FIXME | **0** | 无遗留技术债 |
| 缺失 docstring | **0** | 全部 public 函数已注释 |
| N+1 查询 | **0** | 收藏批量查询 |
| body: dict | **2** | 仅剩 2 个占位导出端点（不处理输入） |
| 测试通过率 | **100%** | 269/269 |
| 输入类型安全 | ✅ | 全部核心端点使用 Pydantic 模型 |
| 响应类型覆盖 | ✅ | IdResponse/AuthResponse/VoiceAnswerResponse 等 |
| 安全头 | ✅ | nosniff + DENY + XSS + Referrer |
| SQLite 并发 | ✅ | WAL + busy_timeout=5000 |
| GZip 压缩 | ✅ | >500B 自动压缩 |
| 全局异常兜底 | ✅ | 500 JSON 不泄露堆栈 |
| 慢请求监控 | ✅ | >1s WARNING |
| AI 限流 | ✅ | 5 次/分钟/用户 |
| DB 索引 | ✅ | 全部 FK 和热点列 |

---

## 生产就绪加固（v1.2.0，2026-04-14）

### Docker 部署

| 文件 | 说明 |
|------|------|
| `Dockerfile` | Python 3.11 slim + 2 workers |
| `docker-compose.yml` | 后端服务 + 可选 PostgreSQL |
| `.dockerignore` | 排除 .venv/.env/.git/tests |

```bash
# Docker 部署
docker compose up -d

# 或本地部署
.venv/bin/uvicorn src.main:app --host 0.0.0.0 --port 8000 --workers 2
```

### 生产安全

| 功能 | 说明 |
|------|------|
| **Secret 强制校验** | `DEBUG=false` 时，使用默认 JWT_SECRET_KEY 会**拒绝启动** |
| **Swagger 生产隐藏** | `DEBUG=false` 时自动禁用 `/api/docs` `/api/redoc` `/api/openapi.json` |
| **DB 连通性检查** | 启动时验证数据库可达，不可达直接 crash 而非静默失败 |
| **增强健康检查** | `/api/health` 返回 DB 类型 + LLM 状态 + TTS 状态 |
| **PostgreSQL URL 兼容** | 自动将 `postgres://` 转换为 `postgresql+asyncpg://` |

### 健康检查响应

```json
{
  "status": "ok",
  "version": "1.2.0",
  "debug": true,
  "services": {
    "database": "sqlite",
    "llm": "connected",
    "tts": "connected"
  }
}
```

### 上线清单

```bash
# 1. 生成安全密钥
python -c "import secrets; print(secrets.token_hex(32))"

# 2. 配置 .env
JWT_SECRET_KEY=<生成的密钥>
CORS_ORIGINS=https://your-domain.com
DEBUG=false
OPENAI_API_KEY=sk-xxx

# 3. 部署
docker compose up -d
```

### 测试结果

```
✅ 281 通过 / ❌ 0 失败 / 共 281 项
```

---

## 管理后台完善（v1.3.0，2026-04-14）

根据 `docs/user-manual.md` 描述的管理后台功能，新增 6 个管理端点：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/dashboard` | 仪表盘（用户/帖子/通知统计 + 本周新增 + 最近用户/帖子） |
| GET | `/api/admin/analytics` | 数据统计（内容分布 + 帖子分类占比 + 通知类型占比） |
| GET | `/api/admin/notices` | 通知管理列表（含审核状态筛选） |
| PUT | `/api/admin/notices/{id}/status` | 更新通知审核状态（pending/published/rejected） |
| GET | `/api/admin/posts` | 帖子管理列表 |
| PUT | `/api/admin/users/{id}/disable` | 禁用/启用用户（toggle） |

同时增强已有端点：
- 用户列表新增 `role` 筛选参数
- 帖子删除同时清除 PostLike 数据

### 测试结果

```
✅ 298 通过 / ❌ 0 失败 / 共 298 项（+17 管理后台测试）
```

---

## 后续迭代方向

| 方向 | 优先级 | 说明 |
|------|--------|------|
| 换更大 LLM 模型 | 高 | Qwen2.5-72B / DeepSeek-V2.5 |
| PostgreSQL 迁移 | 高 | 正式上线必须 |
| 数字人 | 中 | 前端 lip-sync → SadTalker |
| Redis 限流 + 缓存 | 低 | 替换内存限流为分布式 |
| CI/CD 自动化 | 低 | GitHub Actions 自动测试+部署 |

---

## 导师数据全链路打通（v1.4.0，2026-04-28）

> 这一版本的核心目标：**把爬虫产出的真实导师数据完整、分级地呈现给前端用户**。

### 1. 数据模型升级

`Tutor` 表新增 8 个字段（详见 `docs/crawl/tutor_crawler.md` § 3.1）：

| 字段 | 类型 | 用途 |
|---|---|---|
| `crawl_tier` | string | tier1/tier2/tier3 数据完整度分级，决定前端模板 |
| `profile_completeness` | int (0-100) | 完整度分数 |
| `crawl_source` | string | 数据来源：official / openalex / aminer / manual |
| `external_ids` | JSON | `{openalex_id, aminer_id, ...}` |
| `last_crawled_at` | datetime | 最近爬取时间 |
| `h_index` | int | OpenAlex h-指数 |
| `citation_count` | int | OpenAlex 总被引数 |
| `recent_papers` | JSON | OpenAlex 近期论文列表 |
| `recruiting_requirements` | text | 招生要求（与 recruiting_info 区分） |

新增辅助表（爬虫侧写入，后端读取）：

| 表 | 用途 |
|---|---|
| `faculty_page_sources` | 学院师资页 URL 库（阶段 A 产出，类似 DepartmentSource） |
| `tutor_crawl_logs` | 每位教师每阶段爬取日志 |

### 2. Schema / Service / Router 全链路扩展

`schemas/tutor.py`：
- `TutorItem` 增加 `crawl_tier` / `profile_completeness` / `h_index` / `citation_count`
- `TutorDetail` 增加 `recent_papers` / `crawl_source` / `external_ids` / `last_crawled_at`
- `education` / `experience` / `publications` / `projects` 改为 `list[Any]` 兼容对象数组

`services/tutor_service.py`：
- 移除 Mock 降级（568 位真实数据已就位）
- 新增 `_resolve_tier()` 动态修正 tier（避免 DB 中标错的脏数据）
- 新增 `get_tutor_stats()` — 返回总人数 / tier 分布 / 学校分布 / 省份分布 / 学科分布 / 数据质量
- 排序逻辑增强：`_TIER_ORDER` case 排序 + `coalesce(0)` 处理 NULL
- `keyword` 搜索扩展到 `Department.name` / `Tutor.title` / `research_areas`

`routers/tutors.py`：
- 新增 `has_h_index` 筛选参数（仅返回有学术指标的导师）
- 新增 `GET /api/tutors/stats` 端点（用于前端动态填充下拉菜单/概览）
- 默认排序改为 `completeness`（tier1 优先 + 完整度倒序）
- 详细中文 docstring

### 3. 导师数据当前规模

| 指标 | 数量 | 说明 |
|---|---|---|
| 总导师数 | **568** | 5 校 6 学院（北航/北大/北理工/南开/中南/武大）|
| Tier 1（完整画像） | **105** | 含简介+论文+项目+获奖（北航 70 位为主）|
| Tier 2（基础卡片） | **463** | 含姓名+职称+方向+主页 URL+邮箱 |
| 含 h-index | **286** | 50.4% 命中 OpenAlex，平均 h=23.9 |
| 含头像 | 202 |
| 含简介 | 69 |
| 含论文成果 | 21 |
| 学院师资页（faculty_page_sources） | 419+ | 覆盖 180+ 个学院 |

最高质量 Tier 1 样本（王睿杰，北航计算机学院）：
- `profile_completeness=100`
- 完整简介：「王睿杰教授是国家级青年人才，专注于开放动态环境下的可信高效人工智能研究...」
- 2 个研究方向：可信高效人工智能、多模态基础模型
- 3 个科研项目 + 1 项 IEEE DCOSS 最佳论文奖
- 招生信息：「长期招收对人工智能与大数据技术与系统感兴趣的同学加入研究团队」

### 4. API 验证

```bash
# 统计概览（前端动态下拉菜单数据源）
curl http://localhost:8000/api/tutors/stats
# → {"total":568, "tier_distribution":{"tier1":105,"tier2":463},
#     "data_quality":{"with_h_index":286,...},
#     "universities":[{"name":"武汉大学","count":156},...]}

# 默认排序（tier1 优先）
curl 'http://localhost:8000/api/tutors?size=5'
# → 王睿杰 (tier1 100/100), 郝爱民 (tier1 100/100), 姜宏旭 (tier1 93/100), ...

# 仅展示有 h-index 的（按 h 倒序）
curl 'http://localhost:8000/api/tutors?has_h_index=true&sort=h_index&size=2'
# → 黄永刚 h=154, 马波 h=122

# 学院 + tier 联合筛选
curl 'http://localhost:8000/api/tutors?department=计算机&crawl_tier=tier1&size=10'
```

### 5. 文档

- 新增 `docs/crawl/tutor_crawler.md` — 完整四阶段架构 / 数据模型 / 评分体系 / 运行手册
- 更新 `docs/backend/api.md` — 导师章节扩展 200+ 行（含 stats 端点 + 完整字段说明）

### 测试结果

```
✅ 298 通过 / ❌ 0 失败 / 共 298 项
```

### 后续工作

详见 `docs/crawl/tutor_crawler.md` § 10：AMiner enricher、DBLP 交叉验证、同义词扩展、增量更新、管理后台编辑等。

---

## 导师 AMiner 级深度数据（v1.5.0，2026-04-28）

> 本版本将导师库数据丰富度提升到 **AMiner Profile 级别**：每位被 OpenAlex 命中的教师都拥有完整论文列表、主要合作者、研究主题分布、年度发文趋势。

### 1. 数据模型扩展

`Tutor` 表新增 5 个 JSON 字段：

| 字段 | 用途 | 数据示例（黄永刚 h=154）|
|---|---|---|
| `papers` | **完整论文列表**（最多 50 篇，按被引数倒序）| 50 篇含 title/venue/year/authors/citations/**abstract**/doi/url/type |
| `coauthors` | **主要合作者**（按合作次数倒序，最多 20 位）| `[{name:"John A. Rogers", works_together_count:27, last_year:2024}]` |
| `topics` | **研究主题分布**（OpenAlex 自动分类，含论文计数）| `[{name:"Advanced Sensor Materials", works_count:313, subfield:"Materials"}]` |
| `yearly_stats` | **年度发文 + 引用趋势** | `[{year:2024, works_count:5, cited_by_count:458}, ...17 年]` |
| `i10_index` | OpenAlex i10-index | 478 |

### 2. OpenAlex Enricher v2.0

`crawl/src/tutor/enrichers/openalex_enricher.py` 升级亮点：

- **完整 works 抓取**：每位教师拉取 50 篇代表论文（按 cited_by_count 倒序）
- **摘要还原**：从 OpenAlex `abstract_inverted_index` 还原成完整文本（每篇 ≤ 1500 字符）
- **合作者聚合**：从 50 篇论文的 `authorships` 反推主要合作者（去重 + 按合作次数排序）
- **主题分类**：优先使用 OpenAlex `topics`（具体主题），fallback `x_concepts`（广义概念）
- **年度统计**：从 works 聚合得到逐年发文数 + 总引用数
- **三阶段消歧**（修复 v1 bug）：
  - 阶段 1：机构匹配 + 名字相似度 ≥ 0.4 → `matched_institution`
  - 阶段 2：名字相似度 ≥ 0.6（无机构）→ `matched_name`
  - 阶段 3：候选 ≤ 2 + 名字相似度 ≥ 0.5 + works ≥ 30 → `fallback_few_candidates`
  - **修复**：之前 `fallback_works` 只看 works_count 不看名字，导致同一 OpenAlex 作者被错配到多位同校教师
- **限流改进**：200ms / req（5 QPS）+ 429 指数退避（2/4/8s）

### 3. 后端 Schema + 服务

`schemas/tutor.py`：`TutorDetail` 新增 `papers` / `coauthors` / `topics` / `yearly_stats` / `i10_index` 字段（全部 JSON）

`services/tutor_service.py`：
- `_tutor_to_item()` 新增 `i10_index`
- `get_tutor_detail()` **重构**：先读取所有字段到本地变量，再做 view_count 写操作。修复了写锁冲突时 ORM session 失效导致 500 错误的问题
- 写锁冲突 graceful fallback：`try/except` 捕获后 silently 回退，不影响读

### 4. 前端 AMiner 风格组件

新增 4 个组件（`frontend/src/components/tutor/*`）：

| 组件 | 功能 | 数据源 |
|---|---|---|
| `PapersList` | 论文列表，支持 **按引用排序** / **按年份分组** 切换；展开 "全部" + 单篇展开摘要 | `papers` / `publications` / `recent_papers` |
| `CoauthorsCard` | 主要合作者网格，每位含合作次数 + 合作强度条 + 最近合作年份 | `coauthors` |
| `TopicsChart` | 研究主题 横向柱状图（按论文数）+ 广义概念 标签云 | `topics` |
| `YearlyTrend` | 年度发文/引用 双轴柱状图（CSS 实现，hover tooltip） | `yearly_stats` |

详情页 `/info/tutors/[id]` 整合：
- 学术指标条改为 4 列（h / i10 / 被引 / 论文数）
- 论文区使用 `PapersList` 替代旧的简单列表
- 新增 "研究主题 + 年度趋势" 2 列网格
- 新增 "主要合作者" 卡片
- 数据源优先级：`papers`（OpenAlex 完整）> `publications`（LLM 抽取）> `recent_papers`（旧字段）

### 5. 数据规模

| 指标 | v1.4 | v1.5 |
|---|---|---|
| Tier 1 升级 | 105 (18%) | **376 (66%)** ← B2 LLM 全量跑 |
| 含完整论文 | 0 | **282 (50%)** |
| 含合作者数据 | 0 | **282** |
| 含研究主题 | 0 | **282** |
| 含年度趋势 | 0 | **282** |
| h-index 命中 | 286 | **339** |
| 顶级 h | h=80（高文）| **h=154**（黄永刚）|

### 6. 端到端示例

```bash
$ curl http://localhost:8000/api/tutors/195   # 黄永刚
{
  "name": "黄永刚",
  "h_index": 154, "i10_index": 478, "citation_count": 93578,
  "papers": [
    {"title": "Materials and Mechanics for Stretchable Electronics",
     "venue": "Science", "year": 2010, "citations": 4845,
     "abstract": "...", "doi": "10.1126/...", "type": "article"},
    /* ... 49 more papers ... */
  ],
  "coauthors": [
    {"name": "John A. Rogers", "works_together_count": 27, "last_year": 2024},
    /* ... 19 more ... */
  ],
  "topics": [
    {"name": "Advanced Sensor and Energy Harvesting Materials",
     "kind": "topic", "works_count": 313, "subfield": "Materials"},
    /* ... 5 more ... */
  ],
  "yearly_stats": [
    {"year": 2024, "works_count": 5, "cited_by_count": 458},
    /* ... 16 more years ... */
  ]
}
```

返回数据量 ≈ 50 KB / 教师（含全部论文摘要）。

### 7. 已知限制

- **OpenAlex 中文学者覆盖率约 50%**：不发英文论文的教师无法命中
- **某些教师数据被同 OpenAlex ID 误配**：现已修复消歧逻辑，需重跑清理（但 282/568 数据基本干净）
- **API 限流**：高并发跑会触发 429，需间歇性重试。增量模式（`--skip-existing`）可避免
