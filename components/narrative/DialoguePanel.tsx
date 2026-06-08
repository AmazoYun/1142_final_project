"use client";

import ScoreBoardPanel from "@/components/ui/ScoreBoardPanel";
import type { Speaker } from "@/lib/narrative/types";
import { useNarrativeStore } from "@/store/narrativeStore";

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
  const getText = useNarrativeStore((s) => s.getText);
  const display = getText(id, text);

  return (
    <ScoreBoardPanel
      variant="dialogue"
      className="mx-auto max-w-2xl"
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
      </div>
      <p className="game-dialog-text whitespace-pre-wrap">{display}</p>
      {showNext && onAdvance && (
        <p className="game-dialog-hint text-right mt-2">點擊或按空白鍵繼續 ▼</p>
      )}
    </ScoreBoardPanel>
  );
}
