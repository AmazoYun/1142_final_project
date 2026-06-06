"use client";

import { acquireCollectible } from "@/lib/collectibles/acquireItem";
import {
  AMBIENT_COLLECTIBLE_IDS,
  GAME_COLLECTIBLE_IDS,
} from "@/lib/collectibles/stallRewards";
import { resolveEndingId } from "@/lib/endings/resolveEnding";
import type { EndingId } from "@/lib/endings/types";
import { useCollectibleStore } from "@/store/collectibleStore";

/** 離開夜市前：未集滿四獎品時撿起路邊氛圍物（不跳取得對話） */
export function prepareItemsForLeave(): EndingId {
  const collectibleState = useCollectibleStore.getState();
  if (!collectibleState.hydrated) {
    collectibleState.hydrate();
  }

  const gameCount = GAME_COLLECTIBLE_IDS.filter((id) =>
    collectibleState.hasAcquired(id),
  ).length;

  if (gameCount < 4) {
    for (const id of AMBIENT_COLLECTIBLE_IDS) {
      acquireCollectible(id, { skipDialogue: true });
    }
  }

  const acquired = useCollectibleStore.getState().acquired;
  return resolveEndingId(acquired);
}
