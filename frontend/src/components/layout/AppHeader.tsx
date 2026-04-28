"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Menu,
  X,
  ChevronDown,
  User,
  Heart,
  Shield,
  Settings,
  LogOut,
  BookOpen,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NAV_ITEMS, SITE_NAME } from "@/lib/constants";
import { useUserStore } from "@/stores/useUserStore";
import { cn } from "@/lib/utils";
import ThemeSwitcher from "@/components/layout/ThemeSwitcher";

export default function AppHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, isLoggedIn, logout } = useUserStore();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 shadow-sm shadow-black/[0.02]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
          <Image src="/images/logo.png" alt={SITE_NAME} width={36} height={36} className="h-9 w-9 rounded-lg object-contain" />
          <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">{SITE_NAME}</span>
        </Link>

        {/* 桌面端导航 */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) =>
            "items" in item ? (
              <div
                key={item.title}
                className="relative"
                onMouseEnter={() => setActiveDropdown(item.title)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <button
                  className={cn(
                    "flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                    activeDropdown === item.title && "text-foreground"
                  )}
                >
                  {item.title}
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform duration-200",
                      activeDropdown === item.title && "rotate-180"
                    )}
                  />
                </button>
                <AnimatePresence>
                  {activeDropdown === item.title && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 top-full z-50 mt-1 w-64 rounded-xl border bg-popover p-2 shadow-lg"
                    >
                      {item.items.map((subItem) => (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          className="block rounded-lg px-3 py-2.5 transition-all hover:bg-accent hover:translate-x-0.5"
                        >
                          <div className="text-sm font-medium">{subItem.title}</div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {subItem.description}
                          </div>
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                key={item.title}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.title}
              </Link>
            )
          )}
        </nav>

        {/* 右侧操作区 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
            className="hidden sm:flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            <Search className="h-3.5 w-3.5" />
            <span>搜索</span>
            <kbd className="ml-2 rounded border bg-muted/60 px-1.5 py-0.5 text-[11px] text-muted-foreground font-sans">Ctrl+K</kbd>
          </button>
          <Link href="/info/notices" className="sm:hidden">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Search className="h-4 w-4" />
            </Button>
          </Link>

          <ThemeSwitcher />

          {isLoggedIn && user ? (
            <div
              className="relative hidden sm:block"
              onMouseEnter={() => setUserMenuOpen(true)}
              onMouseLeave={() => setUserMenuOpen(false)}
            >
              <button className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-blue-500/10 text-primary transition-all hover:shadow-md">
                <User className="h-4 w-4" />
              </button>
              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full z-50 mt-1 w-48 rounded-xl border bg-popover p-2 shadow-lg"
                  >
                    <div className="px-3 py-2 border-b mb-1">
                      <p className="text-sm font-medium truncate">{user.nickname}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <Link href="/user" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent hover:translate-x-0.5">
                      <User className="h-4 w-4" /> 个人资料
                    </Link>
                    <Link href="/user/knowledge" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent hover:translate-x-0.5">
                      <BookOpen className="h-4 w-4" /> 个人知识库
                    </Link>
                    <Link href="/progress" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent hover:translate-x-0.5">
                      <Target className="h-4 w-4" /> 进度中心
                    </Link>
                    <Link href="/user/favorites" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent hover:translate-x-0.5">
                      <Heart className="h-4 w-4" /> 我的收藏
                    </Link>
                    <Link href="/user/settings" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent hover:translate-x-0.5">
                      <Settings className="h-4 w-4" /> 设置
                    </Link>
                    <div className="my-1 border-t" />
                    <Link href="/about" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent hover:translate-x-0.5 text-muted-foreground">
                      <BookOpen className="h-4 w-4" /> 关于我们
                    </Link>
                    {user.role === "admin" && (
                      <Link href="/admin" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent hover:translate-x-0.5 text-primary font-medium">
                        <Shield className="h-4 w-4" /> 管理后台
                      </Link>
                    )}
                    <button
                      onClick={logout}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 dark:text-red-400 transition-all hover:bg-red-50 dark:hover:bg-red-500/10"
                    >
                      <LogOut className="h-4 w-4" /> 退出登录
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link href="/auth/login" className="hidden sm:block">
              <Button size="sm" className="h-9 px-4 transition-all hover:shadow-md hover:shadow-primary/20">
                登录
              </Button>
            </Link>
          )}

          {/* 移动端菜单按钮 */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className={`inline-block transition-transform duration-200 ${mobileMenuOpen ? "rotate-90" : ""}`}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </span>
          </Button>
        </div>
      </div>

      {/* 移动端菜单 */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t md:hidden"
          >
            <nav className="mx-auto max-w-7xl space-y-1 px-4 py-3">
              {NAV_ITEMS.map((item) =>
                "items" in item ? (
                  <div key={item.title} className="space-y-1">
                    <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {item.title}
                    </div>
                    {item.items.map((subItem) => (
                      <Link
                        key={subItem.href}
                        href={subItem.href}
                        className="block rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {subItem.title}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="block rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.title}
                  </Link>
                )
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
