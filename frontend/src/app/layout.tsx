import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppHeader from "@/components/layout/AppHeader";
import AppFooter from "@/components/layout/AppFooter";
import ThemeProvider from "@/components/layout/ThemeProvider";
import DynamicBackground from "@/components/layout/DynamicBackground";
import AIChatbot from "@/components/layout/AIChatbot";
import ScrollToTop from "@/components/layout/ScrollToTop";
import ToasterProvider from "@/components/layout/ToasterProvider";
import RouteProgress from "@/components/layout/RouteProgress";
import CommandSearch from "@/components/layout/CommandSearch";
import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/constants";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://yantu.com"),
  title: {
    default: `${SITE_NAME} - 一站式保研信息聚合平台`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: ["保研", "推免", "夏令营", "预推免", "研究生", "985", "211", "保研信息", "推免信息", "院校库", "导师库"],
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: SITE_NAME,
    title: `${SITE_NAME} - 一站式保研信息聚合平台`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} - 一站式保研信息聚合平台`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
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
      style={{ fontFamily: "'Noto Sans SC', var(--font-geist-sans), system-ui, sans-serif" }}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col transition-theme">
        <ThemeProvider>
          <DynamicBackground />
          <AppHeader />
          <main className="flex-1">{children}</main>
          <AppFooter />
          <AIChatbot />
          <ScrollToTop />
          <ToasterProvider />
          <RouteProgress />
          <CommandSearch />
        </ThemeProvider>
      </body>
    </html>
  );
}
