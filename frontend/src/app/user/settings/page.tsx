"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Settings,
  Bell,
  Heart,
  Clock,
  BookOpen,
  Building2,
  Save,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useUserStore } from "@/stores/useUserStore";
import { mockUserProfile, mockUserSettings } from "@/lib/mock-data";
import { DISCIPLINE_OPTIONS, UNIVERSITY_OPTIONS } from "@/lib/constants";

export default function SettingsPage() {
  const { isLoggedIn, setUser } = useUserStore();
  const [settings, setSettings] = useState(mockUserSettings);
  const [saved, setSaved] = useState(false);

  // 初始化
  useEffect(() => {
    if (!isLoggedIn) {
      setUser(mockUserProfile, "mock-token-123");
    }
  }, [isLoggedIn, setUser]);

  const handleSave = () => {
    // Mock 保存
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleDiscipline = (d: string) => {
    setSettings((prev) => ({
      ...prev,
      interested_disciplines: prev.interested_disciplines.includes(d)
        ? prev.interested_disciplines.filter((x) => x !== d)
        : [...prev.interested_disciplines, d],
    }));
  };

  const toggleUniversity = (u: string) => {
    setSettings((prev) => ({
      ...prev,
      interested_universities: prev.interested_universities.includes(u)
        ? prev.interested_universities.filter((x) => x !== u)
        : [...prev.interested_universities, u],
    }));
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">设置</h1>
          <p className="text-sm text-muted-foreground mt-1">管理通知偏好和关注内容</p>
        </div>
        <Button className="gap-1.5" onClick={handleSave}>
          {saved ? (
            <>
              <Check className="h-4 w-4" />
              已保存
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              保存设置
            </>
          )}
        </Button>
      </div>

      {/* 通知设置 */}
      <Card>
        <CardContent className="p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            通知设置
          </h2>

          <div className="space-y-4">
            {/* 邮件通知 */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">邮件通知</p>
                <p className="text-xs text-muted-foreground">接收新通知的邮件提醒</p>
              </div>
              <button
                onClick={() => setSettings((s) => ({ ...s, email_notification: !s.email_notification }))}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  settings.email_notification ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    settings.email_notification ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>

            <Separator />

            {/* 收藏更新提醒 */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">收藏更新提醒</p>
                <p className="text-xs text-muted-foreground">收藏的通知有更新时提醒</p>
              </div>
              <button
                onClick={() => setSettings((s) => ({ ...s, favorite_update_notification: !s.favorite_update_notification }))}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  settings.favorite_update_notification ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    settings.favorite_update_notification ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>

            <Separator />

            {/* 截止日期提醒 */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">截止日期提醒</p>
                <p className="text-xs text-muted-foreground">在报名截止前提醒</p>
              </div>
              <select
                className="h-9 rounded-md border bg-background px-3 text-sm"
                value={settings.deadline_reminder_days}
                onChange={(e) => setSettings((s) => ({ ...s, deadline_reminder_days: Number(e.target.value) }))}
              >
                <option value={3}>提前 3 天</option>
                <option value={5}>提前 5 天</option>
                <option value={7}>提前 7 天</option>
                <option value={14}>提前 14 天</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 关注学科 */}
      <Card>
        <CardContent className="p-6">
          <h2 className="font-semibold mb-2 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            关注学科
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            选择你感兴趣的学科门类，我们会优先推送相关信息
          </p>
          <div className="flex flex-wrap gap-2">
            {DISCIPLINE_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => toggleDiscipline(d)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                  settings.interested_disciplines.includes(d)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/50"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 关注学校 */}
      <Card>
        <CardContent className="p-6">
          <h2 className="font-semibold mb-2 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            关注学校
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            选择你关注的学校，我们会优先推送相关通知
          </p>
          <div className="flex flex-wrap gap-2">
            {UNIVERSITY_OPTIONS.map((u) => (
              <button
                key={u}
                onClick={() => toggleUniversity(u)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                  settings.interested_universities.includes(u)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/50"
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 危险操作 */}
      <Card className="border-red-200/50">
        <CardContent className="p-6">
          <h2 className="font-semibold mb-2 text-red-600">危险操作</h2>
          <p className="text-xs text-muted-foreground mb-4">
            以下操作不可撤销，请谨慎操作
          </p>
          <div className="flex gap-3">
            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
              清除所有收藏
            </Button>
            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
              注销账号
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
