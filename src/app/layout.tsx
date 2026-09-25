import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { SiteHeader } from "@/features/site/site-header";
import { SiteFooter } from "@/features/home/site-footer";
import { CustomerSupportWidget } from "@/features/support/customer-support-widget";

import "./globals.css";

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
    default: "旧雨电商",
    template: "%s | 旧雨电商",
  },
  description: "旧雨电商——认真挑选手机、电脑与智能生活好物。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        {children}
        {/* 全站共用客服入口；具体商品信息由当前商品页上下文提供。 */}
        <CustomerSupportWidget />
        <SiteFooter />
      </body>
    </html>
  );
}
