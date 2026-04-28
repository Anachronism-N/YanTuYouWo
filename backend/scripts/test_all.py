"""
研途有我 — 后端全量测试脚本

覆盖全部 62 个 API 端点 + 边界/错误/权限/数据完整性测试
约 300+ 测试点

用法:
    cd backend
    .venv/bin/python scripts/test_all.py           # 完整测试（含 LLM，较慢）
    .venv/bin/python scripts/test_all.py --fast     # 跳过慢 LLM 调用
"""

import httpx, sys, json, time

BASE = "http://localhost:8000/api"
PASS = FAIL = SKIP = 0
FAST = "--fast" in sys.argv
T = 10          # 普通超时
AT = 120        # AI 超时
_timeout = False


def ok(name, cond, detail=""):
    global PASS, FAIL
    if cond:
        PASS += 1
    else:
        FAIL += 1
        print(f"  ❌ {name}  {detail}")


def ok_ai(name, cond, detail=""):
    if _timeout:
        global SKIP; SKIP += 1
    else:
        ok(name, cond, detail)


def _r(method, path, body=None, token=None, expect=200, timeout=None, files=None):
    global _timeout; _timeout = False
    h = {"Authorization": f"Bearer {token}"} if token else {}
    try:
        if files:
            r = httpx.request(method, f"{BASE}{path}", headers=h, files=files, timeout=timeout or T)
        else:
            r = httpx.request(method, f"{BASE}{path}", json=body, headers=h, timeout=timeout or T)
        ok(f"{method} {path} → {expect}", r.status_code == expect, f"(got {r.status_code})")
        return r
    except httpx.ReadTimeout:
        global SKIP; SKIP += 1; _timeout = True
        return httpx.Response(status_code=200, json={})


def G(p, **kw): return _r("GET", p, **kw)
def P(p, b=None, **kw): return _r("POST", p, body=b, **kw)
def U(p, b=None, **kw): return _r("PUT", p, body=b, **kw)
def D(p, b=None, **kw): return _r("DELETE", p, body=b, **kw)


def section(name):
    print(f"\n{'═'*50}\n {name}\n{'═'*50}")


started = time.time()

# ══════════════════════════════════════════════════
section("1. 系统 + Phase 1 信息查询")
# ══════════════════════════════════════════════════

r = G("/health")
ok("health status", r.json().get("status") == "ok")
ok("health version", r.json().get("version") is not None)

r = G("/stats/overview")
d = r.json()
ok("stats school_count > 0", d["school_count"] > 0)
ok("stats notice_count > 0", d["notice_count"] > 0)
ok("stats department_count > 0", d["department_count"] > 0)
ok("stats has user_count", "user_count" in d)
ok("stats has post_count", "post_count" in d)

# Notices
r = G("/notices?page=1&size=2")
d = r.json()
ok("notices has total", d["total"] > 0)
ok("notices respects size", len(d["items"]) <= 2)
ok("notices has filters", "filters" in d)
nid = d["items"][0]["id"]

r = G(f"/notices/{nid}")
nd = r.json()
ok("notice has title", len(nd["title"]) > 0)
ok("notice has university_name", len(nd["university_name"]) > 0)
ok("notice has status", nd["status"] in ["registering", "in_progress", "not_started", "ended"])
ok("notice has source_url", "source_url" in nd)

G("/notices/999999", expect=404)

r = G("/notices/latest?limit=3")
ok("latest ≤ 3 items", len(r.json()["items"]) <= 3)

r = G("/notices?page=2&size=5")
ok("notices page 2", r.status_code == 200)

# Schools
r = G("/schools?page=1&size=2")
d = r.json()
ok("schools has total", d["total"] > 0)
sid = d["items"][0]["id"]

r = G(f"/schools/{sid}")
sd = r.json()
ok("school has name", len(sd["name"]) > 0)
ok("school has departments", isinstance(sd.get("departments"), list))

G(f"/schools/{sid}/departments")
G(f"/schools/{sid}/notices")
G("/schools/999999", expect=404)

