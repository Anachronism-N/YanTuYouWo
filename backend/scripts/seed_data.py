"""
假数据填充脚本 — 为前端展示和功能测试生成演示数据

用法：
    cd backend
    .venv/bin/python scripts/seed_data.py          # 首次填充
    .venv/bin/python scripts/seed_data.py --reset   # 清除旧数据后重新填充

会创建：
    - 5 个演示用户（密码统一为 test123456）
    - 每个用户的设置 + 收藏
    - 社群帖子 + 评论 + 打卡记录
    - 进度规划 + 任务 + 成果
    - 简历草稿 + 面试会话
"""

import asyncio
import sys
from pathlib import Path
from datetime import datetime, date, timedelta

# 将 backend/ 目录加到 Python 路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select, text
from src.database import engine, async_session
from src.models import Base
from src.models.user import User, UserSettings, Favorite
from src.utils.security import hash_password


# ──── 演示用户数据 ────

DEMO_USERS = [
    {
        "email": "zhangsan@demo.com",
        "username": "zhangsan",
        "nickname": "张三",
        "university": "武汉大学",
        "major": "计算机科学与技术",
        "grade": "大三",
        "bio": "武大 CS 大三，目标清北浙复交，研究方向 NLP",
        "gpa_rank": "前5%",
        "target_universities": [
            {"university": "清华大学", "departments": ["计算机科学与技术系"]},
            {"university": "北京大学", "departments": ["信息科学技术学院"]},
        ],
        "research_interests": ["自然语言处理", "大语言模型", "信息检索"],
        "is_onboarded": True,
    },
    {
        "email": "lisi@demo.com",
        "username": "lisi",
        "nickname": "李四",
        "university": "中山大学",
        "major": "软件工程",
        "grade": "大三",
        "bio": "中大软工，对 CV 和多模态很感兴趣",
        "gpa_rank": "前10%",
        "target_universities": [
            {"university": "浙江大学", "departments": ["计算机科学与技术学院"]},
            {"university": "上海交通大学", "departments": ["电子信息与电气工程学院"]},
        ],
        "research_interests": ["计算机视觉", "多模态学习", "深度学习"],
        "is_onboarded": True,
    },
    {
        "email": "wangwu@demo.com",
        "username": "wangwu",
        "nickname": "王五",
        "university": "四川大学",
        "major": "金融学",
        "grade": "大三",
        "bio": "川大金融，转 CS 保研中",
        "gpa_rank": "前3%",
        "target_universities": [
            {"university": "复旦大学", "departments": ["经济学院", "大数据学院"]},
        ],
        "research_interests": ["金融科技", "量化交易", "机器学习"],
        "is_onboarded": True,
    },
    {
        "email": "zhaoliu@demo.com",
        "username": "zhaoliu",
        "nickname": "赵六",
        "university": "哈尔滨工业大学",
        "major": "自动化",
        "grade": "大四",
        "bio": "哈工大自动化，已保研清华，分享经验",
        "gpa_rank": "前8%",
        "target_universities": [],
        "research_interests": ["机器人", "强化学习", "控制理论"],
        "role": "admin",
        "is_onboarded": True,
    },
    {
        "email": "sunqi@demo.com",
        "username": "sunqi",
        "nickname": "孙七",
        "university": "南京大学",
        "major": "法学",
        "grade": "大二",
        "bio": "南大法学大二，提前了解保研流程",
        "gpa_rank": "前15%",
        "target_universities": [
            {"university": "北京大学", "departments": ["法学院"]},
            {"university": "中国人民大学", "departments": ["法学院"]},
        ],
        "research_interests": ["知识产权法", "国际法"],
        "is_onboarded": False,
    },
]

# ──── 帖子数据 ────

