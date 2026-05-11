"use client";

import { useState, useEffect, useCallback } from "react";

interface TourStep {
  target: string; // data-tour attribute value
  title: string;
  body: string;
  position: "top" | "bottom" | "left" | "right" | "center";
  triggerOnFinish?: boolean; // click the first button inside the target
}

// Only targets that are always present in the DOM — no conditional elements
const STEPS: TourStep[] = [
  {
    target: "prose-column",
    title: "课程内容",
    body: "在这里阅读课程。每一步都会接上上一段，并带有可直接运行的代码。",
    position: "center",
  },
  {
    target: "agent-graph",
    title: "Agent 图谱",
    body: "这里展示 Agent 各部件如何连接。运行代码时，对应节点会被点亮。",
    position: "bottom",
  },
  {
    target: "sample-chips",
    title: "现在试一下",
    body: "点击任意示例，把它发送给 Agent。运行时可以观察右侧图谱的变化。",
    position: "top",
    triggerOnFinish: true,
  },
];

const STORAGE_KEY = "tour-of-agents:tour-seen";

export function TourGuide() {
  const [step, setStep] = useState(-1); // -1 = not active
  const [rect, setRect] = useState<DOMRect | null>(null);
  const active = step >= 0 && step < STEPS.length;

  const finish = useCallback((triggerTarget?: string) => {
    setStep(-1);
    localStorage.setItem(STORAGE_KEY, "true");
    if (triggerTarget) {
      const el = document.querySelector(`[data-tour="${triggerTarget}"] button`);
      if (el instanceof HTMLElement) setTimeout(() => el.click(), 100);
    }
  }, []);

  // Auto-show on first visit
  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      const timer = setTimeout(() => setStep(0), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  // Listen for manual trigger from TourButton
  useEffect(() => {
    const handler = () => setStep(0);
    window.addEventListener("tour:start", handler);
    return () => window.removeEventListener("tour:start", handler);
  }, []);

  // Measure the target element for the current step
  useEffect(() => {
    if (!active) { setRect(null); return; } // eslint-disable-line react-hooks/set-state-in-effect
    const el = document.querySelector(`[data-tour="${STEPS[step].target}"]`);
    if (!el) { finish(); return; }
    const r = el.getBoundingClientRect();
    setRect(r);
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [step, active, finish]);

  const next = () => {
    if (step < STEPS.length - 1) { setStep(step + 1); return; }
    const s = STEPS[step];
    finish(s.triggerOnFinish ? s.target : undefined);
  };
  const prev = () => step > 0 && setStep(step - 1);

  if (!active || !rect) return null;

  const s = STEPS[step];
  const pad = 6;
  const tooltip = getTooltipStyle(rect, s.position);

  return (
    <div className="fixed inset-0 z-[100]" onClick={() => finish()}>
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={rect.left - pad} y={rect.top - pad}
              width={rect.width + pad * 2} height={rect.height + pad * 2}
              rx="8" fill="black"
            />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.3)" mask="url(#tour-mask)" />
      </svg>

      <div
        className="absolute border-2 border-primary rounded-lg pointer-events-none animate-pulse"
        style={{
          left: rect.left - pad, top: rect.top - pad,
          width: rect.width + pad * 2, height: rect.height + pad * 2,
        }}
      />

      <div
        className="absolute bg-popover text-popover-foreground border rounded-lg shadow-lg p-4 max-w-xs z-[101]"
        style={tooltip}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-xs text-muted-foreground mb-1">
          {step + 1} / {STEPS.length}
        </div>
        <h3 className="font-semibold text-sm mb-1">{s.title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{s.body}</p>
        <div className="flex items-center gap-2 mt-3">
          {step > 0 && (
            <button onClick={prev}
              className="text-xs text-muted-foreground hover:text-foreground">
              上一步
            </button>
          )}
          <div className="flex-1" />
          <button onClick={() => finish()}
            className="text-xs text-muted-foreground hover:text-foreground">
            跳过
          </button>
          <button onClick={next}
            className="px-3 py-1 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90">
            {step < STEPS.length - 1 ? "下一步" : STEPS[step].triggerOnFinish ? "试一下" : "完成"}
          </button>
        </div>
      </div>
    </div>
  );
}

function getTooltipStyle(rect: DOMRect, pos: string): React.CSSProperties {
  const gap = 12;
  switch (pos) {
    case "center": return {
      left: rect.left + rect.width / 2,
      top: rect.top + rect.height / 2,
      transform: "translate(-50%, -50%)",
    };
    case "right": return { left: rect.right + gap, top: rect.top };
    case "left": return { right: window.innerWidth - rect.left + gap, top: rect.top };
    case "bottom": return { left: rect.left, top: rect.bottom + gap };
    case "top": return { left: rect.left, bottom: window.innerHeight - rect.top + gap };
    default: return { left: rect.left, top: rect.bottom + gap };
  }
}

/** Button to re-trigger the tour */
export function TourButton() {
  const start = () => {
    window.dispatchEvent(new Event("tour:start"));
  };
  return (
    <button onClick={start} title="开始导览"
      className="h-7 px-2 text-xs rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
      ? 导览
    </button>
  );
}
