"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, ExternalLink, Quote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PublicationItem } from "@/types/tutor";

interface PapersListProps {
  papers: (PublicationItem | string)[];
  defaultGroupBy?: "year" | "none";
  initialDisplay?: number;
}

/**
 * AMiner 风格论文列表
 * - 默认按被引数倒序展示前 N 篇，"展开全部" 显示所有
 * - 可切换"按年份分组"视图
 * - 每篇支持展开摘要
 */
export default function PapersList({
  papers,
  defaultGroupBy = "none",
  initialDisplay = 10,
}: PapersListProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const [groupBy, setGroupBy] = useState<"year" | "none">(defaultGroupBy);

  const objectPapers: PublicationItem[] = useMemo(
    () =>
      papers
        .filter((p): p is PublicationItem => typeof p !== "string")
        .map((p) => ({ ...p })),
    [papers],
  );

  // 按被引数倒序排序
  const sorted = useMemo(
    () => [...objectPapers].sort((a, b) => (b.citations || 0) - (a.citations || 0)),
    [objectPapers],
  );

  // 按年份分组
  const grouped = useMemo(() => {
    if (groupBy !== "year") return null;
    const map = new Map<number | string, PublicationItem[]>();
    for (const p of sorted) {
      const key = p.year || "未知年份";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return [...map.entries()].sort((a, b) => {
      const aN = typeof a[0] === "number" ? a[0] : 0;
      const bN = typeof b[0] === "number" ? b[0] : 0;
      return bN - aN;
    });
  }, [sorted, groupBy]);

  const toggle = (i: number) => {
    const next = new Set(expanded);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setExpanded(next);
  };

  if (objectPapers.length === 0) return null;

  const visiblePapers = showAll ? sorted : sorted.slice(0, initialDisplay);

  return (
    <div className="space-y-3">
      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          共 <span className="font-bold text-foreground">{objectPapers.length}</span> 篇代表论文
          {sorted[0]?.citations && (
            <span className="ml-2">· 最高引用 <span className="font-bold text-emerald-600">{sorted[0].citations}</span></span>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setGroupBy("none")}
            className={`px-2 py-1 text-xs rounded ${
              groupBy === "none" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
            }`}
          >
            按引用
          </button>
          <button
            onClick={() => setGroupBy("year")}
            className={`px-2 py-1 text-xs rounded ${
              groupBy === "year" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
            }`}
          >
            按年份
          </button>
        </div>
      </div>

      {/* 列表 */}
      {groupBy === "none" ? (
        <ol className="space-y-2.5">
          {visiblePapers.map((p, i) => (
            <PaperRow
              key={i}
              paper={p}
              index={i + 1}
              isExpanded={expanded.has(i)}
              onToggle={() => toggle(i)}
            />
          ))}
        </ol>
      ) : (
        <div className="space-y-4">
          {grouped!.map(([year, ps]) => (
            <div key={year}>
              <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                <span className="text-base">{year}</span>
                <Badge variant="outline" className="text-[10px]">{ps.length} 篇</Badge>
              </h3>
              <ol className="space-y-2 pl-3 border-l-2 border-primary/20">
                {ps.map((p, i) => (
                  <PaperRow
                    key={i}
                    paper={p}
                    index={i + 1}
                    isExpanded={expanded.has(sorted.indexOf(p))}
                    onToggle={() => toggle(sorted.indexOf(p))}
                  />
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}

      {/* 展开全部 */}
      {!showAll && groupBy === "none" && sorted.length > initialDisplay && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAll(true)}
          className="w-full mt-2"
        >
          展开全部 {sorted.length - initialDisplay} 篇 <ChevronDown className="ml-1 h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

function PaperRow({
  paper,
  index,
  isExpanded,
  onToggle,
}: {
  paper: PublicationItem;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const hasAbstract = paper.abstract && paper.abstract.length > 0;

  return (
    <li className="text-sm leading-relaxed">
      <div className="flex items-start gap-2">
        <span className="shrink-0 text-xs text-primary/60 font-medium mt-1 w-6 text-right">[{index}]</span>
        <div className="flex-1 min-w-0">
          {/* 标题行 */}
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-medium text-foreground">{paper.title}</span>
            {paper.year && (
              <Badge variant="outline" className="text-[10px] shrink-0">{paper.year}</Badge>
            )}
            {paper.type && paper.type !== "article" && (
              <Badge variant="secondary" className="text-[10px] shrink-0">{paper.type}</Badge>
            )}
          </div>

          {/* 元信息 */}
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            {paper.venue && (
              <span className="italic">{paper.venue}</span>
            )}
            {paper.authors && (
              <span className="text-muted-foreground/70 truncate max-w-xs" title={paper.authors}>
                {paper.authors}
              </span>
            )}
            {typeof paper.citations === "number" && paper.citations > 0 && (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <Quote className="h-3 w-3" />
                <span className="font-medium">{paper.citations}</span> 引用
              </span>
            )}
            {paper.url && (
              <a
                href={paper.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                查看 <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {hasAbstract && (
              <button
                onClick={onToggle}
                className="flex items-center gap-1 text-primary hover:underline"
              >
                {isExpanded ? "收起摘要" : "展开摘要"}
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>
            )}
          </div>

          {/* 摘要 */}
          {hasAbstract && isExpanded && (
            <div className="mt-2 pl-3 border-l-2 border-primary/30 text-xs text-muted-foreground leading-6">
              {paper.abstract}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
