from __future__ import annotations

"""规则过滤器 - 基于关键词权重的相关性评分和 program_type 推断"""

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

    if title_len < 4:
        return 0.0

    # 导航/栏目类标题
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

    has_strong_keyword = bool(re.search(
        r"推免|推荐免试|夏令营|预推免|直博|硕博连读|优秀大学生|暑期学校|暑期营|秋令营|冬令营",
        title,
    ))
    if title_len < 8 and not has_strong_keyword:
        return 0.0

    # 强相关关键词 (+1.0)
    if has_strong_keyword:
        score += 1.0

    # 中等相关 (+0.5)
    if re.search(
        r"接收.*研究生|招收.*研究生|优秀大学生|暑期学校|优才计划|拔尖计划|暑期夏令营"
        r"|保研|免试攻读|选拔.*研究生|博士.*招生|硕士.*招生"
        r"|招生简章|招生目录|招生计划|复试.*名单|拟录取|录取.*名单"
        r"|入营名单|优营名单|候补名单|待录取"
        r"|接收.*推免|外校.*推免|校外.*推免"
        r"|暑期学术|学术夏令营|学术论坛.*招生",
        title,
    ):
        score += 0.5

    # 弱相关 (+0.2)
    if re.search(r"招生|研究生|复试|面试|录取|调档|报到", title):
        score += 0.2

    # 更弱相关 (+0.1)
    if re.search(r"通知|公告|公示|通告|简章|章程|办法|方案|安排|须知", title):
        score += 0.1

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
        r"|联合培养.*签约|签订.*协议|工程硕博士.*联合"
        r"|本科.*招生|高考|高招|艺考|体育特长|自主招生|保送生|强基计划|第二学士|高水平运动"
        r"|定向就业.*合同签订|社会实践.*表彰|限选课|选课通知"
        r"|初试成绩|成绩复核|复试分数线|复试基本分数线|考研调剂|统考调剂|一志愿复试|思政审核"
        r"|全国硕士研究生招生考试|考点考生须知|网报公告|报考点|网上确认指南"
        r"|硕士.*调剂方案|调剂工作办法|拟录取查询"
        r"|保留入学资格.*返校|公费师范.*在职攻读",
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

    # 旧通知降权：标题中含明显过期的年级/年份（2023级及更早）。
    # 真实场景里部分学院会把 2018/2019 年的夏令营、拟录取名单长期挂在
    # 列表页，这些对当前保研用户价值很低，降权使其不占据高相关前列。
    # 注意：只匹配 "20NN级" / "20NN年招生" 这类年级/年份标识，
    # 不影响 "2026-07-17" 这种日期前缀（无「级/年」紧随）。
    if re.search(r"20(?:1\d|2[0-3])\s*[级年]", title):
        score -= 0.6

    result = max(score, 0.0)
    logger.debug(f"相关性评分: {result:.2f} | {title}")
    return result


def infer_program_type(title: str, extracted_type: str | None = None) -> str:
    """
    从标题推断 program_type，用于纠正 LLM 分类结果。

    本平台聚焦「保研（推免）」，因此分类优先级设计为：
      夏令营 → 推免/预推免 → 直博/硕博连读 → 统考招生（非推免渠道）
      → 拟录取（推免）/入营名单 → 招生简章/宣讲 → 其他

    关键区分：把「统考 / 在职 / 定向 / 非全 / 专项博士 / 申请考核制」等
    非推免渠道明确归为「统考招生」，避免与推免信息混淆。

    Args:
        title: 通知标题
        extracted_type: LLM 提取的 program_type

    Returns:
        修正后的 program_type
    """
    if extracted_type and extracted_type not in ("其他", "null", "None", ""):
        return extracted_type

    # 1. 夏令营类（平台最核心目标之一，最高优先级）
    if re.search(
        r"夏令营|暑期学校|暑期营|暑期学术|秋令营|冬令营|研学营|学术营|学术论坛.*营|暑期.*论坛",
        title,
    ):
        return "夏令营"

    # 2. 明确推免类（平台另一核心目标）
    if re.search(
        r"推免|推荐免试|预推免|接收.{0,6}推免|免试攻读|优秀大学生.{0,8}(选拔|报名|招募)",
        title,
    ):
        # 推免语境下进一步细分名单类
        if re.search(r"拟录取|录取.{0,4}名单|待录取", title):
            return "拟录取"
        if re.search(r"入营|优营|候补.{0,4}名单|复试.{0,4}名单", title):
            return "入营名单"
        return "预推免"

    # 3. 直博 / 硕博连读（推免的特殊学位通道，明确字样）
    if re.search(r"直博|直接攻博", title):
        return "直博"
    if re.search(r"硕博连读", title):
        return "硕博连读"

    # 4. 统考 / 非推免渠道识别（保研平台应与推免严格区分）
    #    覆盖：初试、统考、考试大纲/科目、分数线、调剂、报考点，
    #    以及在职/定向/非全/专项/港澳台/申请考核制等博士非推免通道
    if re.search(
        r"初试|统考|全国硕士研究生招生考试|考试大纲|考试科目|"
        r"复试.{0,6}分数线|基本分数线|调剂|报考点|网上确认|网报公告|"
        r"申请.{0,2}考核制|在职.{0,4}(攻读|研究生|博士|硕士)|"
        r"定向.{0,2}(就业|培养)|非全日制|专项.{0,4}(博士|硕士|计划|生)|港澳台.{0,4}(研究生|招生|硕士|博士)",
        title,
    ):
        return "统考招生"

    # 5. 拟录取（未命中推免上下文 → 多为统考/博士拟录取，归入统考招生）
    if re.search(r"拟录取|录取.{0,4}名单|待录取", title):
        return "统考招生"

    # 6. 入营 / 优营名单（无明确推免字样但常见于推免流程）
    if re.search(r"入营|优营|候补.{0,4}名单", title):
        return "入营名单"

    # 7. 招生简章 / 目录 / 计划
    if re.search(
        r"招生简章|招生目录|招生计划|招生办法|实施细则|实施办法|工作办法|联合培养|联合招生",
        title,
    ):
        return "招生简章"

    # 8. 招生宣讲
    if re.search(r"宣讲|招生.{0,2}说明|报考指南|招生咨询", title):
        return "招生宣讲"

    # 9. 通用硕博招生（兜底归入招生简章）
    if re.search(
        r"博士.{0,4}招生|招.{0,2}博士|攻读.{0,2}博士|硕士.{0,4}招生|招.{0,2}硕士|攻读.{0,2}硕士",
        title,
    ):
        return "招生简章"

    # 10. 报名类通知（多为预推免报名）
    if re.search(r"报名.{0,2}通知|预报名|报名.{0,2}系统", title):
        return "预推免"

    return extracted_type or "其他"


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
