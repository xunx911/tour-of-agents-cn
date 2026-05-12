import type { Metadata } from "next";
import Link from "next/link";
import { allLessons } from "@/lib/lessons/registry";
import { AgentLoopPreview } from "@/components/landing/agent-loop-preview";
import { ValueProps } from "@/components/landing/value-props";
import { HomepageClient } from "@/components/landing/homepage-client";

const SITE_URL = "https://tinyagents.dev";

export const metadata: Metadata = {
  title: "A Tour of Agents — 中文 AI Agent 交互教程",
  description:
    "面向中文读者的交互式课程：用 Python 从零理解 AI Agent，浏览器里直接运行。",
  openGraph: {
    title: "A Tour of Agents 中文交互教程",
    description:
      "9 节交互课，用 60 行 Python 理解 LLM Agent 的底层模式。",
    url: SITE_URL,
    siteName: "A Tour of Agents",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    type: "website",
  },
  keywords: [
    "AI Agent", "LLM", "Python", "工具调用", "Agent 循环",
    "交互式教程", "A Tour of Agents",
  ],
  alternates: { canonical: SITE_URL },
};

export default function HomePage() {
  return (
    <main>
      <HomepageClient />
      <AgentLoopPreview />
      <ValueProps />
      <section className="max-w-2xl mx-auto px-6 py-12">
        <h2 className="text-lg font-semibold mb-2 text-center">
          9 节课，每一节都接上上一节。
        </h2>
        <p className="text-sm text-muted-foreground text-center mb-2">
          可以从任意一课开始。每节课都能在浏览器里直接运行。
        </p>
        <p className="text-xs text-muted-foreground/70 text-center mb-6 max-w-md mx-auto">
          从一次函数调用开始，逐步理解工具调用、对话记忆、状态管理、安全策略和计划执行。
        </p>
        <nav aria-label="课程列表">
          <ol className="space-y-4">
            {allLessons.map((lesson) => (
              <li key={lesson.slug}>
                <Link
                  href={`/lesson/${lesson.slug}`}
                  className="block p-4 rounded-lg border border-border hover:border-foreground/20 transition-colors"
                >
                  <div className="flex items-baseline gap-3 mb-1">
                    <span className="text-sm text-muted-foreground font-mono">
                      {String(lesson.number).padStart(2, "0")}
                    </span>
                    <h3 className="font-medium text-sm">{lesson.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground ml-8">
                    {lesson.subtitle}
                  </p>
                </Link>
              </li>
            ))}
          </ol>
        </nav>
      </section>
      <section className="border-t">
        <div className="max-w-2xl mx-auto px-6 py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
            一个函数。一次 HTTP POST。
          </h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto mb-8">
            Agent 的第一层就是这么简单。第一课几分钟就能跑起来。
          </p>
          <Link
            href="/lesson/agent-function"
            className="inline-block px-8 py-3 bg-primary text-primary-foreground rounded-md text-base font-medium hover:opacity-90"
          >
            开始第 1 课 &rarr;
          </Link>
        </div>
      </section>
      <footer className="border-t">
        <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-4 text-xs text-muted-foreground">
          <p className="text-muted-foreground/60 text-center md:text-left">
            当前版本优先保留原课程交互体验，并改造成中文可读的学习路径。
          </p>
        </div>
      </footer>
    </main>
  );
}