DEMO_POSTS = [
    {
        "user_idx": 3,  # 赵六（已保研）
        "title": "清华自动化保研经验分享：从夏令营到预推免全流程",
        "content": "大家好，我是哈工大自动化专业的赵六，今年成功保研到清华。分享一下我的保研全程经历...\n\n## 时间线\n- 3月：开始准备材料\n- 5月：投递夏令营\n- 7月：参加清华夏令营\n- 9月：预推免面试\n\n## 面试经验\n面试主要问了三个方面：专业基础、科研经历、未来规划。建议大家...\n\n希望能帮到正在准备的学弟学妹们！",
        "category": "经验分享",
        "tags": ["清华", "自动化", "夏令营", "保研经验"],
        "is_pinned": True,
        "is_featured": True,
        "like_count": 128,
        "comment_count": 23,
        "view_count": 2340,
    },
    {
        "user_idx": 0,  # 张三
        "title": "NLP 方向保研该选哪些学校？求建议",
        "content": "本科武大 CS，GPA 前5%，有一篇 ACL workshop 论文，想走 NLP 方向。\n\n目前在考虑清北和浙大，想请问：\n1. 清华 NLP 组（刘知远/孙茂松）和北大（万小军）哪个更推荐？\n2. 浙大 NLP 实力如何？\n3. 还有没有其他推荐的？\n\n感谢各位！",
        "category": "择校咨询",
        "tags": ["NLP", "择校", "清华", "北大"],
        "is_pinned": False,
        "is_featured": False,
        "like_count": 45,
        "comment_count": 12,
        "view_count": 890,
    },
    {
        "user_idx": 1,  # 李四
        "title": "浙大 CS 夏令营面试经验 + 真题回忆",
        "content": "刚参加完浙大 CS 夏令营，趁热分享一下面试情况。\n\n## 笔试\n- 数据结构：手写快排、红黑树删除\n- 操作系统：进程调度、死锁\n\n## 面试\n- 自我介绍（3分钟）\n- 科研深挖（问得很细）\n- 英文文献阅读\n\n总体感觉浙大面试非常注重基础，建议好好复习 408！",
        "category": "面试交流",
        "tags": ["浙大", "CS", "夏令营", "面试真题"],
        "is_pinned": False,
        "is_featured": True,
        "like_count": 89,
        "comment_count": 18,
        "view_count": 1560,
    },
    {
        "user_idx": 2,  # 王五
        "title": "跨专业保研（金融→CS）可行吗？求过来人分享",
        "content": "川大金融大三，GPA 前3%，但想跨保 CS。自学了 Python、机器学习，做了一个量化交易项目。\n\n想问一下：\n1. 金融跨保 CS 难度大吗？\n2. 需要补哪些课？\n3. 有没有推荐的交叉方向（比如金融科技）？",
        "category": "择校咨询",
        "tags": ["跨专业", "金融", "CS", "保研"],
        "is_pinned": False,
        "is_featured": False,
        "like_count": 67,
        "comment_count": 21,
        "view_count": 1230,
    },
    {
        "user_idx": 4,  # 孙七
        "title": "大二就开始准备保研是不是太早了？",
        "content": "南大法学大二，GPA 前15%。看到学长学姐保研都很卷，想提前准备。\n\n请问大二阶段应该做些什么？目前在考虑：\n1. 提高 GPA\n2. 参加法学竞赛\n3. 跟老师做课题\n\n有没有法学保研的前辈给点建议？",
        "category": "经验分享",
        "tags": ["大二", "法学", "保研规划"],
        "is_pinned": False,
        "is_featured": False,
        "like_count": 34,
        "comment_count": 15,
        "view_count": 670,
    },
    {
        "user_idx": 0,  # 张三
        "title": "整理了一份 408 复习资料，免费分享",
        "content": "花了两个月整理了一套 408 复习笔记，覆盖：\n- 数据结构与算法\n- 计算机网络\n- 操作系统\n- 计算机组成原理\n\n每章都有知识点总结 + 历年真题解析，希望对大家有帮助。\n\n（私信我获取链接）",
        "category": "资料分享",
        "tags": ["408", "复习资料", "数据结构", "操作系统"],
        "is_pinned": False,
        "is_featured": False,
        "like_count": 156,
        "comment_count": 42,
        "view_count": 3210,
    },
]

# ──── 评论数据 ────

