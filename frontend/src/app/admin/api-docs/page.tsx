"use client";

import { useState } from "react";
import { Code2, ExternalLink, BookOpen, Braces, Copy, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { API_BASE_URL } from "@/lib/constants";

type DocTab = "swagger" | "redoc" | "endpoints";

const API_GROUPS = [
  {
    title: "通知 (Notices)",
    color: "text-blue-600",
    endpoints: [
      { method: "GET", path: "/api/notices", desc: "通知列表（分页、筛选、排序）", auth: false },
      { method: "GET", path: "/api/notices/latest", desc: "最新通知", auth: false },
      { method: "GET", path: "/api/notices/{id}", desc: "通知详情", auth: false },
    ],
  },
  {
    title: "院校 (Schools)",
    color: "text-emerald-600",
    endpoints: [
      { method: "GET", path: "/api/schools", desc: "院校列表", auth: false },
      { method: "GET", path: "/api/schools/{id}", desc: "院校详情（含学院列表）", auth: false },
      { method: "GET", path: "/api/schools/{id}/departments", desc: "学院列表", auth: false },
      { method: "GET", path: "/api/schools/{id}/notices", desc: "院校下的通知", auth: false },
    ],
  },
  {
    title: "搜索与统计",
    color: "text-violet-600",
    endpoints: [
      { method: "GET", path: "/api/search", desc: "全站搜索（跨通知+院校）", auth: false },
      { method: "GET", path: "/api/stats/overview", desc: "首页统计数据", auth: false },
      { method: "GET", path: "/api/health", desc: "健康检查", auth: false },
    ],
  },
  {
    title: "认证 (Auth)",
    color: "text-amber-600",
    endpoints: [
      { method: "POST", path: "/api/auth/register", desc: "用户注册", auth: false },
      { method: "POST", path: "/api/auth/login", desc: "用户登录", auth: false },
    ],
  },
  {
    title: "用户 (User)",
    color: "text-pink-600",
    endpoints: [
      { method: "GET", path: "/api/user/profile", desc: "获取个人信息", auth: true },
      { method: "PUT", path: "/api/user/profile", desc: "更新个人信息", auth: true },
      { method: "GET", path: "/api/user/settings", desc: "获取设置", auth: true },
      { method: "PUT", path: "/api/user/settings", desc: "更新设置", auth: true },
      { method: "GET", path: "/api/user/favorites", desc: "收藏列表", auth: true },
      { method: "POST", path: "/api/user/favorites", desc: "添加收藏", auth: true },
      { method: "DELETE", path: "/api/user/favorites", desc: "取消收藏", auth: true },
    ],
  },
  {
    title: "管理员 (Admin)",
    color: "text-red-600",
    endpoints: [
      { method: "GET", path: "/api/admin/stats", desc: "管理后台统计", auth: true },
      { method: "GET", path: "/api/admin/notices", desc: "通知管理列表（含草稿）", auth: true },
      { method: "POST", path: "/api/admin/notices", desc: "创建通知", auth: true },
      { method: "PUT", path: "/api/admin/notices/{id}", desc: "编辑通知", auth: true },
      { method: "DELETE", path: "/api/admin/notices/{id}", desc: "删除通知", auth: true },
      { method: "POST", path: "/api/admin/upload", desc: "文件上传", auth: true },
    ],
  },
];

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  POST: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  PUT: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  DELETE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function ApiDocsPage() {
  const [tab, setTab] = useState<DocTab>("endpoints");
  const [copied, setCopied] = useState("");
  const backendUrl = API_BASE_URL.replace("/api", "");

  const copyPath = (path: string) => {
    navigator.clipboard.writeText(`${backendUrl}${path}`);
    setCopied(path);
    setTimeout(() => setCopied(""), 2000);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Code2 className="h-5 w-5 text-primary" /> API 文档
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            后端 API 接口说明 · 基础路径：<code className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">{API_BASE_URL}</code>
          </p>
        </div>
        <div className="flex gap-2">
          <a href={`${backendUrl}/api/docs`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Braces className="h-3.5 w-3.5" /> Swagger UI <ExternalLink className="h-3 w-3" />
            </Button>
          </a>
          <a href={`${backendUrl}/api/redoc`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-1.5">
              <BookOpen className="h-3.5 w-3.5" /> ReDoc <ExternalLink className="h-3 w-3" />
            </Button>
          </a>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted/50 w-fit">
        {([["endpoints", "端点列表"], ["swagger", "Swagger UI"], ["redoc", "ReDoc"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
            tab === key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
          )}>{label}</button>
        ))}
      </div>

      {/* 端点列表 */}
      {tab === "endpoints" && (
        <div className="space-y-6">
          {API_GROUPS.map((group) => (
            <Card key={group.title}>
              <CardContent className="p-0">
                <div className={cn("px-5 py-3 border-b font-semibold text-sm", group.color)}>
                  {group.title}
                </div>
                <div className="divide-y">
                  {group.endpoints.map((ep) => (
                    <div key={ep.path + ep.method} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors group">
                      <Badge className={cn("text-[10px] font-mono font-bold w-14 justify-center shrink-0", METHOD_COLORS[ep.method])}>
                        {ep.method}
                      </Badge>
                      <code className="text-xs font-mono text-foreground flex-1 min-w-0 truncate">{ep.path}</code>
                      <span className="text-xs text-muted-foreground hidden sm:block shrink-0">{ep.desc}</span>
                      {ep.auth && <Badge variant="outline" className="text-[10px] shrink-0">🔒 Auth</Badge>}
                      <button onClick={() => copyPath(ep.path)} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" title="复制完整 URL">
                        {copied === ep.path ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Swagger UI iframe */}
      {tab === "swagger" && (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <iframe src={`${backendUrl}/api/docs`} className="w-full border-0" style={{ height: "80vh" }} title="Swagger UI" />
          </CardContent>
        </Card>
      )}

      {/* ReDoc iframe */}
      {tab === "redoc" && (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <iframe src={`${backendUrl}/api/redoc`} className="w-full border-0" style={{ height: "80vh" }} title="ReDoc" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
