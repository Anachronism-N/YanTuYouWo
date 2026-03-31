"use client";

import { memo, useRef, useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

/* ================================================================
   项目功能脑图 — 中心双侧展开思维导图
   每个叶子节点独立 ref，SVG 精确连线到每个节点
   ================================================================ */

interface MindNode {
  label: string;
  emoji?: string;
  children?: MindNode[];
}

// 左侧分支数据
const LEFT_BRANCHES: MindNode[] = [
  {
    label: "保研信息",
    emoji: "📢",
    children: [
      { label: "夏令营 | 预推免信息" },
      { label: "院校信息" },
      { label: "招聘信息" },
    ],
  },
  {
    label: "导师信息",
    emoji: "👨‍🏫",
    children: [
      { label: "导师画像" },
      { label: "评价与反馈" },
    ],
  },
  {
    label: "知识库",
    emoji: "📚",
    children: [
      { label: "基础信息" },
      { label: "各校情况" },
      { label: "录播课程" },
      { label: "面试题库" },
      { label: "文书模板" },
      { label: "经验 & 信息差" },
    ],
  },
];

// 右侧分支数据
const RIGHT_BRANCHES: MindNode[] = [
  {
    label: "AI 辅导",
    emoji: "🤖",
    children: [
      { label: "规划与建议" },
      { label: "简历制作" },
      { label: "择校择导" },
      {
        label: "模拟面试",
        children: [
          { label: "RAG 面试教练" },
          { label: "虚拟数字面试官" },
          { label: "ASR+TTS 实时交互" },
        ],
      },
      {
        label: "心理疏导",
        children: [
          { label: "心理学 Multi-Agent" },
          { label: "共情对话" },
        ],
      },
    ],
  },
  {
    label: "社群",
    emoji: "👥",
    children: [
      { label: "经验分享 & 发帖" },
      { label: "问答互助" },
      { label: "学习打卡" },
    ],
  },
  {
    label: "进度中心",
    emoji: "🎯",
    children: [
      { label: "规划管理" },
      { label: "任务追踪" },
      { label: "成果记录" },
    ],
  },
  {
    label: "技术架构",
    emoji: "⚙️",
    children: [
      { label: "Next.js + React 19" },
      { label: "FastAPI + PostgreSQL" },
      { label: "LLM + 向量数据库" },
      { label: "多源爬虫 + Celery" },
      { label: "加密 + 隐私保护" },
    ],
  },
];

// 分支颜色
const BRANCH_COLORS = [
  { bg: "bg-blue-50 dark:bg-blue-950/50", border: "border-blue-400 dark:border-blue-600", text: "text-blue-800 dark:text-blue-200", line: "#60a5fa", lineDark: "#3b82f6" },
  { bg: "bg-orange-50 dark:bg-orange-950/50", border: "border-orange-400 dark:border-orange-600", text: "text-orange-800 dark:text-orange-200", line: "#fb923c", lineDark: "#f97316" },
  { bg: "bg-emerald-50 dark:bg-emerald-950/50", border: "border-emerald-400 dark:border-emerald-600", text: "text-emerald-800 dark:text-emerald-200", line: "#34d399", lineDark: "#10b981" },
  { bg: "bg-violet-50 dark:bg-violet-950/50", border: "border-violet-400 dark:border-violet-600", text: "text-violet-800 dark:text-violet-200", line: "#a78bfa", lineDark: "#8b5cf6" },
  { bg: "bg-rose-50 dark:bg-rose-950/50", border: "border-rose-400 dark:border-rose-600", text: "text-rose-800 dark:text-rose-200", line: "#fb7185", lineDark: "#f43f5e" },
  { bg: "bg-amber-50 dark:bg-amber-950/50", border: "border-amber-400 dark:border-amber-600", text: "text-amber-800 dark:text-amber-200", line: "#fbbf24", lineDark: "#f59e0b" },
  { bg: "bg-cyan-50 dark:bg-cyan-950/50", border: "border-cyan-400 dark:border-cyan-600", text: "text-cyan-800 dark:text-cyan-200", line: "#22d3ee", lineDark: "#06b6d4" },
];

type Color = (typeof BRANCH_COLORS)[0];

/* ---- 叶子节点 ---- */
const Leaf = memo(function Leaf({ node, color }: { node: MindNode; color: Color }) {
  return (
    <div className={cn(
      "px-3.5 py-1.5 rounded-lg border text-[13px] leading-snug whitespace-nowrap",
      color.bg, color.border, color.text,
    )}>
      {node.emoji && <span className="mr-1">{node.emoji}</span>}
      {node.label}
    </div>
  );
});

/* ---- 三级子节点 ---- */
const SubLeaf = memo(function SubLeaf({ node, color }: { node: MindNode; color: Color }) {
  return (
    <div className={cn(
      "px-2.5 py-1 rounded-md border text-xs whitespace-nowrap opacity-90",
      color.bg, color.border, color.text,
    )}>
      {node.label}
    </div>
  );
});

/* ================================================================
   SVG 连线
   ================================================================ */

interface LineData {
  x1: number; y1: number;
  x2: number; y2: number;
  color: string;
  colorDark: string;
  width: number;
}

function ConnectorSvg({ lines, containerW, containerH }: {
  lines: LineData[];
  containerW: number;
  containerH: number;
}) {
  if (containerW === 0 || containerH === 0) return null;
  return (
    <svg
      className="absolute top-0 left-0 pointer-events-none"
      width={containerW}
      height={containerH}
      style={{ overflow: "visible" }}
    >
      {lines.map((l, i) => {
        const dx = l.x2 - l.x1;
        const cx = Math.abs(dx) * 0.5;
        const d = `M ${l.x1} ${l.y1} C ${l.x1 + (dx > 0 ? cx : -cx)} ${l.y1}, ${l.x2 + (dx > 0 ? -cx : cx)} ${l.y2}, ${l.x2} ${l.y2}`;
        return (
          <g key={i}>
            <path d={d} fill="none" stroke={l.color} strokeWidth={l.width} strokeLinecap="round" className="dark:hidden" />
            <path d={d} fill="none" stroke={l.colorDark} strokeWidth={l.width} strokeLinecap="round" className="hidden dark:block" />
          </g>
        );
      })}
    </svg>
  );
}

/* ================================================================
   辅助：扁平化所有叶子节点（包含三级）
   ================================================================ */
function flattenLeaves(nodes: MindNode[]): MindNode[] {
  const result: MindNode[] = [];
  for (const n of nodes) {
    result.push(n);
    // 三级节点也作为独立叶子
    if (n.children) {
      for (const sub of n.children) {
        result.push(sub);
      }
    }
  }
  return result;
}

/* ================================================================
   主组件
   ================================================================ */
export default function ProjectMindMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // 分支标签 refs: leftBranchRefs[branchIdx]
  const leftBranchRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const rightBranchRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // 叶子节点 refs: leafRefs["L-0-2"] = 左侧第0个分支的第2个叶子
  const leafRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  // 三级节点 refs: subLeafRefs["R-0-3-1"] = 右侧第0个分支的第3个叶子的第1个子节点
  const subLeafRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const [lines, setLines] = useState<LineData[]>([]);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  const measureAndDraw = useCallback(() => {
    const container = containerRef.current;
    const root = rootRef.current;
    if (!container || !root) return;

    const cRect = container.getBoundingClientRect();
    setContainerSize({ w: cRect.width, h: cRect.height });

    const rRect = root.getBoundingClientRect();
    const rootCx = rRect.left + rRect.width / 2 - cRect.left;
    const rootCy = rRect.top + rRect.height / 2 - cRect.top;

    const newLines: LineData[] = [];

    const getCenter = (el: HTMLDivElement) => {
      const r = el.getBoundingClientRect();
      return {
        cx: r.left + r.width / 2 - cRect.left,
        cy: r.top + r.height / 2 - cRect.top,
        left: r.left - cRect.left,
        right: r.right - cRect.left,
        top: r.top - cRect.top,
        bottom: r.bottom - cRect.top,
      };
    };

    // ===== 左侧 =====
    LEFT_BRANCHES.forEach((branch, bi) => {
      const branchEl = leftBranchRefs.current.get(bi);
      if (!branchEl) return;
      const color = BRANCH_COLORS[bi];
      const b = getCenter(branchEl);

      // 根 → 分支标签
      newLines.push({
        x1: rRect.left - cRect.left, y1: rootCy,
        x2: b.right, y2: b.cy,
        color: color.line, colorDark: color.lineDark, width: 2.5,
      });

      // 分支标签 → 每个叶子
      const children = branch.children ?? [];
      children.forEach((child, ci) => {
        const leafEl = leafRefs.current.get(`L-${bi}-${ci}`);
        if (!leafEl) return;
        const lf = getCenter(leafEl);
        newLines.push({
          x1: b.left, y1: b.cy,
          x2: lf.right, y2: lf.cy,
          color: color.line, colorDark: color.lineDark, width: 1.8,
        });

        // 叶子 → 三级子节点
        if (child.children) {
          child.children.forEach((_, si) => {
            const subEl = subLeafRefs.current.get(`L-${bi}-${ci}-${si}`);
            if (!subEl) return;
            const sf = getCenter(subEl);
            newLines.push({
              x1: lf.left, y1: lf.cy,
              x2: sf.right, y2: sf.cy,
              color: color.line, colorDark: color.lineDark, width: 1.2,
            });
          });
        }
      });
    });

    // ===== 右侧 =====
    RIGHT_BRANCHES.forEach((branch, bi) => {
      const branchEl = rightBranchRefs.current.get(bi);
      if (!branchEl) return;
      const colorIdx = bi + LEFT_BRANCHES.length;
      const color = BRANCH_COLORS[colorIdx];
      const b = getCenter(branchEl);

      // 根 → 分支标签
      newLines.push({
        x1: rRect.right - cRect.left, y1: rootCy,
        x2: b.left, y2: b.cy,
        color: color.line, colorDark: color.lineDark, width: 2.5,
      });

      // 分支标签 → 每个叶子
      const children = branch.children ?? [];
      children.forEach((child, ci) => {
        const leafEl = leafRefs.current.get(`R-${bi}-${ci}`);
        if (!leafEl) return;
        const lf = getCenter(leafEl);
        newLines.push({
          x1: b.right, y1: b.cy,
          x2: lf.left, y2: lf.cy,
          color: color.line, colorDark: color.lineDark, width: 1.8,
        });

        // 叶子 → 三级子节点
        if (child.children) {
          child.children.forEach((_, si) => {
            const subEl = subLeafRefs.current.get(`R-${bi}-${ci}-${si}`);
            if (!subEl) return;
            const sf = getCenter(subEl);
            newLines.push({
              x1: lf.right, y1: lf.cy,
              x2: sf.left, y2: sf.cy,
              color: color.line, colorDark: color.lineDark, width: 1.2,
            });
          });
        }
      });
    });

    setLines(newLines);
  }, []);

  useEffect(() => {
    // 延迟测量确保 DOM 完全渲染
    const t1 = setTimeout(measureAndDraw, 50);
    const t2 = setTimeout(measureAndDraw, 200);
    window.addEventListener("resize", measureAndDraw);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", measureAndDraw);
    };
  }, [measureAndDraw]);

  // ref 回调
  const setLeftBranch = useCallback((idx: number) => (el: HTMLDivElement | null) => {
    if (el) leftBranchRefs.current.set(idx, el); else leftBranchRefs.current.delete(idx);
  }, []);
  const setRightBranch = useCallback((idx: number) => (el: HTMLDivElement | null) => {
    if (el) rightBranchRefs.current.set(idx, el); else rightBranchRefs.current.delete(idx);
  }, []);
  const setLeaf = useCallback((key: string) => (el: HTMLDivElement | null) => {
    if (el) leafRefs.current.set(key, el); else leafRefs.current.delete(key);
  }, []);
  const setSubLeaf = useCallback((key: string) => (el: HTMLDivElement | null) => {
    if (el) subLeafRefs.current.set(key, el); else subLeafRefs.current.delete(key);
  }, []);

  return (
    <div className="mb-20">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold sm:text-3xl">功能与服务全景</h2>
        <p className="text-base text-muted-foreground mt-2">
          项目功能模块、服务与技术架构一览
        </p>
      </div>

      {/* 思维导图容器 */}
      <div className="relative rounded-2xl border bg-card/60 backdrop-blur-sm overflow-x-auto overflow-y-hidden">
        <div
          ref={containerRef}
          className="relative inline-flex items-center justify-center p-8 sm:p-10 min-w-max w-full"
          style={{ gap: "16px" }}
        >
          {/* SVG 连线层 */}
          <ConnectorSvg lines={lines} containerW={containerSize.w} containerH={containerSize.h} />

          {/* ===== 左侧叶子节点列 ===== */}
          <div className="flex flex-col gap-3 items-end z-[1]">
            {LEFT_BRANCHES.map((branch, bi) => (
              <div key={bi} className="flex flex-col gap-1.5 items-end">
                {(branch.children ?? []).map((child, ci) => (
                  <div key={ci} className="flex items-center gap-2 flex-row-reverse">
                    <div ref={setLeaf(`L-${bi}-${ci}`)}>
                      <Leaf node={child} color={BRANCH_COLORS[bi]} />
                    </div>
                    {/* 三级子节点 */}
                    {child.children && (
                      <div className="flex flex-col gap-1 items-end">
                        {child.children.map((sub, si) => (
                          <div key={si} ref={setSubLeaf(`L-${bi}-${ci}-${si}`)}>
                            <SubLeaf node={sub} color={BRANCH_COLORS[bi]} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* ===== 左侧分支标签列 ===== */}
          <div className="flex flex-col z-[1]" style={{ gap: "12px" }}>
            {LEFT_BRANCHES.map((branch, bi) => {
              const color = BRANCH_COLORS[bi];
              // 计算该分支的子节点总高度来对齐
              const childCount = (branch.children ?? []).length;
              const hasSubChildren = (branch.children ?? []).some(c => c.children);
              return (
                <div
                  key={bi}
                  className="flex items-center"
                  style={{
                    // 让分支标签垂直居中于其子节点区域
                    minHeight: `${childCount * 34 + (hasSubChildren ? 20 : 0)}px`,
                  }}
                >
                  <div
                    ref={setLeftBranch(bi)}
                    className={cn(
                      "px-4 py-2.5 rounded-xl border-2 font-bold text-sm whitespace-nowrap shadow-sm",
                      color.bg, color.border, color.text,
                    )}
                  >
                    {branch.emoji && <span className="mr-1.5">{branch.emoji}</span>}
                    {branch.label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ===== 中心根节点 ===== */}
          <div
            ref={rootRef}
            className="px-7 py-4 rounded-2xl bg-gradient-to-br from-primary to-violet-600 text-white font-bold text-lg shadow-lg shadow-primary/25 whitespace-nowrap shrink-0 z-[1]"
          >
            🎓 研途有我
          </div>

          {/* ===== 右侧分支标签列 ===== */}
          <div className="flex flex-col z-[1]" style={{ gap: "12px" }}>
            {RIGHT_BRANCHES.map((branch, bi) => {
              const colorIdx = bi + LEFT_BRANCHES.length;
              const color = BRANCH_COLORS[colorIdx];
              const childCount = (branch.children ?? []).length;
              const hasSubChildren = (branch.children ?? []).some(c => c.children);
              return (
                <div
                  key={bi}
                  className="flex items-center"
                  style={{
                    minHeight: `${childCount * 34 + (hasSubChildren ? 20 : 0)}px`,
                  }}
                >
                  <div
                    ref={setRightBranch(bi)}
                    className={cn(
                      "px-4 py-2.5 rounded-xl border-2 font-bold text-sm whitespace-nowrap shadow-sm",
                      color.bg, color.border, color.text,
                    )}
                  >
                    {branch.emoji && <span className="mr-1.5">{branch.emoji}</span>}
                    {branch.label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ===== 右侧叶子节点列 ===== */}
          <div className="flex flex-col gap-3 z-[1]">
            {RIGHT_BRANCHES.map((branch, bi) => (
              <div key={bi} className="flex flex-col gap-1.5">
                {(branch.children ?? []).map((child, ci) => (
                  <div key={ci} className="flex items-center gap-2">
                    <div ref={setLeaf(`R-${bi}-${ci}`)}>
                      <Leaf node={child} color={BRANCH_COLORS[bi + LEFT_BRANCHES.length]} />
                    </div>
                    {/* 三级子节点 */}
                    {child.children && (
                      <div className="flex flex-col gap-1">
                        {child.children.map((sub, si) => (
                          <div key={si} ref={setSubLeaf(`R-${bi}-${ci}-${si}`)}>
                            <SubLeaf node={sub} color={BRANCH_COLORS[bi + LEFT_BRANCHES.length]} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
