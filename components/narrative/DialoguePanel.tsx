"use client";

import type { Speaker } from "@/lib/narrative/types";
import { useNarrativeStore } from "@/store/narrativeStore";

const SPEAKER_BORDER: Record<Speaker, string> = {
  主角: "border-l-accent-red",
  友人A: "border-l-sky-400",
  友人B: "border-l-emerald-400",
  旁白: "border-l-foreground/40",
};

type Props = {
  id: string;
  speaker: Speaker;
  text: string;
  onAdvance?: () => void;
  showNext?: boolean;
};

export default function DialoguePanel({
  id,
  speaker,
  text,
  onAdvance,
  showNext = true,
}: Props) {
  const editMode = useNarrativeStore((s) => s.editMode);
  const getText = useNarrativeStore((s) => s.getText);
  const setOverride = useNarrativeStore((s) => s.setOverride);
  const display = getText(id, text);

  return (
    <div
      className={`game-panel mx-auto max-w-2xl border-l-4 px-4 py-3 ${SPEAKER_BORDER[speaker]}`}
      onClick={onAdvance}
      role={onAdvance ? "button" : undefined}
      tabIndex={onAdvance ? 0 : undefined}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.code === "Space") {
          e.preventDefault();
          onAdvance?.();
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="game-dialog-speaker mb-1">{speaker}</p>
        {editMode && (
          <button
            type="button"
            className="game-btn-ghost text-[10px] px-2 py-0.5 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              const next = window.prompt("編輯台詞", display);
              if (next != null) setOverride(id, next);
            }}
          >
            編輯
          </button>
        )}
      </div>
      <p className="game-dialog-text whitespace-pre-wrap">{display}</p>
      {showNext && onAdvance && (
        <p className="game-dialog-hint text-right mt-2">點擊或按空白鍵繼續 ▼</p>
      )}
    </div>
  );
}
