"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { EndingId } from "@/lib/endings/types";
import {
  leaveToiletAmbience,
  playWashHandsSequence,
} from "@/lib/narrative/introSounds";
import { applyDirectLeavePenalty } from "@/lib/player/applyDirectLeavePenalty";
import type { BackdropEffect, StoryButton, StoryLine } from "@/lib/narrative/types";
import { useIntroLineSounds } from "@/lib/narrative/useIntroLineSounds";
import { useStoryAdvance } from "@/lib/useStoryAdvance";
import ScoreBoardWoodButton from "@/components/ui/ScoreBoardWoodButton";
import DialoguePanel from "./DialoguePanel";
import EndingSceneBackdrop from "./EndingSceneBackdrop";
import SceneCaption from "./SceneCaption";
import FirstPersonView from "./FirstPersonView";
import HubSceneOverlay from "./HubSceneOverlay";
import IntroTransition from "./IntroTransition";
import TransitionSplash from "./TransitionSplash";

const DEFAULT_VISUAL_PAUSE_MS = 1200;
const ENDING_VISUAL_PAUSE_MS = 400;

const INTRO_OVERLAY_TRANSITIONS = new Set([
  "flash-transition",
  "fade-reveal",
  "fade-glowing",
  "fade-dark",
]);

const INTRO_TOILET_BLOCK_IDS = new Set([
  "intro-bo1",
  "intro-v2",
  "intro-load",
  "intro-b-toilet",
]);

function isIntroToiletBlocked(line: StoryLine | undefined): boolean {
  return !!line && INTRO_TOILET_BLOCK_IDS.has(line.id);
}

type Props = {
  lines: StoryLine[];
  onComplete: () => void;
  onAction?: (action: StoryButton["action"]) => void;
  showSkip?: boolean;
  onSkip?: () => void;
  endingId?: EndingId;
};