DEMO_COMMENTS = [
    {"post_idx": 0, "user_idx": 0, "content": "太详细了！请问清华夏令营入营率大概多少？"},
    {"post_idx": 0, "user_idx": 1, "content": "同问，自动化方向对论文要求高吗？"},
    {"post_idx": 0, "user_idx": 3, "content": "入营率大概 30% 左右，论文不是必须但是加分项。",
     "reply_to_idx": 0},
    {"post_idx": 1, "user_idx": 3, "content": "NLP 的话清华刘知远组很强，但竞争也很激烈。建议也看看中科院自动化所。"},
    {"post_idx": 1, "user_idx": 1, "content": "浙大 NLP 也不错的，可以了解一下张岳老师的组。"},
    {"post_idx": 2, "user_idx": 0, "content": "谢谢分享！请问科研深挖具体问了什么？"},
    {"post_idx": 3, "user_idx": 3, "content": "跨专业完全可以！我有同学从数学跨到 CS 的。关键是要有相关项目经历。"},
    {"post_idx": 5, "user_idx": 1, "content": "太感谢了！求链接 🙏"},
    {"post_idx": 5, "user_idx": 2, "content": "好人一生平安！"},
    {"post_idx": 5, "user_idx": 4, "content": "虽然不考 408，但还是点赞支持！"},
]


DEMO_EMAILS = [u["email"] for u in DEMO_USERS]


async def reset_demo_data(db):
    """删除所有 demo 用户相关数据（手动级联，SQLite 不自动 CASCADE）"""
    from sqlalchemy import delete
    from sqlalchemy import delete as sa_delete
    from src.models.ai import ResumeDraft, InterviewSession
    from src.models.progress import Plan, Task, Achievement
    from src.models.community import Post, Comment, Checkin

    result = await db.execute(select(User.id).where(User.email.in_(DEMO_EMAILS)))
    user_ids = [row[0] for row in result.all()]

    if user_ids:
        post_ids_r = await db.execute(select(Post.id).where(Post.user_id.in_(user_ids)))
        post_ids = [r[0] for r in post_ids_r.all()]
        if post_ids:
            await db.execute(sa_delete(Comment).where(Comment.post_id.in_(post_ids)))

        from src.models.community import PostLike
        for model in [PostLike, Post, Checkin, Task, Achievement, Plan, ResumeDraft, InterviewSession, Favorite, UserSettings]:
            await db.execute(sa_delete(model).where(model.user_id.in_(user_ids)))
        await db.execute(sa_delete(User).where(User.id.in_(user_ids)))
        print(f"   🗑️  已删除 {len(user_ids)} 个 demo 用户及关联数据")

    # 删除测试脚本创建的临时用户（e2e_ 开头）
    from src.models.community import PostLike
    test_users = await db.execute(select(User.id).where(User.email.like("e2e_%")))
    test_ids = [r[0] for r in test_users.all()]
    if test_ids:
        for model in [PostLike, Post, Checkin, Task, Achievement, Plan, ResumeDraft, InterviewSession, Favorite, UserSettings]:
            await db.execute(sa_delete(model).where(model.user_id.in_(test_ids)))
        await db.execute(sa_delete(User).where(User.id.in_(test_ids)))
        print(f"   🗑️  已清理 {len(test_ids)} 个测试临时用户")

    # 清理所有孤立数据
    for model in [UserSettings, Favorite, ResumeDraft, InterviewSession, PostLike]:
        await db.execute(sa_delete(model).where(~model.user_id.in_(select(User.id))))
    await db.commit()
    print("   🧹 孤立数据已清理")


