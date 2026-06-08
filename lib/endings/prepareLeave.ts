"use client";

import { resolveEndingId } from "@/lib/endings/resolveEnding";
import type { EndingId } from "@/lib/endings/types";
import { useCollectibleStore } from "@/store/collectibleStore";

/** 離開夜市前依背包狀態判定結局（不自動發放氛圍物） */
export function prepareItemsForLeave(): EndingId {
  const collectibleState = useCollectibleStore.getState();
  if (!collectibleState.hydrated) {
    collectibleState.hydrate();
  }

  return resolveEndingId(collectibleState.acquired);
}