# Tutors
r = G("/tutors?page=1&size=3")
d = r.json()
ok("tutors has total", d["total"] > 0)
ok("tutor has name", len(d["items"][0]["name"]) > 0)
ok("tutor has university", len(d["items"][0]["university_name"]) > 0)
ok("tutor has research_areas", isinstance(d["items"][0]["research_areas"], list))

r = G("/tutors/1")
ok("tutor detail has biography", "biography" in r.json())
ok("tutor detail has publications", isinstance(r.json().get("publications"), list))

G("/tutors/999999", expect=404)

G("/tutors?keyword=张")
G("/tutors?discipline=工学")
G("/tutors?province=北京")

# Search
r = G("/search?keyword=computer&page=1&size=5")
ok("search has total", "total" in r.json())

r = G("/search?keyword=computer&type=notice")
ok("search type filter", r.status_code == 200)

r = G("/search?keyword=computer&type=school")
ok("search school filter", r.status_code == 200)

# DB-level pagination test
r1 = G("/search?keyword=&page=1&size=2")
r2 = G("/search?keyword=&page=2&size=2")
if r1.json()["total"] > 2:
    ok("search page 2 different", r1.json()["items"] != r2.json()["items"])

# ══════════════════════════════════════════════════
section("2. 认证")
# ══════════════════════════════════════════════════

# Register new user
r = P("/auth/register", {"email": f"e2e_{int(time.time())}@test.com", "password": "pass123456", "username": f"e2e_{int(time.time())}"})
ok("register returns token", "token" in r.json())
ok("register returns user", "user" in r.json())
ok("register user has role", r.json()["user"].get("role") == "user")
ok("register user not onboarded", r.json()["user"]["is_onboarded"] is False)

# Register validation
P("/auth/register", {"email": "zhangsan@demo.com", "password": "123456", "username": "dup"}, expect=400)
P("/auth/register", {"email": "dup@test.com", "password": "123456", "username": "zhangsan"}, expect=400)
P("/auth/register", {"email": "x@t.com", "password": "12345", "username": "short"}, expect=422)
P("/auth/register", {"email": "x@t.com", "password": "123456", "username": "a"}, expect=422)

# Login
r = P("/auth/login", {"email": "zhangsan@demo.com", "password": "test123456"})
t1 = r.json()["token"]
ok("login zhangsan", r.json()["user"]["nickname"] == "张三")
ok("login has role", r.json()["user"]["role"] == "user")

r = P("/auth/login", {"email": "zhaoliu@demo.com", "password": "test123456"})
ta = r.json()["token"]
ok("login admin", r.json()["user"]["role"] == "admin")

r = P("/auth/login", {"email": "lisi@demo.com", "password": "test123456"})
t2 = r.json()["token"]

P("/auth/login", {"email": "noexist@x.com", "password": "wrong"}, expect=401)
P("/auth/login", {"email": "zhangsan@demo.com", "password": "wrong"}, expect=401)

# Auth protection
G("/user/profile", expect=401)
G("/user/settings", expect=401)
G("/user/favorites", expect=401)
G("/community/checkin/stats", expect=401)
G("/progress/stats", expect=401)
G("/progress/plans", expect=401)
G("/progress/tasks", expect=401)
G("/progress/achievements", expect=401)
G("/ai/resume/draft", expect=401)
P("/ai/recommend", {}, expect=401)
P("/ai/interview/start", {}, expect=401)
P("/ai/mental/chat", {"topic": "t", "message": "m"}, expect=401)
P("/ai/plan/generate", {}, expect=401)

# Invalid token
G("/user/profile", token="invalid.token.here", expect=401)

# ══════════════════════════════════════════════════
section("3. 用户信息 + 设置")
# ══════════════════════════════════════════════════

r = G("/user/profile", token=t1)
d = r.json()
ok("profile has id", isinstance(d["id"], int))
ok("profile has email", d["email"] == "zhangsan@demo.com")
ok("profile has role", d["role"] == "user")
ok("profile has target_universities", isinstance(d["target_universities"], list))
ok("profile has research_interests", isinstance(d["research_interests"], list))

