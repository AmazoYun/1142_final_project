"use client";

import { DIRECT_LEAVE_PENALTY } from "@/lib/player/scoreTotals";
import { useNarrativeStore } from "@/store/narrativeStore";
import { usePlayerStore } from "@/store/playerStore";

/** 前導選「直接離開」時：對所有存檔扣分一次（可為負分，重複點擊不疊加） */
export function applyDirectLeavePenalty() {
  usePlayerStore.getState().hydrate();
  useNarrativeStore.getState().hydrate();

  if (useNarrativeStore.getState().directLeavePenaltyApplied) return;

  usePlayerStore.getState().applyDirectLeavePenaltyToAllSaves(DIRECT_LEAVE_PENALTY);
  useNarrativeStore.getState().markDirectLeavePenaltyApplied();
}