async def main():
    do_reset = "--reset" in sys.argv

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        if do_reset:
            print("🔄 重置 demo 数据...")
            await reset_demo_data(db)
        else:
            result = await db.execute(select(User).where(User.email == "zhangsan@demo.com"))
            if result.scalar_one_or_none():
                print("⚠️  演示数据已存在。使用 --reset 参数重新填充。")
                return

        print("📦 开始填充演示数据...")

        # ── 1. 创建用户 ──
        pw_hash = hash_password("test123456")
        users = []
        for u in DEMO_USERS:
            user = User(password_hash=pw_hash, **u)
            db.add(user)
            users.append(user)
        await db.flush()
        print(f"   ✅ 创建 {len(users)} 个演示用户")

        # ── 2. 创建用户设置 ──
        for user in users:
            settings = UserSettings(
                user_id=user.id,
                interested_disciplines=["工学", "理学"],
                interested_universities=["北京大学", "清华大学", "浙江大学"],
            )
            db.add(settings)
        await db.flush()
        print(f"   ✅ 创建 {len(users)} 条用户设置")

        # ── 3. 创建收藏 ──
        fav_data = [
            (0, "notice", 1), (0, "school", 1), (0, "school", 2),
            (1, "notice", 2), (1, "school", 3),
            (2, "school", 1), (2, "notice", 3),
            (3, "school", 5), (3, "notice", 1), (3, "notice", 4),
        ]
        fav_count = 0
        for user_idx, ftype, target_id in fav_data:
            db.add(Favorite(user_id=users[user_idx].id, type=ftype, target_id=target_id))
            fav_count += 1
        await db.flush()
        print(f"   ✅ 创建 {fav_count} 条收藏记录")

        # ── 4. 创建帖子（如果 posts 表存在） ──
        try:
            from src.models.community import Post, Comment, Checkin
            post_objs = []
            now = datetime.now()
            for i, p in enumerate(DEMO_POSTS):
                post = Post(
                    user_id=users[p["user_idx"]].id,
                    title=p["title"],
                    content=p["content"],
                    category=p["category"],
                    tags=p["tags"],
                    is_pinned=p["is_pinned"],
                    is_featured=p["is_featured"],
                    like_count=p["like_count"],
                    comment_count=p["comment_count"],
                    view_count=p["view_count"],
                    created_at=now - timedelta(days=len(DEMO_POSTS) - i, hours=i * 3),
                )
                db.add(post)
                post_objs.append(post)
            await db.flush()
            print(f"   ✅ 创建 {len(post_objs)} 条帖子")

            # 评论
            comment_objs = []
            for c in DEMO_COMMENTS:
                reply_to = comment_objs[c["reply_to_idx"]].id if "reply_to_idx" in c else None
                comment = Comment(
                    post_id=post_objs[c["post_idx"]].id,
                    user_id=users[c["user_idx"]].id,
                    content=c["content"],
                    reply_to_id=reply_to,
                )
                db.add(comment)
                comment_objs.append(comment)
            await db.flush()
            print(f"   ✅ 创建 {len(comment_objs)} 条评论")

            # 打卡
            today = date.today()
            checkin_count = 0
            moods = ["😊", "🔥", "💪", "😐", "😊"]
            contents = ["复习数据结构", "刷英语真题", "阅读论文", "准备面试", "整理简历"]
            for i in range(15):
                db.add(Checkin(
                    user_id=users[0].id,
                    date=today - timedelta(days=i),
                    duration_minutes=60 + i * 10,
                    content=contents[i % len(contents)],
                    mood=moods[i % len(moods)],
                    tags=["保研", "学习"],
                ))
                checkin_count += 1
            for i in range(8):
                db.add(Checkin(
                    user_id=users[1].id,
                    date=today - timedelta(days=i),
                    duration_minutes=45 + i * 15,
                    content=contents[(i + 2) % len(contents)],
                    mood=moods[(i + 1) % len(moods)],
                    tags=["CV", "论文"],
                ))
                checkin_count += 1
            await db.flush()
            print(f"   ✅ 创建 {checkin_count} 条打卡记录")
        except ImportError:
            print("   ⏭️  社群模型尚未创建，跳过帖子/评论/打卡数据")

        # ── 5. 创建规划和任务（如果 plans 表存在） ──
        try:
            from src.models.progress import Plan, Task, Achievement
            today = date.today()

            plan = Plan(
                user_id=users[0].id,
                title="2026 保研规划",
                description="从夏令营到预推免的完整规划",
                start_date=today - timedelta(days=60),
                end_date=today + timedelta(days=120),
                status="active",
            )
            db.add(plan)
            await db.flush()

            task_data = [
                ("完善个人简历", "high", "done", -30),
                ("联系目标导师", "high", "done", -20),
                ("准备夏令营材料", "high", "in_progress", 10),
                ("复习数据结构与算法", "medium", "in_progress", 20),
                ("刷 LeetCode 100 题", "medium", "todo", 30),
                ("准备英语面试", "medium", "todo", 40),
                ("模拟面试练习", "low", "todo", 50),
            ]
            for title, priority, status, day_offset in task_data:
                db.add(Task(
                    user_id=users[0].id,
                    plan_id=plan.id,
                    title=title,
                    priority=priority,
                    status=status,
                    due_date=today + timedelta(days=day_offset),
                ))
            await db.flush()
            print(f"   ✅ 创建 1 个规划 + {len(task_data)} 个任务")

            achievement_data = [
                ("ACL Workshop 论文录用", "论文", "发表了一篇 ACL 2026 Workshop 论文", 5, -45),
                ("数学建模国赛二等奖", "竞赛", "全国大学生数学建模竞赛国家二等奖", 4, -90),
                ("CET-6 620 分", "英语", "大学英语六级 620 分", 3, -120),
            ]
            for title, atype, desc, importance, day_offset in achievement_data:
                db.add(Achievement(
                    user_id=users[0].id,
                    title=title,
                    type=atype,
                    description=desc,
                    importance=importance,
                    date=today + timedelta(days=day_offset),
                    tags=[atype],
                ))
            await db.flush()
            print(f"   ✅ 创建 {len(achievement_data)} 条成果记录")
        except ImportError:
            print("   ⏭️  进度模型尚未创建，跳过规划/任务/成果数据")

        # ── 6. 创建简历草稿和面试会话（AI 模块） ──
        try:
            from src.models.ai import ResumeDraft, InterviewSession

            resume_data = {
                "basic": {
                    "name": "张三", "email": "zhangsan@demo.com", "phone": "138xxxx0001",
                    "university": "武汉大学", "major": "计算机科学与技术", "grade": "大三",
                },
                "education": [{
                    "school": "武汉大学", "major": "计算机科学与技术", "degree": "本科",
                    "start": "2023-09", "end": "2027-06", "gpa": "3.85/4.0", "rank": "前5%",
                }],
                "research": [{
                    "title": "基于大语言模型的信息检索优化",
                    "role": "核心成员", "period": "2025.03 - 2025.12",
                    "description": "参与导师课题，负责 RAG 模块的设计与实现，提升检索 F1 值 5.2%",
                }],
                "publications": [{
                    "title": "Improving Dense Retrieval with LLM-based Query Expansion",
                    "venue": "ACL 2026 Workshop", "status": "已发表",
                }],
                "awards": [
                    {"title": "全国大学生数学建模竞赛国家二等奖", "level": "国家级", "date": "2025.11"},
                    {"title": "武汉大学优秀学生奖学金", "level": "校级", "date": "2024.10"},
                ],
                "skills": ["Python", "PyTorch", "Transformers", "Linux", "Git"],
            }
            db.add(ResumeDraft(user_id=users[0].id, data=resume_data))

            interview_data = InterviewSession(
                user_id=users[0].id,
                config={"type": "综合", "difficulty": "中等", "duration_minutes": 15},
                messages=[
                    {"role": "interviewer", "content": "请做一个简短的自我介绍。"},
                    {"role": "candidate", "content": "老师好，我是来自武汉大学计算机科学与技术专业的张三，GPA 排名前5%，研究方向是自然语言处理..."},
                    {"role": "interviewer", "content": "你为什么选择我们学校/专业？"},
                    {"role": "candidate", "content": "贵校在 NLP 领域有深厚的学术积累，特别是在信息检索和对话系统方面..."},
                ],
                status="ended",
                report={
                    "total_score": 85,
                    "dimensions": {
                        "expression": {"score": 88, "label": "表达能力"},
                        "knowledge": {"score": 82, "label": "专业知识"},
                        "adaptability": {"score": 80, "label": "应变能力"},
                        "overall_quality": {"score": 87, "label": "综合素质"},
                    },
                    "strengths": ["表达清晰流畅", "科研经历具体", "研究规划明确"],
                    "improvements": ["专业深度可加强", "英文表达待提升"],
                    "overall": "表现良好，展现了扎实的专业基础和清晰的研究规划。",
                },
            )
            db.add(interview_data)
            await db.flush()
            print("   ✅ 创建 1 份简历草稿 + 1 场面试记录")
        except ImportError:
            print("   ⏭️  AI 模型尚未创建，跳过简历/面试数据")

        await db.commit()
        print("")
        print("🎉 演示数据填充完成！")
        print("")
        print("演示账号（密码统一为 test123456）：")
        for u in users:
            print(f"   📧 {u.email}  ({u.nickname} — {u.university})")


if __name__ == "__main__":
    asyncio.run(main())
