"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Palette, Sun, Moon, Monitor,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useThemeStore, THEME_COLORS, BG_EFFECT_GROUPS,
  type ThemeColor, type DarkMode, type BgEffect,
} from "@/lib/stores/theme-store";

/* ================================================================
   主题切换器
   支持颜色主题、暗色模式、动态背景切换（分组显示）
   ================================================================ */

const DARK_MODES: { value: DarkMode; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "浅色", icon: Sun },
  { value: "dark", label: "深色", icon: Moon },
  { value: "system", label: "跟随系统", icon: Monitor },
];

export default function ThemeSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { color, darkMode, bgEffect, setColor, setDarkMode, setBgEffect } = useThemeStore();

  // 点击外部关闭面板
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        panelRef.current && !panelRef.current.contains(target) &&
        buttonRef.current && !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // ESC 关闭
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen]);

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-lg"
        onClick={() => setIsOpen(!isOpen)}
        title="主题设置"
      >
        <Palette className="h-4 w-4" />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute right-0 top-full mt-2 z-50",
              "w-80 max-h-[80vh] overflow-y-auto rounded-xl border bg-card p-4 shadow-xl",
            )}
          >
            {/* 颜色主题 */}
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2.5">颜色主题</h4>
              <div className="flex gap-2">
                {(Object.entries(THEME_COLORS) as [ThemeColor, typeof THEME_COLORS.blue][]).map(
                  ([key, val]) => (
                    <button
                      key={key}
                      onClick={() => setColor(key)}
                      className={cn(
                        "group flex flex-col items-center gap-1.5 rounded-lg p-2 transition-all hover:bg-muted/50",
                        color === key && "bg-muted ring-1 ring-primary/30",
                      )}
                      title={val.label}
                    >
                      <div
                        className={cn(
                          "h-7 w-7 rounded-full ring-2 ring-offset-2 ring-offset-card transition-all",
                          color === key ? "ring-primary scale-110" : "ring-transparent group-hover:ring-muted-foreground/20",
                        )}
                        style={{ background: val.preview }}
                      />
                      <span className="text-xs text-muted-foreground">{val.label}</span>
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* 暗色模式 */}
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2.5">外观模式</h4>
              <div className="flex gap-1.5">
                {DARK_MODES.map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.value}
                      onClick={() => setDarkMode(m.value)}
                      className={cn(
                        "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all",
                        darkMode === m.value
                          ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 动态背景 — 分组显示 */}
            {BG_EFFECT_GROUPS.map((group) => (
              <div key={group.label} className="mb-3 last:mb-0">
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">{group.label}背景</h4>
                <div className="grid grid-cols-4 gap-1.5">
                  {group.items.map((item) => (
                    <button
                      key={item.key}
                      onClick={() => setBgEffect(item.key)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-lg px-1.5 py-2 text-center transition-all",
                        bgEffect === item.key
                          ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                          : "bg-muted/40 text-muted-foreground hover:bg-muted",
                      )}
                    >
                      <span className="text-base leading-none">{item.emoji}</span>
                      <span className="text-xs font-medium leading-tight">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
