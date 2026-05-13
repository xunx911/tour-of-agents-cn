import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { setProvider } from "@/lib/settings/api-keys";
import { InputBar } from "./input-bar";

describe("InputBar", () => {
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

  it("refreshes from setup prompt to free-text input when the provider changes", () => {
    render(
      <InputBar
        inputConfig={{
          placeholder: "给 Agent 输入一句话...",
          variable: "USER_INPUT",
          samples: ["什么是 AI Agent？"],
        }}
        onSend={vi.fn()}
        onClear={vi.fn()}
        entryCount={0}
      />
    );

    expect(screen.getByRole("button", { name: /配置 OpenAI 兼容接口/ })).toBeInTheDocument();

    act(() => setProvider("openai-compatible"));

    expect(screen.getByPlaceholderText("给 Agent 输入一句话...")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /配置 OpenAI 兼容接口/ })).not.toBeInTheDocument();
  });
});
