"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface CountdownBadgeProps {
  deadline: string;
  className?: string;
  /** 紧凑模式：用于卡片右侧状态区 */
  compact?: boolean;
}

export default function CountdownBadge({ deadline, className, compact }: CountdownBadgeProps) {
  const [days, setDays] = useState(0);
  const [hours, setHours] = useState(0);
  const [isExpired, setIsExpired] = useState(false);
  const [urgency, setUrgency] = useState<"normal" | "warning" | "danger">("normal");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const end = new Date(deadline);
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) {
        setIsExpired(true);
        setUrgency("danger");
        return;
      }

      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      setDays(d);
      setHours(h);
      setIsExpired(false);

      if (d > 7) {
        setUrgency("normal");
      } else if (d > 0) {
        setUrgency("warning");
      } else {
        setUrgency("danger");
      }
    };

    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, [deadline]);

  // 紧凑模式：大数字 + 小文字，用于卡片右侧
  if (compact) {
    const urgencyColors = {
      normal: "text-blue-600",
      warning: "text-amber-600",
      danger: "text-red-600",
    };

    if (isExpired) {
      return (
        <div className={`text-center ${className || ""}`}>
          <div className="text-xs text-red-500 dark:text-red-400">已截止</div>
        </div>
      );
    }

    if (days === 0) {
      return (
        <div className={`text-center ${className || ""}`}>
          <div className="text-xs text-muted-foreground leading-tight">距报名截止</div>
          <div className={`text-lg font-bold leading-tight ${urgencyColors[urgency]}`}>
            不足1天
          </div>
        </div>
      );
    }

    return (
      <div className={`text-center ${className || ""}`}>
        <div className="text-xs text-muted-foreground leading-tight">距报名截止</div>
        <div className={`text-2xl font-bold leading-tight tabular-nums ${urgencyColors[urgency]}`}>
          {days}
        </div>
        <div className={`text-xs font-medium ${urgencyColors[urgency]}`}>天</div>
      </div>
    );
  }

  // 标准模式：Badge 样式
  const variants = {
    normal: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-red-50 text-red-700 border-red-200",
  };

  const timeText = isExpired
    ? "已截止"
    : days > 0
      ? `剩余 ${days} 天 ${hours} 小时`
      : `剩余 ${hours} 小时`;

  return (
    <Badge variant="outline" className={`${variants[urgency]} ${className || ""} tabular-nums`}>
      <Clock className="mr-1 h-3 w-3" />
      {timeText}
    </Badge>
  );
}
