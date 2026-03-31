"use client";

import { useRef, useEffect, useCallback, useState, memo } from "react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";
import type { GraphNode, GraphEdge, KnowledgeGraph, GraphNodeType } from "@/types/graph";
import { NODE_TYPE_CONFIG, EDGE_TYPE_CONFIG } from "@/types/graph";
import { cn } from "@/lib/utils";

/* ================================================================
   ForceGraph — 基于 D3 力导向布局 + Canvas 渲染的知识图谱组件
   
   性能策略：
   - Canvas 渲染（非 SVG DOM），支持数百节点
   - requestAnimationFrame 仅在模拟运行时触发
   - 鼠标交互通过 Canvas 坐标计算，无额外 DOM
   ================================================================ */

interface ForceGraphProps {
  data: KnowledgeGraph;
  className?: string;
  /** 节点类型筛选（为空则显示全部） */
  filterTypes?: GraphNodeType[];
  /** 点击节点回调 */
  onNodeClick?: (node: GraphNode) => void;
  /** 是否显示标签 */
  showLabels?: boolean;
}

// 扩展 D3 节点类型
type SimNode = GraphNode & SimulationNodeDatum;
type SimLink = SimulationLinkDatum<SimNode> & { type: GraphEdge["type"]; label?: string };

function ForceGraphInner({ data, className, filterTypes, onNodeClick, showLabels = true }: ForceGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<ReturnType<typeof forceSimulation<SimNode>> | null>(null);
  const nodesRef = useRef<SimNode[]>([]);
  const linksRef = useRef<SimLink[]>([]);
  const hoveredRef = useRef<SimNode | null>(null);
  const dragRef = useRef<{ node: SimNode; offsetX: number; offsetY: number } | null>(null);
  const transformRef = useRef({ x: 0, y: 0, k: 1 });
  const rafRef = useRef<number>(0);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const isDarkRef = useRef(false);

  // 监听深色模式
  useEffect(() => {
    const check = () => { isDarkRef.current = document.documentElement.classList.contains("dark"); };
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // 初始化模拟
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // 筛选节点
    const filteredNodeIds = new Set<string>();
    let nodes: SimNode[] = data.nodes.map((n) => ({ ...n }));
    if (filterTypes && filterTypes.length > 0) {
      nodes = nodes.filter((n) => filterTypes.includes(n.type));
      nodes.forEach((n) => filteredNodeIds.add(n.id));
    } else {
      nodes.forEach((n) => filteredNodeIds.add(n.id));
    }

    const links: SimLink[] = data.edges
      .filter((e) => {
        const sid = typeof e.source === "string" ? e.source : e.source.id;
        const tid = typeof e.target === "string" ? e.target : e.target.id;
        return filteredNodeIds.has(sid) && filteredNodeIds.has(tid);
      })
      .map((e) => ({
        source: typeof e.source === "string" ? e.source : e.source.id,
        target: typeof e.target === "string" ? e.target : e.target.id,
        type: e.type,
        label: e.label,
      })) as SimLink[];

    nodesRef.current = nodes;
    linksRef.current = links;

    // 创建力模拟 — 优化参数使布局更清晰
    const sim = forceSimulation<SimNode>(nodes)
      .force("link", forceLink<SimNode, SimLink>(links)
        .id((d) => d.id)
        .distance((l) => {
          // 根据关系类型调整距离：包含关系短、相似关系长
          const t = (l as SimLink).type;
          if (t === "contains" || t === "belongs_to") return 65;
          if (t === "flow") return 80;
          if (t === "similar" || t === "tagged") return 130;
          return 100;
        })
        .strength((l) => {
          const t = (l as SimLink).type;
          if (t === "contains" || t === "belongs_to") return 0.6;
          if (t === "targets" || t === "flow") return 0.4;
          return 0.15;
        })
      )
      .force("charge", forceManyBody()
        .strength((d) => {
          // 权重大的节点排斥力更强，形成中心
          const w = (d as SimNode).weight ?? 1;
          return -120 - w * 40;
        })
      )
      .force("center", forceCenter(width / 2, height / 2).strength(0.05))
      .force("collide", forceCollide<SimNode>().radius((d) => getNodeRadius(d) + 8).strength(0.8))
      .alphaDecay(0.015)
      .velocityDecay(0.35)
      .on("tick", () => draw());

    simRef.current = sim;

    // 绘制函数
    function draw() {
      const ctx = canvas!.getContext("2d");
      if (!ctx) return;
      const dpr = window.devicePixelRatio;
      const t = transformRef.current;
      const dark = isDarkRef.current;

      ctx.save();
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);
      ctx.scale(dpr, dpr);
      ctx.translate(t.x, t.y);
      ctx.scale(t.k, t.k);

      // 绘制边
      for (const link of linksRef.current) {
        const source = link.source as SimNode;
        const target = link.target as SimNode;
        if (source.x == null || source.y == null || target.x == null || target.y == null) continue;

        const edgeConfig = EDGE_TYPE_CONFIG[link.type];
        const isHighlighted = hoveredRef.current &&
          ((source.id === hoveredRef.current.id) || (target.id === hoveredRef.current.id));

        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.strokeStyle = isHighlighted
          ? (dark ? "rgba(147,197,253,0.6)" : "rgba(59,130,246,0.5)")
          : (dark ? "rgba(148,163,184,0.15)" : "rgba(148,163,184,0.25)");
        ctx.lineWidth = isHighlighted ? edgeConfig.width * 1.5 : edgeConfig.width;

        if (edgeConfig.style === "dashed") {
          ctx.setLineDash([4, 4]);
        } else if (edgeConfig.style === "dotted") {
          ctx.setLineDash([2, 3]);
        } else {
          ctx.setLineDash([]);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // 边标签
        if (link.label && t.k > 0.7) {
          const mx = (source.x + target.x) / 2;
          const my = (source.y + target.y) / 2;
          ctx.font = `${9 / t.k}px system-ui`;
          ctx.fillStyle = dark ? "rgba(148,163,184,0.5)" : "rgba(100,116,139,0.6)";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(link.label, mx, my - 4 / t.k);
        }
      }

      // 绘制节点
      for (const node of nodesRef.current) {
        if (node.x == null || node.y == null) continue;
        const config = NODE_TYPE_CONFIG[node.type];
        const r = getNodeRadius(node);
        const isHovered = hoveredRef.current?.id === node.id;
        const isConnected = hoveredRef.current && linksRef.current.some((l) => {
          const sid = (l.source as SimNode).id;
          const tid = (l.target as SimNode).id;
          return (sid === hoveredRef.current!.id && tid === node.id) ||
                 (tid === hoveredRef.current!.id && sid === node.id);
        });
        const dimmed = hoveredRef.current && !isHovered && !isConnected;

        // 节点圆
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fillStyle = dimmed
          ? (dark ? "rgba(51,65,85,0.4)" : "rgba(226,232,240,0.6)")
          : config.color;
        ctx.globalAlpha = dimmed ? 0.3 : (isHovered ? 1 : 0.85);
        ctx.fill();

        // 边框
        if (isHovered) {
          ctx.strokeStyle = dark ? "#fff" : config.borderColor;
          ctx.lineWidth = 2.5;
          ctx.stroke();
          // 光晕
          ctx.beginPath();
          ctx.arc(node.x, node.y, r + 4, 0, Math.PI * 2);
          ctx.strokeStyle = config.color;
          ctx.globalAlpha = 0.3;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.globalAlpha = 1;

        // Emoji 图标
        const fontSize = Math.max(r * 0.9, 8);
        ctx.font = `${fontSize}px system-ui`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(config.emoji, node.x, node.y);

        // 标签
        if (showLabels && t.k > 0.5) {
          ctx.font = `${Math.max(10 / t.k, 9)}px system-ui`;
          ctx.fillStyle = dimmed
            ? (dark ? "rgba(148,163,184,0.3)" : "rgba(100,116,139,0.3)")
            : (dark ? "rgba(226,232,240,0.9)" : "rgba(30,41,59,0.85)");
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillText(node.label, node.x, node.y + r + 3);
        }
      }

      ctx.restore();
    }

    // 初始绘制
    draw();

    return () => {
      sim.stop();
      cancelAnimationFrame(rafRef.current);
    };
  }, [data, filterTypes, showLabels]);

  // 坐标转换
  const screenToGraph = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const t = transformRef.current;
    return {
      x: (clientX - rect.left - t.x) / t.k,
      y: (clientY - rect.top - t.y) / t.k,
    };
  }, []);

  // 查找节点
  const findNode = useCallback((gx: number, gy: number): SimNode | null => {
    for (let i = nodesRef.current.length - 1; i >= 0; i--) {
      const n = nodesRef.current[i];
      if (n.x == null || n.y == null) continue;
      const r = getNodeRadius(n);
      const dx = gx - n.x;
      const dy = gy - n.y;
      if (dx * dx + dy * dy < (r + 3) * (r + 3)) return n;
    }
    return null;
  }, []);

  // 鼠标移动
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (dragRef.current) {
      const { x, y } = screenToGraph(e.clientX, e.clientY);
      dragRef.current.node.fx = x;
      dragRef.current.node.fy = y;
      simRef.current?.alpha(0.1).restart();
      return;
    }

    const { x, y } = screenToGraph(e.clientX, e.clientY);
    const node = findNode(x, y);
    const prev = hoveredRef.current;
    hoveredRef.current = node;

    if (node !== prev) {
      canvas.style.cursor = node ? "pointer" : "grab";
      setHoveredNode(node);
      if (node) {
        const rect = canvas.getBoundingClientRect();
        setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
      // 触发重绘
      simRef.current?.alpha(0.01).restart();
    }
  }, [screenToGraph, findNode]);

  // 鼠标按下
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const { x, y } = screenToGraph(e.clientX, e.clientY);
    const node = findNode(x, y);
    if (node) {
      dragRef.current = { node, offsetX: 0, offsetY: 0 };
      node.fx = node.x;
      node.fy = node.y;
      simRef.current?.alphaTarget(0.1).restart();
      canvasRef.current!.style.cursor = "grabbing";
    } else {
      // 画布拖拽
      const startX = e.clientX;
      const startY = e.clientY;
      const startTx = transformRef.current.x;
      const startTy = transformRef.current.y;

      const onMove = (ev: MouseEvent) => {
        transformRef.current.x = startTx + (ev.clientX - startX);
        transformRef.current.y = startTy + (ev.clientY - startY);
        simRef.current?.alpha(0.01).restart();
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    }
  }, [screenToGraph, findNode]);

  // 鼠标松开
  const handleMouseUp = useCallback(() => {
    if (dragRef.current) {
      dragRef.current.node.fx = null;
      dragRef.current.node.fy = null;
      dragRef.current = null;
      simRef.current?.alphaTarget(0);
      canvasRef.current!.style.cursor = "grab";
    }
  }, []);

  // 点击
  const handleClick = useCallback((e: React.MouseEvent) => {
    const { x, y } = screenToGraph(e.clientX, e.clientY);
    const node = findNode(x, y);
    if (node && onNodeClick) {
      onNodeClick(node);
    }
  }, [screenToGraph, findNode, onNodeClick]);

  // 滚轮缩放
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const t = transformRef.current;
    const factor = e.deltaY > 0 ? 0.92 : 1.08;
    const newK = Math.max(0.2, Math.min(5, t.k * factor));
    t.x = mx - (mx - t.x) * (newK / t.k);
    t.y = my - (my - t.y) * (newK / t.k);
    t.k = newK;
    simRef.current?.alpha(0.01).restart();
  }, []);

  // 窗口 resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      simRef.current?.alpha(0.01).restart();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative w-full h-full min-h-[400px] rounded-xl overflow-hidden border bg-card", className)}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-grab"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        onWheel={handleWheel}
      />
      {/* Tooltip */}
      {hoveredNode && (
        <div
          className="absolute z-10 pointer-events-none px-3 py-2 rounded-lg border bg-popover shadow-lg text-sm max-w-[200px]"
          style={{
            left: tooltipPos.x + 12,
            top: tooltipPos.y - 10,
            transform: "translateY(-100%)",
          }}
        >
          <div className="flex items-center gap-1.5 mb-0.5">
            <span>{NODE_TYPE_CONFIG[hoveredNode.type].emoji}</span>
            <span className="font-semibold text-xs">{hoveredNode.label}</span>
          </div>
          {hoveredNode.description && (
            <p className="text-xs text-muted-foreground">{hoveredNode.description}</p>
          )}
          <p className="text-xs text-muted-foreground/70 mt-0.5">
            类型：{NODE_TYPE_CONFIG[hoveredNode.type].label}
          </p>
        </div>
      )}
      {/* 图例 */}
      <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5 max-w-[60%]">
        {getUniqueTypes(data.nodes).map((type) => (
          <span key={type} className="inline-flex items-center gap-1 rounded-md bg-card/90 backdrop-blur-sm border px-1.5 py-0.5 text-xs">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: NODE_TYPE_CONFIG[type].color }}
            />
            {NODE_TYPE_CONFIG[type].label}
          </span>
        ))}
      </div>
      {/* 操作提示 */}
      <div className="absolute top-3 right-3 text-xs text-muted-foreground/50 bg-card/80 backdrop-blur-sm rounded-md px-2 py-1 border">
        滚轮缩放 · 拖拽平移 · 拖拽节点 · 点击查看
      </div>
    </div>
  );
}

export const ForceGraph = memo(ForceGraphInner);

// ==================== 工具函数 ====================

function getNodeRadius(node: GraphNode): number {
  const base = 14;
  const weight = node.weight ?? 1;
  return base + weight * 2.5;
}

function getUniqueTypes(nodes: GraphNode[]): GraphNodeType[] {
  const types = new Set<GraphNodeType>();
  nodes.forEach((n) => types.add(n.type));
  return Array.from(types);
}
