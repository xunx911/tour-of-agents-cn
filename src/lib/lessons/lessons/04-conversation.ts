import { LessonDefinition } from "../types";
import { lesson04FullCode } from "./04-full-code";

export const lesson04: LessonDefinition = {
  slug: "conversation",
  number: 4,
  title: "对话就是消息数组",
  subtitle: "ChatGPT 为什么记得上一句，而“新对话”为什么会忘。",
  difficulty: "intermediate",
  concepts: ["对话历史", "多轮", "上下文窗口", "ChatGPT 模式"],
  graph: {
    nodes: [
      { id: "conv", label: "对话列表", icon: "⟩", phase: "input" },
      { id: "call1", label: "第 1 次调用", phase: "llm" },
      { id: "grow1", label: "列表增长", phase: "tool" },
      { id: "call2", label: "第 2 次调用", phase: "llm" },
      { id: "grow2", label: "看到完整历史", phase: "tool" },
      { id: "answer", label: "正确回答", icon: "◆", phase: "output" },
    ],
    edges: [
      { id: "conv-call1", source: "conv", target: "call1" },
      { id: "call1-grow1", source: "call1", target: "grow1" },
      { id: "grow1-call2", source: "grow1", target: "call2" },
      { id: "call2-grow2", source: "call2", target: "grow2" },
      { id: "grow2-answer", source: "grow2", target: "answer" },
    ],
  },
  frameworkName:
    "ChatGPT、Claude 和所有聊天 Agent，本质上都是 messages 数组在承载对话。",
  llmConfig: {
    systemPrompt: "You have tools. Use them when needed. Be concise.",
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
      prose: `# 对话就是消息数组

打开 ChatGPT 或 Claude，先发一句，再发第二句。第二句能引用第一句，是因为应用会把**之前所有消息**连同你的新消息一起发送。没有神秘记忆，本质上就是一个不断增长的数组。

第 3 课里，每次 \`agent()\` 调用都是从空白开始。把 messages 数组**移到函数外面**，每次调用就都能看到完整历史。这就是 LangChain 所谓 \`ConversationBufferMemory\` 的核心：一个不被清空的列表。`,
    },
    {
      id: "setup",
      highlightNodes: ["call1"],
      prose: `## 第 1 步：工具 + ask_llm

和第 3 课完全一样。这里不需要变化。`,
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
      id: "conversation",
      highlightNodes: ["conv"],
      prose: `## 第 2 步：对话数组

相比第 3 课只有一个变化：messages 数组放在函数**外部**。它用 system prompt 初始化一次，然后不再清空。

这就是 ChatGPT 和 Claude 能引用你前面消息的原因，也是“新对话”会忘记一切的原因。新对话 = 新的空数组。`,
      code: `conversation = [
    {"role": "system", "content": "You have tools: add(a,b) and upper(text). Use them when needed. Be concise."},
]`,
    },
    {
      id: "agent",
      highlightNodes: ["call1", "grow1", "call2", "grow2"],
      prose: `## 第 3 步：带持久历史的循环

仍然是第 3 课的循环，只加两件事：
1. 循环前，把用户消息追加到 \`conversation\`。
2. 循环结束后，把 assistant 的回答也追加进去。

下一次调用时，LLM 就能看到这一轮会话里的所有内容。`,
      code: `async def agent(user_message, max_turns=5):
    conversation.append({"role": "user", "content": user_message})
    for turn in range(max_turns):
        trace("llm_call", f"Turn {turn + 1} ({len(conversation)} messages)")
        msg = await ask_llm(conversation)
        if not msg.get("tool_calls"):
            conversation.append({"role": "assistant", "content": msg.get("content", "")})
            trace("agent_end", msg.get("content", ""))
            return msg.get("content", "")
        conversation.append(msg)
        for tc in msg["tool_calls"]:
            name = tc["function"]["name"]
            args = json.loads(tc["function"]["arguments"])
            result = tools[name](**args)
            trace("tool_result", f"{name}({args}) → {result}")
            conversation.append({"role": "tool", "tool_call_id": tc["id"], "content": str(result)})
    return "Max turns reached"`,
    },
    {
      id: "run",
      highlightNodes: ["answer"],
      prose: `## 试一下：多轮对话

连续发送多条消息：
1. *“计算 3 加 4”*
2. *“把 hello 转成大写”*
3. *“我刚才问了什么？”*

Agent 能正确回答第 3 条，因为它看到了完整对话历史。注意监视器里的消息数量会不断增长。`,
      code: `print(f">> {await agent(USER_INPUT)}")
print(f"({len(conversation)} messages in history)")`,
      inputConfig: {
        placeholder: "试试“计算 3 加 4”，再问“我刚才问了什么？”",
        variable: "USER_INPUT",
        samples: ["计算 3 加 4", "我刚才问了什么？", "把 hello 转成大写"],
      },
    },
  ],
  fullCode: lesson04FullCode,
};
