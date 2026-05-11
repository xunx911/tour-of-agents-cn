"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

interface BottomCtaProps {
  nextSlug: string;
  hasProgress: boolean;
}

export function BottomCta({ nextSlug, hasProgress }: BottomCtaProps) {
  return (
    <section className="border-t">
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
          {hasProgress
            ? "已经开始了，继续往下走。"
            : "从第一课开始就够了。"}
        </h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto mb-8">
          {hasProgress
            ? "接着上次的位置继续。整条路径很短，但会把 Agent 的关键部件串起来。"
            : "第一课只需要几分钟：先把 Agent 看成一个函数。"}
        </p>
        <Link href={`/lesson/${nextSlug}`}>
          <Button size="lg" className="text-base px-8 chip-bounce">
            {hasProgress ? "继续上次进度" : "开始第 1 课"} &rarr;
          </Button>
        </Link>
      </div>
    </section>
  );
}
