import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://tinyagents.dev";

export const metadata: Metadata = {
  title: "A Tour of Agents 中文交互教程",
  description:
    "面向中文读者的交互式 LLM Agent 入门教程：在浏览器里从零理解函数调用、工具、循环、记忆和状态。",
  metadataBase: new URL(SITE_URL),
  keywords: [
    "AI Agent", "LLM", "Python", "工具调用", "函数调用", "Agent 循环", "交互式教程",
  ],
  openGraph: {
    title: "A Tour of Agents 中文交互教程",
    description:
      "9 节交互课，在浏览器里理解 LLM Agent 的底层模式。",
    url: SITE_URL,
    siteName: "A Tour of Agents",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "A Tour of Agents — interactive agent-building course" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "A Tour of Agents 中文交互教程",
    description:
      "9 节交互课，在浏览器里理解 LLM Agent 的底层模式。",
    images: ["/og-image.png"],
  },
  alternates: { canonical: SITE_URL },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){try{var d=localStorage.getItem('theme');if(d==='dark'){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(e){}})();
        `}} />
      </head>
      <body
        className={`${geistSans.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
