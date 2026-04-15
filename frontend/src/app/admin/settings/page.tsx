"use client";

import { useState } from "react";
import {
  Settings, Globe, Bot, Bell, AlertTriangle, RotateCcw, Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function ToggleSwitch({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
        enabled ? "bg-primary" : "bg-muted-foreground/30",
      )}
    >
      <span className={cn(
        "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
        enabled ? "translate-x-5" : "translate-x-0",
      )} />
    </button>
  );
}

export default function AdminSettingsPage() {
  const [siteName, setSiteName] = useState("研途 YanTu");
  const [siteDesc, setSiteDesc] = useState("一站式保研信息聚合与智能辅助平台");
  const [crawlFrequency, setCrawlFrequency] = useState("30");
  const [autoClassify, setAutoClassify] = useState(true);
  const [emailNotify, setEmailNotify] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState("https://hooks.example.com/yantu");

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">系统设置</h1>
        <p className="text-sm text-muted-foreground mt-0.5">配置平台基本信息与系统参数</p>
      </div>

      {/* 基本设置 */}
      <Card>
        <CardContent className="p-5 space-y-5">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">基本设置</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1.5">站点名称</label>
              <Input value={siteName} onChange={(e) => setSiteName(e.target.value)} className="h-9 rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">站点描述</label>
              <Input value={siteDesc} onChange={(e) => setSiteDesc(e.target.value)} className="h-9 rounded-xl" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 爬虫设置 */}
      <Card>
        <CardContent className="p-5 space-y-5">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">爬虫设置</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">抓取频率</p>
                <p className="text-xs text-muted-foreground">设置爬虫自动抓取的间隔时间（分钟）</p>
              </div>
              <div className="flex items-center gap-2">
                <Input value={crawlFrequency} onChange={(e) => setCrawlFrequency(e.target.value)} className="h-9 w-20 rounded-xl text-center" />
                <span className="text-sm text-muted-foreground">分钟</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">自动分类</p>
                <p className="text-xs text-muted-foreground">使用 AI 自动对抓取到的通知进行分类</p>
              </div>
              <ToggleSwitch enabled={autoClassify} onToggle={() => setAutoClassify(!autoClassify)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 通知设置 */}
      <Card>
        <CardContent className="p-5 space-y-5">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">通知设置</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">邮件通知</p>
                <p className="text-xs text-muted-foreground">系统异常或重要事件时发送邮件通知</p>
              </div>
              <ToggleSwitch enabled={emailNotify} onToggle={() => setEmailNotify(!emailNotify)} />
            </div>
            <div>
              <p className="text-sm font-medium mb-1.5">Webhook URL</p>
              <p className="text-xs text-muted-foreground mb-2">接收系统事件推送的 Webhook 地址</p>
              <Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} className="h-9 rounded-xl max-w-lg" placeholder="https://..." />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 危险操作 */}
      <Card className="border-destructive/30">
        <CardContent className="p-5 space-y-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h2 className="text-base font-semibold text-destructive">危险操作</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">清除缓存</p>
                <p className="text-xs text-muted-foreground">清除系统所有缓存数据，不影响已持久化的内容</p>
              </div>
              <Button variant="outline" size="sm" className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10">
                <Trash2 className="h-3.5 w-3.5" /> 清除缓存
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">重建索引</p>
                <p className="text-xs text-muted-foreground">重新建立全文搜索索引，过程中搜索功能可能暂时不可用</p>
              </div>
              <Button variant="outline" size="sm" className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10">
                <RotateCcw className="h-3.5 w-3.5" /> 重建索引
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button className="px-8">保存设置</Button>
      </div>
    </div>
  );
}
