"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Calendar, Flame, Trophy, Clock, Target,
  CheckCircle2, Plus, Sparkles, TrendingUp,
  Star, Zap, Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { CheckinRecord, CheckinStats } from "@/types/community";

/* ================================================================
   Mock 数据
   ================================================================ */

const today = new Date();
const MOCK_STATS: CheckinStats = {
  total_days: 45,
  streak_days: 7,
  month_days: 18,
  total_duration: 5400,
  month_duration: 2160,
  rank: 23,
  calendar: Array.from({ length: 18 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), i + 1);
    return d.toISOString().split("T")[0];
  }),
};

const MOOD_OPTIONS: { emoji: string; label: string }[] = [
  { emoji: "🔥", label: "充实" },
  { emoji: "💪", label: "努力" },
  { emoji: "😊", label: "开心" },
  { emoji: "😐", label: "一般" },
  { emoji: "😫", label: "疲惫" },
];

const STUDY_TAGS = ["专业课复习", "英语学习", "科研项目", "论文写作", "竞赛准备", "面试练习", "简历优化", "阅读文献"];

const MOCK_RECORDS: CheckinRecord[] = [
  { id: 1, user_id: 1, date: today.toISOString().split("T")[0], duration: 180, content: "复习了数据结构和算法，刷了 10 道 LeetCode", mood: "🔥", tags: ["专业课复习"] },
  { id: 2, user_id: 1, date: new Date(today.getTime() - 86400000).toISOString().split("T")[0], duration: 120, content: "阅读了 2 篇 Transformer 相关论文", mood: "💪", tags: ["阅读文献", "科研项目"] },
  { id: 3, user_id: 1, date: new Date(today.getTime() - 172800000).toISOString().split("T")[0], duration: 90, content: "练习英语口语，准备自我介绍", mood: "😊", tags: ["英语学习", "面试练习"] },
];

const LEADERBOARD = [
  { rank: 1, name: "学霸小王", school: "清华大学", streak: 42, duration: 12600 },
  { rank: 2, name: "保研冲冲冲", school: "北京大学", streak: 38, duration: 11400 },
  { rank: 3, name: "每天进步一点", school: "浙江大学", streak: 35, duration: 10500 },
  { rank: 4, name: "科研小能手", school: "上海交通大学", streak: 30, duration: 9000 },
  { rank: 5, name: "不卷不行", school: "复旦大学", streak: 28, duration: 8400 },
];

/* ================================================================
   日历组件
   ================================================================ */

