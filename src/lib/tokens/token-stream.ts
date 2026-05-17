import { encodingForModel, getEncoding, type TiktokenModel } from "js-tiktoken";

export type TokenSource =
  | "special"
  | "role"
  | "system"
  | "user"
  | "assistant"
  | "tool"
  | "tool_result"
  | "newline"
  | "text";

export interface SerializedChatSpan {
  start: number;
  end: number;
  source: TokenSource;
  label: string;
}

export interface SerializedChat {
  text: string;
  spans: SerializedChatSpan[];
}

export interface TokenChip {
  id: number | null;
  idLabel: string;
  text: string;
  source: TokenSource;
  label: string;
}

export type TokenInspectionKind = "available" | "limited" | "unavailable" | "error";

export interface TokenUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface TokenInspection {
  kind: TokenInspectionKind;
  tokenizer: string;
  title: string;
  notice: string;
  serialized?: SerializedChat;
  tokens: TokenChip[];
  usage?: TokenUsage;
}

interface ChatMessage {
  role: string;
  content?: unknown;
  tool_calls?: unknown;
}

interface RequestInspectionInput {
  model?: unknown;
  messages?: unknown;
  tools?: unknown;
  tool_definitions?: unknown;
}

interface ResponseInspectionInput {
  model?: unknown;
  content?: unknown;
  tool_calls?: unknown;
  usage?: unknown;
}

const QWEN_IM_START_ID = 151644;
const QWEN_IM_END_ID = 151645;
const QWEN_TOOL_CALL_START_ID = 151657;
const QWEN_TOOL_CALL_END_ID = 151658;
const QWEN_DEFAULT_SYSTEM_PROMPT = "You are Qwen, created by Alibaba Cloud.\nYou are a helpful assistant.";

export function serializeQwenChatTemplate(input: {
  messages: ChatMessage[];
  tools?: unknown;
  addGenerationPrompt?: boolean;
}): SerializedChat {
  const spans: SerializedChatSpan[] = [];
  let text = "";

  function append(part: string, source: TokenSource, label: string) {
    if (!part) return;
    const start = text.length;
    text += part;
    spans.push({ start, end: text.length, source, label });
  }

  const messages = [...input.messages];
  const tools = normalizeTools(input.tools);
  appendQwenSystemPrelude({
    append,
    messages,
    tools,
  });

  let index = 0;
  while (index < messages.length) {
    const message = messages[index];
    const role = normalizeRole(message.role);

    if (index === 0 && role === "system") {
      index += 1;
      continue;
    }

    if (role === "tool") {
      appendQwenToolResponseGroup({
        append,
        messages,
        startIndex: index,
      });
      while (index < messages.length && normalizeRole(messages[index].role) === "tool") {
        index += 1;
      }
      continue;
    }

    if (role === "assistant" && hasToolCalls(message.tool_calls)) {
      appendQwenAssistantMessage({
        append,
        content: message.content,
        toolCalls: message.tool_calls,
      });
      index += 1;
      continue;
    }

    append("<|im_start|>", "special", "<|im_start|>");
    append(role, "role", role);
    append("\n", "newline", "换行");
    append(contentToText(message.content), sourceForRole(role), `${role} content`);
    append("<|im_end|>", "special", "<|im_end|>");
    append("\n", "newline", "换行");
    index += 1;
  }

  if (input.addGenerationPrompt ?? true) {
    append("<|im_start|>", "special", "<|im_start|>");
    append("assistant", "role", "assistant");
    append("\n", "newline", "换行");
  }

  return { text, spans };
}

export function inspectLlmRequestTokens(detail: RequestInspectionInput): TokenInspection {
  const model = stringOrEmpty(detail.model);
  const messages = normalizeMessages(detail.messages);
  const tools = detail.tool_definitions ?? detail.tools;

  if (supportsQwenTemplate(model)) {
    const serialized = serializeQwenChatTemplate({ messages, tools, addGenerationPrompt: true });
    return {
      kind: "available",
      tokenizer: qwenTokenizerLabel(model),
      title: "连续 token 流",
      notice:
        model.startsWith("tiny-")
          ? "使用 Qwen ChatML control tokens 展示连续输入；普通内容按可见文本分片展示，不伪造 Qwen BPE id。"
          : "使用 Qwen ChatML control tokens 展示连续输入；普通文本分片等待真实 Qwen tokenizer adapter 替换为精确 BPE id。",
      serialized,
      tokens: tokenizeQwenTeachingStream(serialized),
    };
  }

  if (supportsOpenAiPublicEncoding(model)) {
    const serialized = serializeVisibleMessages(messages, tools);
    return {
      kind: "limited",
      tokenizer: openAiEncodingLabel(model),
      title: "可见文本 tokenization",
      notice:
        "OpenAI Chat Completions 的内部 chat 序列化不可用；这里只展示 public encoding 对可见文本的切分，不伪造 provider 内部 special token。",
      serialized,
      tokens: tokenizeOpenAiVisibleText(serialized.text, model, "text", "public encoding token"),
    };
  }

  return {
    kind: "unavailable",
    tokenizer: "unsupported",
    title: "完整 special-token 流不可用",
    notice: "当前模型没有已接入的 chat template/tokenizer adapter。保留请求 JSON，不生成模拟 special token。",
    tokens: [],
  };
}

