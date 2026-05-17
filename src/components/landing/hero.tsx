"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

interface HeroProps {
  nextSlug: string;
  hasProgress: boolean;
  nextTitle?: string;
}

export function Hero({ nextSlug, hasProgress, nextTitle }: HeroProps) {
  const ctaLabel = hasProgress
    ? `继续学习：${nextTitle}`
    : "开始第 1 课";

  return (
    <section className="border-b bg-muted/30">
      <div className="max-w-3xl mx-auto px-6 pt-20 pb-16 text-center">
        <p className="text-xs font-medium text-primary tracking-wide uppercase mb-4">
          免费 &middot; 无需安装 &middot; 在浏览器中运行
        </p>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
          用 60 行 Python
          <br />
          理解 AI Agent
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-2">
          不先学框架，不先装环境。通过亲手搭一个最小 Agent，
          看懂 LangChain、CrewAI、AutoGen 底层到底在包装什么。
        </p>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto mb-8">
          10 节交互课程。写真实 Python，观察工具调用、循环、状态、Skill 和 Trace。
          默认使用模拟 LLM，也可以切到真实模型。
        </p>

        <div className="flex flex-wrap gap-3 justify-center mb-4">
          <Link href={`/lesson/${nextSlug}`}>
            <Button size="lg" className="text-base px-8">
              {ctaLabel} &rarr;
            </Button>
          </Link>
        </div>

        <div className="flex flex-wrap gap-4 justify-center text-xs text-muted-foreground">
          <span>全程约 30 分钟</span>
          <span>&middot;</span>
          <span>无需注册</span>
          <span>&middot;</span>
          <span>可直接在浏览器练习</span>
        </div>
      </div>
    </section>
  );
}
