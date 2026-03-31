"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ForceGraph } from "@/components/graph/ForceGraph";
import GraphDetailPanel from "@/components/graph/GraphDetailPanel";
import GraphToolbar from "@/components/graph/GraphToolbar";
import { schoolGraphData } from "@/lib/mock-graph-data";
import type { GraphNode, GraphNodeType } from "@/types/graph";

/* ================================================================
   院校关系图谱 — 嵌入院校百科页面
   展示院校之间的关系（同层次、同地区、相似专业等）
   ================================================================ */

export default function SchoolRelationGraph() {
  const [filterTypes, setFilterTypes] = useState<GraphNodeType[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  const availableTypes = [...new Set(schoolGraphData.nodes.map((n) => n.type))] as GraphNodeType[];

  return (
    <Card className="shadow-sm overflow-hidden">
      <CardContent className="p-4">
        <GraphToolbar
          title="院校关系图谱"
          availableTypes={availableTypes}
          filterTypes={filterTypes}
          onFilterChange={setFilterTypes}
        />
        <div className="relative h-[500px]">
          <ForceGraph
            data={schoolGraphData}
            filterTypes={filterTypes.length > 0 ? filterTypes : undefined}
            onNodeClick={setSelectedNode}
          />
          <GraphDetailPanel
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
          />
        </div>
        <p className="text-xs text-muted-foreground text-center mt-3">
          展示 985 高校之间的关系网络（同城、C9 联盟、相似专业等），点击院校查看详情
        </p>
      </CardContent>
    </Card>
  );
}
