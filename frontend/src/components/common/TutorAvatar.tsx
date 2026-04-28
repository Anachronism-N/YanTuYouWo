"use client";

import { useState } from "react";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface TutorAvatarProps {
  src?: string | null;
  alt: string;
  size?: number;
  className?: string;
  iconClassName?: string;
}

/** 导师头像组件
 *
 * 处理：
 *   - src 为空/null → 显示默认 User 图标
 *   - src 加载失败 → fallback 到默认图标（不会出现破图）
 */
export default function TutorAvatar({
  src,
  alt,
  size = 56,
  className,
  iconClassName,
}: TutorAvatarProps) {
  const [errored, setErrored] = useState(false);
  const showFallback = !src || errored;

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full overflow-hidden bg-gradient-to-br from-primary/10 to-blue-500/10 text-primary",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {showFallback ? (
        <User className={cn("h-1/2 w-1/2", iconClassName)} />
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={src!}
          alt={alt}
          className="h-full w-full object-cover"
          onError={() => setErrored(true)}
          loading="lazy"
        />
      )}
    </div>
  );
}
