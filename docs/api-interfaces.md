# 前端 API 接口完整清单

> 更新日期：2026-04-14
>
> 本文档列出前端已经定义并调用的**所有 API 接口**。后端需要按此规范实现对应端点。
> 
> 基础路径：`/api`（前端 `API_BASE_URL = http://localhost:8000/api`）

---

## 一、已对接（后端 Phase 1 已实现）

以下接口后端已实现，前端已从 Mock 切换到真实 API：

| 状态 | 方法 | 路径 | 说明 | 认证 | 前端调用位置 |
|------|------|------|------|------|-------------|
| ✅ | GET | `/notices` | 通知列表（分页+筛选+排序） | ❌ | `info/notices/page.tsx` |
| ✅ | GET | `/notices/latest` | 最新通知 | ❌ | `page.tsx`（首页） |
| ✅ | GET | `/notices/{id}` | 通知详情 | ❌ | `info/notices/[id]/page.tsx` |
| ✅ | GET | `/schools` | 院校列表 | ❌ | `info/schools/page.tsx` |
| ✅ | GET | `/schools/{id}` | 院校详情（含学院） | ❌ | `info/schools/[id]/page.tsx` |
| ✅ | GET | `/schools/{id}/departments` | 学院列表 | ❌ | `info/schools/[id]/page.tsx` |
| ✅ | GET | `/schools/{id}/notices` | 院校通知 | ❌ | `info/schools/[id]/page.tsx` |
| ✅ | GET | `/stats/overview` | 首页统计 | ❌ | `page.tsx`（首页） |
| ✅ | GET | `/search` | 全站搜索 | ❌ | `CommandSearch.tsx` |
| ✅ | GET | `/health` | 健康检查 | ❌ | - |

---

## 二、待实现 — Phase 2：用户系统 + 收藏

| 方法 | 路径 | 说明 | 认证 | 请求体/参数 | 响应体 | 前端调用位置 |
|------|------|------|------|------------|--------|-------------|
| POST | `/auth/register` | 注册 | ❌ | `{ email, username, password }` | `{ user: UserProfile, token: string }` | `auth/register/page.tsx` |
| POST | `/auth/login` | 登录 | ❌ | `{ email, password }` | `{ user: UserProfile, token: string }` | `auth/login/page.tsx` |
| GET | `/user/profile` | 获取个人信息 | ✅ | - | `UserProfile` | `user/page.tsx` |
| PUT | `/user/profile` | 更新个人信息 | ✅ | `Partial<UserProfile>` | `UserProfile` | `user/page.tsx` |
| GET | `/user/settings` | 获取设置 | ✅ | - | `UserSettings` | `user/settings/page.tsx` |
| PUT | `/user/settings` | 更新设置 | ✅ | `Partial<UserSettings>` | `UserSettings` | `user/settings/page.tsx` |
| GET | `/user/favorites` | 收藏列表 | ✅ | `?type=notice&page=1&size=20` | `{ total, items: FavoriteItem[] }` | `user/favorites/page.tsx` |
| POST | `/user/favorites` | 添加收藏 | ✅ | `{ type, target_id }` | `void` | `FavoriteButton.tsx` |
| DELETE | `/user/favorites` | 取消收藏 | ✅ | `{ type, target_id }` | `void` | `FavoriteButton.tsx` |
| GET | `/user/favorites/check` | 检查收藏 | ✅ | `?type=notice&target_id=1` | `{ is_favorited: boolean }` | `FavoriteButton.tsx` |

### UserProfile 数据结构

```typescript
interface UserProfile {
  id: number;
  username: string;
  email: string;
  avatar_url: string | null;
  nickname: string;
  university: string | null;
  major: string | null;
  grade: string | null;
  bio: string | null;
  gpa_rank: string | null;
  target_universities: { university: string; departments: string[] }[];
  research_interests: string[];
  is_onboarded: boolean;
  role: "user" | "admin";
  created_at: string;
}
```

---

## 三、待实现 — Phase 2.5：管理员系统

