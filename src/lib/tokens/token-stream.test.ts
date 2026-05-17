import { describe, expect, it } from "vitest";
import {
  inspectLlmRequestTokens,
  inspectLlmResponseTokens,
  serializeQwenChatTemplate,
} from "./token-stream";

describe("token stream inspection", () => {
  it("serializes Qwen-style chat as one continuous stream with real control tokens", () => {
    const serialized = serializeQwenChatTemplate({
      messages: [{ role: "user", content: "你好" }],
      addGenerationPrompt: true,
    });

    expect(serialized.text).toBe("<|im_start|>user\n你好<|im_end|>\n<|im_start|>assistant\n");
    expect(serialized.spans.map((span) => span.label)).toContain("<|im_start|>");
    expect(serialized.spans.map((span) => span.label)).toContain("<|im_end|>");
  });

  it("builds a continuous token sequence for the course demo model", () => {
    const result = inspectLlmRequestTokens({
      model: "tiny-mock-v1",
      messages: [{ role: "user", content: "你好" }],
      tools: ["search"],
    });

    expect(result.kind).toBe("available");
    expect(result.tokens.map((token) => token.text)).toContain("<|im_start|>");
    expect(result.tokens.map((token) => token.text)).toContain("<|im_end|>");
    expect(result.tokens[0].source).toBe("special");
  });

  it("does not invent provider-internal special tokens for OpenAI models", () => {
    const result = inspectLlmRequestTokens({
      model: "gpt-4o",
      messages: [{ role: "user", content: "hello" }],
    });

    expect(result.kind).toBe("limited");
    expect(result.tokens.map((token) => token.text)).not.toContain("<assistant_turn>");
    expect(result.notice).toMatch(/内部 chat 序列化不可用/);
  });

  it("returns an unavailable state for unknown models", () => {
    const result = inspectLlmRequestTokens({
      model: "unknown-model",
      messages: [{ role: "user", content: "hello" }],
    });

    expect(result.kind).toBe("unavailable");
    expect(result.tokens).toEqual([]);
  });

  it("tokenizes response visible text without adding special tokens", () => {
    const result = inspectLlmResponseTokens({
      content: "你好",
      usage: { prompt_tokens: 10, completion_tokens: 2 },
    });

    expect(result.kind).toBe("available");
    expect(result.tokens.length).toBeGreaterThan(0);
    expect(result.tokens.map((token) => token.text)).not.toContain("<|im_start|>");
    expect(result.usage?.completion_tokens).toBe(2);
  });
});
