"use client";

import type { PlaybackState } from "@/hooks/use-playback";
import type { Turn } from "@/hooks/use-turns";

interface PlaybackControlsProps {
  playback: PlaybackState;
  entryCount: number;
  turns: Turn[];
}

export function PlaybackControls({ playback, entryCount, turns }: PlaybackControlsProps) {
  const { cursor, replaying, isLive, speed, atEnd, activeTurnIndex } = playback;
  const hasEntries = entryCount > 0;
  if (!hasEntries) return null;

  const playing = replaying || isLive;
  const ghost = "h-7 px-2.5 rounded-md text-xs transition-colors flex items-center gap-1 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30";
  const hasPrevTurn = activeTurnIndex > 0;
  const hasNextTurn = activeTurnIndex < turns.length - 1;

  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5 border-t border-border/40 bg-muted/20 shrink-0"
      data-tour="playback-controls">
      {turns.length > 1 && (
        <div className="flex items-center gap-0.5 mr-0.5">
          <button onClick={() => playback.goToTurn(activeTurnIndex - 1)}
            disabled={!hasPrevTurn} className={ghost}
            title="跳到上一轮并重放">&#x25C0;</button>
          <span className="text-[10px] text-muted-foreground tabular-nums px-0.5 min-w-[5ch] text-center"
            title={`正在查看第 ${activeTurnIndex + 1} / ${turns.length} 轮`}>
            第 {activeTurnIndex + 1}/{turns.length} 轮
          </span>
          <button onClick={() => playback.goToTurn(activeTurnIndex + 1)}
            disabled={!hasNextTurn} className={ghost}
            title="跳到下一轮并重放">&#x25B6;</button>
          <div className="w-px h-4 bg-border/40 mx-1" />
        </div>
      )}

      <button onClick={turns.length > 1 ? playback.replayAll : playback.restart}
        className={ghost}
        title={turns.length > 1
          ? "从第一轮开始重放全部"
          : "回到第一步"}>
        &#x27F2;
      </button>

      <button onClick={playback.stepBack} disabled={cursor <= 0 && !isLive}
        className={ghost}
        title="回退一个 Trace 步骤">&#x23EE;</button>
      <button onClick={playback.stepForward} disabled={atEnd}
        className={ghost}
        title="前进一个 Trace 步骤">&#x23ED;</button>

      <button onClick={playback.toggleReplay}
        className={`h-7 px-3 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
          playing
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-foreground text-background hover:bg-foreground/90"
        }`}
        title={playing
          ? "暂停自动回放"
          : atEnd
            ? "从头重放当前轮"
            : "按当前速度自动播放 Trace 步骤"}
      >
        {playing ? "\u23F8 暂停" : atEnd ? "\u21BB 重放" : "\u25B6 播放"}
      </button>

      <span className="text-[10px] text-muted-foreground tabular-nums px-1"
        title={`当前位于第 ${Math.min(cursor + 1, entryCount)} / ${entryCount} 个 Trace 步骤`}>
        步骤 {Math.min(cursor + 1, entryCount)}<span className="opacity-50">/{entryCount}</span>
      </span>

      <div className="ml-auto">
        <select value={speed} onChange={(e) => playback.setSpeed(Number(e.target.value))}
          className="text-[11px] bg-muted border rounded-md px-1.5 py-1 cursor-pointer"
          title="自动回放速度，会在课程间保留">
          <option value={1500}>慢</option>
          <option value={800}>正常</option>
          <option value={400}>快</option>
          <option value={150}>最快</option>
        </select>
      </div>
    </div>
  );
}