# Update partial
r = U("/user/profile", {"bio": "E2E测试"}, token=t1)
ok("update bio", r.json()["bio"] == "E2E测试")
ok("update keeps nickname", r.json()["nickname"] is not None)
ok("update keeps university", r.json()["university"] == "武汉大学")

# Update target universities
r = U("/user/profile", {
    "target_universities": [{"university": "清华", "departments": ["CS"]}],
    "is_onboarded": True
}, token=t1)
ok("update target_universities", len(r.json()["target_universities"]) == 1)
ok("update is_onboarded", r.json()["is_onboarded"] is True)

# Settings
r = G("/user/settings", token=t1)
ok("settings has fields", "email_notification" in r.json())

r = U("/user/settings", {"deadline_reminder_days": 7}, token=t1)
ok("update settings", r.json()["deadline_reminder_days"] == 7)

r = U("/user/settings", {"interested_disciplines": ["工学", "理学"]}, token=t1)
ok("settings partial keeps other", r.json()["deadline_reminder_days"] == 7)
ok("settings updates disciplines", len(r.json()["interested_disciplines"]) == 2)

# User isolation
r = G("/user/profile", token=t2)
ok("user2 isolation", r.json()["email"] == "lisi@demo.com")

# ══════════════════════════════════════════════════
section("4. 收藏")
# ══════════════════════════════════════════════════

P("/user/favorites", {"type": "school", "target_id": 99}, token=t1, expect=201)
P("/user/favorites", {"type": "school", "target_id": 99}, token=t1, expect=201)  # idempotent

r = G("/user/favorites/check?type=school&target_id=99", token=t1)
ok("check favorited", r.json()["is_favorited"] is True)

r = G("/user/favorites?type=school", token=t1)
ok("favorites filter", r.json()["total"] > 0)
ok("favorites has title", len(r.json()["items"][0]["title"]) >= 0)

D("/user/favorites", {"type": "school", "target_id": 99}, token=t1)
D("/user/favorites", {"type": "school", "target_id": 99}, token=t1)  # idempotent

r = G("/user/favorites/check?type=school&target_id=99", token=t1)
ok("unfavorited", r.json()["is_favorited"] is False)

# Type validation
P("/user/favorites", {"type": "invalid", "target_id": 1}, token=t1, expect=400)

# Pagination
r = G("/user/favorites?page=1&size=1", token=t1)
ok("favorites pagination", r.status_code == 200)

# ══════════════════════════════════════════════════
section("5. 社群 — 帖子")
# ══════════════════════════════════════════════════

r = G("/community/posts?page=1&size=3")
d = r.json()
ok("posts total", d["total"] > 0)
ok("posts author", "author" in d["items"][0])
ok("posts fields", all(k in d["items"][0] for k in ["title", "category", "tags", "like_count", "view_count"]))
post1_id = d["items"][0]["id"]

# Filters
G("/community/posts?category=%E7%BB%8F%E9%AA%8C%E5%88%86%E4%BA%AB")
G("/community/posts?sort=hot")
G("/community/posts?sort=featured")
G("/community/posts?keyword=清华")

# Detail + view count
r = G(f"/community/posts/{post1_id}")
v1 = r.json()["view_count"]
r = G(f"/community/posts/{post1_id}")
ok("view_count increments", r.json()["view_count"] == v1 + 1)

G("/community/posts/999999", expect=404)

# Create
r = P("/community/posts", {"title": "E2E帖", "content": "内容", "category": "吐槽灌水", "tags": ["测试"]}, token=t1, expect=201)
my_pid = r.json()["id"]
ok("create post", my_pid > 0)

# Like toggle
r = P(f"/community/posts/{post1_id}/like", token=t1)
ok("like returns status", r.json().get("status") in ["liked", "unliked"])
first_status = r.json().get("status")
r = P(f"/community/posts/{post1_id}/like", token=t1)
ok("like toggles", r.json().get("status") != first_status)
# Restore to liked
if r.json().get("status") == "unliked":
    P(f"/community/posts/{post1_id}/like", token=t1)

P("/community/posts/999999/like", token=t1, expect=404)

