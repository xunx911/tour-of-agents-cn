import { LessonDefinition } from "../types";
import { lesson06FullCode } from "./06-full-code";

export const lesson06: LessonDefinition = {
  slug: "memory",
  number: 6,
  title: "跨运行的记忆",
  subtitle: "ChatGPT Memory 能跨对话记住你的名字，原理在这里。",
  difficulty: "intermediate",
  concepts: ["记忆", "持久化", "长期记忆", "检索"],
  graph: {
    nodes: [
      { id: "run1", label: "第 1 次：保存事实", icon: "⟩", phase: "input" },
      { id: "mem", label: "记忆字典", icon: "⟡", phase: "llm" },
      { id: "run2", label: "第 2 次：回忆", phase: "llm" },
      { id: "answer", label: "正确回答", icon: "◆", phase: "output" },
    ],
    edges: [
      { id: "run1-mem", source: "run1", target: "mem", label: "记住" },
      { id: "mem-run2", source: "mem", target: "run2", label: "注入" },
      { id: "run2-answer", source: "run2", target: "answer" },
    ],
  },
  frameworkName:
    "Mem0、Zep、LangChain ConversationSummaryMemory，都是把长期存储放在对话之外。",
  llmConfig: {
    systemPrompt: "You have tools and memory. Be concise.",
    tools: [
      { name: "add", description: "Add two numbers",
        parameters: { a: { type: "number" }, b: { type: "number" } } },
      { name: "remember", description: "Save a key-value pair to memory",
        parameters: { key: { type: "string" }, value: { type: "string" } } },
    ],
    mockResponses: [],
  },
  steps: [
    {
      id: "intro",
      prose: `# 记忆：跨运行持久化

ChatGPT 设置里有 “Memory”，可以跨对话记住你的名字、偏好和职业。Claude 的 Projects 加自定义指令也有类似效果。它们怎么做到的？

第 4 课的 conversation 在新对话时会重置。**Memory** 则跨会话存在。区别是：
- **Conversation** = messages 数组，临时存在，随会话结束消失。
- **Memory** = 独立存储，持久存在。

生产环境里你会用 Redis、Postgres 或向量库。这里先用一个 dict，并把它注入 system prompt。接口模式是一样的：**循环前加载，循环中保存。**

> **关键点：** \`remember\` 只是一个工具。LLM 像调用 \`add\` 一样调用它。副作用是：某个值进入 memory dict。`,
    },
    {
      id: "setup",
      highlightNodes: ["run1"],
      prose: `## 第 1 步：记忆字典 + 工具

memory dict 放在模块层级。 \`remember\` 是一个会写入它的工具。LLM 不知道记忆有什么特殊，它只看到另一个会返回字符串的工具。`,
      code: `memory = {}

tools = {
    "add": lambda a, b: a + b,
    "remember": lambda key, value: memory.update({key: value}) or f"saved {key}={value}",
}
TOOL_DEFS = [
    {"type": "function", "function": {"name": "add", "description": "Add two numbers",
        "parameters": {"type": "object",
            "properties": {"a": {"type": "number"}, "b": {"type": "number"}}}}},
    {"type": "function", "function": {"name": "remember",
        "description": "Save a key-value pair to long-term memory",
        "parameters": {"type": "object",
            "properties": {"key": {"type": "string"}, "value": {"type": "string"}}}}},
]
async def ask_llm(messages):
    resp = await pyfetch(f"{LLM_BASE_URL}/chat/completions",
        method="POST",
        headers={"Authorization": f"Bearer {LLM_API_KEY}",
                 "Content-Type": "application/json"},
        body=json.dumps({"model": LLM_MODEL, "messages": messages, "tools": TOOL_DEFS}))
    return json.loads(await resp.string())["choices"][0]["message"]`,
    },
    {
      id: "agent",
      highlightNodes: ["mem", "run2"],
      prose: `## 第 2 步：把记忆注入 system prompt

还是第 3 课的循环，只改一点：system prompt 包含当前 memory 内容。这样 LLM 每轮都能看到已有记忆，也可以通过 \`remember\` 工具保存新知识。`,
      code: `async def agent(task, max_turns=5):
    mem_str = json.dumps(memory) if memory else "empty"
    messages = [
        {"role": "system", "content": f"You have tools. Memory: {mem_str}. Use remember() to save facts. Be concise."},
        {"role": "user", "content": task},
    ]
    for turn in range(max_turns):
        trace("llm_call", f"Turn {turn + 1}")
        msg = await ask_llm(messages)
        if not msg.get("tool_calls"):
            trace("agent_end", msg.get("content", ""))
            return msg.get("content", "")
        messages.append(msg)
        for tc in msg["tool_calls"]:
            name = tc["function"]["name"]
            args = json.loads(tc["function"]["arguments"])
            result = tools[name](**args)
            trace("tool_result", f"{name}({args}) → {result}")
            messages.append({"role": "tool", "tool_call_id": tc["id"], "content": str(result)})
    return "Max turns reached"`,
    },
    {
      id: "run",
      highlightNodes: ["answer"],
      prose: `## 试一下：记忆跨调用保留

1. 发送 *“我的名字是 Alice”*：Agent 调用 \`remember(key="name", value="Alice")\`。
2. 发送 *“我的名字是什么？”*：Agent 从 system prompt 里的 \`Memory: {"name": "Alice"}\` 读出答案。

它能跨调用生效，是因为 memory dict 放在函数外面。`,
      code: `print(f">> {await agent(USER_INPUT)}")
print(f"Memory: {memory}")`,
      inputConfig: {
        placeholder: "试试“我的名字是 Alice”，再问“我的名字是什么？”",
        variable: "USER_INPUT",
        samples: ["我的名字是 Alice", "我的名字是什么？", "记住我喜欢 Python"],
      },
    },
  ],
  fullCode: lesson06FullCode,
};
