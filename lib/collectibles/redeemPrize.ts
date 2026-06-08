"use client";

import { acquireCollectible } from "@/lib/collectibles/acquireItem";
import { GAME_COLLECTIBLE_IDS } from "@/lib/collectibles/stallRewards";
import type { AcquireCollectibleResult } from "@/lib/collectibles/types";
import { useCollectibleStore } from "@/store/collectibleStore";

export type RedeemResult =
  | { ok: false; reason: "no_card" | "not_qualified" | "already_mask" }
  | { ok: true; result: AcquireCollectibleResult };

/** 兌獎：需集點卡 + 前四項道具，獲得超人面具 */
export function tryRedeemPrize(): RedeemResult {
  const state = useCollectibleStore.getState();
  if (!state.hydrated) state.hydrate();

  if (!state.hasAcquired("point-card")) {
    return { ok: false, reason: "no_card" };
  }
  if (state.hasAcquired("plastic-mask")) {
    return { ok: false, reason: "already_mask" };
  }

  const hasAllGameItems = GAME_COLLECTIBLE_IDS.every((id) => state.hasAcquired(id));
  if (!hasAllGameItems) {
    return { ok: false, reason: "not_qualified" };
  }

  const result = acquireCollectible("plastic-mask");
  return { ok: true, result };
}
