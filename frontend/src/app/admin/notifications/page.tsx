"use client";

import { useState } from "react";
import {
  Bell, Plus, Info, AlertTriangle, CheckCircle2, Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SystemNotification {
  id: number;
  type: "info" | "warning" | "success";
  title: string;
  content: string;
  time: string;
  read: boolean;
}

const mockNotifications: SystemNotification[] = [
  { id: 1, type: "success", title: "数据同步完成", content: "爬虫系统已成功抓取并入库新通知 23 条，覆盖 8 所高校。", time: "10 分钟前", read: false },
  { id: 2, type: "warning", title: "存储空间告警", content: "数据库存储空间使用率已达 78%，建议及时清理历史数据或扩容。", time: "1 小时前", read: false },
  { id: 3, type: "info", title: "系统更新通知", content: "v2.1.0 版本已部署上线，新增竞赛管理模块和期刊信息展示功能。", time: "3 小时前", read: true },
  { id: 4, type: "warning", title: "异常访问检测", content: "检测到来自 IP 192.168.1.xx 的频繁请求，已自动触发速率限制。", time: "6 小时前", read: true },
  { id: 5, type: "success", title: "每日备份完成", content: "数据库全量备份已于凌晨 3:00 完成，备份文件大小 256MB。", time: "12 小时前", read: true },
];

const TYPE_CONFIG = {
  info: { icon: Info, color: "text-blue-600 bg-blue-50 dark:bg-blue-500/10", ring: "ring-blue-200 dark:ring-blue-800" },
  warning: { icon: AlertTriangle, color: "text-amber-600 bg-amber-50 dark:bg-amber-500/10", ring: "ring-amber-200 dark:ring-amber-800" },
  success: { icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10", ring: "ring-emerald-200 dark:ring-emerald-800" },
};

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState(mockNotifications);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">系统通知</h1>
          <p className="text-sm text-muted-foreground mt-0.5">查看系统运行状态与告警信息</p>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead} className="text-xs">
              全部标为已读
            </Button>
          )}
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> 发送通知
          </Button>
        </div>
      </div>

      {unreadCount > 0 && (
        <Badge variant="secondary" className="text-xs">{unreadCount} 条未读通知</Badge>
      )}

      <div className="space-y-3">
        {notifications.map((n) => {
          const cfg = TYPE_CONFIG[n.type];
          const Icon = cfg.icon;
          return (
            <Card key={n.id} className={cn("transition-all", !n.read && "ring-1 " + cfg.ring)}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl shrink-0", cfg.color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">{n.title}</h3>
                      {!n.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{n.content}</p>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {n.time}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
