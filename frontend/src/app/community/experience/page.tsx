"use client";

/**
 * 经验分享页面 - 复用社群主页逻辑，默认筛选为「经验分享」分类
 * 实际上重定向到社群主页并带上分类参数
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ExperiencePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/community?category=经验分享");
  }, [router]);
  return null;
}
