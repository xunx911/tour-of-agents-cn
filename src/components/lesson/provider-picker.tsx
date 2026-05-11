"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  getProvider,
  setProvider,
  getApiKeys,
  setApiKeys,
  getModel,
  setModel,
  testConnection,
  hasAnyKey,
  PROVIDER_CONFIGS,
  GROQ_MODELS,
  type LlmProvider,
} from "@/lib/settings/api-keys";
import { trackProviderSelected } from "@/lib/analytics/posthog";

const PROVIDERS: LlmProvider[] = ["tinyagents", "groq"];

export function ProviderPicker() {
  const [mounted, setMounted] = useState(false);
  const [provider, setLocal] = useState<LlmProvider>("tinyagents");
  const [keys, setKeys] = useState({ tinyagents: "", groq: "" });
  const [model, setLocalModel] = useState("");
  const [open, setOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setLocal(getProvider());
    setLocalModel(getModel());
    const stored = getApiKeys();
    setKeys({ tinyagents: "", groq: stored.groq || "" });
    setMounted(true);
    if (!hasAnyKey() && getProvider() !== "tinyagents") setOpen(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const handleProviderSwitch = (p: LlmProvider) => {
    setLocal(p);
    setLocalModel(PROVIDER_CONFIGS[p].defaultModel);
  };

  const handleSave = () => {
    setProvider(provider);
    setApiKeys(keys);
    setModel(model);
    trackProviderSelected(provider);
    setOpen(false);
  };

  const handleClearKey = () => {
    const updated = { ...keys, [provider]: "" };
    setKeys(updated);
    setApiKeys(updated);
  };

  const handleTest = async () => {
    const activeModel = model || PROVIDER_CONFIGS[provider].defaultModel;
    setTesting(true);
    setTestResult(null);
    const result = await testConnection(PROVIDER_CONFIGS[provider].baseUrl, keys[provider], activeModel);
    setTesting(false);
    setTestResult(result);
  };

  const config = PROVIDER_CONFIGS[provider];
  const isFree = config.needsKey === false;
  const hasKey = isFree || !!keys[provider];

  return (
    <div className="relative">
      <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setOpen(!open)}>
        {mounted ? (isFree ? `${config.label}（免费）` : hasKey ? config.label : "设置 API Key") : "..."}
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-80 rounded-md border bg-popover p-3 shadow-lg space-y-3">
          <div className="flex gap-1">
            {PROVIDERS.map((p) => (
              <Button key={p} variant={provider === p ? "default" : "outline"} size="sm"
                className="text-xs flex-1 h-7" onClick={() => handleProviderSwitch(p)}>
                {PROVIDER_CONFIGS[p].label}
              </Button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">{config.hint}</p>
          {provider === "groq" && <GroqSetupHint hasKey={!!keys.groq} />}
          {!isFree && (
            <>
              <input type="password" placeholder={`${config.label} API key`} value={keys[provider]}
                onChange={(e) => setKeys((k) => ({ ...k, [provider]: e.target.value }))}
                className="w-full text-xs p-1.5 rounded border bg-background font-mono" />
              <ModelSelect model={model} defaultModel={config.defaultModel} onChange={setLocalModel} />
            </>
          )}
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 h-7 text-xs" onClick={handleSave}>保存</Button>
            {!isFree && hasKey && (
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleTest} disabled={testing}>
                {testing ? "测试中..." : "测试"}
              </Button>
            )}
            {!isFree && hasKey && (
              <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={handleClearKey}>清除</Button>
            )}
          </div>
          {testResult && (
            <p className={`text-[10px] leading-relaxed ${testResult.ok ? "text-emerald-400" : "text-red-400"}`}>
              {testResult.ok ? `成功 — "${testResult.message}"` : `失败 — ${testResult.message}`}
            </p>
          )}
          <KeyStorageHelp show={showHelp} onToggle={() => setShowHelp(!showHelp)} />
        </div>
      )}
    </div>
  );
}

function ModelSelect({ model, defaultModel, onChange }: {
  model: string; defaultModel: string; onChange: (m: string) => void;
}) {
  return (
    <div>
      <select value={model || defaultModel} onChange={(e) => onChange(e.target.value)}
        className="w-full text-xs p-1.5 rounded border bg-background font-mono appearance-none cursor-pointer">
        {GROQ_MODELS.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
      <p className="text-[10px] text-muted-foreground mt-1">模型：{model || defaultModel}</p>
    </div>
  );
}

function GroqSetupHint({ hasKey }: { hasKey: boolean }) {
  if (hasKey) return null;
  return (
    <div className="rounded-md bg-blue-500/10 border border-blue-500/20 p-2 space-y-1">
      <p className="text-[10px] font-medium text-blue-400">Groq 速度快，并提供免费额度</p>
      <p className="text-[10px] text-muted-foreground">
        1. 在{" "}
        <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer"
          className="text-blue-400 underline">console.groq.com</a>{" "}注册
      </p>
      <p className="text-[10px] text-muted-foreground">2. 创建 API Key 并粘贴到下方</p>
    </div>
  );
}

function KeyStorageHelp({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <div className="border-t pt-2">
      <button onClick={onToggle} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
        {show ? "隐藏" : "我的 Key 存在哪里？"}
      </button>
      {show && (
        <div className="mt-1.5 text-[10px] text-muted-foreground space-y-1 leading-relaxed">
          <p>你的 API Key <strong>只保存在浏览器 localStorage</strong> 中，不会离开你的设备。</p>
          <p>API 请求会直接从浏览器发往 Groq，不经过本站服务器。</p>
        </div>
      )}
    </div>
  );
}
