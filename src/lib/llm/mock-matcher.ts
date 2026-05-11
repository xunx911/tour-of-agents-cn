/**
 * Pattern-matching mock for the Tiny Agents (Free) provider.
 * Maps user messages to OpenAI-format tool_calls or text responses.
 * Covers Chinese and English sample inputs from lessons 1-9.
 */

export type MockResult =
  | { type: "text"; content: string }
  | { type: "tool_call"; name: string; arguments: Record<string, unknown> };

interface Message {
  role: string;
  content?: string;
  tool_calls?: unknown[];
}

/** Match the conversation and return a mock response. */
export function matchResponse(messages: Message[], toolNames: string[]): MockResult {
  const lastToolResult = findLastToolResult(messages);
  if (lastToolResult !== null) {
    return summarizeToolResult(lastToolResult, messages);
  }
  const userMsg = findLastUserMessage(messages);
  if (toolNames.length > 0 && userMsg) {
    const toolMatch = matchToolCall(userMsg, toolNames);
    if (toolMatch) return toolMatch;
  }
  return matchTextResponse(userMsg || "hello", messages);
}

function findLastUserMessage(messages: Message[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user" && messages[i].content) {
      return messages[i].content!;
    }
  }
  return null;
}

function findLastToolResult(messages: Message[]): string | null {
  const last = messages[messages.length - 1];
  if (last?.role === "tool" && last.content) return last.content;
  return null;
}

function summarizeToolResult(result: string, messages: Message[]): MockResult {
  const pendingTools = countPendingTools(messages);
  if (pendingTools > 0) {
    return matchToolCall(findLastUserMessage(messages) || "", []) ?? { type: "text", content: result };
  }
  const nextTask = matchNextTask(messages);
  if (nextTask) return nextTask;
  if (/^\d+(\.\d+)?$/.test(result.trim())) {
    return { type: "text", content: `结果是 ${result.trim()}。` };
  }
  if (result === result.toUpperCase() && /[A-Z]/.test(result)) {
    return { type: "text", content: `处理后是：${result.trim()}` };
  }
  return { type: "text", content: result.trim() || "完成。" };
}

function matchNextTask(messages: Message[]): MockResult | null {
  const userMsg = findLastUserMessage(messages);
  if (!userMsg) return null;
  const thenMatch = userMsg.match(/(?:then|然后|再)\s*(.+)$/i);
  if (!thenMatch) return null;
  const remainder = thenMatch[1];
  const calledTools = new Set<string>();
  for (const m of messages) {
    if (m.role === "assistant" && m.tool_calls) {
      for (const tc of m.tool_calls as Array<{ function?: { name: string } }>) {
        if (tc.function?.name) calledTools.add(tc.function.name);
      }
    }
  }
  const candidate = matchToolCall(remainder, []);
  if (candidate && candidate.type === "tool_call" && !calledTools.has(candidate.name)) {
    return candidate;
  }
  return null;
}

function countPendingTools(messages: Message[]): number {
  let calls = 0;
  let results = 0;
  for (const m of messages) {
    if (m.role === "assistant" && m.tool_calls) calls += (m.tool_calls as unknown[]).length;
    if (m.role === "tool") results++;
  }
  return calls - results;
}

