import type { KnowledgeGraph } from "@/types/graph";

/* ================================================================
   知识图谱 Mock 数据
   包含四种场景的示例数据
   ================================================================ */

/** 个人知识图谱 — 用户收藏/笔记/标签的关联关系 */
export const personalGraphData: KnowledgeGraph = {
  nodes: [
    // 院校
    { id: "s1", type: "school", label: "清华大学", weight: 5, metadata: { level: "985" } },
    { id: "s2", type: "school", label: "北京大学", weight: 4, metadata: { level: "985" } },
    { id: "s3", type: "school", label: "浙江大学", weight: 3, metadata: { level: "985" } },
    // 学院
    { id: "d1", type: "department", label: "计算机系", metadata: { school: "清华大学" } },
    { id: "d2", type: "department", label: "信息科学技术学院", metadata: { school: "北京大学" } },
    { id: "d3", type: "department", label: "计算机学院", metadata: { school: "浙江大学" } },
    // 导师
    { id: "t1", type: "tutor", label: "张教授", description: "研究方向：机器学习", metadata: { school: "清华大学" } },
    { id: "t2", type: "tutor", label: "李教授", description: "研究方向：NLP", metadata: { school: "北京大学" } },
    { id: "t3", type: "tutor", label: "王教授", description: "研究方向：计算机视觉", metadata: { school: "浙江大学" } },
    // 面试题
    { id: "q1", type: "question", label: "清华 CS 面试真题", description: "2026 夏令营面试题" },
    { id: "q2", type: "question", label: "北大信科面试真题", description: "2025 预推免面试题" },
    // 经验帖
    { id: "e1", type: "experience", label: "清华 CS 夏令营经验", description: "从准备到入营的全过程" },
    { id: "e2", type: "experience", label: "北大信科预推免经验", description: "面试流程和注意事项" },
    // 笔记
    { id: "n1", type: "note", label: "面试要点总结", description: "各校面试共性问题" },
    { id: "n2", type: "note", label: "个人陈述写作思路", description: "开头-中间-结尾结构" },
    { id: "n3", type: "note", label: "择校对比笔记", description: "清华 vs 北大 vs 浙大" },
    // 标签
    { id: "tag1", type: "tag", label: "机器学习" },
    { id: "tag2", type: "tag", label: "面试" },
    { id: "tag3", type: "tag", label: "夏令营" },
    { id: "tag4", type: "tag", label: "文书" },
  ],
  edges: [
    // 学院属于院校
    { source: "d1", target: "s1", type: "belongs_to" },
    { source: "d2", target: "s2", type: "belongs_to" },
    { source: "d3", target: "s3", type: "belongs_to" },
    // 导师属于学院
    { source: "t1", target: "d1", type: "belongs_to" },
    { source: "t2", target: "d2", type: "belongs_to" },
    { source: "t3", target: "d3", type: "belongs_to" },
    // 面试题相关院校
    { source: "q1", target: "s1", type: "related" },
    { source: "q2", target: "s2", type: "related" },
    // 经验帖相关院校
    { source: "e1", target: "s1", type: "related" },
    { source: "e2", target: "s2", type: "related" },
    // 笔记引用
    { source: "n1", target: "q1", type: "references" },
    { source: "n1", target: "q2", type: "references" },
    { source: "n3", target: "s1", type: "references" },
    { source: "n3", target: "s2", type: "references" },
    { source: "n3", target: "s3", type: "references" },
    // 标签关联
    { source: "t1", target: "tag1", type: "tagged" },
    { source: "t2", target: "tag1", type: "tagged" },
    { source: "q1", target: "tag2", type: "tagged" },
    { source: "q2", target: "tag2", type: "tagged" },
    { source: "e1", target: "tag3", type: "tagged" },
    { source: "n2", target: "tag4", type: "tagged" },
    // AI 发现的相似关系
    { source: "e1", target: "e2", type: "similar", label: "面试流程相似" },
    { source: "t1", target: "t3", type: "similar", label: "研究方向相近" },
  ],
};

