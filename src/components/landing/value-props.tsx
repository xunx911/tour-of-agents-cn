"use client";

const PROPS = [
  {
    title: "浏览器里直接运行",
    description:
      "通过 Pyodide 执行 Python。能看到真实代码、请求结构和运行轨迹，不需要终端、虚拟环境或 Docker。",
    icon: ">>",
  },
  {
    title: "先看懂本质",
    description:
      "从一次 HTTP 请求开始，逐步理解消息、工具、循环、状态和记忆，避免一上来被框架概念淹没。",
    icon: "{}",
  },
  {
    title: "再理解框架",
    description:
      "每节课都把框架背后的普通 Python 模式拆开，让你知道抽象带来了什么，也隐藏了什么。",
    icon: "==",
  },
] as const;

export function ValueProps() {
  return (
    <section className="border-b">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {PROPS.map((p) => (
            <div key={p.title} className="text-center md:text-left">
              <span className="inline-block font-mono text-lg text-primary mb-2">
                {p.icon}
              </span>
              <h3 className="font-semibold text-sm mb-1">{p.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {p.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
