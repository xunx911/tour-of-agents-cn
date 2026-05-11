import { describe, expect, it } from "vitest";
import { matchResponse } from "./mock-matcher";

describe("matchResponse", () => {
  it("parses Chinese remember-then-add input without storing the next task as memory", () => {
    const result = matchResponse(
      [{ role: "user", content: "记住 name=Alice，然后计算 10 加 5" }],
      ["remember", "add"]
    );

    expect(result).toEqual({
      type: "tool_call",
      name: "remember",
      arguments: { key: "name", value: "Alice" },
    });
  });

  it("keeps self-scheduling mock tasks in Chinese", () => {
    const result = matchResponse(
      [{ role: "user", content: "研究 AI 安全，并安排后续总结" }],
      ["schedule_followup"]
    );

    expect(result).toEqual({
      type: "tool_call",
      name: "schedule_followup",
      arguments: { task: "研究：研究 AI 安全，并安排后续总结" },
    });
  });
});
