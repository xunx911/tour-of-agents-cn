"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  inspectLlmRequestTokens,
  inspectLlmResponseTokens,
  type TokenChip,
  type TokenInspection,
  type TokenSource,
} from "@/lib/tokens/token-stream";

type LlmTraceType = "llm_request" | "llm_response";
type RequestTab = "json" | "serialized" | "tokens";
type ResponseTab = "json" | "serialized" | "tokens";

interface LlmTraceDetailProps {
  traceType: LlmTraceType;
  data: Record<string, unknown>;
}

export function LlmTraceDetail({ traceType, data }: LlmTraceDetailProps) {
  const [open, setOpen] = useState(false);
  const [requestTab, setRequestTab] = useState<RequestTab>("json");
  const [responseTab, setResponseTab] = useState<ResponseTab>("json");

  const inspection = useMemo(
    () => traceType === "llm_request"
      ? inspectLlmRequestTokens(data)
      : inspectLlmResponseTokens(data),
    [data, traceType],
  );

  const isRequest = traceType === "llm_request";
  const activeTab = isRequest ? requestTab : responseTab;

  return (
    <div className="font-mono text-xs px-3 py-0.5 ml-5" data-testid="llm-trace-detail">
      <button
        onClick={() => setOpen(!open)}
        data-testid="llm-trace-detail-toggle"
        className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
      >
        <span aria-hidden="true" className="text-[10px]">{open ? "▾" : "▸"}</span>
        <span>详情</span>
      </button>

      {open && (
        <div className="mt-1 ml-2 rounded-md bg-muted/70 border border-border/50 overflow-hidden">
          <div className="flex flex-wrap items-center gap-1 border-b border-border/50 bg-background/55 px-2 py-1.5">
            {isRequest ? (
              <>
                <TraceTab active={requestTab === "json"} onClick={() => setRequestTab("json")}>
                  请求 JSON
                </TraceTab>
                <TraceTab
                  active={requestTab === "serialized"}
                  onClick={() => setRequestTab("serialized")}
                >
                  序列化文本
                </TraceTab>
                <TraceTab active={requestTab === "tokens"} onClick={() => setRequestTab("tokens")}>
                  Token 序列
                </TraceTab>
              </>
            ) : (
              <>
                <TraceTab active={responseTab === "json"} onClick={() => setResponseTab("json")}>
                  响应 JSON
                </TraceTab>
                <TraceTab
                  active={responseTab === "serialized"}
                  onClick={() => setResponseTab("serialized")}
                >
                  序列化文本
                </TraceTab>
                <TraceTab active={responseTab === "tokens"} onClick={() => setResponseTab("tokens")}>
                  输出 Token
                </TraceTab>
              </>
            )}
          </div>

          {activeTab === "json" && <JsonPanel data={data} />}
          {activeTab === "serialized" && <SerializedPanel inspection={inspection} />}
          {activeTab === "tokens" && <TokenPanel inspection={inspection} />}
        </div>
      )}
    </div>
  );
}

