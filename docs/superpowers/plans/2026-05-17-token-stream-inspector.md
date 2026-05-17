# Token Stream Inspector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a professional token view to the existing Trace request/response detail panel without breaking lesson navigation, graph animation, or JSON inspection.

**Architecture:** Add a small token inspection library under `src/lib/tokens/` that separates chat-template serialization from tokenizer output. Add one LLM-aware Trace detail component that keeps the old JSON view for non-LLM entries and adds tabs for LLM request/response rows.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Testing Library, Tailwind CSS, `js-tiktoken` for public OpenAI visible-text tokenization.

---

### Task 1: Token Inspection Library

**Files:**
- Create: `src/lib/tokens/token-stream.ts`
- Test: `src/lib/tokens/token-stream.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Add dependency**

Run: `npm install js-tiktoken`

Expected: `package.json` and `package-lock.json` include `js-tiktoken`.

- [ ] **Step 2: Write failing tests**

Create `src/lib/tokens/token-stream.test.ts` with tests for:

```ts
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
      model: "tiny-free",
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
```

Run: `npm test -- src/lib/tokens/token-stream.test.ts`

Expected: FAIL because `src/lib/tokens/token-stream.ts` does not exist.

- [ ] **Step 3: Implement token inspection**

Create `src/lib/tokens/token-stream.ts` with:

```ts
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
```

Then add `serializeQwenChatTemplate`, `inspectLlmRequestTokens`, and `inspectLlmResponseTokens`. Qwen/course-demo mode must use `<|im_start|>` and `<|im_end|>` as real control tokens. OpenAI mode must use `js-tiktoken` public encodings for visible text only and must return a limited-state notice for full internal chat serialization.

- [ ] **Step 4: Verify tests pass**

Run: `npm test -- src/lib/tokens/token-stream.test.ts`

Expected: PASS.

### Task 2: LLM Trace Detail Component

**Files:**
- Create: `src/components/lesson/llm-trace-detail.tsx`
- Test: `src/components/lesson/llm-trace-detail.test.tsx`

- [ ] **Step 1: Write failing component tests**

Create `src/components/lesson/llm-trace-detail.test.tsx` with tests for:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LlmTraceDetail } from "./llm-trace-detail";

describe("LlmTraceDetail", () => {
  it("renders request JSON, serialized text, and continuous token tabs", () => {
    render(
      <LlmTraceDetail
        traceType="llm_request"
        data={{
          model: "tiny-free",
          messages: [{ role: "user", content: "你好" }],
          tools: ["search"],
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "详情" }));
    expect(screen.getByRole("button", { name: "请求 JSON" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "序列化文本" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Token 序列" }));
    expect(screen.getByText("<|im_start|>")).toBeInTheDocument();
    expect(screen.getByText(/连续 token 流/)).toBeInTheDocument();
  });

  it("renders response output token tab with usage", () => {
    render(
      <LlmTraceDetail
        traceType="llm_response"
        data={{
          content: "你好",
          usage: { prompt_tokens: 10, completion_tokens: 2 },
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "详情" }));
    fireEvent.click(screen.getByRole("button", { name: "输出 Token" }));
    expect(screen.getByText(/completion_tokens: 2/)).toBeInTheDocument();
  });
});
```

Run: `npm test -- src/components/lesson/llm-trace-detail.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 2: Implement component**

Create `LlmTraceDetail` with the same collapsed-by-default behavior as `MonitorJsonBlock`. Once open:

- request rows show tabs `请求 JSON`, `序列化文本`, `Token 序列`
- response rows show tabs `响应 JSON`, `输出 Token`
- token chips wrap in one continuous stream
- warnings explain limited/unavailable tokenizer states
- source colors are subtle and do not create grouped columns

- [ ] **Step 3: Verify component tests pass**

Run: `npm test -- src/components/lesson/llm-trace-detail.test.tsx`

Expected: PASS.

### Task 3: Wire Into Existing Trace

**Files:**
- Modify: `src/components/lesson/trace-log.tsx`
- Modify: `src/lib/pyodide/bootstrap.ts`
- Test: `src/hooks/use-monitor.test.ts`

- [ ] **Step 1: Preserve trace entry mapping**

Update `src/components/lesson/trace-log.tsx` so:

```tsx
{entry.detail && (
  entry.traceType === "llm_request" || entry.traceType === "llm_response"
    ? <LlmTraceDetail traceType={entry.traceType} data={entry.detail} />
    : <MonitorJsonBlock label="详情" data={entry.detail} />
)}
```

- [ ] **Step 2: Trace full tool definitions**

Update `src/lib/pyodide/bootstrap.ts` so LLM request trace data keeps current `tools` names and also includes:

```python
"tool_definitions": req_body.get("tools", []),
```

This gives the token view enough raw data without breaking existing uses of `tools`.

- [ ] **Step 3: Verify existing monitor tests still pass**

Run: `npm test -- src/hooks/use-monitor.test.ts src/hooks/turn-pipeline.test.ts`

Expected: PASS.

### Task 4: Full Validation

**Files:**
- Modify only if validation reveals issues.

- [ ] **Step 1: Run focused tests**

Run:

```bash
npm test -- src/lib/tokens/token-stream.test.ts src/components/lesson/llm-trace-detail.test.tsx src/hooks/use-monitor.test.ts src/hooks/turn-pipeline.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run full unit tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 3: Run lint**

Run: `npm run lint`

Expected: no errors. Existing unrelated warnings are acceptable only if they are already present.

- [ ] **Step 4: Run production build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 5: Browser validation**

Start dev server: `npm run dev -- --hostname 127.0.0.1 --port 3000`

Validate:

- app loads at `http://127.0.0.1:3000/lesson/tools`
- mock mode can run the lesson
- `→ Request` opens and shows `请求 JSON`, `序列化文本`, `Token 序列`
- `Token 序列` displays one continuous token flow with special tokens in the course demo path
- `← Response` opens and shows `响应 JSON`, `输出 Token`
- switching tabs does not disrupt graph animation, Trace scroll, or lesson controls
- narrow viewport does not overflow or overlap

Expected: PASS with screenshots and no relevant console errors.

### Task 5: Commit and Push

**Files:**
- Stage only files changed for this feature.

- [ ] **Step 1: Review diff**

Run: `git diff -- src package.json package-lock.json docs/superpowers/plans/2026-05-17-token-stream-inspector.md`

Expected: diff only contains token feature implementation and this plan.

- [ ] **Step 2: Commit**

Run:

```bash
git add package.json package-lock.json src/lib/tokens/token-stream.ts src/lib/tokens/token-stream.test.ts src/components/lesson/llm-trace-detail.tsx src/components/lesson/llm-trace-detail.test.tsx src/components/lesson/trace-log.tsx src/lib/pyodide/bootstrap.ts docs/superpowers/plans/2026-05-17-token-stream-inspector.md
git commit -m "Add token stream trace view"
```

Expected: commit succeeds.

- [ ] **Step 3: Push**

Run: `git push origin HEAD:main`

Expected: push succeeds.