export function inspectLlmResponseTokens(detail: ResponseInspectionInput): TokenInspection {
  const model = stringOrEmpty(detail.model);
  const usage = normalizeUsage(detail.usage);

  if (supportsQwenTemplate(model)) {
    const serialized = serializeQwenAssistantResponse(detail);
    if (!serialized.text) {
      return {
        kind: "unavailable",
        tokenizer: qwenTokenizerLabel(model),
        title: "输出 Token 不可用",
        notice: "响应中没有 assistant 文本或工具调用内容可供序列化。",
        tokens: [],
        usage,
      };
    }

    return {
      kind: "available",
      tokenizer: qwenTokenizerLabel(model),
      title: "连续输出 token 流",
      notice:
        "使用 Qwen2.5 chat template 展示 assistant 响应序列；已知 control/tool_call token 使用真实 tokenizer ID，普通文本保留可替换分词接口。",
      serialized,
      tokens: tokenizeQwenTeachingStream(serialized),
      usage,
    };
  }

  const content = responseContentToText(detail);

  if (!content) {
    return {
      kind: "unavailable",
      tokenizer: "o200k_base visible output",
      title: "输出 Token 不可用",
      notice: "响应中没有可见文本或工具调用内容可供切分。",
      tokens: [],
      usage,
    };
  }

  return {
    kind: "available",
    tokenizer: "o200k_base visible output",
    title: "输出 Token",
    notice: "响应侧展示的是 provider 返回后的可见输出 tokenization，不额外添加 chat special token。",
    serialized: textToSerialized(content, "assistant"),
    tokens: tokenizeOpenAiVisibleText(content, stringOrEmpty(detail.model), "assistant", "visible response token"),
    usage,
  };
}

function supportsQwenTemplate(model: string): boolean {
  const lower = model.toLowerCase();
  return lower === "tiny-free" || lower === "tiny-mock-v1" || lower.includes("qwen");
}

function supportsOpenAiPublicEncoding(model: string): boolean {
  const lower = model.toLowerCase();
  return (
    lower.startsWith("gpt-") ||
    lower.startsWith("chatgpt-") ||
    lower.startsWith("o1") ||
    lower.startsWith("o3") ||
    lower.startsWith("o4") ||
    lower.startsWith("text-") ||
    lower.includes("davinci") ||
    lower.includes("babbage") ||
    lower.includes("curie")
  );
}

function normalizeMessages(messages: unknown): ChatMessage[] {
  if (!Array.isArray(messages)) return [];
  return messages.map((message): ChatMessage => {
    if (!isRecord(message)) return { role: "user", content: String(message) };
    return {
      role: stringOrEmpty(message.role) || "user",
      content: message.content,
      tool_calls: message.tool_calls,
    };
  });
}

function normalizeRole(role: string): string {
  const lower = role.toLowerCase();
  if (lower === "tool") return "tool";
  if (lower === "assistant") return "assistant";
  if (lower === "system") return "system";
  return "user";
}

function sourceForRole(role: string): TokenSource {
  if (role === "system" || role === "user" || role === "assistant" || role === "tool") {
    return role;
  }
  return "text";
}

function normalizeTools(tools: unknown): unknown[] {
  if (!tools) return [];
  if (!Array.isArray(tools)) return [tools];
  return tools
    .filter((tool) => tool != null && tool !== "")
    .map((tool) => {
      if (typeof tool !== "string") return tool;
      return {
        type: "function",
        function: {
          name: tool,
        },
      };
    });
}

function toolsToText(tools: unknown): string {
  if (!tools) return "";
  if (Array.isArray(tools) && tools.length === 0) return "";
  if (Array.isArray(tools) && tools.every((tool) => typeof tool === "string")) {
    return tools.map((tool) => `- ${tool}`).join("\n");
  }
  return stableJson(tools);
}