| 方法 | 路径 | 说明 | 认证 | 前端调用位置 |
|------|------|------|------|-------------|
| GET | `/admin/stats` | 管理后台统计 | ✅ Admin | `admin/page.tsx` |
| GET | `/admin/notices` | 通知管理列表（含草稿） | ✅ Admin | `admin/notices/page.tsx` |
| POST | `/admin/notices` | 创建通知（手动） | ✅ Admin | `admin/notices/page.tsx` |
| PUT | `/admin/notices/{id}` | 编辑通知 | ✅ Admin | `admin/notices/page.tsx` |
| DELETE | `/admin/notices/{id}` | 删除通知 | ✅ Admin | `admin/notices/page.tsx` |
| PUT | `/admin/notices/{id}/status` | 更改通知状态 | ✅ Admin | `admin/notices/page.tsx` |
| POST | `/admin/upload` | 文件上传 | ✅ Admin | `admin/upload/page.tsx` |
| GET | `/admin/uploads` | 已上传文件列表 | ✅ Admin | `admin/upload/page.tsx` |
| DELETE | `/admin/uploads/{id}` | 删除文件 | ✅ Admin | `admin/upload/page.tsx` |

---

## 四、待实现 — Phase 3：导师 + 社群 + 进度

### 导师

| 方法 | 路径 | 说明 | 认证 | 前端调用位置 |
|------|------|------|------|-------------|
| GET | `/tutors` | 导师列表 | ❌ | `info/tutors/page.tsx` |
| GET | `/tutors/{id}` | 导师详情 | ❌ | `info/tutors/[id]/page.tsx` |

### 社群

| 方法 | 路径 | 说明 | 认证 | 前端调用位置 |
|------|------|------|------|-------------|
| GET | `/community/posts` | 帖子列表 | ❌ | `community/page.tsx` |
| GET | `/community/posts/{id}` | 帖子详情 | ❌ | - |
| POST | `/community/posts` | 创建帖子 | ✅ | `community/create/page.tsx` |
| POST | `/community/posts/{id}/like` | 点赞 | ✅ | `community/page.tsx` |
| GET | `/community/posts/{id}/comments` | 评论列表 | ❌ | - |
| POST | `/community/posts/{id}/comments` | 发评论 | ✅ | - |
| POST | `/community/checkin` | 学习打卡 | ✅ | `community/checkin/page.tsx` |
| GET | `/community/checkin/stats` | 打卡统计 | ✅ | `community/checkin/page.tsx` |
| GET | `/community/qa` | 问答列表 | ❌ | `community/qa/page.tsx` |

### 进度中心

| 方法 | 路径 | 说明 | 认证 | 前端调用位置 |
|------|------|------|------|-------------|
| GET | `/progress/plans` | 规划列表 | ✅ | `progress/plan/page.tsx` |
| POST | `/progress/plans` | 创建规划 | ✅ | `ai/plan/page.tsx` |
| PUT | `/progress/plans/{id}` | 更新规划 | ✅ | `progress/plan/page.tsx` |
| GET | `/progress/tasks` | 任务列表 | ✅ | `progress/tasks/page.tsx` |
| POST | `/progress/tasks` | 创建任务 | ✅ | `progress/tasks/page.tsx` |
| PUT | `/progress/tasks/{id}` | 更新任务 | ✅ | `progress/tasks/page.tsx` |

---

## 五、待实现 — Phase 4：AI 功能

### 简历工坊

| 方法 | 路径 | 说明 | 认证 | 请求体 | 响应体 |
|------|------|------|------|--------|--------|
| POST | `/ai/resume/draft` | 保存草稿 | ✅ | `ResumeData` | `{ id: string }` |
| GET | `/ai/resume/draft` | 获取草稿 | ✅ | - | `ResumeData \| null` |
| POST | `/ai/resume/optimize` | AI 优化建议 | ✅ | `ResumeData` | `AISuggestion[]` |
| POST | `/ai/resume/export` | 导出 PDF | ✅ | `{ resume, template }` | `Blob (PDF)` |

### 择校推荐