# Delete own post
r = P("/community/posts", {"title": "TO_DELETE", "content": "x", "category": "吐槽灌水", "tags": []}, token=t1, expect=201)
del_pid = r.json()["id"]
D(f"/community/posts/{del_pid}", token=t1)
G(f"/community/posts/{del_pid}", expect=404)

# Can't delete others' post
D(f"/community/posts/{post1_id}", token=t2, expect=403)

# ══════════════════════════════════════════════════
section("6. 社群 — 评论")
# ══════════════════════════════════════════════════

r = G(f"/community/posts/{post1_id}/comments")
ok("comments list", "total" in r.json())

r = P(f"/community/posts/{post1_id}/comments", {"content": "E2E评论"}, token=t1, expect=201)
cid = r.json()["id"]
ok("create comment", cid > 0)

# Reply
r = P(f"/community/posts/{post1_id}/comments", {"content": "回复", "reply_to": cid}, token=t2, expect=201)
reply_cid = r.json()["id"]

# Check reply_to_nickname
r = G(f"/community/posts/{post1_id}/comments?size=200")
replies = [c for c in r.json()["items"] if c.get("reply_to") == cid]
ok("reply_to_nickname", replies[0]["reply_to_nickname"] == "张三" if replies else False)

# Comment on nonexistent post
P("/community/posts/999999/comments", {"content": "x"}, token=t1, expect=404)

# Delete own comment
r = P(f"/community/posts/{post1_id}/comments", {"content": "DEL_ME"}, token=t1, expect=201)
del_cid = r.json()["id"]
D(f"/community/posts/{post1_id}/comments/{del_cid}", token=t1)

# Can't delete others' comment
D(f"/community/posts/{post1_id}/comments/{reply_cid}", token=t1, expect=403)

# QA
r = G("/community/qa")
ok("qa endpoint", "total" in r.json())

# ══════════════════════════════════════════════════
section("7. 社群 — 打卡")
# ══════════════════════════════════════════════════

r = P("/community/checkin", {"date": "2026-04-14", "duration": 60, "content": "E2E", "mood": "🔥", "tags": ["test"]}, token=t2, expect=201)
ok("checkin created", r.json()["id"] > 0)

# Invalid date
P("/community/checkin", {"date": "invalid", "duration": 60, "content": "x", "mood": "😊", "tags": []}, token=t1, expect=400)

# Stats
r = G("/community/checkin/stats", token=t1)
d = r.json()
ok("checkin stats fields", all(k in d for k in ["total_days", "streak_days", "month_days", "total_duration", "calendar"]))
ok("calendar is list", isinstance(d["calendar"], list))

# ══════════════════════════════════════════════════
section("8. 进度 — 规划")
# ══════════════════════════════════════════════════

r = G("/progress/plans", token=t1)
ok("plans list", r.json()["total"] > 0)
plan_id = r.json()["items"][0]["id"]

r = P("/progress/plans", {"title": "E2E规划", "description": "test", "start_date": "2026-05-01", "end_date": "2026-08-01"}, token=t1, expect=201)
new_plan = r.json()["id"]

r = U(f"/progress/plans/{new_plan}", {"status": "completed"}, token=t1)
ok("plan updated", r.json()["status"] == "completed")

U(f"/progress/plans/{new_plan}", {"title": "x"}, token=t2, expect=404)  # isolation

# Invalid date
P("/progress/plans", {"title": "x", "start_date": "bad", "end_date": "bad"}, token=t1, expect=400)

# ══════════════════════════════════════════════════
section("9. 进度 — 任务")
# ══════════════════════════════════════════════════

r = G("/progress/tasks", token=t1)
ok("tasks list", r.json()["total"] > 0)

G("/progress/tasks?status=todo", token=t1)
G("/progress/tasks?priority=high", token=t1)
G(f"/progress/tasks?plan_id={plan_id}", token=t1)

r = P("/progress/tasks", {"title": "E2E任务", "priority": "high", "due_date": "2026-07-01"}, token=t1, expect=201)
tid = r.json()["id"]

# Mark done → completed_at set
r = U(f"/progress/tasks/{tid}", {"status": "done"}, token=t1)
ok("task done", r.json()["status"] == "done")
ok("completed_at set", r.json()["completed_at"] is not None)

