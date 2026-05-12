import { describe, expect, it } from "vitest";
import { matchResponse } from "./mock-matcher";

describe("matchResponse", () => {
  it("answers Chinese memory lookup instead of saving question words as the name", () => {
    const result = matchResponse(
      [
        { role: "system", content: 'Tools available. Memory: {"name":"Alice"}. Be concise.' },
        { role: "user", content: "我的名字是什么？" },
      ],
      ["remember", "add"]
    );

    expect(result).toEqual({
      type: "text",
      content: "你的名字是 Alice。",
    });
  });

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

  it("starts plan-and-execute tasks by creating a plan", () => {
    const result = matchResponse(
      [{ role: "user", content: "帮我规划学习 Agent" }],
      ["make_plan", "execute_step"]
    );

    expect(result).toEqual({
      type: "tool_call",
      name: "make_plan",
      arguments: { task: "帮我规划学习 Agent" },
    });
  });

  it("executes the next unfinished plan step after a plan is created", () => {
    const result = matchResponse(
      [
        { role: "user", content: "帮我规划学习 Agent" },
        {
          role: "assistant",
          tool_calls: [
            { function: { name: "make_plan", arguments: '{"task":"帮我规划学习 Agent"}' } },
          ],
        },
        { role: "tool", content: '["明确目标：帮我规划学习 Agent","拆成 3 个步骤","执行并检查结果"]' },
      ],
      ["make_plan", "execute_step"]
    );

    expect(result).toEqual({
      type: "tool_call",
      name: "execute_step",
      arguments: { step: "明确目标：帮我规划学习 Agent" },
    });
  });

  it("summarizes after every planned step has executed", () => {
    const plan = ["明确目标：帮我规划学习 Agent", "拆成 3 个步骤", "执行并检查结果"];
    const result = matchResponse(
      [
        { role: "user", content: "帮我规划学习 Agent" },
        {
          role: "assistant",
          tool_calls: [
            { function: { name: "make_plan", arguments: '{"task":"帮我规划学习 Agent"}' } },
          ],
        },
        { role: "tool", content: JSON.stringify(plan) },
        ...plan.flatMap((step) => [
          { role: "assistant", tool_calls: [{ function: { name: "execute_step", arguments: JSON.stringify({ step }) } }] },
          { role: "tool", content: `完成：${step}` },
        ]),
      ],
      ["make_plan", "execute_step"]
    );

    expect(result).toEqual({
      type: "text",
      content: "计划已执行完成：3 个步骤都已完成。",
    });
  });
});
