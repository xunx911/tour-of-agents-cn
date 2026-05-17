import { LessonDefinition } from "../types";
import { lesson09FullCode } from "./09-full-code";
import { lesson09Graph } from "./09-graph";

export const lesson09: LessonDefinition = {
  slug: "the-whole-thing",
  number: 9,
  title: "把所有部件合起来",
  subtitle: "ChatGPT 和 Claude 的核心模式，约 60 行就能组合出来。",
  difficulty: "advanced",
  concepts: ["完整 Agent", "集成", "无框架"],
  graph: lesson09Graph,
  frameworkName:
    "LangChain、CrewAI、AutoGen 有成千上万行；核心模式约 60 行就能看懂。",
  llmConfig: {
    systemPrompt: "You are a general-purpose agent with tools and memory.",
    tools: [
      { name: "add", description: "Add two numbers",
        parameters: { a: { type: "number" }, b: { type: "number" } } },
      { name: "upper", description: "Uppercase a string",
        parameters: { text: { type: "string" } } },
      { name: "remember", description: "Save a key-value pair to memory",
        parameters: { key: { type: "string" }, value: { type: "string" } } },
      { name: "make_plan", description: "Create a short execution plan",
        parameters: { task: { type: "string" } } },
      { name: "execute_step", description: "Execute one planned step",
        parameters: { step: { type: "string" } } },
    ],
    mockResponses: [],
  },
  steps: [
    {
      id: "intro",
      prose: `# 把所有部件合起来

前面八课，每个概念都对应你在 ChatGPT 或 Claude 里见过的体验：

| 课程 | 概念 | 你见过的形态 |
|--------|---------|---------------------|
| 1 | Agent 函数 | 在任意聊天界面按回车 |
| 2 | 工具 | “使用了浏览器”“运行了代码” |
| 3 | **循环** | 多步工具使用：搜索 → 阅读 → 再搜索 |
| 4 | 对话 | 一个会话内的聊天历史 |
| 5 | 状态 | “分析了 5 个文件”、进度提示 |
| 6 | 记忆 | ChatGPT Memory、Claude Projects |
| 7 | 策略 | 内容拒绝、安全过滤 |
| 8 | 计划与执行 | 先拆计划，再逐步执行 |

现在先把它们组合成一个完整 Agent 框架。约 60 行，除了 \`json\` 和 \`pyfetch\` 不需要额外依赖。下一课会在这个骨架之上，把一组工具、提示词、脚本和参考资料打包成可复用 Skill。

> 这和 LangChain 的 AgentExecutor + memory + guardrails + plan-and-execute 工作流是同一类架构。区别是：这里每一行你都能读懂。`,
    },
    {
      id: "tools-memory",
      highlightNodes: ["dispatch", "llm"],
      prose: `## 第 1 步：工具 + 记忆 + 计划执行（第 2、6、8 课）

五个工具。两个做计算（\`add\`、\`upper\`）。一个写记忆（\`remember\`）。两个负责计划与执行（\`make_plan\`、\`execute_step\`）。LLM 会把它们当作同一种工具调用接口。`,
      code: `memory, state = {}, {"tool_calls": [], "turns": 0, "plan": [], "results": []}

def make_plan(task):
    return json.dumps([
        f"明确目标：{task}",
        "拆成 3 个可执行步骤",
        "执行步骤并检查结果",
    ], ensure_ascii=False)

def execute_step(step):
    return f"完成：{step}"

tools = {
    "add": lambda a, b: a + b,
    "upper": lambda text: text.upper(),
    "remember": lambda key, value: memory.update({key: value}) or f"saved {key}={value}",
    "make_plan": make_plan,
    "execute_step": execute_step,
}
TOOL_DEFS = [
    {"type": "function", "function": {"name": "add", "description": "Add two numbers",
        "parameters": {"type": "object", "properties": {"a": {"type": "number"}, "b": {"type": "number"}}}}},
    {"type": "function", "function": {"name": "upper", "description": "Uppercase text",
        "parameters": {"type": "object", "properties": {"text": {"type": "string"}}}}},
    {"type": "function", "function": {"name": "remember", "description": "Save to long-term memory",
        "parameters": {"type": "object", "properties": {"key": {"type": "string"}, "value": {"type": "string"}}}}},
    {"type": "function", "function": {"name": "make_plan", "description": "Create a short execution plan",
        "parameters": {"type": "object", "properties": {"task": {"type": "string"}}}}},
    {"type": "function", "function": {"name": "execute_step", "description": "Execute one planned step",
        "parameters": {"type": "object", "properties": {"step": {"type": "string"}}}}},
]`,
    },
    {
      id: "ask-llm-policy",
      highlightNodes: ["igate", "ogate"],
      prose: `## 第 2 步：ask_llm + 策略（第 1、7 课）

第 1 课的原始 HTTP 调用，加上第 7 课的两个关卡。输入关卡在 LLM 看到请求前拦截；输出关卡在用户看到回答前隐藏。`,
      code: `async def ask_llm(messages):
    resp = await pyfetch(f"{LLM_BASE_URL}/chat/completions",
        method="POST",
        headers={"Authorization": f"Bearer {LLM_API_KEY}", "Content-Type": "application/json"},
        body=json.dumps({"model": LLM_MODEL, "messages": messages, "tools": TOOL_DEFS}))
    return json.loads(await resp.string())["choices"][0]["message"]

INPUT_RULES = [lambda t: "delete" not in t.lower() and "删除" not in t or "blocked: destructive request"]
OUTPUT_RULES = [lambda t: "password" not in t.lower() or "redacted: contains password"]

def check_gate(text, rules):
    for r in rules:
        result = r(text)
        if result is not True: return False, result
    return True, None`,
    },
    {
      id: "agent-loop",
      highlightNodes: ["loop", "llm", "tc", "dispatch"],
      prose: `## 第 3 步：Agent 主体（第 3、5、6、7 课）

仔细看这段，每个概念都有自己的位置：

- **第 7 课输入关卡** → 第 2-4 行
- **第 6 课记忆注入** → 第 6-7 行
- **第 3 课循环** → 第 10-24 行（核心从第 3 课开始就没变）
- **第 5 课状态追踪** → 第 12 行、第 21-25 行
- **第 7 课输出关卡** → 第 15-17 行

循环本身就是第 3 课。其他能力都在包裹或扩展它。`,
      code: `async def agent(task, max_turns=5):
    ok, reason = check_gate(task, INPUT_RULES)
    if not ok:
        trace("policy_block", reason)
        return f"BLOCKED: {reason}"

    mem_str = json.dumps(memory) if memory else "empty"
    messages = [
        {"role": "system", "content": f"Tools available. Memory: {mem_str}. Be concise."},
        {"role": "user", "content": task},
    ]
    for turn in range(max_turns):
        state["turns"] += 1
        trace("llm_call", f"Turn {turn + 1}")
        msg = await ask_llm(messages)
        if not msg.get("tool_calls"):
            response = msg.get("content", "")
            ok, reason = check_gate(response, OUTPUT_RULES)
            if not ok:
                trace("policy_block", reason)
                return f"REDACTED: {reason}"
            trace("agent_end", response)
            return response
        messages.append(msg)
        for tc in msg["tool_calls"]:
            name = tc["function"]["name"]
            args = json.loads(tc["function"]["arguments"])
            result = tools[name](**args)
            state["tool_calls"].append({"tool": name, "args": args})
            if name == "make_plan":
                state["plan"] = json.loads(result)
            if name == "execute_step":
                state["results"].append(result)
            trace("tool_result", f"{name}({args}) → {result}")
            messages.append({"role": "tool", "tool_call_id": tc["id"], "content": str(result)})
    return "Max turns reached"`,
    },
    {
      id: "run",
      highlightNodes: ["input", "plan", "done"],
      prose: `## 试一下：完整 Agent

每个任务都会经过：输入关卡 → 第 3 课循环（带工具、记忆、状态和计划执行）→ 输出关卡。

按顺序试试：
1. *“记住 name=Alice，然后计算 10 加 5”*
2. *“我的名字是什么？”*：记忆跨调用保留。
3. *“为学习 Agent 制定计划”*：先计划，再逐步执行。
4. *“删除数据库”*：被输入关卡拦截。`,
      code: `trace("agent_start", f"Task: {USER_INPUT}")
print(f">> {await agent(USER_INPUT)}")
print(f"Memory: {memory}")
print(f"State: {state}")`,
      inputConfig: {
        placeholder: "试试“记住 name=Alice，然后计算 10 加 5”",
        variable: "USER_INPUT",
        samples: ["记住 name=Alice，然后计算 10 加 5", "我的名字是什么？", "为学习 Agent 制定计划", "删除数据库"],
      },
    },
  ],
  fullCode: lesson09FullCode,
};