/** 院校关系图谱 — 院校之间的关系 */
export const schoolGraphData: KnowledgeGraph = {
  nodes: [
    { id: "pku", type: "school", label: "北京大学", weight: 5, metadata: { level: "985", province: "北京" } },
    { id: "thu", type: "school", label: "清华大学", weight: 5, metadata: { level: "985", province: "北京" } },
    { id: "zju", type: "school", label: "浙江大学", weight: 4, metadata: { level: "985", province: "浙江" } },
    { id: "nju", type: "school", label: "南京大学", weight: 4, metadata: { level: "985", province: "江苏" } },
    { id: "sjtu", type: "school", label: "上海交通大学", weight: 4, metadata: { level: "985", province: "上海" } },
    { id: "fudan", type: "school", label: "复旦大学", weight: 4, metadata: { level: "985", province: "上海" } },
    { id: "ustc", type: "school", label: "中国科学技术大学", weight: 4, metadata: { level: "985", province: "安徽" } },
    { id: "hit", type: "school", label: "哈尔滨工业大学", weight: 3, metadata: { level: "985", province: "黑龙江" } },
    { id: "whu", type: "school", label: "武汉大学", weight: 3, metadata: { level: "985", province: "湖北" } },
    { id: "hust", type: "school", label: "华中科技大学", weight: 3, metadata: { level: "985", province: "湖北" } },
    { id: "xjtu", type: "school", label: "西安交通大学", weight: 3, metadata: { level: "985", province: "陕西" } },
    { id: "sysu", type: "school", label: "中山大学", weight: 3, metadata: { level: "985", province: "广东" } },
    // 标签节点（用于分组）
    { id: "r_bj", type: "tag", label: "北京", metadata: { group: "region" } },
    { id: "r_sh", type: "tag", label: "上海", metadata: { group: "region" } },
    { id: "r_hb", type: "tag", label: "湖北", metadata: { group: "region" } },
  ],
  edges: [
    // 同城关系
    { source: "pku", target: "thu", type: "related", label: "同城" },
    { source: "sjtu", target: "fudan", type: "related", label: "同城" },
    { source: "whu", target: "hust", type: "related", label: "同城" },
    // 同层次关系（C9 联盟）
    { source: "pku", target: "zju", type: "similar", label: "C9 联盟" },
    { source: "thu", target: "sjtu", type: "similar", label: "C9 联盟" },
    { source: "zju", target: "ustc", type: "similar", label: "C9 联盟" },
    { source: "nju", target: "fudan", type: "similar", label: "C9 联盟" },
    { source: "hit", target: "xjtu", type: "similar", label: "C9 联盟" },
    // 相似专业关系
    { source: "thu", target: "zju", type: "related", label: "CS 强校" },
    { source: "pku", target: "nju", type: "related", label: "理科强校" },
    { source: "sjtu", target: "xjtu", type: "related", label: "交大系" },
    // 地区标签
    { source: "pku", target: "r_bj", type: "tagged" },
    { source: "thu", target: "r_bj", type: "tagged" },
    { source: "sjtu", target: "r_sh", type: "tagged" },
    { source: "fudan", target: "r_sh", type: "tagged" },
    { source: "whu", target: "r_hb", type: "tagged" },
    { source: "hust", target: "r_hb", type: "tagged" },
  ],
};

/** 保研知识体系图谱 — 全局知识网络 */
export const knowledgeSystemGraphData: KnowledgeGraph = {
  nodes: [
    // 中心
    { id: "root", type: "topic", label: "保研", weight: 6 },
    // 一级主题
    { id: "t_school", type: "topic", label: "院校选择", weight: 4 },
    { id: "t_material", type: "topic", label: "材料准备", weight: 4 },
    { id: "t_camp", type: "topic", label: "夏令营", weight: 4 },
    { id: "t_pre", type: "topic", label: "预推免", weight: 4 },
    { id: "t_interview", type: "topic", label: "面试准备", weight: 4 },
    { id: "t_mental", type: "topic", label: "心理调适", weight: 3 },
    // 二级主题 — 院校选择
    { id: "t_985", type: "school", label: "985 院校" },
    { id: "t_211", type: "school", label: "211 院校" },
    { id: "t_tutor_select", type: "tutor", label: "导师选择" },
    // 二级主题 — 材料准备
    { id: "t_resume", type: "material", label: "简历" },
    { id: "t_ps", type: "material", label: "个人陈述" },
    { id: "t_rec", type: "material", label: "推荐信" },
    { id: "t_rp", type: "material", label: "研究计划" },
    // 二级主题 — 面试准备
    { id: "t_self_intro", type: "question", label: "自我介绍" },
    { id: "t_major", type: "question", label: "专业课问题" },
    { id: "t_research", type: "question", label: "科研经历" },
    { id: "t_english", type: "question", label: "英语口语" },
    // 二级主题 — 心理调适
    { id: "t_anxiety", type: "note", label: "焦虑管理" },
    { id: "t_pressure", type: "note", label: "压力释放" },
    { id: "t_confidence", type: "note", label: "自信建立" },
    // 三级主题 — 专业课
    { id: "t_ml", type: "tag", label: "机器学习" },
    { id: "t_ds", type: "tag", label: "数据结构" },
    { id: "t_os", type: "tag", label: "操作系统" },
  ],
  edges: [
    // 一级
    { source: "root", target: "t_school", type: "contains" },
    { source: "root", target: "t_material", type: "contains" },
    { source: "root", target: "t_camp", type: "contains" },
    { source: "root", target: "t_pre", type: "contains" },
    { source: "root", target: "t_interview", type: "contains" },
    { source: "root", target: "t_mental", type: "contains" },
    // 二级 — 院校选择
    { source: "t_school", target: "t_985", type: "contains" },
    { source: "t_school", target: "t_211", type: "contains" },
    { source: "t_school", target: "t_tutor_select", type: "contains" },
    // 二级 — 材料准备
    { source: "t_material", target: "t_resume", type: "contains" },
    { source: "t_material", target: "t_ps", type: "contains" },
    { source: "t_material", target: "t_rec", type: "contains" },
    { source: "t_material", target: "t_rp", type: "contains" },
    // 二级 — 面试准备
    { source: "t_interview", target: "t_self_intro", type: "contains" },
    { source: "t_interview", target: "t_major", type: "contains" },
    { source: "t_interview", target: "t_research", type: "contains" },
    { source: "t_interview", target: "t_english", type: "contains" },
    // 二级 — 心理调适
    { source: "t_mental", target: "t_anxiety", type: "contains" },
    { source: "t_mental", target: "t_pressure", type: "contains" },
    { source: "t_mental", target: "t_confidence", type: "contains" },
    // 三级 — 专业课
    { source: "t_major", target: "t_ml", type: "contains" },
    { source: "t_major", target: "t_ds", type: "contains" },
    { source: "t_major", target: "t_os", type: "contains" },
    // 跨主题关联
    { source: "t_camp", target: "t_interview", type: "related", label: "夏令营含面试" },
    { source: "t_pre", target: "t_interview", type: "related", label: "预推免含面试" },
    { source: "t_resume", target: "t_research", type: "related", label: "简历展示科研" },
  ],
};

