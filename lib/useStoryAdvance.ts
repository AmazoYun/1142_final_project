"use client";

import { useEffect } from "react";
import { popStoryInputBlock, pushStoryInputBlock } from "@/lib/narrative/storyInputBlock";
import { playUiButtonSound } from "@/lib/ui/uiSounds";

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      "button, a, input, textarea, select, [data-story-no-advance], .score-board-wood-btn",
    ),
  );
}

/** 空白鍵／Enter 與點擊任意處推進劇情；啟用時封鎖遊戲互動 */
export function useStoryAdvance(onAdvance?: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    pushStoryInputBlock();
    return () => popStoryInputBlock();
  }, [enabled]);

  useEffect(() => {
    if (!onAdvance || !enabled) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== "Enter") return;
      if (e.repeat) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      playUiButtonSound();
      onAdvance();
    };

    const onClick = (e: MouseEvent) => {
      if (isInteractiveTarget(e.target)) return;
      playUiButtonSound();
      onAdvance();
    };

    window.addEventListener("keydown", onKey, true);
    window.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("click", onClick, true);
    };
  }, [onAdvance, enabled]);
}
