import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { SiteHeader } from "@/features/site/site-header";

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
  description: "旧雨电商——一个简洁、可靠的微型电商平台。",
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
        <footer className="mt-auto border-t border-stone-200 px-6 py-8 text-center text-sm text-stone-500">
          旧雨相逢，值得被好好收藏。
        </footer>
      </body>
    </html>
  );
}