/** 个人保研路径图谱 — 用户的目标/进度/资源关联 */
export const pathGraphData: KnowledgeGraph = {
  nodes: [
    // 中心
    { id: "me", type: "user", label: "我", weight: 6 },
    // 目标院校
    { id: "goal_thu", type: "school", label: "清华 CS", weight: 4, metadata: { status: "已投递夏令营" } },
    { id: "goal_pku", type: "school", label: "北大信科", weight: 4, metadata: { status: "准备中" } },
    { id: "goal_zju", type: "school", label: "浙大 CS", weight: 3, metadata: { status: "已投递预推免" } },
    // 材料
    { id: "mat_resume", type: "material", label: "简历", metadata: { progress: 85 } },
    { id: "mat_ps", type: "material", label: "个人陈述", metadata: { progress: 60 } },
    { id: "mat_rec", type: "material", label: "推荐信", metadata: { progress: 40 } },
    // 成果
    { id: "ach_paper", type: "achievement", label: "SCI 论文一篇", metadata: { importance: 5 } },
    { id: "ach_contest", type: "achievement", label: "数模国赛二等奖", metadata: { importance: 4 } },
    { id: "ach_cet6", type: "achievement", label: "CET-6 580 分", metadata: { importance: 3 } },
    // 阶段
    { id: "phase1", type: "milestone", label: "基础夯实期", metadata: { status: "completed" } },
    { id: "phase2", type: "milestone", label: "科研深耕期", metadata: { status: "in_progress" } },
    { id: "phase3", type: "milestone", label: "材料准备期", metadata: { status: "upcoming" } },
    { id: "phase4", type: "milestone", label: "投递冲刺期", metadata: { status: "upcoming" } },
    // 相关笔记
    { id: "pn1", type: "note", label: "清华面试要点", description: "3 篇笔记" },
    { id: "pn2", type: "note", label: "北大面试要点", description: "2 篇笔记" },
  ],
  edges: [
    // 目标
    { source: "me", target: "goal_thu", type: "targets", label: "目标" },
    { source: "me", target: "goal_pku", type: "targets", label: "目标" },
    { source: "me", target: "goal_zju", type: "targets", label: "目标" },
    // 材料
    { source: "me", target: "mat_resume", type: "related" },
    { source: "me", target: "mat_ps", type: "related" },
    { source: "me", target: "mat_rec", type: "related" },
    // 成果
    { source: "me", target: "ach_paper", type: "related" },
    { source: "me", target: "ach_contest", type: "related" },
    { source: "me", target: "ach_cet6", type: "related" },
    // 阶段流向
    { source: "phase1", target: "phase2", type: "flow" },
    { source: "phase2", target: "phase3", type: "flow" },
    { source: "phase3", target: "phase4", type: "flow" },
    { source: "me", target: "phase1", type: "related" },
    // 笔记关联目标
    { source: "pn1", target: "goal_thu", type: "references" },
    { source: "pn2", target: "goal_pku", type: "references" },
    // 成果支撑目标
    { source: "ach_paper", target: "goal_thu", type: "related", label: "支撑申请" },
    { source: "ach_paper", target: "goal_pku", type: "related", label: "支撑申请" },
    { source: "ach_contest", target: "goal_zju", type: "related", label: "支撑申请" },
  ],
};
