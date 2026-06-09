"use client";

import { acquireCollectible, hasCollectible } from "@/lib/collectibles/acquireItem";
import { fortuneSlipForStall } from "@/lib/collectibles/fortuneSlips";
import type { StallId } from "@/lib/narrative/types";
import { useNarrativeStore } from "@/store/narrativeStore";

/** 回合得分後登記籤詩生成（實際座標於 Hub 依畫面尺寸解析） */
export function spawnFortuneSlipAfterRound(stallId: StallId, score: number) {
  if (score <= 0) return;

  const itemId = fortuneSlipForStall(stallId);
  if (!itemId) return;

  const narrative = useNarrativeStore.getState();
  if (!narrative.hydrated) narrative.hydrate();
  if (hasCollectible(itemId)) return;
  if (narrative.charmSpawns.some((s) => s.itemId === itemId)) return;

  narrative.addCharmSpawn({ stallId, itemId });
}

export function pickupCharmSpawnItem(spawnId: string) {
  const narrative = useNarrativeStore.getState();
  if (!narrative.hydrated) narrative.hydrate();
  const spawn = narrative.pickupCharmSpawn(spawnId);
  if (!spawn) return { success: false as const, reason: "not_found" as const };
  return acquireCollectible(spawn.itemId);
}
