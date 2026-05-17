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
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "详情" }));

    expect(screen.getByRole("button", { name: "请求 JSON" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "序列化文本" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Token 序列" }));

    expect(screen.getAllByText("<|im_start|>").length).toBeGreaterThan(0);
    expect(screen.getByText(/连续 token 流/)).toBeInTheDocument();
    expect(screen.queryByText("demo")).not.toBeInTheDocument();
  });

  it("renders response output token tab with usage", () => {
    render(
      <LlmTraceDetail
        traceType="llm_response"
        data={{
          content: "你好",
          usage: { prompt_tokens: 10, completion_tokens: 2 },
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "详情" }));
    fireEvent.click(screen.getByRole("button", { name: "输出 Token" }));

    expect(screen.getByText(/completion_tokens: 2/)).toBeInTheDocument();
  });
});
