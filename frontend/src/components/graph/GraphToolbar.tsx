"use client";

import { useState } from "react";
import { Filter, RotateCcw, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { GraphNodeType, GraphNode } from "@/types/graph";
import { NODE_TYPE_CONFIG } from "@/types/graph";

/* ================================================================
   图谱工具栏 — 节点类型筛选 + 缩放控制
   ================================================================ */

interface GraphToolbarProps {
  /** 图谱中出现的节点类型 */
  availableTypes: GraphNodeType[];
  /** 当前选中的筛选类型 */
  filterTypes: GraphNodeType[];
  /** 筛选变更回调 */
  onFilterChange: (types: GraphNodeType[]) => void;
  /** 重置视图 */
  onReset?: () => void;
  /** 标题 */
  title?: string;
}

export default function GraphToolbar({
  availableTypes,
  filterTypes,
  onFilterChange,
  onReset,
  title,
}: GraphToolbarProps) {
  const [showFilter, setShowFilter] = useState(false);

  const toggleType = (type: GraphNodeType) => {
    if (filterTypes.length === 0) {
      // 当前显示全部，点击某个类型 = 只显示该类型
      onFilterChange([type]);
    } else if (filterTypes.includes(type)) {
      const next = filterTypes.filter((t) => t !== type);
      onFilterChange(next); // 空数组 = 显示全部
    } else {
      onFilterChange([...filterTypes, type]);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <div className="flex items-center gap-2">
        {title && <h3 className="font-bold text-sm">{title}</h3>}
        <Button
          variant="outline"
          size="sm"
          className={cn("h-7 gap-1 text-xs", showFilter && "bg-primary/10 text-primary")}
          onClick={() => setShowFilter(!showFilter)}
        >
          <Filter className="h-3 w-3" />
          筛选
          {filterTypes.length > 0 && (
            <Badge className="h-4 min-w-4 px-1 text-xs bg-primary text-primary-foreground">
              {filterTypes.length}
            </Badge>
          )}
        </Button>
        {showFilter && (
          <div className="flex flex-wrap gap-1">
            {availableTypes.map((type) => {
              const config = NODE_TYPE_CONFIG[type];
              const active = filterTypes.length === 0 || filterTypes.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium transition-all border",
                    active
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-transparent bg-muted/50 text-muted-foreground opacity-50 hover:opacity-80",
                  )}
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: config.color }}
                  />
                  {config.label}
                </button>
              );
            })}
            {filterTypes.length > 0 && (
              <button
                onClick={() => onFilterChange([])}
                className="text-xs text-primary hover:underline px-1"
              >
                重置
              </button>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1">
        {onReset && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onReset} title="重置视图">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
