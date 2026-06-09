"use client";

import { acquireCollectible, hasCollectible } from "@/lib/collectibles/acquireItem";
import { fortuneSlipForStall } from "@/lib/collectibles/fortuneSlips";
import type { StallId } from "@/lib/narrative/types";
import { useCollectibleStore } from "@/store/collectibleStore";
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

/** 清除地上已持有道具對應的籤詩 spawn（避免存檔不同步時無法拾取） */
export function purgeCollectedCharmSpawns() {
  const narrative = useNarrativeStore.getState();
  if (!narrative.hydrated) narrative.hydrate();

  const collectible = useCollectibleStore.getState();
  if (!collectible.hydrated) collectible.hydrate();

  const acquired = collectible.acquired;
  const stale = narrative.charmSpawns.filter((spawn) => acquired.includes(spawn.itemId));
  for (const spawn of stale) {
    narrative.pickupCharmSpawn(spawn.id);
  }
}

export function pickupCharmSpawnItem(spawnId: string) {
  const narrative = useNarrativeStore.getState();
  if (!narrative.hydrated) narrative.hydrate();

  const spawn = narrative.charmSpawns.find((s) => s.id === spawnId);
  if (!spawn) return { success: false as const, reason: "not_found" as const };

  const result = acquireCollectible(spawn.itemId);
  if (result.success || result.reason === "already_acquired") {
    narrative.pickupCharmSpawn(spawnId);
  }
  return result;
}
