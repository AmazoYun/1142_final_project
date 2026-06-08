"use client";

import { useCollectibleStore } from "@/store/collectibleStore";
import { useNarrativeStore } from "@/store/narrativeStore";
import { useTokenStore } from "@/store/tokenStore";
import { clearHubPlayerPosition } from "@/lib/market/hubPlayerPosition";

/** 開新局：重置主線進度、收集品與 Hub 位置（保留已看過的開場動畫） */
export function resetGameProgress() {
  const keepIntroDone = useNarrativeStore.getState().introDone;
  useNarrativeStore.getState().resetAll();
  useCollectibleStore.getState().debugClearAllAcquired();
  useTokenStore.getState().resetEconomy();
  clearHubPlayerPosition();
  if (keepIntroDone) {
    useNarrativeStore.getState().completeIntro();
  }
}
