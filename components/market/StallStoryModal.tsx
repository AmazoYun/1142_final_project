"use client";

import { useCallback, useState } from "react";
import DialoguePanel from "@/components/narrative/DialoguePanel";
import SceneCaption from "@/components/narrative/SceneCaption";
import type { StallIntroScript } from "@/lib/narrative/types";
import { useStoryAdvance } from "@/lib/useStoryAdvance";

type Props = {
  script: StallIntroScript;
  onComplete: () => void;
};

/** 首次靠近攤位時自動播放的劇情 */
export default function StallStoryModal({ script, onComplete }: Props) {
  const [lineIndex, setLineIndex] = useState(0);

  const allLines = [
    ...script.captions.map((c) => ({ kind: "caption" as const, ...c })),
    ...script.dialogues.map((d) => ({ kind: "dialogue" as const, ...d })),
  ];
  const current = allLines[lineIndex];

  const advanceLine = useCallback(() => {
    if (lineIndex < allLines.length - 1) {
      setLineIndex((i) => i + 1);
      return;
    }
    onComplete();
  }, [lineIndex, allLines.length, onComplete]);

  useStoryAdvance(current ? advanceLine : undefined, Boolean(current));

  return (
    <div className="fixed inset-0 z-[55] flex flex-col justify-end p-4 cursor-default">
      <div className="absolute inset-0 hub-world-sky opacity-80" aria-hidden />
      <div className="relative z-10 space-y-3 max-w-2xl mx-auto w-full">
        {current?.kind === "caption" && (
          <SceneCaption id={current.id} text={current.text} />
        )}
        {current?.kind === "dialogue" && (
          <DialoguePanel
            id={current.id}
            speaker={current.speaker}
            text={current.text}
          />
        )}
      </div>
    </div>
  );
}
