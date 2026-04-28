"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Home, ArrowLeft, Search, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-md text-center"
      >
        {/* 404 数字 */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4, type: "spring" }}
          className="relative mx-auto mb-8"
        >
          <div className="text-[120px] font-bold leading-none tracking-tighter bg-gradient-to-br from-primary via-blue-500 to-cyan-500 bg-clip-text text-transparent select-none sm:text-[160px]">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10"
            >
              <MapPin className="h-8 w-8 text-primary" />
            </motion.div>
          </div>
        </motion.div>

        {/* 文案 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            页面走丢了
          </h1>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            你访问的页面不存在或已被移除。
            <br />
            不如回到首页，继续探索保研信息吧。
          </p>
        </motion.div>

        {/* 操作按钮 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
        >
          <Link href="/">
            <Button className="gap-2 px-6">
              <Home className="h-4 w-4" />
              返回首页
            </Button>
          </Link>
          <Link href="/info/notices">
            <Button variant="outline" className="gap-2 px-6">
              <Search className="h-4 w-4" />
              浏览保研信息
            </Button>
          </Link>
        </motion.div>

        {/* 返回上一页 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-6"
        >
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            返回上一页
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
