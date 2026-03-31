"use client";

import { useState } from "react";
import { Network } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ForceGraph } from "@/components/graph/ForceGraph";
import GraphDetailPanel from "@/components/graph/GraphDetailPanel";
import GraphToolbar from "@/components/graph/GraphToolbar";
import { knowledgeSystemGraphData } from "@/lib/mock-graph-data";
import type { GraphNode, GraphNodeType } from "@/types/graph";

/* ================================================================
   保研知识体系图谱 — 嵌入知识库首页
   展示保研全流程的知识点网络
   ================================================================ */

export default function KnowledgeSystemGraph() {
  const [filterTypes, setFilterTypes] = useState<GraphNodeType[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  const availableTypes = [...new Set(knowledgeSystemGraphData.nodes.map((n) => n.type))] as GraphNodeType[];

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Network className="h-5 w-5 text-primary" />
        <h2 className="font-bold text-lg">保研知识体系图谱</h2>
      </div>
      <Card className="shadow-sm overflow-hidden">
        <CardContent className="p-4">
          <GraphToolbar
            availableTypes={availableTypes}
            filterTypes={filterTypes}
            onFilterChange={setFilterTypes}
          />
          <div className="relative h-[450px]">
            <ForceGraph
              data={knowledgeSystemGraphData}
              filterTypes={filterTypes.length > 0 ? filterTypes : undefined}
              onNodeClick={setSelectedNode}
            />
            <GraphDetailPanel
              node={selectedNode}
              onClose={() => setSelectedNode(null)}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center mt-3">
            以网络图形式展示保研全流程知识点关联，点击节点查看详情
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