function matchToolCall(text: string, toolNames: string[]): MockResult | null {
  const lower = text.toLowerCase();
  const ok = (name: string) => toolNames.includes(name) || toolNames.length === 0;

  type Candidate = { index: number; result: MockResult };
  const candidates: Candidate[] = [];

  const addMatch = lower.match(/add\s+(\d+)\s+and\s+(\d+)/);
  if (addMatch && ok("add")) {
    candidates.push({ index: addMatch.index!, result:
      { type: "tool_call", name: "add", arguments: { a: Number(addMatch[1]), b: Number(addMatch[2]) } } });
  }

  const addCnMatch = text.match(/(?:计算|求|先)?\s*(\d+)\s*(?:加|\+)\s*(\d+)/);
  if (addCnMatch && ok("add")) {
    candidates.push({ index: addCnMatch.index!, result:
      { type: "tool_call", name: "add", arguments: { a: Number(addCnMatch[1]), b: Number(addCnMatch[2]) } } });
  }

  const upperMatch = lower.match(/uppercase\s+(.+?)(?:\s+then\s+|$)/);
  if (upperMatch && ok("upper")) {
    candidates.push({ index: upperMatch.index!, result:
      { type: "tool_call", name: "upper", arguments: { text: upperMatch[1].trim() } } });
  }

  const upperCnMatch = text.match(/把\s+(.+?)\s*(?:转成|转换成|变成)?大写/);
  if (upperCnMatch && ok("upper")) {
    candidates.push({ index: upperCnMatch.index!, result:
      { type: "tool_call", name: "upper", arguments: { text: upperCnMatch[1].trim() } } });
  }

  const rememberKV = lower.match(/remember\s+(\w+)\s*=\s*(.+?)(?:\s+then\s+|$)/);
  if (rememberKV && ok("remember")) {
    candidates.push({ index: rememberKV.index!, result:
      { type: "tool_call", name: "remember", arguments: { key: rememberKV[1], value: rememberKV[2].trim() } } });
  }

  const rememberCnKV = text.match(/记住\s+(\w+)\s*=\s*(.+?)(?:(?:，|,)?\s*(?:then|然后|再)\s*|$)/i);
  if (rememberCnKV && ok("remember")) {
    candidates.push({ index: rememberCnKV.index!, result:
      { type: "tool_call", name: "remember", arguments: { key: rememberCnKV[1], value: rememberCnKV[2].trim() } } });
  }

  const nameMatch = lower.match(/my name is (\w+)/);
  if (nameMatch && ok("remember")) {
    candidates.push({ index: nameMatch.index!, result:
      { type: "tool_call", name: "remember", arguments: { key: "name", value: nameMatch[1] } } });
  }

  const nameCnMatch = text.match(/我的名字是\s*([A-Za-z0-9_\u4e00-\u9fa5]+)/);
  if (nameCnMatch && ok("remember")) {
    candidates.push({ index: nameCnMatch.index!, result:
      { type: "tool_call", name: "remember", arguments: { key: "name", value: nameCnMatch[1] } } });
  }

  const rememberLike = lower.match(/remember i like (\w+)/);
  if (rememberLike && ok("remember")) {
    candidates.push({ index: rememberLike.index!, result:
      { type: "tool_call", name: "remember", arguments: { key: "preference", value: rememberLike[1] } } });
  }

  const rememberCnLike = text.match(/记住我喜欢\s*([A-Za-z0-9_\u4e00-\u9fa5]+)/);
  if (rememberCnLike && ok("remember")) {
    candidates.push({ index: rememberCnLike.index!, result:
      { type: "tool_call", name: "remember", arguments: { key: "preference", value: rememberCnLike[1] } } });
  }

  if (toolNames.includes("schedule_followup") && !lower.includes("add") && !lower.includes("upper")) {
    const taskText = text.trim().replace(/^(Research:\s*)+/i, "").trim() || text.trim();
    candidates.push({ index: 0, result:
      { type: "tool_call", name: "schedule_followup", arguments: { task: `研究：${taskText}` } } });
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.index - b.index);
  return candidates[0].result;
}

function matchTextResponse(text: string, messages: Message[] = []): MockResult {
  const lower = text.toLowerCase();

  if (lower.includes("what is an ai agent") || text.includes("什么是 AI Agent") || text.includes("什么是 ai agent"))
    return { type: "text", content: "AI Agent 是一个用 LLM 决定下一步动作的程序。它读取消息，需要时调用工具，并在循环中推进任务直到完成。" };
  if (lower.includes("explain python") || text.includes("解释 Python") || text.includes("解释 python"))
    return { type: "text", content: "Python 是一种高级解释型编程语言，语法清晰，生态丰富，常用于 Web、数据分析、自动化和 AI。" };
  if (lower.includes("joke") || text.includes("笑话"))
    return { type: "text", content: "一个简短笑话：程序员为什么喜欢深色模式？因为亮光会把 bug 招出来。" };
  if (lower.includes("what is my name") || text.includes("我的名字是什么")) {
    const name = extractMemoryValue("name", messages);
    if (name) return { type: "text", content: `你的名字是 ${name}。` };
    return { type: "text", content: "我还没有在记忆里找到你的名字。可以先让我记住它。" };
  }
  if (lower.includes("what did i just ask") || text.includes("我刚才问了什么"))
    return { type: "text", content: "你刚才让我计算 3 加 4。" };
  if (lower.includes("what is python") || text.includes("什么是 Python") || text.includes("什么是 python"))
    return { type: "text", content: "Python 是一种通用编程语言，常用于 Web 开发、数据科学、AI 和脚本自动化。" };
  if (lower.includes("delete") || lower.includes("drop") || text.includes("删除") || text.includes("清空"))
    return { type: "text", content: "我不能帮助执行破坏性操作。可以改问我计算数字或把文本转成大写。" };

  return { type: "text", content: `这是一个关于“${text.slice(0, 40)}”的好问题。简短说，Agent 就是在循环中调用 LLM、工具和状态的函数。` };
}

function extractMemoryValue(key: string, messages: Message[]): string | null {
  const sysMsg = messages.find((m) => m.role === "system");
  if (!sysMsg?.content) return null;
  const memMatch = sysMsg.content.match(/Memory:\s*(\{[^}]*\})/);
  if (!memMatch) return null;
  try {
    const mem = JSON.parse(memMatch[1]) as Record<string, string>;
    return mem[key] ?? null;
  } catch {
    return null;
  }
}
