import { LessonDefinition } from "../types";
import { lesson08FullCode } from "./08-full-code";

export const lesson08: LessonDefinition = {
  slug: "self-scheduling",
  number: 8,
  title: "计划与执行",
  subtitle: "复杂任务先拆成计划，再逐步执行。很多 Agent 产品靠的就是这个循环。",
  difficulty: "advanced",
  concepts: ["计划", "执行", "步骤列表", "任务拆解", "收敛"],
  graph: {
    direction: "TB",
    nodes: [
      { id: "input", label: "任务输入", icon: "⟩", phase: "input" },
      { id: "planner", label: "生成计划", icon: "⟡", phase: "llm" },
      { id: "check", label: "还有步骤？", shape: "diamond", phase: "decide" },
      { id: "execute", label: "执行步骤", icon: "⚙", phase: "tool" },
      { id: "record", label: "记录结果", phase: "tool" },
      { id: "done", label: "汇总完成", icon: "◆", phase: "output" },
    ],
    edges: [
      { id: "input-planner", source: "input", target: "planner" },
      { id: "planner-check", source: "planner", target: "check" },
      { id: "check-execute", source: "check", target: "execute", label: "是" },
      { id: "execute-record", source: "execute", target: "record" },
      { id: "record-check", source: "record", target: "check" },
      { id: "check-done", source: "check", target: "done", label: "否" },
    ],
  },
  frameworkName:
    "Plan-and-execute Agent、LangGraph 工作流、CrewAI 顺序任务，本质上都是先拆步骤，再逐步执行和汇总。",
  llmConfig: {
    systemPrompt: "你可以使用工具。复杂任务先调用 make_plan，再逐步调用 execute_step。",
    tools: [
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
      prose: `# 计划与执行：先想清楚，再一步步做

复杂 Agent 不应该一边跑一边随便追加任务。更清楚的结构是：**先生成计划，再按计划执行**。

你在很多产品里都见过这个模式：让 AI 做代码审查，它会先列出检查项；让它写研究报告，它会先给提纲；让它处理发布准备，它会先列 checklist。这里的关键不是“自治”，而是一个可检查的执行流程：

1. 用户给出目标。
2. Planner 把目标拆成几个步骤。
3. Executor 逐步执行。
4. 每一步结果都进入状态，最后汇总。

> **对应框架：** LangGraph 常把这做成 planner 节点 + executor 节点；CrewAI 常把它表现为顺序 Task；很多 “deep research” 产品也会先生成研究计划。`,
    },
    {
      id: "setup",
      highlightNodes: ["planner", "execute"],
      prose: `## 第 1 步：两个工具

这次不再用会无限追加任务的队列，而是两个边界清楚的工具：

- \`make_plan(task)\`：把目标拆成步骤列表。
- \`execute_step(step)\`：执行其中一步，并返回结果。

这里的工具实现仍然是模拟的。接口先固定住，后面可以替换成真实检索、代码运行、文件编辑或 API 调用。`,
      code: `def make_plan(task):
    return json.dumps([
        f"明确目标：{task}",
        "拆成 3 个可执行步骤",
        "执行步骤并检查结果",
    ], ensure_ascii=False)

def execute_step(step):
    return f"完成：{step}"

tools = {"make_plan": make_plan, "execute_step": execute_step}
TOOL_DEFS = [
    {"type": "function", "function": {"name": "make_plan",
        "description": "Create a short execution plan",
        "parameters": {"type": "object",
            "properties": {"task": {"type": "string"}}}}},
    {"type": "function", "function": {"name": "execute_step",
        "description": "Execute one planned step",
        "parameters": {"type": "object",
            "properties": {"step": {"type": "string"}}}}},
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
      highlightNodes: ["planner", "check", "execute", "record"],
      prose: `## 第 2 步：计划-执行循环

Agent 主体还是第 3 课的循环，但任务结构更清楚：

1. 第一次调用 LLM，LLM 会请求 \`make_plan\`。
2. 计划返回后，LLM 按顺序请求 \`execute_step\`。
3. 每个步骤结果都记录到 \`results\`。
4. 所有步骤完成后，LLM 返回汇总。

这样右侧 Trace 会更好读：你能清楚看到先计划，再执行第 1、2、3 步。`,
      code: `async def agent(task, max_turns=8):
    messages = [
        {"role": "system", "content": "First make a plan, then execute each step. Be concise."},
        {"role": "user", "content": task},
    ]
    plan, results = [], []
    for turn in range(max_turns):
        trace("llm_call", f"Turn {turn + 1}")
        msg = await ask_llm(messages)
        if not msg.get("tool_calls"):
            trace("agent_end", msg.get("content", ""))
            return {"plan": plan, "results": results, "summary": msg.get("content", "")}

        messages.append(msg)
        for tc in msg["tool_calls"]:
            name = tc["function"]["name"]
            args = json.loads(tc["function"]["arguments"])
            result = tools[name](**args)
            if name == "make_plan":
                plan = json.loads(result)
            if name == "execute_step":
                results.append(result)
            trace("tool_result", f"{name}({args}) → {result}")
            messages.append({"role": "tool", "tool_call_id": tc["id"], "content": str(result)})
    return {"plan": plan, "results": results, "summary": "Max turns reached"}`,
    },
    {
      id: "run",
      highlightNodes: ["input", "planner", "execute", "done"],
      prose: `## 试一下

输入一个目标，看它先形成计划，再逐步执行。注意观察 Trace：

- 第一次工具调用是 \`make_plan\`。
- 后面每一步都是 \`execute_step\`。
- 最后返回“计划已执行完成”。

这就是更适合教学和生产排查的 Agent 结构：每一步都能解释，每一步都能替换。`,
      code: `result = await agent(USER_INPUT)
print("Plan:")
for i, step in enumerate(result["plan"], 1):
    print(f"{i}. {step}")
print("Results:")
for item in result["results"]:
    print(f"- {item}")
print(f">> {result['summary']}")`,
      inputConfig: {
        placeholder: "试试“帮我规划学习 Agent”",
        variable: "USER_INPUT",
        samples: ["帮我规划学习 Agent", "做一个代码审查计划", "准备一次产品发布"],
      },
    },
  ],
  fullCode: lesson08FullCode,
};
