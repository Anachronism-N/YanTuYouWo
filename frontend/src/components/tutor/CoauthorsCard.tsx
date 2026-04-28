"use client";

import { Users, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CoauthorItem } from "@/types/tutor";

interface CoauthorsCardProps {
  coauthors: CoauthorItem[];
  maxDisplay?: number;
}

/**
 * 主要合作者卡片 — 仿 AMiner Profile
 */
export default function CoauthorsCard({ coauthors, maxDisplay = 12 }: CoauthorsCardProps) {
  if (!coauthors || coauthors.length === 0) return null;

  const visible = coauthors.slice(0, maxDisplay);
  const maxCount = Math.max(...coauthors.map((c) => c.works_together_count));

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          主要合作者
          <span className="text-sm font-normal text-muted-foreground">
            ({coauthors.length})
          </span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {visible.map((c, i) => {
            const ratio = maxCount > 0 ? c.works_together_count / maxCount : 0;
            return (
              <div
                key={i}
                className="rounded-lg border bg-card p-2.5 hover:border-primary/30 transition-colors group"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate" title={c.name}>
                    {c.name}
                  </span>
                  {c.openalex_id && (
                    <a
                      href={`https://openalex.org/${c.openalex_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                      title="OpenAlex profile"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    合作 <span className="font-bold text-foreground">{c.works_together_count}</span> 篇
                  </span>
                  {c.last_year && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      {c.last_year}
                    </Badge>
                  )}
                </div>
                {/* 合作强度条 */}
                <div className="mt-1.5 h-1 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full"
                    style={{ width: `${Math.max(ratio * 100, 10)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        {coauthors.length > maxDisplay && (
          <p className="mt-3 text-xs text-muted-foreground text-center">
            还有 {coauthors.length - maxDisplay} 位合作者...
          </p>
        )}
      </CardContent>
    </Card>
  );
}
