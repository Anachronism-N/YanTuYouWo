import Link from "next/link";
import Image from "next/image";
import { GraduationCap, Globe } from "lucide-react";
import { SITE_NAME } from "@/lib/constants";

const footerLinks = [
  {
    title: "保研信息",
    links: [
      { label: "信息聚合", href: "/info/notices" },
      { label: "院校库", href: "/info/schools" },
    ],
  },
  {
    title: "更多",
    links: [
      { label: "关于我们", href: "/about" },
      { label: "登录 / 注册", href: "/auth/login" },
    ],
  },
];

export default function AppFooter() {
  return (
    <footer className="border-t bg-gradient-to-b from-muted/20 to-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Logo & 简介 */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-blue-500">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold">{SITE_NAME}</span>
            </Link>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
              一站式保研信息聚合平台，汇集全国高校夏令营、预推免招生信息，助力你的保研之路。
            </p>
          </div>

          {/* 链接列 */}
          {footerLinks.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-semibold tracking-wide">{group.title}</h3>
              <ul className="mt-3 space-y-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-all hover:text-foreground hover:translate-x-0.5"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Slogan 品牌展示 */}
        <div className="mt-10 flex justify-center border-t pt-8">
          <Image
            src="/slogan.png"
            alt="研途有我品牌标语"
            width={320}
            height={80}
            className="h-auto w-auto max-w-[180px] sm:max-w-[260px] opacity-40 hover:opacity-70 transition-opacity duration-500"
          />
        </div>

        {/* 底部版权 */}
        <div className="mt-6 flex flex-col items-center justify-between gap-4 border-t pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <Globe className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
