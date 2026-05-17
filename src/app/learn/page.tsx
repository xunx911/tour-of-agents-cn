import Link from "next/link";
import type { Metadata } from "next";
import { allLessons } from "@/lib/lessons/registry";
import { getLessonSeo } from "@/lib/seo/lesson-seo";
import { ListJsonLd } from "@/components/seo/list-json-ld";

const SITE = "https://tinyagents.dev";

export const metadata: Metadata = {
  title: "从零学习 AI Agent — A Tour of Agents",
  description:
    "10 节交互课程，用 Python 从零理解 AI Agent：工具调用、Agent 循环、记忆、策略、计划执行和 Skill Bundle。",
  keywords: [
    "学习 AI Agent", "AI Agent 教程", "Python AI Agent",
    "LLM 工具调用", "Agent 循环", "ReAct 模式",
  ],
  openGraph: {
    title: "从零学习 AI Agent — A Tour of Agents",
    description: "10 节交互课程，用 Python 理解 LLM Agent 的底层模式。",
    url: `${SITE}/learn`,
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  alternates: { canonical: `${SITE}/learn` },
};

export default function LearnIndex() {
  const listItems = allLessons.map((l) => ({
    url: `${SITE}/learn/${l.slug}`,
    name: `第 ${l.number} 课：${l.title}`,
  }));

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <ListJsonLd items={listItems} />
      <h1 className="text-3xl font-bold mb-3">
        从零搭一个 AI Agent
      </h1>
      <p className="text-lg text-muted-foreground mb-8">
        10 节交互课程，用 Python 看懂 Agent 函数、工具、循环、记忆、计划执行和 Skill Bundle。
      </p>

      <div className="space-y-6">
        {allLessons.map((lesson) => {
          const seo = getLessonSeo(lesson);
          return (
            <Link
              key={lesson.slug}
              href={`/learn/${lesson.slug}`}
              className="block p-5 rounded-lg border border-border hover:border-foreground/20 transition-colors"
            >
              <div className="flex items-baseline gap-3 mb-1">
                <span className="text-sm text-muted-foreground font-mono">
                  {String(lesson.number).padStart(2, "0")}
                </span>
                <h2 className="text-lg font-semibold">{lesson.title}</h2>
              </div>
              <p className="text-sm text-muted-foreground ml-8">
                {seo.description}
              </p>
              <div className="flex gap-2 mt-3 ml-8 flex-wrap">
                {lesson.concepts.slice(0, 4).map((c) => (
                  <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {c}
                  </span>
                ))}
              </div>
            </Link>
          );
        })}
      </div>

      <section className="mt-12 p-6 rounded-lg bg-muted/50 border border-border">
        <h2 className="font-semibold mb-2">想边看边跑？</h2>
        <p className="text-sm text-muted-foreground mb-4">
          这些课程也可以作为交互练习运行：无需配置环境，直接在浏览器里写并执行 Python。
        </p>
        <Link
          href="/lesson/agent-function"
          className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90"
        >
          开始交互课程
        </Link>
      </section>
    </main>
  );
}
