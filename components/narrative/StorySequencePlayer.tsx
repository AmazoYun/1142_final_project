"use client";

import { useCallback, useEffect, useState } from "react";
import type { StoryButton, StoryLine } from "@/lib/narrative/types";
import { useStoryKeyAdvance } from "@/lib/useStoryKeyAdvance";
import DialoguePanel from "./DialoguePanel";
import SceneCaption from "./SceneCaption";
import FirstPersonView from "./FirstPersonView";
import TransitionSplash from "./TransitionSplash";

const VISUAL_PAUSE_MS = 1000;

type Props = {
  lines: StoryLine[];
  onComplete: () => void;
  onAction?: (action: StoryButton["action"]) => void;
  showSkip?: boolean;
  onSkip?: () => void;
};

export default function StorySequencePlayer({
  lines,
  onComplete,
  onAction,
  showSkip = false,
  onSkip,
}: Props) {
  const [index, setIndex] = useState(0);
  const [transition, setTransition] = useState<StoryLine | null>(null);
  const [visual, setVisual] = useState<StoryLine | null>(null);

  const line = lines[index];

  const advance = useCallback(() => {
    if (index >= lines.length - 1) {
      onComplete();
      return;
    }
    setIndex((i) => i + 1);
  }, [index, lines.length, onComplete]);

  useEffect(() => {
    if (!line) return;
    if (line.type === "visual") {
      setVisual(line);
      const t = window.setTimeout(advance, VISUAL_PAUSE_MS);
      return () => clearTimeout(t);
    }
    if (line.type === "transition") {
      setTransition(line);
      return;
    }
    if (line.type === "wait") {
      const t = window.setTimeout(advance, line.ms);
      return () => clearTimeout(t);
    }
  }, [line, advance]);

  const canKeyAdvance =
    line?.type === "caption" || line?.type === "dialogue" || line?.type === "visual";
  useStoryKeyAdvance(canKeyAdvance ? advance : undefined, Boolean(canKeyAdvance));

  if (!line) return null;

  const currentVisual =
    visual?.type === "visual"
      ? visual.visual
      : line.type === "visual"
        ? line.visual
        : "market-walk-shake";

  const handleButton = (action: StoryButton["action"]) => {
    onAction?.(action);
    const skipAdvance =
      action === "goto-market" ||
      action === "edit-mode" ||
      action === "skip-intro" ||
      action === "goto-toilet" ||
      action === "goto-investigate";
    if (!skipAdvance) advance();
  };

  if (transition?.type === "transition") {
    return (
      <TransitionSplash
        kind={transition.transition}
        onDone={() => {
          setTransition(null);
          advance();
        }}
      />
    );
  }

  const hasOverlay =
    line.type === "caption" || line.type === "dialogue" || line.type === "buttons";

  return (
    <div className="fixed inset-0 z-[70] overflow-hidden bg-black">
      {showSkip && (
        <button
          type="button"
          className="absolute top-4 right-4 z-30 game-btn-ghost text-sm"
          onClick={onSkip}
        >
          跳過劇情
        </button>
      )}

      <div className="absolute inset-0">
        <FirstPersonView visual={currentVisual} />
      </div>

      {line.type === "visual" && (
        <button
          type="button"
          className="absolute inset-0 z-10 cursor-default"
          aria-label="繼續"
          onClick={advance}
        />
      )}

      {hasOverlay && (
        <div className="absolute inset-x-0 bottom-0 z-20 pointer-events-none p-4 pb-8 bg-gradient-to-t from-black via-black/90 to-transparent max-h-[50vh] overflow-y-auto">
          <div className="pointer-events-auto space-y-3">
            {line.type === "caption" && (
              <SceneCaption id={line.id} text={line.text} onDismiss={advance} />
            )}
            {line.type === "dialogue" && (
              <DialoguePanel
                id={line.id}
                speaker={line.speaker}
                text={line.text}
                onAdvance={advance}
              />
            )}
            {line.type === "buttons" && (
              <div className="flex flex-wrap justify-center gap-3">
                {line.buttons.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className="game-btn-primary min-w-[140px]"
                    onClick={() => handleButton(b.action)}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