function CheckinCalendar({ checkedDays }: { checkedDays: string[] }) {
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];

  const cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const todayDate = today.getDate();

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((w) => (
          <div key={w} className="text-center text-xs text-muted-foreground font-medium py-1">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isChecked = checkedDays.includes(dateStr);
          const isToday = day === todayDate;
          return (
            <div key={day} className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg text-sm mx-auto transition-all",
              isChecked && "bg-green-500 text-white font-bold",
              isToday && !isChecked && "ring-2 ring-primary ring-offset-2 ring-offset-background",
              !isChecked && !isToday && "text-muted-foreground hover:bg-muted/50",
              day > todayDate && "opacity-30",
            )}>
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================
   主页面
   ================================================================ */

export default function CheckinPage() {
  const [showForm, setShowForm] = useState(false);
  const [duration, setDuration] = useState("120");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState("🔥");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const todayChecked = MOCK_STATS.calendar.includes(today.toISOString().split("T")[0]);

  const toggleTag = (tag: string) => {
    setSelectedTags((p) => p.includes(tag) ? p.filter((t) => t !== tag) : [...p, tag]);
  };

  const handleCheckin = () => {
    alert("打卡成功！（Mock）");
    setShowForm(false);
  };

  const formatDuration = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="space-y-6">
      {/* 统计概览 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "连续打卡", value: `${MOCK_STATS.streak_days} 天`, icon: Flame, color: "text-orange-500 bg-orange-50" },
          { label: "本月打卡", value: `${MOCK_STATS.month_days} 天`, icon: Calendar, color: "text-blue-500 bg-blue-50" },
          { label: "总学习时长", value: formatDuration(MOCK_STATS.total_duration), icon: Clock, color: "text-emerald-500 bg-emerald-50" },
          { label: "排名", value: `第 ${MOCK_STATS.rank} 名`, icon: Trophy, color: "text-amber-500 bg-amber-50" },
        ].map((stat) => (
          <Card key={stat.label} className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", stat.color)}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-lg font-bold">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：日历 + 打卡 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 打卡日历 */}
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                {today.getFullYear()} 年 {today.getMonth() + 1} 月
              </h3>
              <CheckinCalendar checkedDays={MOCK_STATS.calendar} />
            </CardContent>
          </Card>

          {/* 今日打卡 */}
          {!todayChecked && !showForm && (
            <Card className="shadow-sm border-dashed border-2 hover:border-primary/40 transition-colors cursor-pointer" onClick={() => setShowForm(true)}>
              <CardContent className="p-8 text-center">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-3">
                  <Plus className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-bold text-lg">今日打卡</h3>
                <p className="text-sm text-muted-foreground mt-1">记录今天的学习内容，保持连续打卡！</p>
              </CardContent>
            </Card>
          )}

          {showForm && (
            <Card className="shadow-sm">
              <CardContent className="p-6 space-y-5">
                <h3 className="font-bold flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> 今日学习打卡</h3>

                {/* 心情 */}
                <div>
                  <label className="text-sm font-medium mb-2 block">今天的状态</label>
                  <div className="flex gap-3">
                    {MOOD_OPTIONS.map((m) => (
                      <button key={m.emoji} onClick={() => setMood(m.emoji)}
                        className={cn("flex flex-col items-center gap-1 rounded-xl border-2 px-4 py-3 transition-all",
                          mood === m.emoji ? "border-primary bg-primary/5" : "border-transparent bg-muted/30 hover:bg-muted/50")}>
                        <span className="text-xl">{m.emoji}</span>
                        <span className="text-xs font-medium">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 时长 */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">学习时长（分钟）</label>
                  <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} min={1} max={720} className="h-10 w-40" />
                </div>

                {/* 内容 */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">学习内容</label>
                  <textarea value={content} onChange={(e) => setContent(e.target.value)}
                    placeholder="今天学了什么？有什么收获？"
                    className="w-full rounded-xl border bg-background px-4 py-3 text-sm min-h-[100px] resize-y focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>

                {/* 标签 */}
                <div>
                  <label className="text-sm font-medium mb-2 block">学习类型</label>
                  <div className="flex gap-2 flex-wrap">
                    {STUDY_TAGS.map((t) => (
                      <button key={t} onClick={() => toggleTag(t)}
                        className={cn("rounded-lg border px-3 py-1.5 text-xs transition-all",
                          selectedTags.includes(t) ? "border-primary bg-primary/5 text-primary font-medium" : "hover:bg-muted/50")}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button onClick={handleCheckin} className="gap-2"><CheckCircle2 className="h-4 w-4" /> 完成打卡</Button>
                  <Button variant="outline" onClick={() => setShowForm(false)}>取消</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 打卡记录 */}
          <div>
            <h3 className="font-bold mb-4">最近打卡记录</h3>
            <div className="space-y-3">
              {MOCK_RECORDS.map((record) => (
                <Card key={record.id} className="shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{record.mood}</span>
                        <span className="text-sm font-medium">{record.date}</span>
                      </div>
                      <Badge variant="outline" className="text-xs gap-1"><Clock className="h-3 w-3" /> {formatDuration(record.duration)}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{record.content}</p>
                    {record.tags.length > 0 && (
                      <div className="flex gap-1.5 mt-2">
                        {record.tags.map((t) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧：排行榜 */}
        <div>
          <Card className="shadow-sm sticky top-24">
            <CardContent className="p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2"><Trophy className="h-5 w-5 text-amber-500" /> 打卡排行榜</h3>
              <div className="space-y-3">
                {LEADERBOARD.map((user) => (
                  <div key={user.rank} className="flex items-center gap-3">
                    <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      user.rank === 1 ? "bg-amber-100 text-amber-700" :
                      user.rank === 2 ? "bg-gray-100 text-gray-700" :
                      user.rank === 3 ? "bg-orange-100 text-orange-700" :
                      "bg-muted text-muted-foreground")}>
                      {user.rank <= 3 ? ["🥇", "🥈", "🥉"][user.rank - 1] : user.rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.school}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-orange-500">{user.streak} 天</p>
                      <p className="text-xs text-muted-foreground">{formatDuration(user.duration)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
