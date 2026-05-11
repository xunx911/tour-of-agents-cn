"use client";

import { MonitorEntry } from "@/hooks/use-monitor";

const roleConfig: Record<
  MonitorEntry["role"],
  { color: string; icon: string; label: string }
> = {
  user: {
    color: "text-blue-400",
    icon: "⟩",
    label: "用户",
  },
  agent: {
    color: "text-emerald-400",
    icon: "◆",
    label: "Agent",
  },
  tool: {
    color: "text-purple-400",
    icon: "⚙",
    label: "工具",
  },
  llm: {
    color: "text-amber-400",
    icon: "⟡",
    label: "LLM",
  },
  system: {
    color: "text-muted-foreground",
    icon: "●",
    label: "系统",
  },
};

interface MonitorEntryRowProps {
  entry: MonitorEntry;
}

export function MonitorEntryRow({ entry }: MonitorEntryRowProps) {
  const { color, icon, label } = roleConfig[entry.role];

  return (
    <div className="font-mono text-xs leading-relaxed px-3 py-0.5 flex items-start gap-1.5">
      <span className={`${color} shrink-0 select-none`}>
        {icon}
      </span>
      <span className={`${color} shrink-0 font-semibold`}>
        {label}
      </span>
      <span className="text-foreground/80 break-all">{entry.content}</span>
    </div>
  );
}
