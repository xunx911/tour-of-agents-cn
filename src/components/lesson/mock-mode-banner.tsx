"use client";

import { useSyncExternalStore } from "react";
import { getProvider, PROVIDER_CONFIGS, subscribeLlmSettingsChange } from "@/lib/settings/api-keys";

function checkMock() {
  return PROVIDER_CONFIGS[getProvider()].needsKey === false;
}

export function MockModeBanner() {
  const isMock = useSyncExternalStore(
    subscribeLlmSettingsChange,
    checkMock,
    () => true,
  );

  if (!isMock) return null;

  return (
    <span className="text-[10px] text-amber-400/80 bg-amber-400/10 border border-amber-400/20 rounded px-1.5 py-0.5">
      模拟模式：回答来自预设脚本。{" "}
      <span className="text-amber-400/60">切换到 OpenAI 兼容接口可使用真实 LLM。</span>
    </span>
  );
}
