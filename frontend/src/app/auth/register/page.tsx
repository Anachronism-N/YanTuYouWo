"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { GraduationCap, Mail, Lock, Eye, EyeOff, User, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SITE_NAME } from "@/lib/constants";
import { useUserStore } from "@/stores/useUserStore";
import { mockUserProfile, mockFavorites } from "@/lib/mock-data";
import { register as apiRegister } from "@/lib/api";
import { toast } from "sonner";
import axios from "axios";

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    nickname: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const { setUser, setFavorites } = useUserStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error("两次输入的密码不一致");
      return;
    }
    setIsLoading(true);
    const email = form.email.trim();
    const username = email.split("@")[0] || form.nickname || "user";
    try {
      const res = await apiRegister({ email, password: form.password, username, nickname: form.nickname || username });
      setUser(res.user ?? { ...mockUserProfile, email, username, nickname: form.nickname || username }, res.token);
      setFavorites(mockFavorites);
      toast.success("注册成功，欢迎加入！");
      router.push("/user/onboarding");
    } catch (err) {
      console.error(err);
      let msg = "注册失败，请稍后重试";
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 400) msg = "该邮箱已被注册或密码强度不够（至少 6 位）";
        else if (err.code === "ERR_NETWORK") msg = "无法连接后端服务，请确认后端已启动";
        else if (err.response?.data && typeof err.response.data === "object") {
          const data = err.response.data as { detail?: string };
          if (data.detail) msg = data.detail;
        }
      }
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex">
      {/* 左侧装饰区 */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-cyan-500 via-blue-500 to-primary">
        {/* 装饰元素 */}
        <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-white/10 blur-xl" />
        <div className="absolute top-10 left-10 h-60 w-60 rounded-full bg-white/10 blur-xl" />
        <div className="absolute bottom-1/3 left-1/4 h-40 w-40 rounded-full bg-white/5 blur-lg" />
        {/* 网格装饰 */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />

        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* 大号学士帽图标 */}
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm mb-8 shadow-lg">
              <GraduationCap className="h-9 w-9" />
            </div>

            <h2 className="text-4xl font-bold leading-tight">
              加入我们
            </h2>
            <p className="mt-4 text-lg text-white/80 max-w-md leading-relaxed">
              创建你的专属账号，开启智能化的保研信息管理之旅。
            </p>

            <div className="mt-12 space-y-4">
              {[
                "免费使用所有基础功能",
                "智能匹配推荐适合的项目",
                "报名截止前自动提醒",
              ].map((text, i) => (
                <motion.div
                  key={text}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <CheckCircle2 className="h-5 w-5 text-white/70 shrink-0" />
                  <span className="text-white/90">{text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* 右侧注册表单 */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* 移动端 Logo */}
          <div className="lg:hidden flex items-center justify-center gap-2.5 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">{SITE_NAME}</span>
          </div>

          {/* Slogan 装饰图 */}
          <div className="hidden lg:flex justify-center mb-8">
            <Image
              src="/images/slogan_AD.png"
              alt={SITE_NAME}
              width={360}
              height={90}
              className="h-auto w-auto max-w-[300px] opacity-80 hover:opacity-100 transition-opacity duration-300"
            />
          </div>

          <div className="text-center lg:text-left">
            <h1 className="text-2xl font-bold sm:text-3xl">创建账号</h1>
            <p className="mt-2 text-muted-foreground">
              已有账号？{" "}
              <Link href="/auth/login" className="text-primary font-medium hover:underline">
                立即登录
              </Link>
            </p>
          </div>

          <Card className="mt-8 border-0 shadow-none lg:border lg:shadow-sm lg:hover:shadow-md transition-shadow duration-300">
            <CardContent className="p-0 lg:p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* 昵称 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="nickname">
                    昵称
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="nickname"
                      type="text"
                      placeholder="你的昵称"
                      className="pl-10 h-11"
                      value={form.nickname}
                      onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* 邮箱 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="email">
                    邮箱地址
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      className="pl-10 h-11"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* 密码 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="password">
                    密码
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="至少 8 位字符"
                      className="pl-10 pr-10 h-11"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* 确认密码 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="confirmPassword">
                    确认密码
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="再次输入密码"
                      className="pl-10 pr-10 h-11"
                      value={form.confirmPassword}
                      onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* 注册按钮 */}
                <Button
                  type="submit"
                  className="w-full h-11 text-base gap-2 mt-2 transition-all hover:shadow-md hover:scale-[1.01] active:scale-[0.99]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <>
                      创建账号
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6">
                <div className="relative">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
                    或
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <Button variant="outline" className="h-11" type="button">
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z"/>
                    </svg>
                    GitHub
                  </Button>
                  <Button variant="outline" className="h-11" type="button">
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Google
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            注册即表示你同意我们的{" "}
            <Link href="/about" className="text-primary hover:underline">服务条款</Link>
            {" "}和{" "}
            <Link href="/about" className="text-primary hover:underline">隐私政策</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
