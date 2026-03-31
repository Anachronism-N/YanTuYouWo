"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, Flame, Trophy, Clock, Target,
  CheckCircle2, Plus, Sparkles, TrendingUp,
  Star, Zap, Award, ArrowRight, Bell,
  Trash2, Edit3, X, Gift, Medal,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/* ================================================================
   打卡事项类型
   ================================================================ */

interface CheckinHabit {
  id: string;
  name: string;
  icon: string;
  color: string;
  /** 目标频率：每天/每周几次 */
  frequency: "daily" | "weekly";
  /** 每周目标次数（frequency=weekly时有效） */
  weekly_target?: number;
  /** 连续打卡天数 */
  streak: number;
  /** 总打卡次数 */
  total: number;
  /** 今日是否已打卡 */
  checked_today: boolean;
  /** 提醒时间 */
  reminder_time?: string;
  /** 是否开启提醒 */
  reminder_enabled: boolean;
  /** 奖励里程碑 */
  milestones: { days: number; reward: string; achieved: boolean }[];
}

/* ================================================================
   Mock 数据
   ================================================================ */

const today = new Date();

const MOCK_HABITS: CheckinHabit[] = [
  {
    id: "h1", name: "背单词", icon: "📖", color: "from-blue-500/10 to-cyan-500/10",
    frequency: "daily", streak: 12, total: 45, checked_today: true,
    reminder_time: "08:00", reminder_enabled: true,
    milestones: [
      { days: 7, reward: "🏅 坚持一周", achieved: true },
      { days: 30, reward: "🎖️ 月度达人", achieved: false },
      { days: 100, reward: "🏆 百日英语王", achieved: false },
    ],
  },
  {
    id: "h2", name: "刷算法题", icon: "💻", color: "from-violet-500/10 to-purple-500/10",
    frequency: "daily", streak: 5, total: 28, checked_today: false,
    reminder_time: "20:00", reminder_enabled: true,
    milestones: [
      { days: 7, reward: "🏅 算法入门", achieved: false },
      { days: 30, reward: "🎖️ 算法达人", achieved: false },
    ],
  },
  {
    id: "h3", name: "联系导师", icon: "📧", color: "from-emerald-500/10 to-green-500/10",
    frequency: "weekly", weekly_target: 2, streak: 3, total: 8, checked_today: false,
    reminder_enabled: false,
    milestones: [
      { days: 5, reward: "🏅 主动出击", achieved: true },
      { days: 10, reward: "🎖️ 社交达人", achieved: false },
    ],
  },
  {
    id: "h4", name: "阅读论文", icon: "📄", color: "from-amber-500/10 to-yellow-500/10",
    frequency: "weekly", weekly_target: 3, streak: 2, total: 15, checked_today: false,
    reminder_time: "14:00", reminder_enabled: true,
    milestones: [
      { days: 10, reward: "🏅 学术新星", achieved: true },
      { days: 30, reward: "🎖️ 论文达人", achieved: false },
    ],
  },
  {
    id: "h5", name: "模拟面试", icon: "🎤", color: "from-rose-500/10 to-pink-500/10",
    frequency: "weekly", weekly_target: 2, streak: 1, total: 6, checked_today: false,
    reminder_enabled: false,
    milestones: [
      { days: 5, reward: "🏅 面试新手", achieved: true },
      { days: 20, reward: "🎖️ 面试高手", achieved: false },
    ],
  },
];

