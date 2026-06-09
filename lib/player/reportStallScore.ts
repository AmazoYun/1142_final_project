"use client";

import { spawnFortuneSlipAfterRound } from "@/lib/collectibles/spawnFortuneSlip";
import type { StallId } from "@/lib/narrative/types";
import { markStallPlayed } from "@/lib/player/markStallPlayed";
import { usePlayerStore } from "@/store/playerStore";

export function reportStallScore(stallId: StallId, score: number) {
  usePlayerStore.getState().hydrate();
  usePlayerStore.getState().recordStallScore(stallId, score);
  markStallPlayed(stallId);
  spawnFortuneSlipAfterRound(stallId, score);
}