| 方法 | 路径 | 说明 | 认证 | 请求体 | 响应体 |
|------|------|------|------|--------|--------|
| POST | `/ai/recommend` | 获取推荐 | ✅ | `RecommendInput` | `RecommendResult` |
| POST | `/ai/recommend/export` | 导出报告 | ✅ | `{ input, result }` | `Blob (PDF)` |

### 模拟面试

| 方法 | 路径 | 说明 | 认证 | 请求体 | 响应体 |
|------|------|------|------|--------|--------|
| POST | `/ai/interview/start` | 开始面试 | ✅ | `config` | `{ session_id }` |
| POST | `/ai/interview/{id}/answer` | 发送回答 | ✅ | `{ answer }` | `{ reply, feedback? }` |
| POST | `/ai/interview/{id}/end` | 结束面试 | ✅ | - | 评估报告 |

### 心理支持

| 方法 | 路径 | 说明 | 认证 | 请求体 | 响应体 |
|------|------|------|------|--------|--------|
| POST | `/ai/mental/chat` | 发送消息 | ✅ | `{ topic, message }` | `{ reply }` |
| GET | `/ai/mental/assessment/{id}` | 心理评估 | ✅ | - | 评估结果 |

### 综合规划

| 方法 | 路径 | 说明 | 认证 | 请求体 | 响应体 |
|------|------|------|------|--------|--------|
| POST | `/ai/plan/generate` | 生成规划 | ✅ | 用户背景信息 | 规划时间线+任务 |

---

## 六、筛选参数约定

### 通知列表 `/notices` Query 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `keyword` | string | 关键词搜索（标题+学校+学院） |
| `type` | string | 通知类型：`summer_camp` / `pre_admission` / `seminar` / `admission_list` |
| `status` | string | 状态：`registering` / `in_progress` / `not_started` / `ended` |
| `school_level` | string | 学校层次：`985` / `211` / `double_first_class` |
| `province` | string | 省份 |
| `university` | string | 学校名 |
| `discipline` | string | 学科门类 |
| `major` | string | 专业 |
| `sort` | string | 排序：`latest` / `deadline` / `hot` |
| `page` | number | 页码（默认 1） |
| `size` | number | 每页条数（默认 20） |

### 院校列表 `/schools` Query 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `keyword` | string | 搜索学校名称 |
| `level` | string | `985` / `211` / `double_first_class` |
| `province` | string | 省份 |
| `sort` | string | `name` / `notice_count` |
| `page` | number | 页码 |
| `size` | number | 每页条数 |

### 搜索 `/search` Query 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `keyword` | string | 搜索关键词 |
| `type` | string | 可选：`notice` / `school` / `tutor` |
| `page` | number | 页码 |
| `size` | number | 每页条数 |

---

## 七、响应格式约定

### 分页响应

```json
{
  "total": 1234,
  "items": [...]
}
```

### 错误响应

```json
{
  "detail": "错误描述"
}
```

### 认证方式

- JWT Token
- 请求头：`Authorization: Bearer <token>`
- Token 有效期：7 天

---

## 八、当前前端 Mock 状态

| 功能模块 | 状态 | 说明 |
|---------|------|------|
| 首页统计/通知/院校 | ✅ 真实 API | 已对接后端 Phase 1 |
| 通知列表/详情 | ✅ 真实 API | 支持筛选+分页 |
| 院校列表/详情 | ✅ 真实 API | 含学院和通知 |
| 导师列表/详情 | ⚠️ Mock | 前端 mock-data.ts |
| 用户登录/注册 | ⚠️ Mock | 任意账密可登录 |
| 用户信息/收藏 | ⚠️ Mock | 本地 Zustand 存储 |
| AI 简历/择校/面试 | ⚠️ Mock | 前端模拟数据 |
| 社群帖子/打卡 | ⚠️ Mock | 前端模拟数据 |
| 进度中心 | ⚠️ Mock | 前端模拟数据 |
| 竞赛/期刊 | ⚠️ Mock | 前端模拟数据 |
| 管理后台 | ⚠️ Mock | 前端模拟数据 |

> 所有 ⚠️ Mock 的模块，前端 API 函数已在 `lib/api.ts` 中定义好，只需后端实现对应端点即可无缝切换。
