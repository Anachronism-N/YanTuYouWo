"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  User,
  Heart,
  Settings,
  LogOut,
  BookOpen,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/stores/useUserStore";
import { cn } from "@/lib/utils";

const sidebarItems = [
  { title: "个人资料", href: "/user", icon: User },
  { title: "个人知识库", href: "/user/knowledge", icon: BookOpen },
  { title: "进度中心", href: "/progress", icon: Target },
  { title: "我的收藏", href: "/user/favorites", icon: Heart },
  { title: "设置", href: "/user/settings", icon: Settings },
];

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useUserStore();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        {/* 侧边栏 */}
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-1"
        >
          <div className="lg:sticky lg:top-24 space-y-6">
            {/* 用户信息卡片 */}
            <div className="rounded-xl border bg-card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-blue-500/10 text-primary">
                  <User className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold truncate">
                    {user?.nickname || "未登录用户"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email || "请先登录"}
                  </p>
                </div>
              </div>
              {user?.bio && (
                <p className="mt-3 text-xs text-muted-foreground line-clamp-2">
                  {user.bio}
                </p>
              )}
            </div>

            {/* 导航菜单 */}
            <nav className="space-y-1">
              {sidebarItems.map((item) => {
                const isActive =
                  item.href === "/user"
                    ? pathname === "/user"
                    : pathname.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.title}
                    </div>
                  </Link>
                );
              })}

              <button
                onClick={logout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
              >
                <LogOut className="h-4 w-4" />
                退出登录
              </button>
            </nav>
          </div>
        </motion.aside>

        {/* 主内容区 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-3"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
