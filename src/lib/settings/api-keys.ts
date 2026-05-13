const STORAGE_KEY = "tour-of-agents-api-keys";
const PROVIDER_KEY = "tour-of-agents-provider";
const MODEL_KEY = "tour-of-agents-model";
const COMPATIBLE_BASE_URL_KEY = "tour-of-agents-compatible-base-url";

export type LlmProvider = "tinyagents" | "openai-compatible";

export interface ProviderConfig {
  label: string;
  hint: string;
  baseUrl: string;
  defaultModel: string;
  needsKey?: boolean;
}

export const DEFAULT_COMPATIBLE_BASE_URL = "https://api.openai.com/v1";

export const PROVIDER_CONFIGS: Record<LlmProvider, ProviderConfig> = {
  tinyagents: {
    label: "模拟 LLM",
    hint: "免费，无需 API Key。所有课程都使用脚本化模拟回答。",
    baseUrl: "/api",
    defaultModel: "tiny-mock-v1",
    needsKey: false,
  },
  "openai-compatible": {
    label: "OpenAI 兼容接口",
    hint: "可选真实模型。填写任意 OpenAI-compatible Base URL、API Key 和模型名。",
    baseUrl: DEFAULT_COMPATIBLE_BASE_URL,
    defaultModel: "gpt-4o-mini",
  },
};

export interface ApiKeys {
  tinyagents?: string;
  "openai-compatible"?: string;
  /** Legacy key kept only for localStorage migration. */
  groq?: string;
}

export function getApiKeys(): ApiKeys {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) as ApiKeys : {};
    if (parsed.groq && !parsed["openai-compatible"]) {
      return { ...parsed, "openai-compatible": parsed.groq };
    }
    return parsed;
  } catch {
    return {};
  }
}

export function setApiKeys(keys: ApiKeys): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

export function hasAnyKey(): boolean {
  if (getProvider() === "tinyagents") return true;
  const keys = getApiKeys();
  return !!keys["openai-compatible"];
}

export function getProvider(): LlmProvider {
  if (typeof window === "undefined") return "tinyagents";
  const stored = localStorage.getItem(PROVIDER_KEY);
  if (stored === "openai" || stored === "groq") return "openai-compatible";
  if (stored === "anthropic") return "tinyagents";
  if (stored === "tinyagents" || stored === "openai-compatible") return stored;
  return "tinyagents";
}

export function setProvider(provider: LlmProvider): void {
  localStorage.setItem(PROVIDER_KEY, provider);
}

export function getModel(): string {
  if (typeof window === "undefined")
    return PROVIDER_CONFIGS.tinyagents.defaultModel;
  const stored = localStorage.getItem(MODEL_KEY);
  if (stored) return stored;
  return PROVIDER_CONFIGS[getProvider()].defaultModel;
}

export function setModel(model: string): void {
  localStorage.setItem(MODEL_KEY, model);
}

export function getActiveKey(): string | undefined {
  const provider = getProvider();
  if (provider === "tinyagents") return "tiny-free";
  return getApiKeys()["openai-compatible"];
}

export function getCompatibleBaseUrl(): string {
  if (typeof window === "undefined") return DEFAULT_COMPATIBLE_BASE_URL;
  return localStorage.getItem(COMPATIBLE_BASE_URL_KEY) || DEFAULT_COMPATIBLE_BASE_URL;
}

export function setCompatibleBaseUrl(baseUrl: string): void {
  localStorage.setItem(COMPATIBLE_BASE_URL_KEY, normalizeBaseUrl(baseUrl));
}

export function getLlmConfig() {
  const provider = getProvider();
  const config = PROVIDER_CONFIGS[provider];
  return {
    apiKey: getActiveKey() || "",
    baseUrl: provider === "openai-compatible" ? getCompatibleBaseUrl() : config.baseUrl,
    model: getModel(),
  };
}

/** Fire a minimal chat completion to verify the key + model work. */
export async function testConnection(
  baseUrl: string, apiKey: string, model: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`${normalizeBaseUrl(baseUrl)}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "用三个字打招呼。" }],
        max_tokens: 20,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      const msg = tryParseError(body) || `${res.status} ${res.statusText}`;
      return { ok: false, message: msg };
    }
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content ?? "";
    return { ok: true, message: reply.slice(0, 60) };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

function tryParseError(body: string): string | null {
  try {
    const j = JSON.parse(body);
    return j.error?.message || j.error?.code || null;
  } catch { return null; }
}

function normalizeBaseUrl(baseUrl: string): string {
  return (baseUrl.trim() || DEFAULT_COMPATIBLE_BASE_URL).replace(/\/+$/, "");
}
