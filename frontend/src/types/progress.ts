/** 任务优先级 */
export type TaskPriority = "high" | "medium" | "low";

/** 任务状态 */
export type TaskStatus = "todo" | "in_progress" | "done" | "overdue";

/** 规划阶段 */
export interface PlanPhase {
  id: number;
  /** 阶段名称 */
  name: string;
  /** 阶段描述 */
  description: string;
  /** 开始日期 */
  start_date: string;
  /** 结束日期 */
  end_date: string;
  /** 完成百分比 0-100 */
  progress: number;
  /** 颜色标识 */
  color: string;
  /** 包含的任务 ID 列表 */
  task_ids: number[];
}

/** 任务 */
export interface Task {
  id: number;
  /** 任务标题 */
  title: string;
  /** 任务描述 */
  description: string;
  /** 所属阶段 ID */
  phase_id: number;
  /** 优先级 */
  priority: TaskPriority;
  /** 状态 */
  status: TaskStatus;
  /** 截止日期 */
  due_date: string;
  /** 完成日期 */
  completed_at?: string;
  /** 标签 */
  tags: string[];
  /** 来源 */
  source: "ai_generated" | "manual";
  /** 提醒设置 */
  reminder?: string;
  /** 创建时间 */
  created_at: string;
}

/** 成果类型 */
export type AchievementType = "科研" | "论文" | "竞赛" | "英语" | "面试" | "实习" | "志愿服务" | "其他";

/** 成果记录 */
export interface Achievement {
  id: number;
  /** 成果标题 */
  title: string;
  /** 成果描述 */
  description: string;
  /** 成果类型 */
  type: AchievementType;
  /** 获得日期 */
  date: string;
  /** 证明材料 URL */
  proof_urls: string[];
  /** 重要程度 1-5 */
  importance: number;
  /** 标签 */
  tags: string[];
  /** 创建时间 */
  created_at: string;
}

/** 进度统计 */
export interface ProgressStats {
  /** 总任务数 */
  total_tasks: number;
  /** 已完成任务数 */
  completed_tasks: number;
  /** 进行中任务数 */
  in_progress_tasks: number;
  /** 逾期任务数 */
  overdue_tasks: number;
  /** 总体完成率 */
  completion_rate: number;
  /** 连续打卡天数 */
  streak_days: number;
  /** 成果总数 */
  total_achievements: number;
  /** 本周完成任务数 */
  weekly_completed: number;
}

/** 打卡记录（进度中心版） */
export interface ProgressCheckin {
  id: number;
  /** 打卡日期 */
  date: string;
  /** 学习时长（分钟） */
  duration: number;
  /** 学习内容 */
  content: string;
  /** 心情 */
  mood: string;
  /** 标签 */
  tags: string[];
  /** 关联任务 ID */
  related_task_ids: number[];
}
