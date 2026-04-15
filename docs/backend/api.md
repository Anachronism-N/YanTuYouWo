# 研途有我 — 后端 API 文档

> 基础地址：`http://localhost:8000/api`
> Swagger UI：http://localhost:8000/api/docs
> ReDoc：http://localhost:8000/api/redoc
> 版本：1.1.0 | 端点总数：67 | 测试：281 项

---

## 目录

- [认证与权限](#认证与权限)
- [通用约定](#通用约定)
- [1. 系统 (1)](#1-系统)
- [2. 认证 (2)](#2-认证)
- [3. 用户信息 (4)](#3-用户信息)
- [4. 收藏 (4)](#4-收藏)
- [5. 通知 (4)](#5-通知)
- [6. 院校 (4)](#6-院校)
- [7. 导师 (2)](#7-导师)
- [8. 搜索 (1)](#8-搜索)
- [8. 统计 (1)](#8-统计)
- [9. 社群 — 帖子 (5)](#9-社群--帖子)
- [10. 社群 — 评论 (3)](#10-社群--评论)
- [11. 社群 — 打卡 (2)](#11-社群--打卡)
- [12. 社群 — 问答 (1)](#12-社群--问答)
- [13. 进度 — 规划 (3)](#13-进度--规划)
- [14. 进度 — 任务 (3)](#14-进度--任务)
- [15. 进度 — 成果 (2)](#15-进度--成果)
- [16. 进度 — 统计 (1)](#16-进度--统计)
- [17. AI — 简历 (4)](#17-ai--简历)
- [18. AI — 择校 (2)](#18-ai--择校)
- [19. AI — 面试 (3)](#19-ai--面试)
- [20. AI — 心理 (2)](#20-ai--心理)
- [21. AI — 规划 (1)](#21-ai--规划)
- [22. 语音 (5)](#22-语音)
- [23. 管理员 (6)](#23-管理员)
- [演示数据](#演示数据)

---

## 认证与权限

### JWT Token

需要认证的接口在 Header 中携带：
```
Authorization: Bearer <token>
```
Token 通过注册或登录获取，有效期 7 天。

### 错误响应

| HTTP 状态码 | 含义 | 示例 |
|------------|------|------|
| 400 | 请求参数错误 | `{"detail": "该邮箱已被注册"}` |
| 401 | 未认证 / Token 无效 | `{"detail": "未提供认证信息"}` |
| 403 | 权限不足 | `{"detail": "需要管理员权限"}` |
| 404 | 资源不存在 | `{"detail": "帖子不存在"}` |
| 422 | 参数校验失败 | Pydantic 自动校验错误 |

### 用户角色

| 角色 | 说明 |
|------|------|
| `user` | 默认角色，可使用所有用户功能 |
| `admin` | 额外可访问 `/api/admin/*` 管理端点 |

---

## 通用约定

### 分页
```
GET /api/xxx?page=1&size=20
```
响应：`{"total": 100, "items": [...]}`

### 日期格式
所有日期字段使用 ISO 格式：`2026-04-13` (date) 或 `2026-04-13T12:00:00` (datetime)

---

## 1. 系统

### `GET /api/health` — 健康检查
无需认证。
```json
{"status": "ok", "version": "0.6.0"}
```

---

## 2. 认证

### `POST /api/auth/register` — 注册
```json
// 请求
{"email": "user@example.com", "password": "123456", "username": "myname", "nickname": "昵称"}
// password ≥ 6 字符，username 2-50 字符

// 响应 200
{
  "token": "eyJ...",
  "user": {
    "id": 1, "username": "myname", "email": "user@example.com",
    "nickname": "昵称", "role": "user", "avatar_url": null,
    "university": null, "major": null, "grade": null, "bio": null,
    "gpa_rank": null, "target_universities": [], "research_interests": [],
    "is_onboarded": false, "created_at": "2026-04-13T12:00:00"
  }
}
// 错误: 400 "该邮箱已被注册" / 400 "该用户名已被占用" / 422 密码太短
```

### `POST /api/auth/login` — 登录
```json
// 请求
{"email": "user@example.com", "password": "123456"}
// 响应: 同注册
// 错误: 401 "邮箱或密码错误"
```

---

## 3. 用户信息

### `GET /api/user/profile` — 获取个人信息
认证：✅ | 响应：同注册中的 user 对象

### `PUT /api/user/profile` — 更新个人信息
认证：✅ | 部分更新（只传需要改的字段）
```json
// 请求（所有字段可选）
{
  "nickname": "新昵称", "university": "北京大学", "major": "计算机",
  "grade": "大三", "bio": "简介", "gpa_rank": "前10%",
  "target_universities": [{"university": "清华大学", "departments": ["计算机学院"]}],
  "research_interests": ["NLP", "机器学习"],
  "is_onboarded": true
}
```

### `GET /api/user/settings` — 获取设置
认证：✅
```json
{
  "email_notification": true, "favorite_update_notification": true,
  "deadline_reminder_days": 3,
  "interested_disciplines": ["工学"], "interested_universities": ["北京大学"]
}
```

### `PUT /api/user/settings` — 更新设置
认证：✅ | 部分更新

---

## 4. 收藏

### `GET /api/user/favorites` — 收藏列表
认证：✅ | 参数：`?type=notice&page=1&size=20`（type: notice/school/tutor）
```json
{
  "total": 2,
  "items": [{
    "id": 1, "type": "school", "target_id": 1,
    "title": "北京大学", "description": "985 · 北京",
    "created_at": "2026-04-13T12:00:00",
    "extra": {"level": "985", "province": "北京"}
  }]
}
```

### `POST /api/user/favorites` — 添加收藏
认证：✅ | 请求：`{"type": "notice", "target_id": 1}` | 响应 201
type 必须为 notice / school / tutor

### `DELETE /api/user/favorites` — 取消收藏
认证：✅ | 请求：`{"type": "notice", "target_id": 1}`

### `GET /api/user/favorites/check` — 检查是否已收藏
认证：✅ | 参数：`?type=notice&target_id=1`
```json
{"is_favorited": true}
```

---

## 5. 通知

### `GET /api/notices` — 通知列表
无需认证 | 参数：

| 参数 | 说明 | 值 |
|------|------|------|
| type | 通知类型 | summer_camp / pre_admission / seminar / admission_list |
| school_level | 学校层次 | 985 / 211 |
| province | 省份 | 北京 / 浙江 / ... |
| university | 学校名 | 清华大学 |
| discipline | 学科 | 计算机 |
| keyword | 关键词搜索 | 夏令营 |
| status | 状态 | registering / in_progress / not_started / ended |
| sort | 排序 | latest / deadline / hot |
| page, size | 分页 | 默认 1, 20 |

### `GET /api/notices/latest` — 最新通知
参数：`?limit=10`

### `GET /api/notices/{id}` — 通知详情
含 requirements, raw_content, contact, registration_url, images 等

`images` 字段为图片数组（已自动过滤 logo/图标/二维码等噪音）：
```json
"images": [{"url": "https://...", "alt": "招生简章", "width": 800, "height": 600}]
```

---

## 6. 院校

### `GET /api/schools` — 院校列表
参数：`?level=985&province=北京&keyword=清华&sort=name&page=1&size=20`

### `GET /api/schools/{id}` — 院校详情（含学院列表）

### `GET /api/schools/{id}/departments` — 学院列表

### `GET /api/schools/{id}/notices` — 院校下的通知

---

## 7. 导师

### `GET /api/tutors` — 导师列表
无需认证 | 参数：

| 参数 | 说明 |
|------|------|
| university | 学校名 |
| discipline | 学科门类（工学/理学/经济学...） |
| keyword | 关键词搜索 |
| is_recruiting | 是否招生（true/false） |
| province | 省份 |
| sort | 排序（name/paper_count/view_count） |
| page, size | 分页 |

> 当前数据库无导师数据时自动返回 6 位 Mock 导师，爬取导师数据后自动切换为真实数据。

### `GET /api/tutors/{id}` — 导师详情
含 biography, education, experience, publications, projects, awards 等

---

## 8. 搜索

### `GET /api/search` — 全站搜索
参数：`?keyword=北京&type=notice&page=1&size=20`（type 可选过滤）
```json
{
  "total": 10,
  "items": [{"id": 1, "type": "notice", "title": "...", "description": "...", "url": "/info/notices/1"}]
}
```

---

## 8. 统计

### `GET /api/stats/overview` — 首页统计
```json
{"school_count": 39, "notice_count": 916, "department_count": 1593, "tutor_count": 0, "user_count": 5, "post_count": 6}
```

---

## 9. 社群 — 帖子

### `GET /api/community/posts` — 帖子列表
参数：`?category=经验分享&keyword=清华&sort=latest&page=1&size=20`
sort: latest（默认）/ hot / featured

### `GET /api/community/posts/{id}` — 帖子详情
自动 +1 浏览量

### `POST /api/community/posts` — 发帖
认证：✅ | 201
```json
{"title": "标题", "content": "Markdown内容", "category": "经验分享", "tags": ["保研"]}
```
category: 经验分享 / 择校咨询 / 面试交流 / 资料分享 / 吐槽灌水 / 官方公告

### `POST /api/community/posts/{id}/like` — 点赞/取消点赞
认证：✅ | Toggle 行为：已点赞则取消，未点赞则点赞
```json
{"detail": "点赞成功", "status": "liked"}    // 或
{"detail": "已取消点赞", "status": "unliked"}
```
同一用户对同一帖子只能点赞一次（PostLike 表去重）

### `DELETE /api/community/posts/{id}` — 删除帖子
认证：✅ | 仅帖子作者或管理员

---

## 10. 社群 — 评论

### `GET /api/community/posts/{id}/comments` — 评论列表
含 reply_to_nickname（回复目标昵称）

### `POST /api/community/posts/{id}/comments` — 发评论
认证：✅ | `{"content": "评论", "reply_to": 1}`（reply_to 可选）

### `DELETE /api/community/posts/{post_id}/comments/{comment_id}` — 删除评论
认证：✅ | 仅评论作者或管理员

---

## 11. 社群 — 打卡

### `POST /api/community/checkin` — 学习打卡
认证：✅
```json
{"date": "2026-04-13", "duration": 120, "content": "复习", "mood": "🔥", "tags": ["复习"]}
```

### `GET /api/community/checkin/stats` — 打卡统计
认证：✅
```json
{
  "total_days": 15, "streak_days": 15, "month_days": 13,
  "total_duration": 2070, "month_duration": 1680,
  "rank": 1, "calendar": ["2026-04-01", "2026-04-02", "..."]
}
```

---

## 12. 社群 — 问答

### `GET /api/community/qa` — 问答列表
实际为 category=择校咨询 的帖子

---

## 13. 进度 — 规划

### `GET /api/progress/plans` — 规划列表
认证：✅

### `POST /api/progress/plans` — 创建规划
认证：✅ | `{"title": "规划", "description": "描述", "start_date": "2026-05-01", "end_date": "2026-09-01"}`

### `PUT /api/progress/plans/{id}` — 更新规划
认证：✅ | 部分更新 | status: active / completed / archived

---

## 14. 进度 — 任务

### `GET /api/progress/tasks` — 任务列表
认证：✅ | 参数：`?plan_id=1&status=todo&priority=high`

### `POST /api/progress/tasks` — 创建任务
认证：✅
```json
{
  "title": "复习", "description": "描述", "plan_id": 1,
  "priority": "high", "due_date": "2026-06-01",
  "tags": ["408"], "source": "manual"
}
```
priority: high/medium/low | source: manual/ai_generated

### `PUT /api/progress/tasks/{id}` — 更新任务
认证：✅ | status→done 时自动设 completed_at，离开 done 自动清除

---

## 15. 进度 — 成果

### `GET /api/progress/achievements` — 成果列表
认证：✅ | 参数：`?type=论文`
type: 科研/论文/竞赛/英语/面试/实习/其他

### `POST /api/progress/achievements` — 创建成果
认证：✅
```json
{"title": "国赛二等奖", "type": "竞赛", "date": "2026-01-15", "importance": 4, "tags": ["竞赛"]}
```

---

## 16. 进度 — 统计

### `GET /api/progress/stats` — 进度统计
认证：✅
```json
{
  "total_tasks": 7, "completed_tasks": 2, "in_progress_tasks": 2,
  "overdue_tasks": 0, "completion_rate": 28.6,
  "streak_days": 15, "total_achievements": 3, "weekly_completed": 0
}
```

---

## 17. AI — 简历

> 有 LLM API Key 调真实 AI，无 Key 自动降级 Mock

### `POST /api/ai/resume/draft` — 保存简历草稿
认证：✅ | 请求：任意 JSON | 响应：`{"id": "1"}`

### `GET /api/ai/resume/draft` — 获取简历草稿
认证：✅ | 无草稿返回 `{}`

### `POST /api/ai/resume/optimize` — AI 优化简历
认证：✅ | 请求：简历 JSON
```json
// 响应
[
  {"type": "improvement", "field": "research", "message": "建议量化科研成果..."},
  {"type": "warning", "field": "skills", "message": "技能描述建议分层级..."},
  {"type": "tip", "field": "awards", "message": "获奖按含金量排列..."}
]
```

### `POST /api/ai/resume/export` — 导出 PDF（开发中）

---

## 18. AI — 择校

### `POST /api/ai/recommend` — 择校推荐
认证：✅
```json
// 请求
{
  "university": "武汉大学", "major": "计算机", "gpa_rank": "前5%",
  "research_interests": ["NLP"], "publications": 1, "awards": 2,
  "english_level": "CET-6 580", "preferred_regions": ["华东"]
}
// 响应
{
  "overall_score": 78,
  "evaluation": "综合竞争力较强...",
  "schools": [
    {"university": "清华大学", "department": "计算机系", "match_score": 72,
     "difficulty": "reach", "reason": "理由", "discipline_rating": "A+"}
  ],
  "suggestions": ["建议1", "建议2"]
}
```
difficulty: reach（冲刺）/ match（稳妥）/ safety（保底）

### `POST /api/ai/recommend/export` — 导出报告（开发中）

---

## 19. AI — 面试

### `POST /api/ai/interview/start` — 开始面试
认证：✅
```json
// 请求
{"type": "综合", "difficulty": "中等", "target_school": "清华大学", "target_major": "计算机", "duration_minutes": 15}
// 响应
{"session_id": "1", "question": "请做一个简短的自我介绍。"}
```
type: 综合/专业/英语

### `POST /api/ai/interview/{session_id}/answer` — 发送回答
认证：✅ | `{"answer": "我是..."}`
```json
{
  "reply": "下一个问题...",
  "feedback": {"score": 82, "comment": "回答清晰"}
}
```

### `POST /api/ai/interview/{session_id}/end` — 结束面试
认证：✅
```json
{
  "total_score": 82,
  "dimensions": {
    "expression": {"score": 85, "label": "表达能力"},
    "knowledge": {"score": 80, "label": "专业知识"},
    "adaptability": {"score": 78, "label": "应变能力"},
    "overall_quality": {"score": 84, "label": "综合素质"}
  },
  "strengths": ["表达清晰", "科研具体"],
  "improvements": ["专业深度", "英文表达"],
  "overall": "总体评价",
  "questions_count": 5
}
```

---

## 20. AI — 心理

### `POST /api/ai/mental/chat` — 心理支持对话
认证：✅ | `{"topic": "考研焦虑", "message": "最近很焦虑"}`
topic: 考研焦虑/面试紧张/选择困难/人际关系/时间管理/自我怀疑/其他
```json
{"reply": "温暖共情的回复..."}
```

### `POST /api/ai/mental/chat/stream` — 心理支持 SSE 流式输出
认证：✅

请求体同 `/mental/chat`。返回 `text/event-stream`：
```
data: 你好
data: 呀
data: ，听到你
data: ...
data: [DONE]
```
前端使用 `EventSource` 或 `fetch` + `ReadableStream` 接收，实现逐字显示效果。

> 注：AI 端点（简历优化/择校推荐/综合规划）启用限流，每用户 5 次/分钟，超限返回 `429`。

---

### `GET /api/ai/mental/assessment/{session_id}` — 心理评估
认证：✅
```json
{
  "stress_index": 45, "anxiety_index": 38, "confidence_index": 72,
  "suggestions": ["建议1"],
  "resources": [{"type": "article", "title": "保研焦虑指南", "url": "#"}]
}
```

---

## 21. AI — 规划

### `POST /api/ai/plan/generate` — 生成保研规划
认证：✅
```json
// 请求
{"grade": "大三", "gpa_rank": "前5%", "target_level": "985", "target_discipline": "计算机", "publications": 1, "weaknesses": ["科研不够"]}
// 响应
{
  "competitiveness_score": 76,
  "evaluation": "综合评估...",
  "phases": [
    {"name": "基础夯实期", "period": "大三上", "tasks": [{"title": "提升GPA", "priority": "high"}]}
  ],
  "suggestions": ["建议1", "建议2"]
}
```

---

## 22. 语音

### `GET /api/voice/voices` — 语音列表
无需认证
```json
[
  {"id": "FunAudioLLM/CosyVoice2-0.5B:alex", "name": "Alex", "gender": "男", "style": "沉稳专业", "lang": "中英"},
  {"id": "FunAudioLLM/CosyVoice2-0.5B:claire", "name": "Claire", "gender": "女", "style": "专业温暖", "lang": "中英", "scene": "心理支持"}
]
```

### `POST /api/voice/tts` — 文本转语音
认证：✅ | `{"text": "你好", "voice": "FunAudioLLM/CosyVoice2-0.5B:alex"}`
响应：`audio/mpeg` 二进制 MP3

### `POST /api/voice/asr` — 语音识别
认证：✅ | multipart/form-data, 字段 `file`（mp3/wav/webm, ≤50MB）
```json
{"text": "识别出的文本"}
```

### `POST /api/voice/interview/{session_id}/voice-answer` — 语音面试回答
认证：✅ | multipart/form-data, 字段 `file`
处理链路：ASR → AI 面试官 → TTS
```json
{
  "transcribed_text": "用户说的话",
  "reply_text": "AI 面试官的问题",
  "feedback": {"score": 80, "comment": "评价"},
  "has_audio": true,
  "reply_audio_base64": "//uQxAAA..."
}
```

### `POST /api/voice/interview/{session_id}/voice-start` — 面试首问语音
认证：✅ | 获取面试第一题的 TTS 语音
```json
{"question": "请简单介绍一下你自己。", "has_audio": true, "audio_base64": "//uQxAAA..."}
```

---

### `POST /api/voice/interview/{session_id}/voice-end` — 结束语音面试
认证：✅ | 返回评估报告 + `overall_audio_base64`

---

## 23. 管理员

> 所有 `/api/admin/*` 需要 role=admin，普通用户返回 403

### `GET /api/admin/users` — 用户列表
参数：`?keyword=张&page=1&size=20`

### `PUT /api/admin/users/{id}/role` — 修改角色
`{"role": "admin"}` 或 `{"role": "user"}`

### `DELETE /api/admin/posts/{id}` — 删除任意帖子

### `PUT /api/admin/posts/{id}/pin` — 置顶/取消置顶
返回 `{"is_pinned": true}`（toggle）

### `PUT /api/admin/posts/{id}/feature` — 加精/取消加精
返回 `{"is_featured": true}`（toggle）

### `DELETE /api/admin/comments/{id}` — 删除任意评论

---

## 演示数据

```bash
cd backend && .venv/bin/python scripts/seed_data.py          # 首次
cd backend && .venv/bin/python scripts/seed_data.py --reset   # 重建
```

| 邮箱 | 密码 | 角色 | 说明 |
|------|------|------|------|
| zhangsan@demo.com | test123456 | user | 完整数据：简历+面试+打卡+规划+成果 |
| lisi@demo.com | test123456 | user | CV 方向，8天打卡 |
| wangwu@demo.com | test123456 | user | 金融跨保 CS |
| zhaoliu@demo.com | test123456 | **admin** | 管理员，已保研清华 |
| sunqi@demo.com | test123456 | user | 大二，未完成引导 |

数据含：5 用户 + 6 帖子 + 10 评论 + 23 打卡 + 1 规划 + 7 任务 + 3 成果 + 1 简历草稿 + 1 面试记录

---

### `POST /api/voice/mental/voice-chat` — 语音心理对话
认证：✅ | multipart/form-data

参数：`?topic=考研焦虑`，字段 `file` 为语音录音

处理链路：ASR → AI 心理咨询师（Clara 语音）→ TTS
```json
{
  "transcribed_text": "我最近压力好大",
  "reply_text": "我能理解你的感受...",
  "has_audio": true,
  "reply_audio_base64": "//uQxAAA..."
}
```

> 面试用 Alex 语音（沉稳专业），心理支持用 Claire 语音（专业温暖）
> 可用语音共 6 个：alex, benjamin, anna, bella, claire, diana

---

## 数字人方案（前端实现指引）

后端提供 TTS 音频，前端负责数字人渲染：

| 方案 | 复杂度 | 效果 | 说明 |
|------|--------|------|------|
| CSS 动画头像 | 低 | ⭐⭐ | 播放时嘴型开合 CSS 动画 |
| Lottie 动画 | 中 | ⭐⭐⭐ | 预制 JSON 动画 + 表情切换 |
| lip-sync.js | 中 | ⭐⭐⭐⭐ | 分析音频振幅驱动嘴型 |
| SadTalker/MuseTalk | 高 | ⭐⭐⭐⭐⭐ | 照片+音频→说话视频（需 GPU） |
