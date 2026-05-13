import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  DEFAULT_COMPATIBLE_BASE_URL,
  getApiKeys,
  setApiKeys,
  hasAnyKey,
  setProvider,
  getProvider,
  getCompatibleBaseUrl,
  setCompatibleBaseUrl,
} from "./api-keys";

describe("api-keys", () => {
  const store: Record<string, string> = {};

  beforeEach(() => {
    for (const key of Object.keys(store)) delete store[key];

    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, val: string) => {
        store[key] = val;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
    });
  });

  it("returns empty object when nothing stored", () => {
    expect(getApiKeys()).toEqual({});
  });

  it("stores and retrieves keys", () => {
    setApiKeys({ "openai-compatible": "sk-test-123" });
    const keys = getApiKeys();
    expect(keys["openai-compatible"]).toBe("sk-test-123");
  });

  it("hasAnyKey returns true when tinyagents (default)", () => {
    expect(hasAnyKey()).toBe(true);
  });

  it("hasAnyKey returns false when non-free provider with no key", () => {
    setProvider("openai-compatible");
    expect(hasAnyKey()).toBe(false);
  });

  it("hasAnyKey returns true with OpenAI-compatible key", () => {
    setApiKeys({ "openai-compatible": "sk-test" });
    setProvider("openai-compatible");
    expect(hasAnyKey()).toBe(true);
  });

  it("overwrites previous keys", () => {
    setApiKeys({ "openai-compatible": "old" });
    setApiKeys({ "openai-compatible": "new" });
    expect(getApiKeys()["openai-compatible"]).toBe("new");
  });

  it("migrates old openai provider to OpenAI-compatible", () => {
    store["tour-of-agents-provider"] = "openai";
    expect(getProvider()).toBe("openai-compatible");
  });

  it("migrates anthropic provider to tinyagents", () => {
    store["tour-of-agents-provider"] = "anthropic";
    expect(getProvider()).toBe("tinyagents");
  });

  it("migrates legacy provider key to OpenAI-compatible key", () => {
    store["tour-of-agents-api-keys"] = JSON.stringify({ groq: "legacy-key" });
    expect(getApiKeys()["openai-compatible"]).toBe("legacy-key");
  });

  it("stores and normalizes OpenAI-compatible base URL", () => {
    expect(getCompatibleBaseUrl()).toBe(DEFAULT_COMPATIBLE_BASE_URL);
    setCompatibleBaseUrl("https://example.com/v1///");
    expect(getCompatibleBaseUrl()).toBe("https://example.com/v1");
  });
});
