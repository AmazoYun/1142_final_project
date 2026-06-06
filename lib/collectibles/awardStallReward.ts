"use client";

import type { StallId } from "@/lib/narrative/types";
import { useNarrativeStore } from "@/store/narrativeStore";
import { acquireCollectible } from "./acquireItem";
import { STALL_REWARD } from "./stallRewards";

/** 小遊戲結束時發放對應道具並記錄攤位通關 */
export function awardStallReward(stallId: StallId) {
  const itemId = STALL_REWARD[stallId];
  const result = acquireCollectible(itemId);
  if (result.success) {
    useNarrativeStore.getState().markStallCompleted(stallId);
  }
  return result;
}
