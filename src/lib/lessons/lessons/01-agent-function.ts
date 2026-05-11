import { LessonDefinition } from "../types";
import { lesson01FullCode } from "./01-full-code";

export const lesson01: LessonDefinition = {
  slug: "agent-function",
  number: 1,
  title: "Agent 就是一个函数",
  subtitle: "每次 ChatGPT 对话，本质上都是一次 HTTP POST。",
  difficulty: "beginner",
  concepts: ["Agent", "函数", "HTTP POST", "系统提示词", "消息数组"],
  graph: {
    nodes: [
      { id: "input", label: "你的消息", icon: "⟩", phase: "input" },
      { id: "fn", label: "agent()", phase: "llm" },
      { id: "api", label: "POST /completions", phase: "llm" },
      { id: "out", label: "模型回答", icon: "◆", phase: "output" },
    ],
    edges: [
      { id: "input-fn", source: "input", target: "fn" },
      { id: "fn-api", source: "fn", target: "api" },
      { id: "api-out", source: "api", target: "out" },
    ],
  },
  frameworkName:
    "LangChain 的 AgentExecutor、CrewAI 的 Agent、AutoGen 的 ConversableAgent，本质上都在包装这个函数。",
  llmConfig: {
    systemPrompt: "You are a concise expert. Answer in 1-2 sentences max.",
    mockResponses: [],
  },
  steps: [
    {
      id: "intro",
      prose: `# Agent 就是一个函数

每次你在 ChatGPT 或 Claude 里发送消息，底层实际发生的是：浏览器向 API 发出一次 HTTP POST，然后拿到一个响应。就是这样。漂亮的界面、流式输出、正在输入的动画，都只是围绕这次函数调用做的体验包装。

把 LangChain 的 \`AgentExecutor\`、CrewAI 的 \`Agent\`、AutoGen 的 \`ConversableAgent\` 都拆掉，最底层都是：**一个发出 HTTP POST 并返回响应的函数。**

这一课就先搭出这个最小单位。`,
    },
    {
      id: "ask-llm",
      highlightNodes: ["fn", "api"],
      prose: `## 第 1 步：向 LLM 发 POST 请求

这是所有 SDK 都会包装起来的原始调用，也就是你在 ChatGPT 里按下回车后真正发生的事情。注意两点：

1. **\`messages\`** 是数组：\`system\` 设置行为，\`user\` 放你的输入。
2. 回答在 \`choices[0].message.content\` 里。

其他部分基本都是 HTTP 样板代码。`,
      code: `SYSTEM = "You are a concise expert. Answer in 1-2 sentences max."

async def ask_llm(message):
    trace("llm_call", f"Asking: {message}")
    resp = await pyfetch(f"{LLM_BASE_URL}/chat/completions",
        method="POST",
        headers={"Authorization": f"Bearer {LLM_API_KEY}",
                 "Content-Type": "application/json"},
        body=json.dumps({
            "model": LLM_MODEL,
            "messages": [
                {"role": "system", "content": SYSTEM},
                {"role": "user", "content": message},
            ]
        }))
    data = json.loads(await resp.string())
    return data["choices"][0]["message"]["content"]`,
    },
    {
      id: "agent",
      highlightNodes: ["fn"],
      prose: `## 第 2 步：包一层 agent()

这个 Agent 是最薄的一层封装：字符串进，字符串出。改变 system prompt，同样的输入就会得到不同的行为。ChatGPT 和 Claude 的行为差异，很多时候就是不同系统提示词带来的。所谓“提示词工程”，起点就在这里。`,
      code: `async def agent(message):
    trace("agent_start", f"Input: {message}")
    response = await ask_llm(message)
    trace("agent_end", f"Output: {response}")
    return response`,
    },
    {
      id: "run",
      highlightNodes: ["input", "out"],
      prose: `## 试一下

随便发送一句话。观察上方图谱：你的消息经过 \`agent()\` 到 API，再返回结果。一个函数，一次 HTTP POST，一个回答。`,
      code: `print(f">> {await agent(USER_INPUT)}")`,
      inputConfig: {
        placeholder: "给 Agent 输入一句话...",
        variable: "USER_INPUT",
        samples: ["什么是 AI Agent？", "用一句话解释 Python", "讲一个简短笑话"],
      },
    },
  ],
  fullCode: lesson01FullCode,
};