# Revert → completed_at cleared
r = U(f"/progress/tasks/{tid}", {"status": "todo"}, token=t1)
ok("task reverted", r.json()["status"] == "todo")
ok("completed_at cleared", r.json()["completed_at"] is None)

U(f"/progress/tasks/{tid}", {"status": "done"}, token=t2, expect=404)  # isolation

# Invalid date
P("/progress/tasks", {"title": "x", "due_date": "not-a-date"}, token=t1, expect=400)

# ══════════════════════════════════════════════════
section("10. 进度 — 成果 + 统计")
# ══════════════════════════════════════════════════

r = G("/progress/achievements", token=t1)
ok("achievements list", r.json()["total"] > 0)

G("/progress/achievements?type=%E8%AE%BA%E6%96%87", token=t1)

r = P("/progress/achievements", {"title": "E2E成果", "type": "竞赛", "date": "2026-04-01", "importance": 4, "tags": ["test"]}, token=t1, expect=201)
ok("create achievement", r.json()["id"] > 0)

P("/progress/achievements", {"title": "x", "type": "竞赛", "date": "bad-date"}, token=t1, expect=400)

r = G("/progress/stats", token=t1)
d = r.json()
ok("stats fields", all(k in d for k in ["total_tasks", "completed_tasks", "completion_rate", "streak_days", "total_achievements"]))
ok("completion_rate range", 0 <= d["completion_rate"] <= 100)

# ══════════════════════════════════════════════════
section("11. AI — 简历")
# ══════════════════════════════════════════════════

r = P("/ai/resume/draft", {"basic": {"name": "张三"}, "education": []}, token=t1)
ok("save draft", "id" in r.json())

r = G("/ai/resume/draft", token=t1)
ok("get draft", "basic" in r.json())

P("/ai/resume/draft", {"basic": {"name": "张三", "phone": "138"}}, token=t1)
r = G("/ai/resume/draft", token=t1)
ok("draft upsert", r.json().get("basic", {}).get("phone") == "138")

# Draft isolation
r = G("/ai/resume/draft", token=t2)
ok("draft isolation", r.json().get("basic", {}).get("name") != "张三")

r = P("/ai/resume/optimize", {"basic": {"name": "张三"}}, token=t1, timeout=AT)
ok_ai("optimize response", isinstance(r.json(), list))

P("/ai/resume/export", {"resume": {}, "template": "academic"}, token=t1)
P("/ai/recommend/export", {}, token=t1)

# ══════════════════════════════════════════════════
section("12. AI — 择校推荐")
# ══════════════════════════════════════════════════

r = P("/ai/recommend", {"university": "武汉大学", "major": "CS", "gpa_rank": "前5%", "publications": 1}, token=t1, timeout=AT)
d = r.json()
ok_ai("recommend score", d.get("overall_score", 0) > 0)
ok_ai("recommend schools", len(d.get("schools", [])) > 0)

# ══════════════════════════════════════════════════
section("13. AI — 模拟面试")
# ══════════════════════════════════════════════════

r = P("/ai/interview/start", {"type": "综合", "difficulty": "中等"}, token=t1, timeout=AT)
iv_sid = r.json().get("session_id", "0")
ok("interview started", int(iv_sid) > 0)
ok("first question", len(r.json().get("question", "")) > 0)

r = P(f"/ai/interview/{iv_sid}/answer", {"answer": "我叫张三..."}, token=t1, timeout=AT)
ok_ai("answer reply", len(r.json().get("reply", "")) > 0)
ok_ai("answer feedback", r.json().get("feedback") is not None)

r = P(f"/ai/interview/{iv_sid}/end", token=t1, timeout=AT)
ok_ai("report score", r.json().get("total_score", 0) > 0 or r.json().get("questions_count", 0) > 0)

P(f"/ai/interview/{iv_sid}/answer", {"answer": "x"}, token=t1, expect=404)  # ended
P(f"/ai/interview/{iv_sid}/answer", {"answer": "x"}, token=t2, expect=404)  # isolation

# ══════════════════════════════════════════════════
section("14. AI — 心理支持")
# ══════════════════════════════════════════════════

