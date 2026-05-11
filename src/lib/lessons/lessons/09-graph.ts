import type { GraphDefinition } from "@/lib/graph/types";

export const lesson09Graph: GraphDefinition = {
  direction: "TB",
  nodes: [
    { id: "input", label: "用户输入", icon: "⟩", phase: "input" },
    { id: "igate", label: "输入策略", shape: "diamond", phase: "policy" },
    { id: "reject", label: "拒绝", phase: "policy" },
    { id: "loop", label: "Agent 循环", phase: "llm" },
    { id: "llm", label: "LLM + 记忆", icon: "⟡", phase: "llm" },
    { id: "tc", label: "tool_calls?", shape: "diamond", phase: "decide" },
    { id: "dispatch", label: "工具 + 状态", icon: "⚙", phase: "tool" },
    { id: "ogate", label: "输出策略", shape: "diamond", phase: "policy" },
    { id: "redact", label: "隐藏", phase: "policy" },
    { id: "queue", label: "还有任务？", shape: "diamond", phase: "output" },
    { id: "done", label: "完成", icon: "◆", phase: "output" },
  ],
  edges: [
    { id: "input-igate", source: "input", target: "igate" },
    { id: "igate-reject", source: "igate", target: "reject", label: "拦截" },
    { id: "igate-loop", source: "igate", target: "loop", label: "通过" },
    { id: "loop-llm", source: "loop", target: "llm" },
    { id: "llm-tc", source: "llm", target: "tc" },
    { id: "tc-dispatch", source: "tc", target: "dispatch", label: "是" },
    { id: "dispatch-loop", source: "dispatch", target: "loop" },
    { id: "tc-ogate", source: "tc", target: "ogate", label: "否" },
    { id: "ogate-redact", source: "ogate", target: "redact", label: "拦截" },
    { id: "ogate-queue", source: "ogate", target: "queue", label: "通过" },
    { id: "queue-input", source: "queue", target: "input", label: "是" },
    { id: "queue-done", source: "queue", target: "done", label: "否" },
  ],
};
