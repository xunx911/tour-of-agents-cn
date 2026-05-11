"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  getApiKeys,
  setApiKeys,
  getProvider,
  setProvider,
  getModel,
  setModel,
  PROVIDER_CONFIGS,
  GROQ_MODELS,
  type LlmProvider,
  type ApiKeys,
} from "@/lib/settings/api-keys";
import { trackProviderSelected } from "@/lib/analytics/posthog";

const PROVIDERS: LlmProvider[] = ["tinyagents", "groq"];

function ApiKeyForm({ onClose }: { onClose: () => void }) {
  const [provider, setLocal] = useState<LlmProvider>(() => getProvider());
  const [keys, setKeys] = useState<ApiKeys>(() => getApiKeys());
  const [model, setLocalModel] = useState(() => getModel());

  const handleProviderSwitch = (p: LlmProvider) => {
    setLocal(p);
    setLocalModel(PROVIDER_CONFIGS[p].defaultModel);
  };

  const config = PROVIDER_CONFIGS[provider];
  const isFree = config.needsKey === false;
  const currentKey = keys[provider] || "";

  const save = () => {
    setProvider(provider);
    setApiKeys(keys);
    setModel(model || config.defaultModel);
    trackProviderSelected(provider);
    onClose();
  };

  const revokeKey = () => {
    setKeys({ ...keys, [provider]: "" });
  };

  const revokeAll = () => {
    setKeys({ tinyagents: "", groq: "" });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        {PROVIDERS.map((p) => {
          const hasKey = !!(keys[p]);
          return (
            <Button key={p} variant={provider === p ? "default" : "outline"} size="sm"
              className="flex-1 text-xs gap-1" onClick={() => handleProviderSwitch(p)}>
              {hasKey && <span className="text-emerald-400">&#x25cf;</span>}
              {PROVIDER_CONFIGS[p].label}
            </Button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">{config.hint}</p>

      {isFree && (
        <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 p-3">
          <p className="text-xs text-emerald-400">
            无需任何配置。所有课程都可以用模拟回答立即运行。
            想看真实模型回答时，可以切换到 Groq。
          </p>
        </div>
      )}

      {provider === "groq" && !currentKey && (
        <div className="rounded-md bg-blue-500/10 border border-blue-500/20 p-3 space-y-2">
          <p className="text-xs font-medium text-blue-400">Groq 提供免费额度，通常无需信用卡</p>
          <p className="text-[11px] text-muted-foreground">
            如需真实 LLM 回答，可以注册 Groq 并粘贴你的 API Key：
          </p>
          <p className="text-[11px] text-muted-foreground">
            1. 打开{" "}
            <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer"
              className="text-blue-400 underline">console.groq.com</a>{" "}并注册
          </p>
          <p className="text-[11px] text-muted-foreground">2. 创建 API Key，然后粘贴到下方</p>
        </div>
      )}

      {!isFree && (
        <>
          <div>
            <label className="text-sm font-medium mb-1 block">{config.label} API Key</label>
            <div className="flex gap-2">
              <input type="password" placeholder={`粘贴你的 ${config.label} Key`}
                value={currentKey} onChange={(e) => setKeys({ ...keys, [provider]: e.target.value })}
                className="flex-1 text-sm p-2 rounded-md border bg-background font-mono" />
              {currentKey && (
                <Button variant="ghost" size="sm" className="text-xs text-red-400 hover:text-red-300 shrink-0"
                  onClick={revokeKey}>移除</Button>
              )}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">模型</label>
            <select value={model || config.defaultModel} onChange={(e) => setLocalModel(e.target.value)}
              className="w-full text-sm p-2 rounded-md border bg-background font-mono appearance-none cursor-pointer">
              {GROQ_MODELS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </>
      )}

      <p className="text-[11px] text-muted-foreground bg-muted rounded-md p-2">
        {isFree
          ? "模拟 LLM 不需要 API Key，适合先跑通课程。"
          : "Key 只存放在你的浏览器本地，并直接发送给 Groq。"}
      </p>

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={revokeAll}>
          移除全部 Key
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={save}>保存</Button>
        </div>
      </div>
    </div>
  );
}

export function ApiKeyDialog({
  open, onOpenChange,
}: {
  open: boolean; onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>设置 LLM 提供方</DialogTitle>
          <DialogDescription>
            默认模拟模式可立即运行；需要真实模型回答时再填写 API Key。
          </DialogDescription>
        </DialogHeader>
        {open && <ApiKeyForm onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
