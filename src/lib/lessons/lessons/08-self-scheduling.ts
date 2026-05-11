import { LessonDefinition } from "../types";
import { lesson08FullCode } from "./08-full-code";

export const lesson08: LessonDefinition = {
  slug: "self-scheduling",
  number: 8,
  title: "自调度",
  subtitle: "ChatGPT 深度研究会自己拆子任务。核心是一个队列加预算。",
  difficulty: "advanced",
  concepts: ["自调度", "任务队列", "BFS", "收敛", "预算"],
  graph: {
    direction: "TB",
    nodes: [
      { id: "queue", label: "任务队列", icon: "⟩", phase: "input" },
      { id: "pop", label: "取出任务", phase: "input" },
      { id: "agent", label: "Agent 循环", icon: "⟡", phase: "llm" },
      { id: "check", label: "队列为空？", shape: "diamond", phase: "decide" },
      { id: "done", label: "全部完成", icon: "◆", phase: "output" },
      { id: "enqueue", label: "加入后续任务", icon: "⚙", phase: "tool" },
    ],
    edges: [
      { id: "queue-pop", source: "queue", target: "pop" },
      { id: "pop-agent", source: "pop", target: "agent" },
      { id: "agent-check", source: "agent", target: "check", label: "完成" },
      { id: "check-done", source: "check", target: "done", label: "是" },
      { id: "check-pop", source: "check", target: "pop", label: "否" },
      { id: "agent-enqueue", source: "agent", target: "enqueue", label: "调度" },
      { id: "enqueue-queue", source: "enqueue", target: "queue" },
    ],
  },
  frameworkName:
    "CrewAI 的任务委派、AutoGen 的 nested chats，本质上都是动态工作队列上的 BFS。",
  llmConfig: {
    systemPrompt: "你可以使用工具。遇到研究任务时，用 schedule_followup 安排后续步骤。",
    tools: [
      { name: "add", description: "Add two numbers",
        parameters: { a: { type: "number" }, b: { type: "number" } } },
      { name: "schedule_followup", description: "Add a follow-up task to the queue",
        parameters: { task: { type: "string" } } },
    ],
    mockResponses: [],
  },
  steps: [
    {
      id: "intro",
      prose: `# 自调度：Agent 决定下一步做什么

你在 Claude 里可能见过：让它“重构这个模块”，它会自己决定读取相关文件、检查测试、更新 import。你并没有逐条要求这些子任务。ChatGPT 的深度研究也类似：你问一个问题，它会派生多个研究线程。

到目前为止，都是**你**决定 Agent 做什么。更像 Agent 的系统会自己决定下一步。技巧是：\`schedule_followup\` 只是一个工具。LLM 像调用 \`add\` 一样调用它，副作用是：一个新任务进入队列。外层循环不断处理任务，直到队列清空或预算用完。

> **对应框架：** CrewAI 把它叫 delegation，AutoGen 把它叫 nested chats。预算上限（\`max_tasks\`）决定了这是有用 Agent，还是账单事故。`,
    },
    {
      id: "setup",
      highlightNodes: ["queue", "enqueue"],
      prose: `## 第 1 步：工具 + 队列

\`schedule_followup\` 会向 \`task_queue\` 追加任务。这个队列既在 Agent 外面，也在调度器外面。LLM 不知道它很特殊，只看到一个返回 "scheduled: ..." 的工具。`,
      code: `task_queue = []

tools = {
    "add": lambda a, b: a + b,
    "schedule_followup": lambda task: task_queue.append(task) or f"scheduled: {task}",
}
TOOL_DEFS = [
    {"type": "function", "function": {"name": "add", "description": "Add two numbers",
        "parameters": {"type": "object",
            "properties": {"a": {"type": "number"}, "b": {"type": "number"}}}}},
    {"type": "function", "function": {"name": "schedule_followup",
        "description": "Schedule a follow-up task for the agent to process next",
        "parameters": {"type": "object",
            "properties": {"task": {"type": "string"}}}}},
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
      highlightNodes: ["agent"],
      prose: `## 第 2 步：第 3 课循环不变

Agent 自己并不知道队列存在。它只是在执行工具。当 LLM 调用 \`schedule_followup\` 时，工具函数通过副作用把任务追加到队列里。循环把它当作普通工具结果处理。`,
      code: `async def agent(task, max_turns=5):
    messages = [
        {"role": "system", "content": "You have tools. Use schedule_followup to add next steps. Be concise."},
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
      id: "scheduler",
      highlightNodes: ["pop", "check", "done"],
      prose: `## 第 3 步：调度器，也就是 BFS

取出队首任务，运行 \`agent()\`，检查有没有新任务被加入。重复这个过程，直到队列为空或预算耗尽。

这是**外层循环**。Agent 内部还有自己的**内层循环**（第 3 课）。两层迭代：调度器决定做什么，Agent 决定怎么做。`,
      code: `async def run_queue(initial_tasks, max_tasks=5):
    task_queue.clear()
    task_queue.extend(initial_tasks)
    results = []
    processed = 0
    while task_queue and processed < max_tasks:
        task = task_queue.pop(0)
        processed += 1
        trace("agent_start", f"[{processed}/{max_tasks}] {task}")
        result = await agent(task)
        results.append({"task": task, "result": result})
    if task_queue:
        trace("policy_block", f"BUDGET: {len(task_queue)} tasks remaining")
    return results`,
    },
    {
      id: "run",
      highlightNodes: ["queue", "agent", "done"],
      prose: `## 试一下

输入一个主题。LLM 会处理它，并可能安排后续任务。观察监视器里队列如何增长和清空。如果 LLM 过于积极，就会撞到预算上限。`,
      code: `results = await run_queue([f"研究 {USER_INPUT}，并安排后续总结"])
for r in results:
    print(f">> [{r['task']}] {r['result']}")`,
      inputConfig: {
        placeholder: "输入一个主题，例如 AI 安全",
        variable: "USER_INPUT",
        samples: ["AI 安全", "量子计算", "气候变化"],
      },
    },
  ],
  fullCode: lesson08FullCode,
};
