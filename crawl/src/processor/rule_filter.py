from __future__ import annotations

"""规则过滤器 - 基于关键词权重的相关性评分"""

import re
from loguru import logger


def relevance_score(title: str) -> float:
    """
    基于关键词权重的相关性评分。

    返回值：
    - score >= 0.5 → 高置信度，直接进入 LLM 提取（跳过分类）
    - 0.2 <= score < 0.5 → 中等置信度，需 LLM 分类确认
    - score < 0.2 → 低置信度，直接丢弃

    Args:
        title: 通知标题

    Returns:
        相关性评分 (0.0 ~ 2.0+)
    """
    score = 0.0
    title_stripped = title.strip()
    title_len = len(title_stripped)

    # 标题太短（<4字）大概率是导航链接
    if title_len < 4:
        return 0.0

    # 导航/栏目类标题 — 这些是网站导航链接，不是通知（提前检测，避免后续加分）
    if re.search(
        r"^(学院领导|历任院长|组织机构|全职教授|名誉教授|特聘教授|荣休教授|兼职教授"
        r"|教授研究|教学网络|社会责任|学院新闻|学院概况|学院简介|师资队伍|科学研究"
        r"|人才培养|党建工作|学生工作|院务公开|联系我们|学科建设|实验室|下载中心"
        r"|教学管理|培养方案|课程大纲|专业设置|光华视频|党建专题|活动回顾|近期活动"
        r"|思想光华|E-Newsletter|教授|副教授|讲师|助理教授"
        r"|硕士研究生|博士研究生|本科生|留学生|博士后|在职研究生"
        r"|招生动态|招生报名|录取信息|报考指南|外事指南|科研机构"
        r"|学术报告|学术讲座|学术交流|学术活动|科研动态|科研成果"
        r"|通知公告|新闻动态|学院动态|工作动态|综合新闻"
        r"|规章制度|下载专区|办事流程|常见问题|联系方式"
        r"|本科教育|研究生教育|继续教育|国际教育|教育培训"
        r"|学位授予|学位论文|毕业论文|开题报告"
        r"|实习实践|社会实践|创新创业|就业指导|就业信息"
        r"|硕士招生|博士招生|招生信息|研究生招生|招生就业|招生工作"
        r"|本科生招生|博士生招生|硕士生招生|硕博士招生|留学项目招生简章"
        r"|招生简章|研究生培养|学工通知|实验室概况|党的建设)$",
        title_stripped,
    ):
        return 0.0

    # 短标题惩罚（<8字的标题大概率是导航链接或栏目名，除非包含强关键词）
    has_strong_keyword = bool(re.search(
        r"推免|推荐免试|夏令营|预推免|直博|硕博连读|优秀大学生|暑期学校", title
    ))
    if title_len < 8 and not has_strong_keyword:
        # 短标题如果只匹配弱关键词（如"招生"、"硕士"），直接丢弃
        return 0.0

    # 强相关关键词 (+1.0)
    if has_strong_keyword:
        score += 1.0

    # 中等相关 (+0.5)
    if re.search(
        r"接收.*研究生|招收.*研究生|优秀大学生|暑期学校|优才计划|拔尖计划|暑期夏令营"
        r"|保研|免试攻读|选拔.*研究生|申请.*考核|申请考核制|博士.*招生|硕士.*招生"
        r"|招生简章|招生目录|招生计划|复试.*名单|拟录取|录取.*名单",
        title,
    ):
        score += 0.5

    # 弱相关 (+0.2) — 仅在标题足够长时才加分
    if re.search(r"招生|研究生|复试|面试|录取|调档|报到", title):
        score += 0.2

    # 更弱相关 (+0.1) — 通知/公告类标题，可能包含招生信息
    if re.search(r"通知|公告|公示|通告|简章|章程|办法|方案|安排|须知", title):
        score += 0.1

    # 年份标识（通常招生通知会包含年份）(+0.1)
    if re.search(r"20\d{2}年|20\d{2}届", title):
        score += 0.1

    # 负面关键词 (-0.8)
    if re.search(
        r"考研|统考|调剂|期末|课程安排|放假|工资|采购|招标|中标|比价|维修|物业"
        r"|成绩查询|成绩复核|初试成绩|缴费|学费|奖学金评定|评优|评先|党课|团课|志愿服务"
        r"|运动会|文艺|迎新|军训|社团|竞赛|比赛|征文|演讲"
        r"|中期考核|学位申请|培养方案|开题报告|答辩|论文评审|学位论文"
        r"|课程表|选课|退课|补考|重修|毕业审核|离校手续"
        r"|申请考核制|申请.考核|博士.*考核|考核.*博士"
        r"|学业导师|工作细则|年度报告|授权点建设|第二学士学位"
        r"|联合培养.*签约|签订.*协议|工程硕博士.*联合",
        title,
    ):
        score -= 0.8

    # 强负面关键词 (-1.5)
    if re.search(
        r"食堂|宿舍|水电|停电|停水|失物|招聘|人事|工会|离退休|校友"
        r"|疫情|防控|核酸|健康打卡|返校|离校"
        r"|工程硕士|MBA|MPA|EMBA|MPAcc|在职.*硕士",
        title,
    ):
        score -= 1.5

    result = max(score, 0.0)
    logger.debug(f"相关性评分: {result:.2f} | {title}")
    return result


def batch_filter(
    items: list[dict],
    title_key: str = "title",
    source_type: str | None = None,
    min_score: float = 0.2,
) -> list[dict]:
    """
    批量过滤通知条目，添加相关性评分。

    对于招生类信息源，给予额外的基础分加成（+0.2），
    因为招生类源的通知大概率是招生相关的。

    Args:
        items: 通知条目列表，每项至少包含 title_key 指定的标题字段
        title_key: 标题字段名
        source_type: 信息源类型（招生/通知/新闻），用于加权
        min_score: 最低通过分数（默认0.1，之前是0.2）

    Returns:
        添加了 relevance_score 字段的条目列表（已按评分降序排列）
    """
    # 招生类信息源给予额外基础分
    type_bonus = 0.0
    if source_type == "招生":
        type_bonus = 0.3
    elif source_type == "通知":
        type_bonus = 0.1

    scored_items = []
    for item in items:
        title = item.get(title_key, "")
        base_score = relevance_score(title)
        # 源类型加成只在标题本身有正面关键词匹配时才生效
        # 避免导航链接因为源类型加成而通过过滤
        if base_score > 0:
            score = base_score + type_bonus
        else:
            score = base_score
        item["relevance_score"] = score
        if score >= min_score:
            scored_items.append(item)

    # 按评分降序排列
    scored_items.sort(key=lambda x: x["relevance_score"], reverse=True)

    logger.info(
        f"规则过滤: 输入 {len(items)} 条, "
        f"通过 {len(scored_items)} 条 (≥{min_score}), "
        f"高相关 {len([i for i in scored_items if i['relevance_score'] >= 0.5])} 条 (≥0.5)"
        + (f", 源类型加成: +{type_bonus}" if type_bonus > 0 else "")
    )

    return scored_items