function TraceTab({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-2 py-1 text-[10px] leading-none transition-colors",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function JsonPanel({ data }: { data: Record<string, unknown> }) {
  return (
    <pre className="max-h-80 overflow-auto p-3 text-[11px] leading-relaxed whitespace-pre-wrap break-all">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function SerializedPanel({ inspection }: { inspection: TokenInspection }) {
  if (!inspection.serialized) {
    return (
      <EmptyState
        title="序列化文本不可用"
        notice={inspection.notice}
      />
    );
  }

  return (
    <div className="p-3 space-y-2">
      <TraceNotice inspection={inspection} />
      <pre className="max-h-72 overflow-auto rounded-md border border-border/50 bg-background/70 p-3 text-[11px] leading-relaxed whitespace-pre-wrap break-all">
        {inspection.serialized.text}
      </pre>
    </div>
  );
}

function TokenPanel({ inspection }: { inspection: TokenInspection }) {
  if (inspection.tokens.length === 0) {
    return <EmptyState title={inspection.title} notice={inspection.notice} />;
  }

  return (
    <div className="p-3 space-y-2">
      <TraceNotice inspection={inspection} />
      <div className="flex flex-wrap gap-1.5 max-h-80 overflow-auto rounded-md border border-border/50 bg-background/55 p-2">
        {inspection.tokens.map((token, index) => (
          <TokenChipView key={`${token.text}-${index}`} token={token} />
        ))}
      </div>
      <TokenLegend />
    </div>
  );
}

function TraceNotice({ inspection }: { inspection: TokenInspection }) {
  return (
    <div className="space-y-1 text-[10px] leading-relaxed text-muted-foreground">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-semibold text-foreground">{inspection.title}</span>
        <span>tokenizer: {inspection.tokenizer}</span>
        <span>状态: {formatKind(inspection.kind)}</span>
        {formatUsage(inspection.usage) && <span>{formatUsage(inspection.usage)}</span>}
      </div>
      <p>{inspection.notice}</p>
    </div>
  );
}

function TokenChipView({ token }: { token: TokenChip }) {
  return (
    <span
      title={[token.label, token.idLabel].filter(Boolean).join(" · ")}
      aria-label={[token.label, token.text, token.idLabel].filter(Boolean).join(" ")}
      className={cn(
        "inline-flex min-w-0 items-center gap-1 rounded-md border px-1.5 py-1 text-[10px] leading-none",
        "max-w-full bg-background/80 shadow-[0_1px_0_rgba(0,0,0,0.03)]",
        sourceClassName(token.source),
      )}
    >
      {token.idLabel && (
        <span className="shrink-0 text-[9px] opacity-65">{token.idLabel}</span>
      )}
      <span className="truncate">{token.text}</span>
    </span>
  );
}

function EmptyState({ title, notice }: { title: string; notice: string }) {
  return (
    <div className="p-3 text-[11px] leading-relaxed text-muted-foreground">
      <p className="font-semibold text-foreground">{title}</p>
      <p className="mt-1">{notice}</p>
    </div>
  );
}

function TokenLegend() {
  const items: Array<{ source: TokenSource; label: string }> = [
    { source: "special", label: "special/control" },
    { source: "role", label: "role" },
    { source: "user", label: "user text" },
    { source: "assistant", label: "assistant text" },
    { source: "tool", label: "tool data" },
  ];

  return (
    <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
      {items.map((item) => (
        <span key={item.source} className="inline-flex items-center gap-1">
          <span className={cn("h-2 w-2 rounded-sm border", sourceClassName(item.source))} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function sourceClassName(source: TokenSource): string {
  switch (source) {
    case "special":
      return "border-amber-300/70 bg-amber-100/70 text-amber-950";
    case "role":
      return "border-slate-300/70 bg-slate-100/80 text-slate-900";
    case "system":
      return "border-purple-300/60 bg-purple-100/55 text-purple-950";
    case "user":
      return "border-sky-300/60 bg-sky-100/55 text-sky-950";
    case "assistant":
      return "border-emerald-300/60 bg-emerald-100/55 text-emerald-950";
    case "tool":
    case "tool_result":
      return "border-orange-300/60 bg-orange-100/55 text-orange-950";
    case "newline":
      return "border-border bg-muted text-muted-foreground";
    default:
      return "border-border bg-background text-foreground";
  }
}

function formatUsage(usage: TokenInspection["usage"]): string {
  if (!usage) return "";
  const parts = [
    usage.prompt_tokens !== undefined ? `prompt_tokens: ${usage.prompt_tokens}` : "",
    usage.completion_tokens !== undefined ? `completion_tokens: ${usage.completion_tokens}` : "",
    usage.total_tokens !== undefined ? `total_tokens: ${usage.total_tokens}` : "",
  ].filter(Boolean);
  return parts.join(" · ");
}

function formatKind(kind: TokenInspection["kind"]): string {
  switch (kind) {
    case "available":
      return "可用";
    case "limited":
      return "受限";
    case "unavailable":
      return "不可用";
    case "error":
      return "出错";
  }
}
