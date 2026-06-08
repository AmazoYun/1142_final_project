"use client";

import type { StallId } from "@/lib/narrative/types";
import { useNarrativeStore } from "@/store/narrativeStore";

/** 記錄攤位至少玩過一輪（不論是否取得道具） */
export function markStallPlayed(stallId: StallId) {
  useNarrativeStore.getState().hydrate();
  useNarrativeStore.getState().markStallPlayed(stallId);
}
