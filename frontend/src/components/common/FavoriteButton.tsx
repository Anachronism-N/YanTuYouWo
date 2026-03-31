"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/stores/useUserStore";
import { cn } from "@/lib/utils";
import type { FavoriteType } from "@/types/user";

interface FavoriteButtonProps {
  /** 收藏类型 */
  type: FavoriteType;
  /** 目标 ID */
  targetId: number;
  /** 标题（用于收藏记录） */
  title: string;
  /** 描述（用于收藏记录） */
  description?: string;
  /** 额外信息 */
  extra?: Record<string, string>;
  /** 尺寸 */
  size?: "sm" | "default" | "lg";
  /** 是否显示文字 */
  showText?: boolean;
  /** 自定义类名 */
  className?: string;
}

export default function FavoriteButton({
  type,
  targetId,
  title,
  description = "",
  extra = {},
  size = "default",
  showText = false,
  className,
}: FavoriteButtonProps) {
  const { isLoggedIn, isFavorited, addFavorite, removeFavorite } = useUserStore();
  const [isAnimating, setIsAnimating] = useState(false);

  const favorited = isFavorited(type, targetId);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isLoggedIn) {
      // 未登录时，使用 Mock 模式直接操作（后续接入真实 API 后改为跳转登录）
      // 暂时允许未登录也能收藏（本地存储）
    }

    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 600);

    if (favorited) {
      removeFavorite(type, targetId);
    } else {
      addFavorite({
        id: Date.now(),
        type,
        target_id: targetId,
        title,
        description,
        created_at: new Date().toISOString(),
        extra,
      });
    }
  };

  const iconSize = size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-5 w-5" : "h-4 w-4";

  return (
    <Button
      variant="ghost"
      size={size === "sm" ? "sm" : size === "lg" ? "lg" : "default"}
      className={cn(
        "relative gap-1.5 transition-all",
        favorited
          ? "text-red-500 hover:text-red-600 hover:bg-red-50"
          : "text-muted-foreground hover:text-red-500 hover:bg-red-50",
        className
      )}
      onClick={handleToggle}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={favorited ? "filled" : "outline"}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Heart
            className={cn(
              iconSize,
              favorited && "fill-current",
              isAnimating && "animate-bounce"
            )}
          />
        </motion.div>
      </AnimatePresence>
      {/* 收藏时的粒子效果 */}
      <AnimatePresence>
        {isAnimating && favorited && (
          <>
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute h-1 w-1 rounded-full bg-red-400"
                initial={{ scale: 0, x: 0, y: 0 }}
                animate={{
                  scale: [0, 1, 0],
                  x: Math.cos((i * 60 * Math.PI) / 180) * 20,
                  y: Math.sin((i * 60 * Math.PI) / 180) * 20,
                }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            ))}
          </>
        )}
      </AnimatePresence>
      {showText && (
        <span className="text-sm">
          {favorited ? "已收藏" : "收藏"}
        </span>
      )}
    </Button>
  );
}
