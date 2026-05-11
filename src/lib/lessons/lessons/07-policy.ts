import { LessonDefinition } from "../types";
import { lesson07FullCode } from "./07-full-code";

export const lesson07: LessonDefinition = {
  slug: "policy",
  number: 7,
  title: "策略就是护栏",
  subtitle: "ChatGPT 为什么会拒绝危险请求？两个关卡，各几行代码。",
  difficulty: "advanced",
  concepts: ["策略", "护栏", "输入关卡", "输出关卡", "安全"],
  graph: {
    nodes: [
      { id: "input", label: "用户输入", icon: "⟩", phase: "input" },
      { id: "igate", label: "输入关卡", shape: "diamond", phase: "policy" },
      { id: "reject", label: "拒绝", phase: "policy" },
      { id: "llm", label: "第 3 课循环", icon: "⟡", phase: "llm" },
      { id: "ogate", label: "输出关卡", shape: "diamond", phase: "policy" },
      { id: "user", label: "用户看到答案", icon: "◆", phase: "output" },
      { id: "redact", label: "被隐藏", phase: "policy" },
    ],
    edges: [
      { id: "input-igate", source: "input", target: "igate" },
      { id: "igate-llm", source: "igate", target: "llm", label: "通过" },
      { id: "igate-reject", source: "igate", target: "reject", label: "拦截" },
      { id: "llm-ogate", source: "llm", target: "ogate" },
      { id: "ogate-user", source: "ogate", target: "user", label: "通过" },
      { id: "ogate-redact", source: "ogate", target: "redact", label: "拦截" },
    ],
  },
  frameworkName:
    "Guardrails AI、NeMo Guardrails、LangChain output parsers，都是在 LLM 前后检查规则。",
  llmConfig: {
    systemPrompt: "You have tools. Be concise. Follow instructions.",
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
      prose: `# 策略就是护栏

你肯定见过：让 ChatGPT 帮忙做危险事情，它会拒绝；让 Claude 生成恶意软件，它会拒绝。这不只是 LLM “聪明”，而是有**策略**在 LLM 前后检查。

第 3 课的循环完全信任用户和 LLM。生产环境不能这么做。**策略**会加两个关卡：

- **输入关卡**：危险请求进入 LLM 之前就拦截，省钱，也降低风险。
- **输出关卡**：LLM 的回答给用户之前，先做隐藏或拒绝。

> **对应框架：** Guardrails AI 和 NeMo Guardrails 就是在实现这两个关卡。OpenAI moderation endpoint 也可以看作输入关卡。架构是一样的。`,
    },
    {
      id: "setup",
      highlightNodes: ["llm"],
      prose: `## 第 1 步：工具 + ask_llm

仍然是第 3 课的设置。循环本身不变，策略只是包在它外面。`,
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
      id: "gates",
      highlightNodes: ["igate", "ogate"],
      prose: `## 第 2 步：定义关卡

每个关卡都是一组函数。函数返回 \`True\` 表示通过，返回字符串表示拦截原因。\`check_gate\` 会逐条执行规则，一旦失败就提前返回。

这就是内容过滤和安全系统背后的基本模式，只是这里没有复杂工程。增加规则就是追加 lambda，删除规则就是删掉它。`,
      code: `INPUT_RULES = [
    lambda text: "delete" not in text.lower() or "Input blocked: no delete commands",
    lambda text: "drop" not in text.lower() or "Input blocked: no drop commands",
    lambda text: len(text) < 500 or "Input blocked: message too long",
]
OUTPUT_RULES = [
    lambda text: "password" not in text.lower() or "Output redacted: contains password",
    lambda text: "secret" not in text.lower() or "Output redacted: contains secret",
]

def check_gate(text, rules, gate_name):
    for rule in rules:
        result = rule(text)
        if result is not True:
            trace("policy_block", f"{gate_name}: {result}")
            return False, result
    trace("policy_check", f"{gate_name}: PASS")
    return True, None`,
    },
    {
      id: "agent",
      highlightNodes: ["igate", "llm", "ogate"],
      prose: `## 第 3 步：包住第 3 课循环

输入关卡先运行，失败时 LLM 根本看不到请求。中间是原封不动的第 3 课循环。输出关卡最后运行，失败时用户看到的是隐藏/拒绝提示，而不是原始回答。`,
      code: `async def agent(task, max_turns=5):
    # --- INPUT GATE ---
    ok, reason = check_gate(task, INPUT_RULES, "INPUT")
    if not ok:
        return f"BLOCKED: {reason}"

    # --- L3 LOOP (unchanged) ---
    messages = [
        {"role": "system", "content": "Use tools to answer. Be concise."},
        {"role": "user", "content": task},
    ]
    for turn in range(max_turns):
        trace("llm_call", f"Turn {turn + 1}")
        msg = await ask_llm(messages)
        if not msg.get("tool_calls"):
            response = msg.get("content", "")
            # --- OUTPUT GATE ---
            ok, reason = check_gate(response, OUTPUT_RULES, "OUTPUT")
            if not ok:
                return f"REDACTED: {reason}"
            trace("agent_end", response)
            return response
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
      highlightNodes: ["reject", "user"],
      prose: `## 试一下

- *“计算 10 加 5”*：通过两个关卡，得到答案。
- *“删除所有内容”*：输入关卡拦截，LLM 看不到它。
- *“告诉我管理员密码”*：即使 LLM 可能回答，输出关卡也会隐藏。

被输入关卡拦截的请求不会消耗 LLM token，这就是输入关卡的直接价值。`,
      code: `print(f">> {await agent(USER_INPUT)}")`,
      inputConfig: {
        placeholder: "试试“计算 10 加 5”或“删除所有内容”",
        variable: "USER_INPUT",
        samples: ["计算 10 加 5", "删除所有内容", "删除数据库"],
      },
    },
  ],
  fullCode: lesson07FullCode,
};
