"use client";

import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { TopicItem } from "@/types/tutor";

interface TopicsChartProps {
  topics: TopicItem[];
}

/**
 * 研究主题分布 - 类 AMiner Profile 的横向条形图
 *
 * 优先展示 OpenAlex `topics`（具体主题，含 works_count）
 * 次要展示 `x_concepts`（广义概念，含 score 0-1）
 */
export default function TopicsChart({ topics }: TopicsChartProps) {
  if (!topics || topics.length === 0) return null;

  const specific = topics.filter((t) => t.kind === "topic");
  const concepts = topics.filter((t) => t.kind === "concept");

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          研究主题分布
        </h2>

        {specific.length > 0 && (
          <div className="space-y-2.5">
            {(() => {
              const max = Math.max(...specific.map((t) => t.works_count || 0));
              return specific.map((t, i) => {
                const ratio = max > 0 ? (t.works_count || 0) / max : 0;
                return (
                  <div key={i} className="text-sm">
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <span className="font-medium truncate" title={t.name}>
                        {t.name}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        <span className="font-bold text-foreground">{t.works_count}</span> 篇
                        {t.subfield && (
                          <span className="ml-1 text-muted-foreground/60">· {t.subfield}</span>
                        )}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.max(ratio * 100, 5)}%`,
                          background: `linear-gradient(90deg, hsl(${210 + i * 25}, 70%, 55%), hsl(${230 + i * 25}, 70%, 65%))`,
                        }}
                      />
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}

        {/* x_concepts (broader categories) */}
        {concepts.length > 0 && (
          <div className="mt-4 pt-3 border-t">
            <p className="text-xs text-muted-foreground mb-2">广义研究领域：</p>
            <div className="flex flex-wrap gap-1.5">
              {concepts.map((c, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground"
                  title={`Level ${c.level} · score=${c.score}`}
                >
                  {c.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
