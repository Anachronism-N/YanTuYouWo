import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppHeader from "@/components/layout/AppHeader";
import AppFooter from "@/components/layout/AppFooter";
import ThemeProvider from "@/components/layout/ThemeProvider";
import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/constants";

// 懒加载重型组件 — 不阻塞首屏渲染（Server Component 中不能用 ssr:false）
const DynamicBackground = dynamic(() => import("@/components/layout/DynamicBackground"));
const AIChatbot = dynamic(() => import("@/components/layout/AIChatbot"));

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} - 一站式保研信息聚合平台`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: ["保研", "推免", "夏令营", "预推免", "研究生", "985", "211"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col transition-theme">
        <ThemeProvider>
          <DynamicBackground />
          <AppHeader />
          <main className="flex-1">{children}</main>
          <AppFooter />
          <AIChatbot />
        </ThemeProvider>
      </body>
    </html>
  );
}
