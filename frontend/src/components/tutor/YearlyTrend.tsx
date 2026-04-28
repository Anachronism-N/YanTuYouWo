"use client";

import { TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { YearlyStatsItem } from "@/types/tutor";

interface YearlyTrendProps {
  stats: YearlyStatsItem[];
}

/**
 * 年度论文 / 引用 趋势图（CSS 柱状图）
 */
export default function YearlyTrend({ stats }: YearlyTrendProps) {
  if (!stats || stats.length === 0) return null;

  // 取近 12 年（按年份升序，最右是最新）
  const recent = stats.slice(0, 12).reverse();
  const maxWorks = Math.max(...recent.map((s) => s.works_count), 1);
  const maxCites = Math.max(...recent.map((s) => s.cited_by_count), 1);
  const totalWorks = recent.reduce((s, x) => s + x.works_count, 0);
  const totalCites = recent.reduce((s, x) => s + x.cited_by_count, 0);

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          年度发文 & 引用趋势
        </h2>

        {/* 概览 */}
        <div className="flex gap-4 mb-4 text-sm">
          <div>
            <span className="text-muted-foreground">近 {recent.length} 年发文：</span>
            <span className="font-bold text-primary">{totalWorks}</span>
          </div>
          <div>
            <span className="text-muted-foreground">总引用：</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {totalCites >= 10000 ? `${(totalCites / 10000).toFixed(1)}万` : totalCites}
            </span>
          </div>
        </div>

        {/* 双轴柱状图（论文 + 引用） */}
        <div className="flex items-end gap-2 h-32 border-l border-b pl-1 pb-1 relative">
          {recent.map((s, i) => {
            const wHeight = (s.works_count / maxWorks) * 100;
            const cHeight = (s.cited_by_count / maxCites) * 100;
            return (
              <div
                key={i}
                className="flex-1 flex flex-col items-center justify-end gap-0.5 group relative"
                title={`${s.year}: ${s.works_count} 篇 / ${s.cited_by_count} 引用`}
              >
                {/* tooltip on hover */}
                <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 bg-foreground text-background text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
                  {s.year}年: {s.works_count} 篇 / {s.cited_by_count.toLocaleString()} 引
                </div>
                {/* 引用柱（淡色，背景） */}
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 bg-emerald-200/40 dark:bg-emerald-500/15 rounded-t"
                  style={{ height: `${cHeight}%` }}
                />
                {/* 论文柱（实色，前景） */}
                <div
                  className="relative w-2/3 bg-gradient-to-t from-primary to-blue-500 rounded-t hover:opacity-80 transition-opacity"
                  style={{ height: `${wHeight}%`, minHeight: s.works_count > 0 ? "2px" : "0" }}
                />
              </div>
            );
          })}
        </div>

        {/* X 轴年份 */}
        <div className="flex gap-2 mt-1">
          {recent.map((s, i) => (
            <div key={i} className="flex-1 text-center text-[10px] text-muted-foreground">
              {`'${String(s.year).slice(-2)}`}
            </div>
          ))}
        </div>

        {/* 图例 */}
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 bg-gradient-to-t from-primary to-blue-500 rounded-sm" />
            论文数
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 bg-emerald-200/60 dark:bg-emerald-500/30 rounded-sm" />
            引用数
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
