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
  const toolsText = toolsToText(input.tools);
  if (toolsText) {
    messages.unshift({
      role: "system",
      content: `可用工具(JSON):\n${toolsText}`,
    });
  }

  for (const message of messages) {
    const role = normalizeRole(message.role);
    append("<|im_start|>", "special", "<|im_start|>");
    append(role, "role", role);
    append("\n", "newline", "换行");
    append(contentToText(message.content), sourceForRole(role), `${role} content`);
    append("<|im_end|>", "special", "<|im_end|>");
    append("\n", "newline", "换行");
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
        model === "tiny-free"
          ? "课程演示模式使用 Qwen ChatML 结构展示 special token；普通文本为教学分片，未伪造成真实 Qwen BPE id。"
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
  const content = responseContentToText(detail);
  const usage = normalizeUsage(detail.usage);

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

function toolsToText(tools: unknown): string {
  if (!tools) return "";
  if (Array.isArray(tools) && tools.length === 0) return "";
  if (Array.isArray(tools) && tools.every((tool) => typeof tool === "string")) {
    return tools.map((tool) => `- ${tool}`).join("\n");
  }
  return stableJson(tools);
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
      tokens.push({
        id: null,
        idLabel: span.source === "newline" ? "\\n" : "demo",
        text: segment === "\n" ? "\\n" : segment,
        source: span.source,
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
  return model.startsWith("tiny-") ? "Qwen ChatML teaching view" : "Qwen ChatML adapter";
}

function splitVisibleSegments(text: string): string[] {
  return text.match(/\n|\s+|[\u4e00-\u9fff]|[A-Za-z0-9_]+|[^\s]/g) ?? [];
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
