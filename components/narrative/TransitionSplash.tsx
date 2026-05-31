"use client";

import { useEffect } from "react";
import type { TransitionKind } from "@/lib/narrative/types";
import { useStoryKeyAdvance } from "@/lib/useStoryKeyAdvance";

const PAUSE_MS = 1000;

type Props = {
  kind: TransitionKind;
  onDone: () => void;
};

export default function TransitionSplash({ kind, onDone }: Props) {
  const label =
    kind === "bathroom"
      ? "過場：廁所"
      : kind === "fade-dark"
        ? "螢幕漸暗..."
        : "遊戲提示（待輸入）";

  useEffect(() => {
    const t = window.setTimeout(onDone, PAUSE_MS);
    return () => clearTimeout(t);
  }, [onDone]);

  useStoryKeyAdvance(onDone);

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
      {kind === "bathroom" && (
        <p className="relative game-caption max-w-xs text-center text-xs pointer-events-none">
          素材製作中，暫以文字過場代替
        </p>
      )}
      {kind === "game-hint" && (
        <p className="relative game-caption max-w-md text-center text-xs px-4 pointer-events-none">
          玩法說明待輸入。
        </p>
      )}
    </button>
  );
}
