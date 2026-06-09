"use client";

import { useEffect } from "react";
import type { StoryLine } from "@/lib/narrative/types";
import {
  crossfadeToToiletAmbience,
  playGhostCry,
  playHorrorFlash,
  playPeeingSound,
  returnToNightMarketAmbience,
  startCaveAmbience,
  startIntroAmbience,
  stopIntroSounds,
  stopNightMarketAmbience,
} from "@/lib/narrative/introSounds";

/** 前導劇情依台詞節點觸發環境音／音效 */
export function useIntroLineSounds(line: StoryLine | undefined, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    if (line?.id === "intro-open") {
      startIntroAmbience();
      return;
    }
    if (line?.id === "intro-bo1") {
      stopNightMarketAmbience();
      return;
    }
    if (line?.id === "intro-v2") {
      crossfadeToToiletAmbience();
      playPeeingSound();
      return;
    }
    if (line?.id === "intro-v3") {
      returnToNightMarketAmbience();
      return;
    }
    if (line?.id === "intro-e0") {
      playGhostCry();
      return;
    }
    if (line?.id === "intro-t-flash") {
      void playHorrorFlash();
      return;
    }
    if (line?.id === "intro-bo3") {
      stopNightMarketAmbience();
      startCaveAmbience();
    }
  }, [line, enabled]);

  useEffect(() => {
    if (!enabled) return;
    return () => {
      void stopIntroSounds();
    };
  }, [enabled]);
}
