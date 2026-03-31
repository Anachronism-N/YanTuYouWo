"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { GraphNode } from "@/types/graph";
import { NODE_TYPE_CONFIG } from "@/types/graph";
import Link from "next/link";

/* ================================================================
   图谱节点详情侧边面板
   点击节点后展开，显示节点详细信息和操作
   ================================================================ */

interface GraphDetailPanelProps {
  node: GraphNode | null;
  onClose: () => void;
}

/** 根据节点类型生成跳转链接 */
function getNodeLink(node: GraphNode): string | null {
  switch (node.type) {
    case "school": return `/info/schools/1`;
    case "tutor": return `/info/tutors/1`;
    case "notice": return `/info/notices/1`;
    case "question": return `/knowledge/questions`;
    case "experience": return `/knowledge/experiences`;
    default: return null;
  }
}

export default function GraphDetailPanel({ node, onClose }: GraphDetailPanelProps) {
  return (
    <AnimatePresence>
      {node && (
        <motion.div
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="absolute top-0 right-0 bottom-0 w-72 border-l bg-card shadow-xl z-20 overflow-y-auto"
        >
          {/* 头部 */}
          <div className="sticky top-0 bg-card/95 backdrop-blur-sm border-b p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white text-sm"
                style={{ background: NODE_TYPE_CONFIG[node.type].color }}
              >
                {NODE_TYPE_CONFIG[node.type].emoji}
              </span>
              <div>
                <h3 className="font-bold text-sm">{node.label}</h3>
                <Badge variant="secondary" className="text-xs mt-0.5">
                  {NODE_TYPE_CONFIG[node.type].label}
                </Badge>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* 内容 */}
          <div className="p-4 space-y-4">
            {/* 描述 */}
            {node.description && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-1">描述</h4>
                <p className="text-sm">{node.description}</p>
              </div>
            )}

            {/* 元数据 */}
            {node.metadata && Object.keys(node.metadata).length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-1.5">详细信息</h4>
                <div className="space-y-1.5">
                  {Object.entries(node.metadata).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground capitalize">{formatMetaKey(key)}</span>
                      <span className="font-medium">{formatMetaValue(key, value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 跳转链接 */}
            {getNodeLink(node) && (
              <Link href={getNodeLink(node)!}>
                <Button variant="outline" size="sm" className="w-full gap-1.5 mt-2">
                  <ExternalLink className="h-3.5 w-3.5" />
                  查看详情
                </Button>
              </Link>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function formatMetaKey(key: string): string {
  const map: Record<string, string> = {
    level: "层次",
    province: "省份",
    school: "所属院校",
    status: "状态",
    progress: "完成度",
    importance: "重要性",
    group: "分组",
  };
  return map[key] || key;
}

function formatMetaValue(key: string, value: unknown): string {
  if (key === "progress" && typeof value === "number") return `${value}%`;
  if (key === "importance" && typeof value === "number") return "⭐".repeat(value);
  if (key === "status") {
    const statusMap: Record<string, string> = {
      completed: "✅ 已完成",
      in_progress: "🔥 进行中",
      upcoming: "⏳ 即将开始",
    };
    return statusMap[String(value)] || String(value);
  }
  return String(value);
}