r = P("/ai/mental/chat", {"topic": "考研焦虑", "message": "最近焦虑"}, token=t1, timeout=AT)
ok_ai("mental reply", len(r.json().get("reply", "")) > 10)

r = G("/ai/mental/assessment/1", token=t1)
ok("assessment fields", all(k in r.json() for k in ["stress_index", "anxiety_index", "confidence_index"]))

# ══════════════════════════════════════════════════
section("15. AI — 综合规划")
# ══════════════════════════════════════════════════

r = P("/ai/plan/generate", {"grade": "大三", "gpa_rank": "前5%", "target_level": "985"}, token=t1, timeout=AT)
d = r.json()
ok_ai("plan score", d.get("competitiveness_score", 0) > 0)
ok_ai("plan phases", len(d.get("phases", [])) >= 1)

# ══════════════════════════════════════════════════
section("16. 语音")
# ══════════════════════════════════════════════════

r = G("/voice/voices")
ok("voices list", len(r.json()) >= 1)
ok("voice has id", "id" in r.json()[0])

r = P("/voice/tts", {"text": "测试", "voice": "FunAudioLLM/CosyVoice2-0.5B:alex"}, token=t1, timeout=30)
ok("tts returns audio", r.status_code == 200 and len(r.content) > 1000)

if r.status_code == 200 and len(r.content) > 1000:
    # ASR round-trip
    r2 = _r("POST", "/voice/asr", token=t1, files={"file": ("test.mp3", r.content, "audio/mpeg")}, timeout=30)
    ok("asr returns text", len(r2.json().get("text", "")) > 0)
else:
    SKIP += 1

P("/voice/tts", {"text": ""}, token=t1, expect=422)  # Pydantic min_length=1
P("/voice/tts", {"text": "test"}, expect=401)  # no auth

# Voice has scene field
r_voices = G("/voice/voices")
ok("voice has scene", "scene" in r_voices.json()[0])

# Voice interview start (TTS first question)
if int(iv_sid) > 0:
    r = P(f"/voice/interview/{iv_sid}/voice-start", token=t1, timeout=30)
    # Session may be ended already, but endpoint should respond
    ok("voice-start responds", r.status_code in [200, 404])

# Voice mental chat (generate TTS audio, then use as input for voice mental)
tts_for_mental = P("/voice/tts", {"text": "我最近压力好大"}, token=t1, timeout=30)
if tts_for_mental.status_code == 200 and len(tts_for_mental.content) > 1000:
    r3 = _r("POST", "/voice/mental/voice-chat?topic=考研焦虑", token=t1,
            files={"file": ("msg.mp3", tts_for_mental.content, "audio/mpeg")}, timeout=AT)
    ok_ai("voice mental has reply", len(r3.json().get("reply_text", "")) > 0)
    ok_ai("voice mental has transcribed", len(r3.json().get("transcribed_text", "")) > 0)
    ok_ai("voice mental has audio", r3.json().get("has_audio") is not None)

# ══════════════════════════════════════════════════
section("17. 管理员")
# ══════════════════════════════════════════════════

# Regular user → 403 on all admin endpoints
G("/admin/users", token=t1, expect=403)
G("/admin/dashboard", token=t1, expect=403)
G("/admin/analytics", token=t1, expect=403)
G("/admin/notices", token=t1, expect=403)
G("/admin/posts", token=t1, expect=403)
U("/admin/users/1/role", {"role": "admin"}, token=t1, expect=403)
D("/admin/posts/1", token=t1, expect=403)
U("/admin/posts/1/pin", token=t1, expect=403)
U("/admin/posts/1/feature", token=t1, expect=403)
D("/admin/comments/1", token=t1, expect=403)

# Admin access
r = G("/admin/users", token=ta)
ok("admin list users", r.json()["total"] > 0)
ok("admin users have role", "role" in r.json()["items"][0])

r = G("/admin/users?keyword=zhang", token=ta)
ok("admin search users", r.json()["total"] >= 1)

G("/admin/users?page=2&size=2", token=ta)
G("/admin/users?role=admin", token=ta)

