"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUserStore } from "@/stores/useUserStore";
import { useEffect } from "react";
import {
  LayoutDashboard, FileText, Building2, Users, Trophy, BookOpen,
  MessageSquare, Settings, Shield, Upload, BarChart3, Bell, Code2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { title: "仪表盘", href: "/admin", icon: LayoutDashboard, exact: true },
  { title: "通知管理", href: "/admin/notices", icon: FileText },
  { title: "院校管理", href: "/admin/schools", icon: Building2 },
  { title: "导师管理", href: "/admin/tutors", icon: Users },
  { title: "竞赛管理", href: "/admin/competitions", icon: Trophy },
  { title: "期刊管理", href: "/admin/journals", icon: BookOpen },
  { title: "社群管理", href: "/admin/community", icon: MessageSquare },
  { title: "内容上传", href: "/admin/upload", icon: Upload },
  { title: "数据统计", href: "/admin/analytics", icon: BarChart3 },
  { title: "API 文档", href: "/admin/api-docs", icon: Code2 },
  { title: "系统通知", href: "/admin/notifications", icon: Bell },
  { title: "系统设置", href: "/admin/settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoggedIn } = useUserStore();
  const router = useRouter();
  const pathname = usePathname();

  const isAdmin = isLoggedIn && user?.role === "admin";

  useEffect(() => {
    if (!isAdmin) {
      router.replace("/auth/login");
    }
  }, [isAdmin, router]);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-lg font-medium">需要管理员权限</p>
          <p className="text-sm text-muted-foreground mt-1">正在跳转到登录页...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      {/* 侧边栏 */}
      <aside className="w-56 shrink-0 border-r bg-muted/20 hidden lg:block">
        <div className="sticky top-16 p-4 space-y-1">
          <div className="flex items-center gap-2 px-3 py-2 mb-3">
            <Shield className="h-5 w-5 text-primary" />
            <span className="text-sm font-bold">管理后台</span>
          </div>
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}>
                <item.icon className="h-4 w-4" />
                {item.title}
              </Link>
            );
          })}
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}
