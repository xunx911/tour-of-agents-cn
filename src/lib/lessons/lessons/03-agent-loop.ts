import { LessonDefinition } from "../types";
import { lesson03FullCode } from "./03-full-code";

export const lesson03: LessonDefinition = {
  slug: "agent-loop",
  number: 3,
  title: "Agent 循环",
  subtitle: "Claude 先搜索文件、再阅读、再继续搜索，靠的就是这个循环。",
  difficulty: "beginner",
  concepts: ["Agent 循环", "多轮", "工具协议", "收敛"],
  graph: {
    direction: "TB",
    nodes: [
      { id: "start", label: "构造消息", icon: "⟩", phase: "input" },
      { id: "llm", label: "询问 LLM", icon: "⟡", phase: "llm" },
      { id: "check", label: "tool_calls?", shape: "diamond", phase: "decide" },
      { id: "done", label: "返回答案", icon: "◆", phase: "output" },
      { id: "exec", label: "执行工具", icon: "⚙", phase: "tool" },
    ],
    edges: [
      { id: "start-llm", source: "start", target: "llm" },
      { id: "llm-check", source: "llm", target: "check" },
      { id: "check-done", source: "check", target: "done", label: "否" },
      { id: "check-exec", source: "check", target: "exec", label: "是" },
      { id: "exec-llm", source: "exec", target: "llm" },
    ],
  },
  frameworkName:
    "LangChain AgentExecutor、OpenAI Agents SDK、AutoGen，本质上都是围绕 messages 的 while 循环。",
  llmConfig: {
    systemPrompt: "Use tools to answer. Be concise.",
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
      prose: `# Agent 循环

**这是最重要的一课。** 后面的所有能力都会建立在这个循环之上。

你在 Claude 里见过这种过程：让它分析代码库，它会搜索文件、读取文件、继续搜索、继续阅读，经过多步后才给出答案。ChatGPT 的 Code Interpreter 也类似：写代码、运行、看到错误、修复、再运行。这就是 Agent 循环。

第 2 课的 Agent 调一次工具就停了。真实 Agent 会**循环**：调用工具 → 看到结果 → 判断下一步 → 重复直到完成。LLM 决定何时停止。响应里没有 \`tool_calls\`，就代表完成。

这就是 LangChain \`AgentExecutor\` 的运行时核心。`,
    },
    {
      id: "setup",
      highlightNodes: ["call"],
      prose: `## 第 1 步：工具 + ask_llm

工具仍然和第 2 课一样。但现在 \`ask_llm\` 接收完整的 \`messages\` 数组，并返回原始 message 对象。多轮工具协议需要 \`tool_calls\` 和 \`tool_call_id\`。`,
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
      id: "loop",
      highlightNodes: ["loop", "call", "check", "exec", "append"],
      prose: `## 第 2 步：循环

当 Claude 执行多步任务，比如搜索代码库、读取文件、再写代码时，每一步都是这个循环的一次迭代：

1. 用完整 messages 数组调用 LLM。
2. 没有 \`tool_calls\`？返回答案，说明 LLM 认为完成了。
3. 有 \`tool_calls\`？逐个执行，把结果带着 \`tool_call_id\` 追加回 messages，然后回到循环开头。

\`tool_call_id\` 用来把每个工具结果和原始请求对应起来。没有它，当 LLM 一次请求多个工具时，就分不清哪个结果属于哪个调用。这就是**工具调用协议**。`,
      code: `async def agent(task, max_turns=5):
    messages = [
        {"role": "system", "content": "Use tools to answer. Be concise."},
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
            messages.append({
                "role": "tool",
                "tool_call_id": tc["id"],
                "content": str(result),
            })
    return "Max turns reached"`,
    },
    {
      id: "run",
      highlightNodes: ["start", "done"],
      prose: `## 试一下

- *“计算 10 加 5”*：一次工具调用，一轮完成。
- *“先计算 3 加 4，然后把 hello 转成大写”*：多个工具调用，LLM 会把它们串起来。

观察图谱：每一轮都会穿过这个循环。每次工具调用后，messages 数组都会变长。`,
      code: `print(f">> {await agent(USER_INPUT)}")`,
      inputConfig: {
        placeholder: "试试“计算 10 加 5”或“先计算 3 加 4，然后把 hello 转成大写”",
        variable: "USER_INPUT",
        samples: ["先计算 3 加 4，然后把 hello 转成大写", "把 agent 转成大写，然后计算 1 加 2", "计算 100 加 200"],
      },
    },
  ],
  fullCode: lesson03FullCode,
};
