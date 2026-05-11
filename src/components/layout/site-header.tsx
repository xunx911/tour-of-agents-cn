"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useSyncExternalStore } from "react";
import { MoreVertical } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ApiKeyDialog } from "@/components/settings/api-key-dialog";
import { getProvider, PROVIDER_CONFIGS } from "@/lib/settings/api-keys";
import { useLessonHeader } from "./lesson-header-context";

function getProviderLabel() {
  const cfg = PROVIDER_CONFIGS[getProvider()];
  return cfg.needsKey === false ? "⚡ 模拟模式" : `🔑 ${cfg.label}`;
}

let labelVersion = 0;
function subscribeLabelChange(cb: () => void) {
  const orig = labelVersion;
  const id = setInterval(() => { if (labelVersion !== orig) cb(); }, 100);
  return () => clearInterval(id);
}

export function SiteHeader() {
  const [showSettings, setShowSettings] = useState(false);
  const { content } = useLessonHeader();
  const providerLabel = useSyncExternalStore(
    subscribeLabelChange,
    getProviderLabel,
    () => "...",
  );

  useEffect(() => { if (!showSettings) labelVersion++; }, [showSettings]);

  return (
    <header className="fixed top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 md:px-6">
        {content ? content.lessonSelector : (
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg hover:opacity-80 transition-opacity">
              <span className="text-primary">A Tour of Agents</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1 text-xs text-muted-foreground">
              <Link href="/learn" className="px-2 py-1 rounded-md hover:bg-muted hover:text-foreground transition-colors">课程</Link>
            </nav>
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" className="hidden md:inline-flex" onClick={() => setShowSettings(true)}>
            {providerLabel}
          </Button>
          <span className="hidden md:inline-flex"><ThemeToggle /></span>
          {/* Mobile: compact mock badge + overflow */}
          <button onClick={() => setShowSettings(true)}
            className="md:hidden text-[10px] px-2 py-1 rounded-full border border-border/50 text-muted-foreground">
            {providerLabel}
          </button>
          <MobileOverflow onOpenSettings={() => setShowSettings(true)} />
        </div>
      </div>
      <ApiKeyDialog open={showSettings} onOpenChange={setShowSettings} />
    </header>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <Button variant="ghost" size="sm" onClick={toggle}>
      {dark ? "浅色" : "深色"}
    </Button>
  );
}

function MobileOverflow({ onOpenSettings }: { onOpenSettings: () => void }) {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="md:hidden h-8 w-8 p-0" aria-label="Open menu">
          <MoreVertical className="h-4 w-4" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-48 p-1">
        <Link href="/learn"
          className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
          onClick={() => setOpen(false)}>
          课程
        </Link>
        <div className="h-px bg-border my-1" />
        <button onClick={() => { onOpenSettings(); setOpen(false); }}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors">
          LLM 设置
        </button>
        <button onClick={() => { toggleTheme(); setOpen(false); }}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors">
          {dark ? "浅色模式" : "深色模式"}
        </button>
      </PopoverContent>
    </Popover>
  );
}
