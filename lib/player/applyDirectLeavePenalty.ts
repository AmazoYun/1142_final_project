"use client";

import { DIRECT_LEAVE_PENALTY } from "@/lib/player/scoreTotals";
import { useNarrativeStore } from "@/store/narrativeStore";
import { usePlayerStore } from "@/store/playerStore";

/** 前導選「直接離開」時：有存檔則立刻扣分，否則待開新局時套用 */
export function applyDirectLeavePenalty() {
  usePlayerStore.getState().hydrate();
  useNarrativeStore.getState().hydrate();

  const saveId = usePlayerStore.getState().activeSaveId;
  if (saveId) {
    usePlayerStore.getState().addScorePenalty(DIRECT_LEAVE_PENALTY);
    return;
  }

  useNarrativeStore.getState().markPendingDirectLeavePenalty();
}
