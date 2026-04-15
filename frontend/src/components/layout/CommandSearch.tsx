"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Search, FileText, Building2, Users, Trophy, BookOpen, Sparkles, Calendar, Heart, MessageSquare } from "lucide-react";

const COMMANDS = [
  { label: "信息聚合", href: "/info/notices", icon: FileText, group: "保研信息" },
  { label: "院校库", href: "/info/schools", icon: Building2, group: "保研信息" },
  { label: "导师库", href: "/info/tutors", icon: Users, group: "保研信息" },
  { label: "竞赛信息", href: "/info/competitions", icon: Trophy, group: "保研信息" },
  { label: "期刊会议", href: "/info/journals", icon: BookOpen, group: "保研信息" },
  { label: "AI 简历工坊", href: "/ai/resume", icon: Sparkles, group: "AI 辅导" },
  { label: "AI 择校推荐", href: "/ai/recommend", icon: Sparkles, group: "AI 辅导" },
  { label: "AI 模拟面试", href: "/ai/interview", icon: Sparkles, group: "AI 辅导" },
  { label: "综合规划", href: "/ai/plan", icon: Calendar, group: "AI 辅导" },
  { label: "心理支持", href: "/ai/mental", icon: Heart, group: "AI 辅导" },
  { label: "社群", href: "/community", icon: MessageSquare, group: "社区" },
  { label: "进度中心", href: "/progress", icon: Calendar, group: "个人" },
];

export default function CommandSearch() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  if (!open) return null;

  const groups = Array.from(new Set(COMMANDS.map(c => c.group)));

  return (
    <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)}>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <Command className="rounded-xl border bg-popover shadow-2xl overflow-hidden">
          <div className="flex items-center gap-2 border-b px-4">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Command.Input placeholder="搜索页面、功能..." className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
            <kbd className="hidden sm:inline-flex h-5 items-center rounded border px-1.5 text-[10px] text-muted-foreground">ESC</kbd>
          </div>
          <Command.List className="max-h-72 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">没有找到结果</Command.Empty>
            {groups.map(group => (
              <Command.Group key={group} heading={group} className="[&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                {COMMANDS.filter(c => c.group === group).map(cmd => (
                  <Command.Item key={cmd.href} value={cmd.label} onSelect={() => { router.push(cmd.href); setOpen(false); }}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer aria-selected:bg-accent">
                    <cmd.icon className="h-4 w-4 text-muted-foreground" />
                    {cmd.label}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
          <div className="border-t px-4 py-2 text-xs text-muted-foreground flex items-center gap-4">
            <span>↑↓ 导航</span><span>↵ 打开</span><span>ESC 关闭</span>
          </div>
        </Command>
      </div>
    </div>
  );
}
