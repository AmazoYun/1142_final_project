"use client";

import { isAcquireSequenceBlocking } from "@/lib/collectibles/acquireSequence";
import { isStoryInputBlocked } from "@/lib/narrative/storyInputBlock";
import { useCollectibleStore } from "@/store/collectibleStore";

/** 劇情文本或取得道具流程進行中時，小遊戲應封鎖所有操作 */
export function isGameInputBlocked(): boolean {
  if (isStoryInputBlocked()) return true;
  const state = useCollectibleStore.getState();
  if (!state.hydrated) return false;
  return isAcquireSequenceBlocking(
    state.pendingAcquireDialogue,
    state.pendingAcquireAnimation,
  );
}