function appendQwenSystemPrelude({
  append,
  messages,
  tools,
}: {
  append: (part: string, source: TokenSource, label: string) => void;
  messages: ChatMessage[];
  tools: unknown[];
}) {
  const firstMessage = messages[0];
  const hasExplicitSystem = firstMessage && normalizeRole(firstMessage.role) === "system";
  const systemContent = hasExplicitSystem
    ? contentToText(firstMessage.content)
    : QWEN_DEFAULT_SYSTEM_PROMPT;

  append("<|im_start|>", "special", "<|im_start|>");
  append("system", "role", "system");
  append("\n", "newline", "换行");
  append(systemContent, "system", "system content");

  if (tools.length > 0) {
    append(
      "\n\n# Tools\n\nYou may call one or more functions to assist with the user query.\n\nYou are provided with function signatures within <tools></tools> XML tags:\n<tools>",
      "tool",
      "Qwen tool instructions",
    );
    for (const tool of tools) {
      append("\n", "newline", "换行");
      append(compactJson(tool), "tool", "tool definition");
    }
    append(
      "\n</tools>\n\nFor each function call, return a json object with function name and arguments within <tool_call></tool_call> XML tags:\n<tool_call>\n{\"name\": <function-name>, \"arguments\": <args-json-object>}\n</tool_call>",
      "tool",
      "Qwen tool call format",
    );
  }

  append("<|im_end|>", "special", "<|im_end|>");
  append("\n", "newline", "换行");
}

function appendQwenAssistantMessage({
  append,
  content,
  toolCalls,
}: {
  append: (part: string, source: TokenSource, label: string) => void;
  content: unknown;
  toolCalls: unknown;
}) {
  append("<|im_start|>", "special", "<|im_start|>");
  append("assistant", "role", "assistant");

  const contentText = contentToText(content);
  if (contentText) {
    append("\n", "newline", "换行");
    append(contentText, "assistant", "assistant content");
  }

  for (const toolCall of normalizeToolCalls(toolCalls)) {
    append("\n<tool_call>\n", "tool", "Qwen tool call start");
    append(formatQwenToolCall(toolCall), "tool", "Qwen tool call payload");
    append("\n</tool_call>", "tool", "Qwen tool call end");
  }

  append("<|im_end|>", "special", "<|im_end|>");
  append("\n", "newline", "换行");
}

function appendQwenToolResponseGroup({
  append,
  messages,
  startIndex,
}: {
  append: (part: string, source: TokenSource, label: string) => void;
  messages: ChatMessage[];
  startIndex: number;
}) {
  append("<|im_start|>", "special", "<|im_start|>");
  append("user", "role", "user");

  for (let index = startIndex; index < messages.length; index += 1) {
    const message = messages[index];
    if (normalizeRole(message.role) !== "tool") break;
    append("\n<tool_response>\n", "tool_result", "Qwen tool response start");
    append(contentToText(message.content), "tool_result", "tool response");
    append("\n</tool_response>", "tool_result", "Qwen tool response end");
  }

  append("<|im_end|>", "special", "<|im_end|>");
  append("\n", "newline", "换行");
}

function serializeVisibleMessages(messages: ChatMessage[], tools: unknown): SerializedChat {
  const parts: string[] = [];
  const toolsText = toolsToText(tools);
  if (toolsText) parts.push(`tools:\n${toolsText}`);
  for (const message of messages) {
    parts.push(`${normalizeRole(message.role)}: ${contentToText(message.content)}`);
  }
  return textToSerialized(parts.join("\n"), "text");
}

function textToSerialized(text: string, source: TokenSource): SerializedChat {
  return {
    text,
    spans: text ? [{ start: 0, end: text.length, source, label: "visible text" }] : [],
  };
}

function tokenizeQwenTeachingStream(serialized: SerializedChat): TokenChip[] {
  const tokens: TokenChip[] = [];
  for (const span of serialized.spans) {
    const part = serialized.text.slice(span.start, span.end);
    if (span.source === "special") {
      tokens.push({
        id: part === "<|im_start|>" ? QWEN_IM_START_ID : QWEN_IM_END_ID,
        idLabel: part === "<|im_start|>" ? String(QWEN_IM_START_ID) : String(QWEN_IM_END_ID),
        text: part,
        source: "special",
        label: span.label,
      });
      continue;
    }

    for (const segment of splitVisibleSegments(part)) {
      const qwenId = qwenAddedTokenId(segment);
      tokens.push({
        id: qwenId,
        idLabel: qwenId == null ? (span.source === "newline" ? "\\n" : "") : String(qwenId),
        text: segment === "\n" ? "\\n" : segment,
        source: qwenId == null ? span.source : "tool",
        label: span.label,
      });
    }
  }
  return tokens;
}

