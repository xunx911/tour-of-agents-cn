import { allLessons } from "@/lib/lessons/registry";
import type { LessonDefinition } from "@/lib/lessons/types";

export interface LessonSeo {
  description: string;
  keywords: string[];
}

/**
 * Auto-generate the short description shown on article-style lesson pages.
 */
function generateDescription(lesson: LessonDefinition): string {
  const descriptions: Record<string, string> = {
    "agent-function":
      "AI Agent 本质上就是一个向 LLM API 发 POST 请求的函数。用 Python 从零写一遍，看懂 LangChain、CrewAI、AutoGen 在包装什么。",
    tools:
      "LLM 工具调用本质上是一次字典查找：tools[name](**args)。从零实现函数调用，看懂 @tool 这类抽象隐藏了什么。",
    "agent-loop":
      "Agent 循环就是 while 循环：调用 LLM、执行工具、继续调用，直到结束。亲手写出 AgentExecutor 背后的核心模式。",
    conversation:
      "ChatGPT 能记住上下文，是因为对话就是一个 messages 数组。从零实现多轮聊天，看懂上下文窗口真正怎么工作。",
    state:
      "用普通 Python 字典在 LLM 对话旁边记录结构化状态。不用框架，也能理解 LangGraph 状态通道在做什么。",
    memory:
      "ChatGPT Memory 会跨对话保存事实，底层可以先理解成键值存储。亲手实现持久记忆，看懂 Mem0、Zep、LangChain 的基础模式。",
    policy:
      "ChatGPT 会拒绝危险请求，靠的是输入和输出两道关卡。用几行 Python 写出护栏原型，看懂 Guardrails AI 和 NeMo Guardrails 的基础思路。",
    "self-scheduling":
      "ChatGPT 深度研究会自己拆子任务。用任务队列和预算写一个自调度 Agent，看懂 CrewAI 任务委派背后的模式。",
    "the-whole-thing":
      "用约 60 行 Python 组合出完整 AI Agent：工具、记忆、护栏、自调度。先看懂底层，再决定是否需要框架。",
  };
  return descriptions[lesson.slug] ?? lesson.subtitle;
}

const BASE_KEYWORDS = [
  "AI Agent", "LLM", "Python", "从零实现",
  "无框架", "交互教程",
];

function generateKeywords(lesson: LessonDefinition): string[] {
  const perLesson: Record<string, string[]> = {
    "agent-function": [
      "构建 AI Agent", "LLM API 调用", "chat completions",
      "LangChain 替代", "agent function Python",
      "HTTP POST LLM", "OpenAI API 教程",
    ],
    tools: [
      "LLM 工具调用", "function calling", "JSON schema tools",
      "LangChain tool", "工具分发", "AI Agent 工具",
      "OpenAI function calling 教程",
    ],
    "agent-loop": [
      "Agent 循环", "ReAct 模式", "AgentExecutor",
      "多步工具调用", "while loop LLM",
      "OpenAI Agents SDK", "Agent 推理循环",
    ],
    conversation: [
      "对话历史", "多轮聊天", "上下文窗口",
      "ChatGPT memory", "messages array",
      "ConversationBufferMemory", "聊天历史 Python",
    ],
    state: [
      "Agent 状态管理", "LangGraph state channels",
      "结构化追踪", "Agent 元数据",
      "state dict Python", "LLM 可观测性",
    ],
    memory: [
      "AI Agent 记忆", "LLM 持久记忆",
      "Mem0 替代", "Zep memory", "Agent 长期记忆",
      "ConversationSummaryMemory", "跨会话记忆",
    ],
    policy: [
      "AI 护栏", "LLM 安全", "输入输出关卡",
      "Guardrails AI", "NeMo Guardrails",
      "LLM 内容过滤", "AI 策略 Python",
    ],
    "self-scheduling": [
      "自调度 Agent", "AI 任务队列",
      "BFS agent", "CrewAI task delegation",
      "自主 Agent", "deep research agent", "Agent 子任务",
    ],
    "the-whole-thing": [
      "完整 AI Agent", "从零构建 Agent",
      "60 行 Python Agent", "LangChain vs 从零实现",
      "CrewAI 替代", "AutoGen 替代",
      "最小 AI Agent",
    ],
  };
  return [
    ...BASE_KEYWORDS,
    ...lesson.concepts,
    ...(perLesson[lesson.slug] ?? []),
  ];
}

export function getLessonSeo(lesson: LessonDefinition): LessonSeo {
  return {
    description: generateDescription(lesson),
    keywords: generateKeywords(lesson),
  };
}

export function getAllLessonSeo(): Map<string, LessonSeo> {
  const map = new Map<string, LessonSeo>();
  for (const lesson of allLessons) {
    map.set(lesson.slug, getLessonSeo(lesson));
  }
  return map;
}
