"use client";

import { useState } from "react";
import { Network } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ForceGraph } from "@/components/graph/ForceGraph";
import GraphDetailPanel from "@/components/graph/GraphDetailPanel";
import GraphToolbar from "@/components/graph/GraphToolbar";
import { pathGraphData } from "@/lib/mock-graph-data";
import type { GraphNode, GraphNodeType } from "@/types/graph";

/* ================================================================
   个人保研路径图谱 — 嵌入进度中心
   展示用户的目标院校、准备进度、相关资源的关联
   ================================================================ */

export default function PathGraph() {
  const [filterTypes, setFilterTypes] = useState<GraphNodeType[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  const availableTypes = [...new Set(pathGraphData.nodes.map((n) => n.type))] as GraphNodeType[];

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Network className="h-5 w-5 text-primary" />
        <h2 className="font-bold text-lg">我的保研路径图谱</h2>
      </div>
      <Card className="shadow-sm overflow-hidden">
        <CardContent className="p-4">
          <GraphToolbar
            availableTypes={availableTypes}
            filterTypes={filterTypes}
            onFilterChange={setFilterTypes}
          />
          <div className="relative h-[400px]">
            <ForceGraph
              data={pathGraphData}
              filterTypes={filterTypes.length > 0 ? filterTypes : undefined}
              onNodeClick={setSelectedNode}
            />
            <GraphDetailPanel
              node={selectedNode}
              onClose={() => setSelectedNode(null)}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center mt-3">
            以图谱形式展示你的目标院校、准备材料、成果和阶段进度的关联关系
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