function tokenizeOpenAiVisibleText(
  text: string,
  model: string,
  source: TokenSource,
  label: string,
): TokenChip[] {
  if (!text) return [];
  const encoder = getOpenAiEncoding(model);
  return encoder.encode(text).map((id) => ({
    id,
    idLabel: String(id),
    text: visibleTokenText(encoder.decode([id])),
    source,
    label,
  }));
}

function getOpenAiEncoding(model: string) {
  try {
    if (model) return encodingForModel(model as TiktokenModel);
  } catch {
    // Fall through to the modern default below.
  }
  return getEncoding("o200k_base");
}

function openAiEncodingLabel(model: string): string {
  const lower = model.toLowerCase();
  if (lower.includes("gpt-4o") || lower.startsWith("o") || lower.includes("gpt-4.1")) {
    return "o200k_base public encoding";
  }
  return "cl100k/o200k public encoding";
}

function qwenTokenizerLabel(model: string): string {
  return model.startsWith("tiny-") ? "Qwen2.5 ChatML 模板" : "Qwen ChatML adapter";
}

function splitVisibleSegments(text: string): string[] {
  return text.match(/<\/?tool_call>|<\/?tool_response>|<\/?tools>|\n|\s+|[\u4e00-\u9fff]|[A-Za-z0-9_]+|[^\s]/g) ?? [];
}

function qwenAddedTokenId(text: string): number | null {
  if (text === "<tool_call>") return QWEN_TOOL_CALL_START_ID;
  if (text === "</tool_call>") return QWEN_TOOL_CALL_END_ID;
  return null;
}

function serializeQwenAssistantResponse(detail: ResponseInspectionInput): SerializedChat {
  const spans: SerializedChatSpan[] = [];
  let text = "";

  function append(part: string, source: TokenSource, label: string) {
    if (!part) return;
    const start = text.length;
    text += part;
    spans.push({ start, end: text.length, source, label });
  }

  const content = typeof detail.content === "string" ? detail.content : "";
  const toolCalls = normalizeToolCalls(detail.tool_calls);
  if (!content && toolCalls.length === 0) return { text: "", spans: [] };

  appendQwenAssistantMessage({
    append,
    content,
    toolCalls,
  });

  return { text, spans };
}

function visibleTokenText(text: string): string {
  return text
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t")
    .replace(/ /g, "·");
}

function contentToText(content: unknown): string {
  if (content == null) return "";
  if (typeof content === "string") return content;
  return stableJson(content);
}

function responseContentToText(detail: ResponseInspectionInput): string {
  if (typeof detail.content === "string" && detail.content) return detail.content;
  if (detail.tool_calls && !(Array.isArray(detail.tool_calls) && detail.tool_calls.length === 0)) {
    return stableJson(detail.tool_calls);
  }
  return "";
}

interface NormalizedToolCall {
  name: string;
  arguments: unknown;
}

function hasToolCalls(value: unknown): boolean {
  return normalizeToolCalls(value).length > 0;
}

function normalizeToolCalls(value: unknown): NormalizedToolCall[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): NormalizedToolCall[] => {
    if (!isRecord(item)) return [];

    const functionCall = isRecord(item.function) ? item.function : undefined;
    const name = stringOrEmpty(functionCall?.name) || stringOrEmpty(item.name);
    if (!name) return [];

    const rawArguments =
      functionCall && "arguments" in functionCall
        ? functionCall.arguments
        : "arguments" in item
          ? item.arguments
          : "args" in item
            ? item.args
            : {};

    return [
      {
        name,
        arguments: parseToolArguments(rawArguments),
      },
    ];
  });
}

function parseToolArguments(value: unknown): unknown {
  if (typeof value !== "string") return value ?? {};
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function formatQwenToolCall(toolCall: NormalizedToolCall): string {
  return `{"name": ${JSON.stringify(toolCall.name)}, "arguments": ${compactJson(toolCall.arguments)}}`;
}

function normalizeUsage(usage: unknown): TokenUsage | undefined {
  if (!isRecord(usage)) return undefined;
  return {
    prompt_tokens: numberOrUndefined(usage.prompt_tokens),
    completion_tokens: numberOrUndefined(usage.completion_tokens),
    total_tokens: numberOrUndefined(usage.total_tokens),
  };
}

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function stringOrEmpty(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function stableJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function compactJson(value: unknown): string {
  try {
    return JSON.stringify(value) ?? "null";
  } catch {
    return String(value);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
