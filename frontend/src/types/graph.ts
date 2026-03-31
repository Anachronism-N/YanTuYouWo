/* ================================================================
   知识图谱类型定义
   ================================================================ */

/** 图谱节点类型 */
export type GraphNodeType =
  | "school"
  | "department"
  | "tutor"
  | "question"
  | "experience"
  | "note"
  | "tag"
  | "notice"
  | "user"       // 个人路径图谱中心
  | "milestone"  // 保研阶段
  | "material"   // 材料（简历/个人陈述等）
  | "achievement" // 成果
  | "topic";     // 知识体系主题

/** 图谱关系类型 */
export type GraphEdgeType =
  | "belongs_to"  // 属于（学院→院校）
  | "related"     // 相关
  | "tagged"      // 标签关联
  | "references"  // 引用
  | "similar"     // AI 发现的相似关系
  | "targets"     // 目标（用户→院校）
  | "contains"    // 包含（主题→子主题）
  | "flow";       // 流向（阶段→阶段）

/** 节点类型配色 */
export const NODE_TYPE_CONFIG: Record<GraphNodeType, {
  label: string;
  emoji: string;
  color: string;       // 填充色
  borderColor: string; // 边框色
  textColor: string;   // 文字色
}> = {
  school:      { label: "院校",   emoji: "🏫", color: "#3B82F6", borderColor: "#2563EB", textColor: "#1D4ED8" },
  department:  { label: "学院",   emoji: "📚", color: "#8B5CF6", borderColor: "#7C3AED", textColor: "#6D28D9" },
  tutor:       { label: "导师",   emoji: "👨‍🏫", color: "#10B981", borderColor: "#059669", textColor: "#047857" },
  question:    { label: "面试题", emoji: "❓", color: "#F59E0B", borderColor: "#D97706", textColor: "#B45309" },
  experience:  { label: "经验帖", emoji: "✍️", color: "#EC4899", borderColor: "#DB2777", textColor: "#BE185D" },
  note:        { label: "笔记",   emoji: "📝", color: "#06B6D4", borderColor: "#0891B2", textColor: "#0E7490" },
  tag:         { label: "标签",   emoji: "🏷️", color: "#6B7280", borderColor: "#4B5563", textColor: "#374151" },
  notice:      { label: "通知",   emoji: "📢", color: "#EF4444", borderColor: "#DC2626", textColor: "#B91C1C" },
  user:        { label: "我",     emoji: "👤", color: "#6366F1", borderColor: "#4F46E5", textColor: "#4338CA" },
  milestone:   { label: "阶段",   emoji: "🎯", color: "#14B8A6", borderColor: "#0D9488", textColor: "#0F766E" },
  material:    { label: "材料",   emoji: "📄", color: "#F97316", borderColor: "#EA580C", textColor: "#C2410C" },
  achievement: { label: "成果",   emoji: "🏆", color: "#EAB308", borderColor: "#CA8A04", textColor: "#A16207" },
  topic:       { label: "主题",   emoji: "💡", color: "#A855F7", borderColor: "#9333EA", textColor: "#7E22CE" },
};

/** 关系类型配置 */
export const EDGE_TYPE_CONFIG: Record<GraphEdgeType, {
  label: string;
  style: "solid" | "dashed" | "dotted";
  color: string;
  width: number;
}> = {
  belongs_to: { label: "属于",     style: "solid",  color: "#94A3B8", width: 1.5 },
  related:    { label: "相关",     style: "dashed", color: "#94A3B8", width: 1 },
  tagged:     { label: "标签关联", style: "dotted", color: "#94A3B8", width: 0.8 },
  references: { label: "引用",     style: "solid",  color: "#60A5FA", width: 1.5 },
  similar:    { label: "相似",     style: "dashed", color: "#C4B5FD", width: 0.6 },
  targets:    { label: "目标",     style: "solid",  color: "#F59E0B", width: 2 },
  contains:   { label: "包含",     style: "solid",  color: "#94A3B8", width: 1.2 },
  flow:       { label: "流向",     style: "solid",  color: "#10B981", width: 2 },
};

/** 图谱节点 */
export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  description?: string;
  metadata?: Record<string, unknown>;
  weight?: number;
  // D3 力导向布局会自动添加以下属性
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

/** 图谱边 */
export interface GraphEdge {
  source: string | GraphNode;
  target: string | GraphNode;
  type: GraphEdgeType;
  label?: string;
  weight?: number;
}

/** 图谱数据 */
export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** 图谱场景类型 */
export type GraphScene =
  | "personal"    // 个人知识图谱
  | "school"      // 院校关系图谱
  | "knowledge"   // 保研知识体系图谱
  | "path";       // 个人保研路径图谱
