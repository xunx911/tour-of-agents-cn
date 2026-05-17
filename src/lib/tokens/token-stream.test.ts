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

    expect(serialized.text).toBe(
      "<|im_start|>system\nYou are Qwen, created by Alibaba Cloud.\nYou are a helpful assistant.<|im_end|>\n<|im_start|>user\n你好<|im_end|>\n<|im_start|>assistant\n",
    );
    expect(serialized.spans.map((span) => span.label)).toContain("<|im_start|>");
    expect(serialized.spans.map((span) => span.label)).toContain("<|im_end|>");
  });

  it("builds a continuous token sequence for the course model without demo labels", () => {
    const result = inspectLlmRequestTokens({
      model: "tiny-mock-v1",
      messages: [{ role: "user", content: "你好" }],
      tools: ["search"],
    });

    expect(result.kind).toBe("available");
    expect(result.tokens.map((token) => token.text)).toContain("<|im_start|>");
    expect(result.tokens.map((token) => token.text)).toContain("<|im_end|>");
    expect(result.tokens.map((token) => token.idLabel)).not.toContain("demo");
    expect(result.tokenizer).not.toMatch(/demo|teaching/i);
    expect(result.tokens[0].source).toBe("special");
  });

  it("serializes Qwen tool definitions with the official tools and tool_call markers", () => {
    const result = inspectLlmRequestTokens({
      model: "tiny-mock-v1",
      messages: [{ role: "user", content: "计算 10 加 5" }],
      tools: [
        {
          type: "function",
          function: {
            name: "add",
            description: "Add two numbers",
            parameters: {
              type: "object",
              properties: {
                a: { type: "number" },
                b: { type: "number" },
              },
            },
          },
        },
      ],
    });

    expect(result.serialized?.text).toContain("<tools>\n");
    expect(result.serialized?.text).toContain("</tools>");
    expect(result.serialized?.text).toContain("<tool_call>");
    expect(result.serialized?.text).toContain("</tool_call><|im_end|>");
    expect(result.serialized?.text).not.toContain("可用工具(JSON)");
    expect(result.tokens).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ text: "<tool_call>", idLabel: "151657" }),
        expect.objectContaining({ text: "</tool_call>", idLabel: "151658" }),
      ]),
    );
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

  it("serializes Qwen response visible text as an assistant message", () => {
    const result = inspectLlmResponseTokens({
      model: "tiny-mock-v1",
      content: "你好",
      usage: { prompt_tokens: 10, completion_tokens: 2 },
    });

    expect(result.kind).toBe("available");
    expect(result.serialized?.text).toBe("<|im_start|>assistant\n你好<|im_end|>\n");
    expect(result.tokens.length).toBeGreaterThan(0);
    expect(result.tokens.map((token) => token.text)).toContain("<|im_start|>");
    expect(result.usage?.completion_tokens).toBe(2);
  });

  it("serializes Qwen response tool calls with official tool_call markers", () => {
    const result = inspectLlmResponseTokens({
      model: "tiny-mock-v1",
      tool_calls: [{ name: "add", args: { a: 10, b: 5 } }],
    });

    expect(result.kind).toBe("available");
    expect(result.serialized?.text).toContain("<tool_call>\n");
    expect(result.serialized?.text).toContain('{"name": "add", "arguments": {"a":10,"b":5}}');
    expect(result.serialized?.text).toContain("\n</tool_call><|im_end|>");
    expect(result.tokens).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ text: "<tool_call>", idLabel: "151657" }),
        expect.objectContaining({ text: "</tool_call>", idLabel: "151658" }),
      ]),
    );
  });
});
