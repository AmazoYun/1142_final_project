"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import DialoguePanel from "@/components/narrative/DialoguePanel";
import SceneCaption from "@/components/narrative/SceneCaption";
import TransitionSplash from "@/components/narrative/TransitionSplash";
import type { StallIntroScript } from "@/lib/narrative/types";
import { useStoryKeyAdvance } from "@/lib/useStoryKeyAdvance";
import { useNarrativeStore } from "@/store/narrativeStore";

type Props = {
  script: StallIntroScript;
  onClose: () => void;
};

export default function StallIntroModal({ script, onClose }: Props) {
  const router = useRouter();
  const markVisited = useNarrativeStore((s) => s.markStallVisited);
  const [phase, setPhase] = useState<"story" | "fade" | "transition" | "howto">("story");
  const [lineIndex, setLineIndex] = useState(0);

  const allLines = [
    ...script.captions.map((c) => ({ kind: "caption" as const, ...c })),
    ...script.dialogues.map((d) => ({ kind: "dialogue" as const, ...d })),
  ];
  const current = allLines[lineIndex];

  const advanceLine = useCallback(() => {
    if (lineIndex < allLines.length - 1) setLineIndex((i) => i + 1);
  }, [lineIndex, allLines.length]);

  useStoryKeyAdvance(
    phase === "story" && current ? advanceLine : undefined,
    phase === "story" && Boolean(current),
  );

  const goEnter = () => {
    markVisited(script.stallId);
    setPhase("fade");
    window.setTimeout(() => setPhase("transition"), 600);
  };

  const dismissLater = () => {
    markVisited(script.stallId);
    onClose();
  };

  if (phase === "transition") {
    return (
      <TransitionSplash
        kind="game-hint"
        onDone={() => setPhase("howto")}
      />
    );
  }

  if (phase === "howto") {
    return (
      <div className="fixed inset-0 z-[60] hub-shell flex items-center justify-center p-4">
        <div className="absolute inset-0 hub-world-sky opacity-95" />
        <div className="game-panel relative max-w-lg w-full p-6 space-y-4">
          <h2 className="game-title text-center text-ink">{script.title} — 玩法說明</h2>
          <p className="game-dialog-text">{script.howToPlay}</p>
          <div className="flex gap-3 justify-center">
            <button type="button" className="game-btn-ghost" onClick={onClose}>
              返回夜市
            </button>
            <button
              type="button"
              className="game-btn-primary"
              onClick={() => router.push(script.href)}
            >
              開始遊戲
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 z-[55] flex flex-col justify-end p-4 transition-opacity duration-500 ${
        phase === "fade" ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="absolute inset-0 hub-world-sky opacity-80" aria-hidden />
      <div className="relative z-10 space-y-3 max-w-2xl mx-auto w-full">
        {current?.kind === "caption" && (
          <SceneCaption
            id={current.id}
            text={current.text}
            onDismiss={advanceLine}
          />
        )}
        {current?.kind === "dialogue" && (
          <DialoguePanel
            id={current.id}
            speaker={current.speaker}
            text={current.text}
            onAdvance={advanceLine}
            showNext={lineIndex < allLines.length - 1}
          />
        )}
        {lineIndex >= allLines.length - 1 && (
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button type="button" className="game-btn-primary" onClick={goEnter}>
              {script.enterLabel}
            </button>
            <button type="button" className="game-btn-ghost" onClick={dismissLater}>
              {script.laterLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
