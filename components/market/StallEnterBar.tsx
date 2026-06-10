"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { narrativeDefault } from "@/data/narrative-default";
import { saveHubPlayerPosition } from "@/lib/market/hubPlayerPosition";
import { playUiEnterSound } from "@/lib/ui/uiSounds";
import type { StallId } from "@/lib/narrative/types";

type Props = {
  stallId: StallId;
  playerX: number;
  worldWidth: number;
  worldX: number;
  worldY: number;
  zIndex: number;
  visible: boolean;
  /** 取得道具對話／動畫進行中時停用空白鍵與按鈕 */
  interactionDisabled?: boolean;
  onFadeOutComplete?: () => void;
  onEnterGame: (stallId: StallId) => void;
};

const CORRODE_MS = 520;
const FADE_MS = 350;
const SCORE_BOARD_SRC = "/narrative/score_board.webp";

/** 攤位中央：分數版素材進入按鈕 */
export default function StallEnterBar({
  stallId,
  playerX,
  worldWidth,
  worldX,
  worldY,
  zIndex,
  visible,
  interactionDisabled = false,
  onFadeOutComplete,
  onEnterGame,
}: Props) {
  const script = narrativeDefault.stalls[stallId];
  const [corroding, setCorroding] = useState(false);
  const [mounted, setMounted] = useState(visible);
  const [fadedIn, setFadedIn] = useState(false);
  const pendingRef = useRef(false);

  const runEnter = useCallback(() => {
    saveHubPlayerPosition(playerX, worldWidth);
    onEnterGame(stallId);
  }, [onEnterGame, playerX, stallId, worldWidth]);

  const triggerEnter = useCallback(() => {
    if (interactionDisabled || corroding || pendingRef.current || !fadedIn) return;
    pendingRef.current = true;
    setCorroding(true);
    window.setTimeout(() => {
      runEnter();
      pendingRef.current = false;
      setCorroding(false);
    }, CORRODE_MS);
  }, [corroding, fadedIn, interactionDisabled, runEnter]);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      const raf = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setFadedIn(true));
      });
      return () => window.cancelAnimationFrame(raf);
    }
    setFadedIn(false);
  }, [visible]);

  useEffect(() => {
    if (visible || fadedIn) return;
    const timer = window.setTimeout(() => {
      setMounted(false);
      onFadeOutComplete?.();
    }, FADE_MS);
    return () => window.clearTimeout(timer);
  }, [visible, fadedIn, onFadeOutComplete]);

  useEffect(() => {
    if (!visible || interactionDisabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== " ") return;
      if (!fadedIn) return;
      e.preventDefault();
      e.stopPropagation();
      playUiEnterSound();
      triggerEnter();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [visible, triggerEnter, fadedIn, interactionDisabled]);

  if (!mounted) return null;

  return (
    <div
      className={`stall-enter-anchor pointer-events-none absolute ${fadedIn ? "stall-enter-anchor--visible" : ""}`}
      style={{
        left: worldX,
        top: worldY,
        zIndex,
        transform: "translate(-50%, -50%)",
      }}
    >
      <div className="stall-enter-stack stall-enter-stack--game pointer-events-auto flex flex-col items-center gap-1.5">
        <p className="stall-enter-title">{script.title}</p>
        <button
          type="button"
          className={`stall-enter-btn ${corroding ? "stall-enter-btn--corroding" : ""}`}
          data-ui-sound="enter"
          onClick={triggerEnter}
          disabled={interactionDisabled || corroding || !fadedIn}
        >
          <span className="stall-enter-btn__mask" aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={SCORE_BOARD_SRC}
              alt=""
              className="stall-enter-btn__mask-img"
              draggable={false}
            />
          </span>
          <span className="stall-enter-btn__label">進入遊戲</span>
          {corroding ? <span className="stall-enter-btn__corrode" aria-hidden /> : null}
        </button>
      </div>
    </div>
  );
}
