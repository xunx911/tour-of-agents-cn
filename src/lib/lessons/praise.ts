/**
 * Per-lesson praise messages shown after successful code execution.
 * Tone: engineer-friendly, specific to what they just built. No emojis, no "great job".
 */

/** Shown inline below trace output after first successful run per lesson */
export const CODE_PRAISE: Record<number, string> = {
  1: "就是这样：一个调用 LLM 的函数。其他部分都只是工程管线。",
  2: "你刚刚搭出了工具注册表。LangChain 会把类似结构包装成 ToolNode。",
  3: "你刚刚搭出了 Agent 循环。这是多数框架的核心。",
  4: "现在它能记住上下文了。这正是 ChatGPT 管理对话的基本方式。",
  5: "状态就是一个 dict。简单、可检查，没有隐藏魔法。",
  6: "持久记忆。CrewAI 会包装很多层，但核心就是这一点。",
  7: "策略控制。防止 Agent 乱来，靠的就是这类检查点。",
  8: "自调度。Agent 开始决定下一步要做什么，这就是自治的雏形。",
  9: "约 60 行，一个完整 Agent 框架。现在你能看懂框架背后的部件了。",
};

/** Shown as toast when lesson is completed (code runs successfully) */
export const LESSON_TOAST: Record<number, string> = {
  1: "完成。但这个 Agent 还不会用工具 →",
  2: "完成。但如果工具调用后还需要继续判断呢？→",
  3: "完成。现在它会循环了，但轮次之间还会遗忘 →",
  4: "完成。它能记住对话了，但刷新后状态还会消失 →",
  5: "完成。但关闭标签页后，这些状态仍然不见了 →",
  6: "完成。记忆可以持久化了，但 Agent 乱来怎么办？→",
  7: "完成。它更安全了，但仍然由你决定何时运行 →",
  8: "完成。还剩最后一课，把所有部件合起来 →",
  9: "9 节课全部完成。",
};

/** Next lesson slugs for toast click-through */
export const NEXT_LESSON_SLUG: Record<number, string> = {
  1: "tools",
  2: "agent-loop",
  3: "conversation",
  4: "state",
  5: "memory",
  6: "policy",
  7: "self-scheduling",
  8: "the-whole-thing",
};