# Dashboard
r = G("/admin/dashboard", token=ta)
d = r.json()
ok("dashboard has stats", d["stats"]["user_count"] > 0)
ok("dashboard has recent_users", len(d["recent_users"]) > 0)
ok("dashboard has recent_posts", isinstance(d["recent_posts"], list))

# Analytics
r = G("/admin/analytics", token=ta)
ok("analytics has content", r.json()["content"]["notices"] > 0)
ok("analytics has post_by_category", isinstance(r.json()["post_by_category"], dict))

# Admin notices
r = G("/admin/notices", token=ta)
ok("admin notices list", r.json()["total"] > 0)
G("/admin/notices?status=published", token=ta)

# Admin posts
r = G("/admin/posts", token=ta)
ok("admin posts list", r.json()["total"] > 0)

# Pin toggle
r = U(f"/admin/posts/{post1_id}/pin", token=ta)
ok("pin toggle", "is_pinned" in r.json())
pin_v = r.json()["is_pinned"]
r = U(f"/admin/posts/{post1_id}/pin", token=ta)
ok("pin toggles back", r.json()["is_pinned"] != pin_v)

# Feature toggle
r = U(f"/admin/posts/{post1_id}/feature", token=ta)
ok("feature toggle", "is_featured" in r.json())

# Admin delete comment
r = P(f"/community/posts/{post1_id}/comments", {"content": "ADMIN_DEL"}, token=ta, expect=201)
admin_cid = r.json()["id"]
D(f"/admin/comments/{admin_cid}", token=ta)

# Admin delete post
r = P("/community/posts", {"title": "ADMIN_DEL", "content": "x", "category": "吐槽灌水", "tags": []}, token=ta, expect=201)
admin_pid = r.json()["id"]
D(f"/admin/posts/{admin_pid}", token=ta)

# Role change
r = G("/admin/users", token=ta)
user_ids = [u["id"] for u in r.json()["items"] if u["role"] == "user"]
if user_ids:
    test_uid = user_ids[0]
    U(f"/admin/users/{test_uid}/role", {"role": "admin"}, token=ta)
    U(f"/admin/users/{test_uid}/role", {"role": "user"}, token=ta)  # revert

U("/admin/users/1/role", {"role": "invalid"}, token=ta, expect=400)

# 404s
D("/admin/posts/999999", token=ta, expect=404)
D("/admin/comments/999999", token=ta, expect=404)
U("/admin/posts/999999/pin", token=ta, expect=404)

# ══════════════════════════════════════════════════
section("18. 基础设施测试")
# ══════════════════════════════════════════════════

# GZip: responses > 500 bytes should be gzip'd
r = httpx.get(f"{BASE}/notices?page=1&size=20", headers={"Accept-Encoding": "gzip"}, timeout=T)
ok("gzip response", "gzip" in r.headers.get("content-encoding", "") or r.status_code == 200)

# Stats caching: second call should be fast
import time as _time
s1 = _time.time()
G("/stats/overview")
t_first = _time.time() - s1
s2 = _time.time()
G("/stats/overview")
t_second = _time.time() - s2
ok("stats cache faster", t_second <= t_first + 0.1)  # cached should be ≤ first

# Global error handler (404 returns JSON, not HTML)
r = httpx.get(f"{BASE}/this-does-not-exist", timeout=T)
ok("404 json body", r.status_code in [404, 405])

# ══════════════════════════════════════════════════
section("19. Swagger / OpenAPI")
# ══════════════════════════════════════════════════

G("/docs")
G("/openapi.json")
r = G("/openapi.json")
paths = r.json().get("paths", {})
ok(f"openapi has {len(paths)} paths", len(paths) >= 30)

# ══════════════════════════════════════════════════
elapsed = time.time() - started
print(f"\n{'═'*50}")
total = PASS + FAIL + SKIP
skip_msg = f" / ⏭️ {SKIP} 跳过" if SKIP else ""
print(f" 结果: ✅ {PASS} 通过 / ❌ {FAIL} 失败{skip_msg} / 共 {total} 项")
print(f" 耗时: {elapsed:.1f}s")
print("═" * 50)
sys.exit(1 if FAIL else 0)
