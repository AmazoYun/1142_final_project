"use client";

import type { StallId } from "@/lib/narrative/types";
import { useNarrativeStore } from "@/store/narrativeStore";
import { acquireCollectible } from "./acquireItem";
import type { CollectibleId } from "./types";
import { STALL_REWARD } from "./stallRewards";

/** 達成條件時發放對應道具 */
export function awardStallReward(stallId: StallId, itemId?: CollectibleId) {
  const id = itemId ?? STALL_REWARD[stallId];
  const result = acquireCollectible(id);
  if (result.success) {
    useNarrativeStore.getState().markStallCompleted(stallId);
  }
  return result;
}
