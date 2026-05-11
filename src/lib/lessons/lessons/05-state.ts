import { LessonDefinition } from "../types";
import { lesson05FullCode } from "./05-full-code";

export const lesson05: LessonDefinition = {
  slug: "state",
  number: 5,
  title: "状态就是一个字典",
  subtitle: "Claude 显示“搜索了 5 个文件”时，靠的是对话旁边的结构化状态。",
  difficulty: "intermediate",
  concepts: ["状态", "结构化追踪", "元数据", "可观测性"],
  graph: {
    direction: "TB",
    nodes: [
      { id: "loop", label: "Agent 循环", icon: "⟩", phase: "input" },
      { id: "tool", label: "工具调用", icon: "⚙", phase: "tool" },
      { id: "track", label: "写入状态", phase: "tool" },
      { id: "done", label: "答案 + 状态", icon: "◆", phase: "output" },
    ],
    edges: [
      { id: "loop-tool", source: "loop", target: "tool" },
      { id: "tool-track", source: "tool", target: "track" },
      { id: "track-loop", source: "track", target: "loop" },
      { id: "loop-done", source: "loop", target: "done" },
    ],
  },
  frameworkName:
    "LangGraph 的 state channel、Redux store，都是在对话之外维护结构化数据。",
  llmConfig: {
    systemPrompt: "You have tools. Use them. Be concise.",
    tools: [
      { name: "add", description: "Add two numbers",
        parameters: { a: { type: "number" }, b: { type: "number" } } },
      { name: "upper", description: "Uppercase a string",
        parameters: { text: { type: "string" } } },
    ],
    mockResponses: [],
  },
  steps: [
    {
      id: "intro",
      prose: `# 状态就是字典

你见过 Claude 显示“搜索了 5 个文件”，或 ChatGPT 显示“分析了数据”的小摘要吗？这些通常不是 messages 里的原始文本，而是对话旁边维护的**状态**。

messages 数组是**原始录像带**。但工程里常常需要结构化信息：运行了哪些工具？几轮完成？结果是什么？这些就是**状态**：在循环中更新的 dict，最后和答案一起返回。

> **对应框架：** LangGraph 把它叫作带 typed reducer 的 state channels。拆掉抽象，就是循环里更新的 dict。`,
    },
    {
      id: "setup",
      highlightNodes: ["loop"],
      prose: `## 第 1 步：工具 + ask_llm

仍然是第 3 课的材料，不需要变化。`,
      code: `tools = {"add": lambda a, b: a + b, "upper": lambda text: text.upper()}
TOOL_DEFS = [
    {"type": "function", "function": {"name": "add", "description": "Add two numbers",
        "parameters": {"type": "object",
            "properties": {"a": {"type": "number"}, "b": {"type": "number"}}}}},
    {"type": "function", "function": {"name": "upper", "description": "Uppercase text",
        "parameters": {"type": "object",
            "properties": {"text": {"type": "string"}}}}},
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
      highlightNodes: ["tool", "track"],
      prose: `## 第 2 步：带状态追踪的循环

还是第 3 课的循环，只加一个 \`state\` dict。循环运行时，把每次工具调用和结果都记录进去。Agent 最后返回 \`state\`，而不只是答案字符串。

这样你就有了结构化审计轨迹：不只是“答案是 15”，还知道**哪些工具被调用、参数是什么、结果是什么、用了几轮**。`,
      code: `async def agent(task, max_turns=5):
    state = {"turns": 0, "tool_calls": [], "results": []}
    messages = [
        {"role": "system", "content": "Use tools to answer. Be concise."},
        {"role": "user", "content": task},
    ]
    for turn in range(max_turns):
        state["turns"] += 1
        trace("llm_call", f"Turn {state['turns']}")
        msg = await ask_llm(messages)
        if not msg.get("tool_calls"):
            state["answer"] = msg.get("content", "")
            trace("agent_end", f"Done in {state['turns']} turns")
            return state
        messages.append(msg)
        for tc in msg["tool_calls"]:
            name = tc["function"]["name"]
            args = json.loads(tc["function"]["arguments"])
            result = tools[name](**args)
            state["tool_calls"].append({"tool": name, "args": args})
            state["results"].append(result)
            trace("tool_result", f"{name}({args}) → {result}")
            messages.append({"role": "tool", "tool_call_id": tc["id"], "content": str(result)})
    state["answer"] = "Max turns reached"
    return state`,
    },
    {
      id: "run",
      highlightNodes: ["done"],
      prose: `## 试一下

试试 *"add 10 and 5, then uppercase hello"*。你会看到完整状态：哪些工具运行了，返回了什么，用了几轮。这就是可观测性：可以记录、存储、调试。`,
      code: `result = await agent(USER_INPUT)
print(f">> {result['answer']}")
print(f"Tools used: {result['tool_calls']}")
print(f"Results: {result['results']}")
print(f"Turns: {result['turns']}")`,
      inputConfig: {
        placeholder: "试试“计算 10 加 5，然后把 hello 转成大写”",
        variable: "USER_INPUT",
        samples: ["计算 10 加 5，然后把 hello 转成大写", "把 foo 转成大写，然后计算 7 加 8", "计算 1 加 1"],
      },
    },
  ],
  fullCode: lesson05FullCode,
};
