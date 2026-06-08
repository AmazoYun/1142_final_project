"use client";

import { useEffect } from "react";
import {
  playUiButtonSound,
  playUiEnterSound,
  preloadUiSounds,
  resolveUiSoundKind,
} from "@/lib/ui/uiSounds";

/** 全域按鈕點擊音效；`data-ui-sound="enter"` 使用 enter 音效 */
export default function UiSoundProvider() {
  useEffect(() => {
    preloadUiSounds();

    const onPointerUp = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const kind = resolveUiSoundKind(event.target);
      if (kind === "enter") {
        playUiEnterSound();
        return;
      }
      if (kind === "button") {
        playUiButtonSound();
      }
    };

    document.addEventListener("pointerup", onPointerUp, true);
    return () => document.removeEventListener("pointerup", onPointerUp, true);
  }, []);

  return null;
}
