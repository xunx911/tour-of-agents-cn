import { LessonDefinition } from "../types";
import { lesson02FullCode } from "./02-full-code";

export const lesson02: LessonDefinition = {
  slug: "tools",
  number: 2,
  title: "工具就是一个字典",
  subtitle: "ChatGPT 显示“使用了浏览器”时，底层就是这件事。",
  difficulty: "beginner",
  concepts: ["工具", "函数调用", "JSON Schema", "分发"],
  graph: {
    nodes: [
      { id: "user", label: "用户", icon: "⟩", phase: "input" },
      { id: "agent", label: "Agent", phase: "input" },
      { id: "llm", label: "LLM + 工具", icon: "⟡", phase: "llm" },
      { id: "tc", label: "tool_calls?", shape: "diamond", phase: "decide" },
      { id: "dispatch", label: "分发工具", icon: "⚙", phase: "tool" },
      { id: "result", label: "工具结果", icon: "◆", phase: "output" },
      { id: "text", label: "文本回答", icon: "◆", phase: "output" },
    ],
    edges: [
      { id: "user-agent", source: "user", target: "agent" },
      { id: "agent-llm", source: "agent", target: "llm" },
      { id: "llm-tc", source: "llm", target: "tc" },
      { id: "tc-dispatch", source: "tc", target: "dispatch", label: "是" },
      { id: "dispatch-result", source: "dispatch", target: "result" },
      { id: "tc-text", source: "tc", target: "text", label: "否" },
    ],
  },
  frameworkName:
    "LangChain 的 @tool、CrewAI 的工具注册，核心都是 `tools[name](**args)`。",
  llmConfig: {
    systemPrompt: "You have tools: add(a,b) and upper(text). Use them.",
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
      prose: `# 工具就是字典

你一定见过这种体验：问 ChatGPT 天气，它会调用天气工具；让 Claude 搜索网页，它会执行搜索。LLM 自己不能真正运行代码，但它可以说：*“请调用 \`add\`，参数是 \`a=10, b=5\`”*。这是一个结构化请求，由你的代码来执行。

> **对应框架：** LangChain 的 \`@tool\` 装饰器、CrewAI 的工具注册，都是在帮你建立这个字典。这里我们直接看它里面是什么。`,
    },
    {
      id: "tools",
      highlightNodes: ["dispatch"],
      prose: `## 第 1 步：工具注册表

一个可调用对象的字典。lambda、函数、类方法都可以，只要能接收参数并返回值。`,
      code: `tools = {
    "add": lambda a, b: a + b,
    "upper": lambda text: text.upper(),
}`,
    },
    {
      id: "tool-defs",
      highlightNodes: ["llm", "tc"],
      prose: `## 第 2 步：把工具描述给 LLM

LLM 需要 JSON Schema 才知道有哪些工具、每个工具接收什么参数。ChatGPT 调用工具前显示的小图标背后，就是这类工具描述。OpenAI 和 Groq 在 \`tools\` 字段里期待的也是这种格式。`,
      code: `TOOL_DEFS = [
    {"type": "function", "function": {
        "name": "add", "description": "Add two numbers",
        "parameters": {"type": "object",
            "properties": {"a": {"type": "number"}, "b": {"type": "number"}}}}},
    {"type": "function", "function": {
        "name": "upper", "description": "Uppercase a string",
        "parameters": {"type": "object",
            "properties": {"text": {"type": "string"}}}}},
]`,
    },
    {
      id: "ask-llm",
      highlightNodes: ["agent", "llm", "tc"],
      prose: `## 第 3 步：带工具调用的 ask_llm

还是第 1 课的 HTTP POST，只是现在请求体里多了 \`tools\`。当 LLM 想调用工具时，它不会直接返回文本，而是返回 \`tool_calls\`。`,
      code: `async def ask_llm(task):
    trace("llm_call", f"Asking: {task}")
    resp = await pyfetch(f"{LLM_BASE_URL}/chat/completions",
        method="POST",
        headers={"Authorization": f"Bearer {LLM_API_KEY}",
                 "Content-Type": "application/json"},
        body=json.dumps({
            "model": LLM_MODEL,
            "messages": [{"role": "user", "content": task}],
            "tools": TOOL_DEFS,
        }))
    msg = json.loads(await resp.string())["choices"][0]["message"]
    if msg.get("tool_calls"):
        tc = msg["tool_calls"][0]["function"]
        return {"tool": tc["name"], "args": json.loads(tc["arguments"])}
    return {"text": msg.get("content", "")}`,
    },
    {
      id: "agent",
      highlightNodes: ["dispatch", "result"],
      prose: `## 第 4 步：分发

真正执行工作的就是这一行：\`tools[name](**args)\`。当你看到 ChatGPT 说“使用了浏览器”或 Claude 说“正在搜索”时，背后就是按名字查字典，再把参数传进去调用。这个模式和 Express 路由、Redux reducer 很像。`,
      code: `async def agent(task):
    trace("agent_start", f"Task: {task}")
    d = await ask_llm(task)
    if d.get("tool") and d["tool"] in tools:
        result = tools[d["tool"]](**d["args"])
        trace("tool_result", f"{d['tool']} → {result}")
        trace("agent_end", f"{d['tool']}({d['args']}) = {result}")
        return f"{d['tool']}({d['args']}) = {result}"
    trace("agent_end", d.get("text", "No tool needed"))
    return d.get("text", "No tool needed")`,
    },
    {
      id: "run",
      highlightNodes: ["user", "result", "text"],
      prose: `## 试一下

试试 *"add 10 and 5"*：LLM 会返回工具调用，由你的代码执行。再试试 *"what is Python?"*：不需要工具，LLM 会直接回答。**是否调用工具，由 LLM 决定。**`,
      code: `print(f">> {await agent(USER_INPUT)}")`,
      inputConfig: {
        placeholder: '试试“计算 10 加 5”或“把 hello world 转成大写”',
        variable: "USER_INPUT",
        samples: ["计算 10 加 5", "把 hello world 转成大写", "什么是 Python？"],
      },
    },
  ],
  fullCode: lesson02FullCode,
};