const MOCK_STATS = {
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

const MOOD_OPTIONS = [
  { emoji: "🔥", label: "充实" },
  { emoji: "💪", label: "努力" },
  { emoji: "😊", label: "开心" },
  { emoji: "😐", label: "一般" },
  { emoji: "😫", label: "疲惫" },
];

const MOCK_RECORDS = [
  { id: 1, date: today.toISOString().split("T")[0], duration: 180, content: "复习了数据结构和算法，刷了 10 道 LeetCode", mood: "🔥", tags: ["专业课复习"], habits: ["背单词", "刷算法题"] },
  { id: 2, date: new Date(today.getTime() - 86400000).toISOString().split("T")[0], duration: 120, content: "阅读了 2 篇 Transformer 相关论文", mood: "💪", tags: ["阅读文献", "科研项目"], habits: ["背单词", "阅读论文"] },
  { id: 3, date: new Date(today.getTime() - 172800000).toISOString().split("T")[0], duration: 90, content: "练习英语口语，准备自我介绍", mood: "😊", tags: ["英语学习", "面试练习"], habits: ["背单词", "模拟面试"] },
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

  const cells: (number | null)[] = [];
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
              isChecked && "bg-emerald-500 text-white font-bold",
              isToday && !isChecked && "ring-2 ring-emerald-500",
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

export default function ProgressCheckinPage() {
  const [habits, setHabits] = useState(MOCK_HABITS);
  const [showForm, setShowForm] = useState(false);
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [duration, setDuration] = useState("120");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState("🔥");
  const [selectedHabits, setSelectedHabits] = useState<string[]>([]);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitIcon, setNewHabitIcon] = useState("📝");
  const [newHabitFreq, setNewHabitFreq] = useState<"daily" | "weekly">("daily");
  const [newHabitReminder, setNewHabitReminder] = useState("");

  const todayChecked = MOCK_STATS.calendar.includes(today.toISOString().split("T")[0]);
  const checkedHabitsToday = habits.filter((h) => h.checked_today).length;
  const totalHabits = habits.length;

  const toggleHabitCheck = (id: string) => {
    setHabits((prev) => prev.map((h) => h.id === id ? {
      ...h,
      checked_today: !h.checked_today,
      streak: !h.checked_today ? h.streak + 1 : h.streak - 1,
      total: !h.checked_today ? h.total + 1 : h.total - 1,
    } : h));
  };

  const toggleSelectedHabit = (name: string) => {
    setSelectedHabits((p) => p.includes(name) ? p.filter((n) => n !== name) : [...p, name]);
  };

  const addHabit = () => {
    if (!newHabitName.trim()) return;
    const newH: CheckinHabit = {
      id: `h_${Date.now()}`, name: newHabitName.trim(), icon: newHabitIcon,
      color: "from-gray-500/10 to-slate-500/10", frequency: newHabitFreq,
      weekly_target: newHabitFreq === "weekly" ? 3 : undefined,
      streak: 0, total: 0, checked_today: false,
      reminder_time: newHabitReminder || undefined,
      reminder_enabled: !!newHabitReminder,
      milestones: [
        { days: 7, reward: "🏅 坚持一周", achieved: false },
        { days: 30, reward: "🎖️ 月度达人", achieved: false },
      ],
    };
    setHabits((prev) => [...prev, newH]);
    setNewHabitName(""); setNewHabitIcon("📝"); setShowAddHabit(false);
  };

  const deleteHabit = (id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
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

  const ICON_OPTIONS = ["📝", "📖", "💻", "📧", "📄", "🎤", "🏃", "🧘", "✍️", "🔬", "📊", "🎯"];

  return (
    <div className="space-y-6">
      {/* 与社群同步提示 */}
      <div className="rounded-xl bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-200/50 p-3 flex items-center justify-between">
        <p className="text-xs text-emerald-700 dark:text-emerald-400">
          📢 打卡数据已与社群学习打卡同步，你的打卡记录会同时出现在社群排行榜中
        </p>
        <Link href="/community/checkin" className="text-xs text-emerald-600 hover:underline flex items-center gap-1 shrink-0">
          前往社群 <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "连续打卡", value: `${MOCK_STATS.streak_days} 天`, icon: Flame, color: "text-orange-500 bg-orange-50" },
          { label: "本月打卡", value: `${MOCK_STATS.month_days} 天`, icon: Calendar, color: "text-blue-500 bg-blue-50" },
          { label: "今日事项", value: `${checkedHabitsToday}/${totalHabits}`, icon: CheckCircle2, color: "text-emerald-500 bg-emerald-50" },
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
        {/* 左侧：打卡事项 + 日历 + 打卡 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 打卡事项管理 */}
          <Card className="shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold flex items-center gap-2">
                  <Target className="h-5 w-5 text-emerald-500" /> 今日打卡事项
                  <Badge variant="secondary" className="text-xs">{checkedHabitsToday}/{totalHabits}</Badge>
                </h3>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => setShowAddHabit(!showAddHabit)}>
                  <Plus className="h-3.5 w-3.5" /> 添加事项
                </Button>
              </div>

              {/* 添加事项表单 */}
              <AnimatePresence>
                {showAddHabit && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-4">
                    <div className="rounded-xl border-2 border-dashed border-emerald-300 p-4 space-y-3">
                      <div className="flex gap-3">
                        <div>
                          <label className="text-xs font-medium mb-1 block">图标</label>
                          <div className="flex gap-1 flex-wrap max-w-[200px]">
                            {ICON_OPTIONS.map((ic) => (
                              <button key={ic} onClick={() => setNewHabitIcon(ic)}
                                className={cn("h-8 w-8 rounded-lg text-lg flex items-center justify-center transition-all",
                                  newHabitIcon === ic ? "bg-emerald-100 ring-2 ring-emerald-500" : "hover:bg-muted/50")}>
                                {ic}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex-1 space-y-2">
                          <Input value={newHabitName} onChange={(e) => setNewHabitName(e.target.value)} placeholder="事项名称，如：背单词" className="h-9" />
                          <div className="flex gap-2">
                            <select value={newHabitFreq} onChange={(e) => setNewHabitFreq(e.target.value as "daily" | "weekly")}
                              className="rounded-lg border bg-background px-3 py-1.5 text-xs flex-1">
                              <option value="daily">每天</option>
                              <option value="weekly">每周</option>
                            </select>
                            <Input value={newHabitReminder} onChange={(e) => setNewHabitReminder(e.target.value)} type="time" placeholder="提醒时间" className="h-8 text-xs flex-1" />
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="gap-1.5 text-xs bg-emerald-500 hover:bg-emerald-600" onClick={addHabit}>
                          <Plus className="h-3.5 w-3.5" /> 添加
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs" onClick={() => setShowAddHabit(false)}>取消</Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 事项列表 */}
              <div className="space-y-2">
                {habits.map((habit) => {
                  const nextMilestone = habit.milestones.find((m) => !m.achieved);
                  return (
                    <div key={habit.id}
                      className={cn("flex items-center gap-3 rounded-xl border p-3 transition-all group",
                        habit.checked_today ? "bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-200/50" : "hover:bg-muted/30")}>
                      {/* 打卡按钮 */}
                      <button onClick={() => toggleHabitCheck(habit.id)}
                        className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg transition-all",
                          habit.checked_today
                            ? "bg-emerald-500 text-white shadow-sm scale-105"
                            : `bg-gradient-to-br ${habit.color}`)}>
                        {habit.checked_today ? <CheckCircle2 className="h-5 w-5" /> : habit.icon}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn("text-sm font-medium", habit.checked_today && "line-through text-muted-foreground")}>{habit.name}</span>
                          <Badge variant="outline" className="text-xs">{habit.frequency === "daily" ? "每天" : `每周${habit.weekly_target}次`}</Badge>
                          {habit.reminder_enabled && (
                            <Badge variant="secondary" className="text-xs gap-0.5">
                              <Bell className="h-2.5 w-2.5" /> {habit.reminder_time}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-0.5">
                            <Flame className="h-3 w-3 text-orange-500" /> 连续 {habit.streak} 天
                          </span>
                          <span>累计 {habit.total} 次</span>
                          {nextMilestone && (
                            <span className="flex items-center gap-0.5 text-amber-600">
                              <Gift className="h-3 w-3" /> 还差 {nextMilestone.days - habit.total} 次解锁 {nextMilestone.reward}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 操作按钮 */}
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500"
                        onClick={() => deleteHabit(habit.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>

              {/* 今日完成进度 */}
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">今日完成进度</span>
                  <span className="text-xs font-bold text-emerald-600">{Math.round((checkedHabitsToday / totalHabits) * 100)}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(checkedHabitsToday / totalHabits) * 100}%` }}
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 打卡日历 */}
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-emerald-500" />
                {today.getFullYear()} 年 {today.getMonth() + 1} 月
              </h3>
              <CheckinCalendar checkedDays={MOCK_STATS.calendar} />
            </CardContent>
          </Card>

          {/* 今日打卡 */}
          {!todayChecked && !showForm && (
            <Card className="shadow-sm border-dashed border-2 hover:border-emerald-400 transition-colors cursor-pointer" onClick={() => setShowForm(true)}>
              <CardContent className="p-8 text-center">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 mb-3">
                  <Plus className="h-7 w-7 text-emerald-600" />
                </div>
                <h3 className="font-bold text-lg">今日学习打卡</h3>
                <p className="text-sm text-muted-foreground mt-1">记录今天的学习内容，保持连续打卡！</p>
              </CardContent>
            </Card>
          )}

          {showForm && (
            <Card className="shadow-sm">
              <CardContent className="p-6 space-y-5">
                <h3 className="font-bold flex items-center gap-2"><Sparkles className="h-5 w-5 text-emerald-500" /> 今日学习打卡</h3>

                {/* 心情 */}
                <div>
                  <label className="text-sm font-medium mb-2 block">今天的状态</label>
                  <div className="flex gap-3">
                    {MOOD_OPTIONS.map((m) => (
                      <button key={m.emoji} onClick={() => setMood(m.emoji)}
                        className={cn("flex flex-col items-center gap-1 rounded-xl border-2 px-4 py-3 transition-all",
                          mood === m.emoji ? "border-emerald-500 bg-emerald-500/5" : "border-transparent bg-muted/30 hover:bg-muted/50")}>
                        <span className="text-xl">{m.emoji}</span>
                        <span className="text-xs font-medium">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 关联打卡事项 */}
                <div>
                  <label className="text-sm font-medium mb-2 block">今日完成的事项</label>
                  <div className="flex gap-2 flex-wrap">
                    {habits.map((h) => (
                      <button key={h.id} onClick={() => toggleSelectedHabit(h.name)}
                        className={cn("flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-all",
                          selectedHabits.includes(h.name)
                            ? "border-emerald-500 bg-emerald-500/5 text-emerald-700 font-medium"
                            : "hover:bg-muted/50")}>
                        <span>{h.icon}</span> {h.name}
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
                    className="w-full rounded-xl border bg-background px-4 py-3 text-sm min-h-[100px] resize-y focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                </div>

                <div className="flex gap-3">
                  <Button onClick={handleCheckin} className="gap-2 bg-emerald-500 hover:bg-emerald-600"><CheckCircle2 className="h-4 w-4" /> 完成打卡</Button>
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
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {record.tags.map((t) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                      {record.habits.map((h) => (
                        <Badge key={h} variant="outline" className="text-xs text-emerald-600 border-emerald-200">✅ {h}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧：鼓励 + 里程碑 + 统计 */}
        <div className="space-y-4">
          {/* 鼓励卡片 */}
          <Card className="shadow-sm bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-500/5 dark:to-green-500/5">
            <CardContent className="p-5 text-center">
              <div className="text-4xl mb-2">🎯</div>
              <h3 className="font-bold text-sm">坚持就是胜利！</h3>
              <p className="text-xs text-muted-foreground mt-1">
                你已经连续打卡 {MOCK_STATS.streak_days} 天了，继续保持！
              </p>
              <div className="mt-3 flex justify-center gap-1">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className={cn("h-2 w-6 rounded-full",
                    i < MOCK_STATS.streak_days ? "bg-emerald-500" : "bg-muted")} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 里程碑奖励 */}
          <Card className="shadow-sm">
            <CardContent className="p-5">
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                <Medal className="h-4 w-4 text-amber-500" /> 里程碑奖励
              </h3>
              <div className="space-y-2">
                {habits.flatMap((h) => h.milestones.map((m) => ({ ...m, habitName: h.name, habitIcon: h.icon }))).map((m, i) => (
                  <div key={i} className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-xs",
                    m.achieved ? "bg-amber-50/50 dark:bg-amber-500/5" : "opacity-60")}>
                    <span className="text-base">{m.achieved ? m.reward.split(" ")[0] : "🔒"}</span>
                    <div className="flex-1">
                      <span className={cn("font-medium", m.achieved && "text-amber-700")}>{m.reward.split(" ").slice(1).join(" ")}</span>
                      <span className="text-muted-foreground ml-1">({m.habitName})</span>
                    </div>
                    {m.achieved && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 月度统计 */}
          <Card className="shadow-sm">
            <CardContent className="p-5">
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" /> 本月学习统计
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">打卡天数</span>
                  <span className="text-sm font-bold">{MOCK_STATS.month_days} / {new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${(MOCK_STATS.month_days / new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()) * 100}%` }} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">学习时长</span>
                  <span className="text-sm font-bold">{formatDuration(MOCK_STATS.month_duration)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">日均时长</span>
                  <span className="text-sm font-bold">{formatDuration(Math.round(MOCK_STATS.month_duration / MOCK_STATS.month_days))}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