export default function StorySequencePlayer({
  lines,
  onComplete,
  onAction,
  showSkip = false,
  onSkip,
  endingId,
}: Props) {
  const [index, setIndex] = useState(0);
  const [transition, setTransition] = useState<StoryLine | null>(null);
  const [visual, setVisual] = useState<StoryLine | null>(null);
  const [backdropEffect, setBackdropEffect] = useState<BackdropEffect>("none");
  const [endingSlide, setEndingSlide] = useState(0);
  const [buttonBusy, setButtonBusy] = useState(false);
  const [backdropInstantSwap, setBackdropInstantSwap] = useState(false);
  const [holdBlackScreen, setHoldBlackScreen] = useState(false);
  const onCompleteCalledRef = useRef(false);

  const line = lines[index];
  useIntroLineSounds(line, !endingId);

  const advance = useCallback(() => {
    if (index >= lines.length - 1) {
      if (!onCompleteCalledRef.current) {
        onCompleteCalledRef.current = true;
        onComplete();
      }
      return;
    }
    setIndex((i) => i + 1);
  }, [index, lines.length, onComplete]);

  useEffect(() => {
    if (!line) return;

    if (line.type === "visual") {
      setVisual(line);
      const fadeMs = line.fadeMs ?? DEFAULT_VISUAL_PAUSE_MS;
      const t = window.setTimeout(advance, fadeMs);
      return () => clearTimeout(t);
    }

    if (line.type === "ending-visual") {
      setEndingSlide(line.slide);
      const t = window.setTimeout(advance, ENDING_VISUAL_PAUSE_MS);
      return () => clearTimeout(t);
    }

    if (line.type === "backdrop-effect") {
      setBackdropEffect(line.effect);
      advance();
      return;
    }

    if (line.type === "transition") {
      setTransition(line);
      if (line.transition === "fade-reveal") {
        setBackdropEffect("none");
      }
      if (line.transition === "fade-reveal" && line.reveals) {
        setVisual({
          type: "visual",
          id: `${line.id}-prep`,
          visual: line.reveals,
        });
      }
      return;
    }

    if (line.type === "wait") {
      const t = window.setTimeout(advance, line.ms);
      return () => clearTimeout(t);
    }

    if (line.type === "loading") {
      const t = window.setTimeout(advance, line.ms);
      return () => clearTimeout(t);
    }

    if (line.type === "blackout") {
      setBackdropEffect("none");
      const t = window.setTimeout(advance, line.ms);
      return () => clearTimeout(t);
    }
  }, [line, advance]);

  const canStoryAdvance =
    !isIntroToiletBlocked(line) &&
    (line?.type === "caption" ||
      line?.type === "dialogue" ||
      line?.type === "visual" ||
      line?.type === "ending-visual");
  useStoryAdvance(canStoryAdvance ? advance : undefined, Boolean(canStoryAdvance));

  if (!line) return null;

  const currentVisual =
    line.type === "visual"
      ? line.visual
      : visual?.type === "visual"
        ? visual.visual
        : "night-market";

  const sceneFadeMs =
    line.type === "visual" && line.fadeMs
      ? line.fadeMs
      : visual?.type === "visual" && visual.fadeMs
        ? visual.fadeMs
        : DEFAULT_VISUAL_PAUSE_MS;

  const activeVisualLine =
    line.type === "visual" ? line : visual?.type === "visual" ? visual : null;
  const sceneDim = activeVisualLine?.dim ?? false;
  const backdropCrossfadeMs = backdropInstantSwap ? 0 : sceneFadeMs;

  useLayoutEffect(() => {
    if (!backdropInstantSwap) return;
    setBackdropInstantSwap(false);
  }, [backdropInstantSwap, index, currentVisual]);

  const handleButton = async (action: StoryButton["action"]) => {
    if (buttonBusy) return;

    const skipAdvance =
      action === "goto-market" ||
      action === "edit-mode" ||
      action === "skip-intro";

    if (!endingId && action === "wash-hands") {
      setButtonBusy(true);
      onAction?.(action);
      await playWashHandsSequence();
      setButtonBusy(false);
      advance();
      return;
    }

    if (!endingId && action === "leave-toilet") {
      setButtonBusy(true);
      onAction?.(action);
      applyDirectLeavePenalty();
      await leaveToiletAmbience();
      setButtonBusy(false);
      advance();
      return;
    }

    onAction?.(action);
    if (!skipAdvance) advance();
  };

  const activeTransition =
    transition?.type === "transition" ? transition : null;
  const useIntroOverlay =
    activeTransition != null &&
    INTRO_OVERLAY_TRANSITIONS.has(activeTransition.transition);

  if (activeTransition && !useIntroOverlay) {
    return (
      <TransitionSplash
        kind={activeTransition.transition}
        onDone={() => {
          setTransition(null);
          advance();
        }}
      />
    );
  }

  const hasOverlay =
    line.type === "caption" ||
    line.type === "dialogue" ||
    line.type === "buttons";

  const showLoading = line.type === "loading";
  const showBlackout = line.type === "blackout";
  const hideBackdrop =
    showBlackout ||
    holdBlackScreen ||
    activeTransition?.transition === "fade-reveal" ||
    activeTransition?.transition === "fade-glowing" ||
    activeTransition?.transition === "fade-dark" ||
    activeTransition?.transition === "flash-transition";

  const finishIntroTransition = () => {
    if (!activeTransition) return;
    if (activeTransition.reveals) {
      setBackdropInstantSwap(true);
      setVisual({
        type: "visual",
        id: `${activeTransition.id}-reveal`,
        visual: activeTransition.reveals,
      });
    }
    if (activeTransition.transition === "fade-dark") {
      setHoldBlackScreen(true);
    }
    setTransition(null);
    advance();
  };

  return (
    <div className="fixed inset-0 z-[70] overflow-hidden bg-black">
      {showSkip && !isIntroToiletBlocked(line) && (
        <button
          type="button"
          className="absolute top-4 right-4 z-30 game-btn-ghost text-sm"
          data-story-no-advance
          onClick={onSkip}
        >
          跳過劇情
        </button>
      )}

      <div className="absolute inset-0 z-0">
        {hideBackdrop ? (
          <div className="absolute inset-0 bg-black" aria-hidden />
        ) : endingId ? (
          <EndingSceneBackdrop endingId={endingId} slide={endingSlide} />
        ) : (
          <FirstPersonView
            visual={currentVisual}
            effect={backdropEffect}
            crossfadeMs={backdropCrossfadeMs}
            dim={sceneDim}
          />
        )}
      </div>

      {useIntroOverlay && activeTransition && (
        <IntroTransition
          kind={activeTransition.transition}
          reveals={activeTransition.reveals}
          overlay={
            activeTransition.transition !== "fade-reveal" &&
            activeTransition.transition !== "fade-glowing" &&
            activeTransition.transition !== "fade-dark"
          }
          onDone={finishIntroTransition}
        />
      )}

      {holdBlackScreen && (
        <div className="absolute inset-0 z-[85] bg-black pointer-events-none" aria-hidden />
      )}

      {!endingId && !useIntroOverlay && <HubSceneOverlay />}

      {showBlackout && <div className="absolute inset-0 z-[12] bg-black" aria-hidden />}

      {showLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <p className="intro-loading-text">{line.text}</p>
        </div>
      )}

      {hasOverlay && (
        <div className="absolute inset-x-0 bottom-0 z-20 pointer-events-none p-4 pb-8 bg-gradient-to-t from-black/80 via-black/50 to-transparent max-h-[50vh] overflow-y-auto">
          <div className="pointer-events-auto space-y-3">
            {line.type === "caption" && (
              <SceneCaption id={line.id} text={line.text} />
            )}
            {line.type === "dialogue" && (
              <DialoguePanel
                id={line.id}
                speaker={line.speaker}
                text={line.text}
              />
            )}
            {line.type === "buttons" && (
              <div className="flex flex-wrap justify-center gap-4" data-story-no-advance>
                {line.buttons.map((b) => (
                  <ScoreBoardWoodButton
                    key={b.id}
                    className="min-w-[140px] px-6"
                    onClick={() => handleButton(b.action)}
                  >
                    {b.label}
                  </ScoreBoardWoodButton>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
