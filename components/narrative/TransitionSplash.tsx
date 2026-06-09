"use client";

import { useEffect } from "react";
import type { TransitionKind } from "@/lib/narrative/types";
import { useStoryAdvance } from "@/lib/useStoryAdvance";

const PAUSE_MS = 1000;

type Props = {
  kind: TransitionKind;
  onDone: () => void;
};

export default function TransitionSplash({ kind, onDone }: Props) {
  const label = kind === "fade-dark" ? "螢幕漸暗..." : "遊戲提示（待輸入）";

  useEffect(() => {
    const t = window.setTimeout(onDone, PAUSE_MS);
    return () => clearTimeout(t);
  }, [onDone]);

  useStoryAdvance(onDone);

  return (
    <button
      type="button"
      className="fixed inset-0 z-[80] hub-shell flex flex-col items-center justify-center gap-6 animate-fade-in cursor-default"
      onClick={onDone}
      aria-label="繼續"
    >
      <div className="absolute inset-0 hub-world-sky" />
      <p className="relative game-panel px-6 py-4 text-sm tracking-widest pointer-events-none">
        {label}
      </p>
      {kind === "game-hint" && (
        <p className="relative game-caption max-w-md text-center text-xs px-4 pointer-events-none">
          玩法說明待輸入。
        </p>
      )}
    </button>
  );
}
