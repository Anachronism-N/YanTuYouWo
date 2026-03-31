"use client";

import { useEffect } from "react";
import { useThemeStore, THEME_COLORS } from "@/lib/stores/theme-store";

/* ================================================================
   ThemeProvider
   监听主题状态变化，动态更新 CSS 变量和 dark class
   合并为单一 useEffect 避免竞态条件
   ================================================================ */

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const color = useThemeStore((s) => s.color);
  const darkMode = useThemeStore((s) => s.darkMode);

  useEffect(() => {
    const root = document.documentElement;
    const hue = THEME_COLORS[color].hue;

    // 1. 先确定是否为深色模式
    let isDark = false;
    let cleanup: (() => void) | undefined;

    if (darkMode === "dark") {
      isDark = true;
    } else if (darkMode === "light") {
      isDark = false;
    } else {
      // system
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      isDark = mq.matches;
      const handler = (e: MediaQueryListEvent) => {
        const newIsDark = e.matches;
        if (newIsDark) root.classList.add("dark");
        else root.classList.remove("dark");
        applyColorVars(root, hue, newIsDark);
      };
      mq.addEventListener("change", handler);
      cleanup = () => mq.removeEventListener("change", handler);
    }

    // 2. 应用 dark class
    if (isDark) root.classList.add("dark");
    else root.classList.remove("dark");

    // 3. 应用颜色变量
    applyColorVars(root, hue, isDark);

    // 4. 设置 data-theme 属性
    root.setAttribute("data-theme", color);

    return cleanup;
  }, [color, darkMode]);

  return <>{children}</>;
}

function applyColorVars(root: HTMLElement, hue: number, isDark: boolean) {
  if (isDark) {
    root.style.setProperty("--primary", `oklch(0.65 0.18 ${hue})`);
    root.style.setProperty("--primary-foreground", "oklch(0.99 0 0)");
    root.style.setProperty("--ring", `oklch(0.65 0.18 ${hue})`);
    root.style.setProperty("--chart-1", `oklch(0.65 0.18 ${hue})`);
    root.style.setProperty("--secondary", `oklch(0.26 0.02 ${hue})`);
    root.style.setProperty("--secondary-foreground", "oklch(0.985 0 0)");
    root.style.setProperty("--accent", `oklch(0.26 0.02 ${hue})`);
    root.style.setProperty("--accent-foreground", "oklch(0.985 0 0)");
    root.style.setProperty("--muted", `oklch(0.26 0.018 ${hue})`);
    root.style.setProperty("--muted-foreground", `oklch(0.70 0.018 ${hue})`);
    root.style.setProperty("--background", `oklch(0.145 0.015 ${hue})`);
    root.style.setProperty("--foreground", "oklch(0.985 0 0)");
    root.style.setProperty("--card", `oklch(0.195 0.018 ${hue})`);
    root.style.setProperty("--card-foreground", "oklch(0.985 0 0)");
    root.style.setProperty("--popover", `oklch(0.195 0.018 ${hue})`);
    root.style.setProperty("--popover-foreground", "oklch(0.985 0 0)");
    root.style.setProperty("--border", `oklch(0.30 0.015 ${hue})`);
    root.style.setProperty("--input", `oklch(0.30 0.015 ${hue})`);
    root.style.setProperty("--destructive", "oklch(0.704 0.191 22.216)");
    root.style.setProperty("--sidebar", `oklch(0.195 0.018 ${hue})`);
    root.style.setProperty("--sidebar-foreground", "oklch(0.985 0 0)");
    root.style.setProperty("--sidebar-primary", `oklch(0.65 0.18 ${hue})`);
    root.style.setProperty("--sidebar-primary-foreground", "oklch(0.99 0 0)");
    root.style.setProperty("--sidebar-accent", `oklch(0.26 0.018 ${hue})`);
    root.style.setProperty("--sidebar-accent-foreground", "oklch(0.985 0 0)");
    root.style.setProperty("--sidebar-border", `oklch(0.30 0.015 ${hue})`);
    root.style.setProperty("--sidebar-ring", `oklch(0.65 0.18 ${hue})`);
  } else {
    root.style.setProperty("--primary", `oklch(0.55 0.18 ${hue})`);
    root.style.setProperty("--primary-foreground", "oklch(0.99 0 0)");
    root.style.setProperty("--ring", `oklch(0.55 0.18 ${hue})`);
    root.style.setProperty("--chart-1", `oklch(0.55 0.18 ${hue})`);
    root.style.setProperty("--secondary", `oklch(0.96 0.01 ${hue})`);
    root.style.setProperty("--secondary-foreground", `oklch(0.30 0.03 ${hue})`);
    root.style.setProperty("--accent", `oklch(0.95 0.02 ${hue})`);
    root.style.setProperty("--accent-foreground", `oklch(0.30 0.03 ${hue})`);
    root.style.setProperty("--muted", `oklch(0.965 0.006 ${hue})`);
    root.style.setProperty("--muted-foreground", `oklch(0.50 0.02 ${hue})`);
    root.style.setProperty("--background", "oklch(0.985 0 0)");
    root.style.setProperty("--foreground", `oklch(0.22 0.02 ${hue})`);
    root.style.setProperty("--card", "oklch(1 0 0)");
    root.style.setProperty("--card-foreground", `oklch(0.22 0.02 ${hue})`);
    root.style.setProperty("--popover", "oklch(1 0 0)");
    root.style.setProperty("--popover-foreground", `oklch(0.22 0.02 ${hue})`);
    root.style.setProperty("--border", `oklch(0.92 0.008 ${hue})`);
    root.style.setProperty("--input", `oklch(0.92 0.008 ${hue})`);
    root.style.setProperty("--destructive", "oklch(0.577 0.245 27.325)");
    root.style.setProperty("--sidebar", `oklch(0.98 0.004 ${hue})`);
    root.style.setProperty("--sidebar-foreground", `oklch(0.22 0.02 ${hue})`);
    root.style.setProperty("--sidebar-primary", `oklch(0.55 0.18 ${hue})`);
    root.style.setProperty("--sidebar-primary-foreground", "oklch(0.99 0 0)");
    root.style.setProperty("--sidebar-accent", `oklch(0.95 0.02 ${hue})`);
    root.style.setProperty("--sidebar-accent-foreground", `oklch(0.30 0.03 ${hue})`);
    root.style.setProperty("--sidebar-border", `oklch(0.92 0.008 ${hue})`);
    root.style.setProperty("--sidebar-ring", `oklch(0.55 0.18 ${hue})`);
  }
}
