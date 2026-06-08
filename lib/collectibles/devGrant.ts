"use client";

import { acquireCollectible } from "@/lib/collectibles/acquireItem";
import { GAME_COLLECTIBLE_IDS } from "@/lib/collectibles/stallRewards";

/** 開發用：一次取得四個遊戲道具與集點卡（不播放取得動畫） */
export function devGrantGameItemsAndCard() {
  for (const id of [...GAME_COLLECTIBLE_IDS, "point-card"] as const) {
    acquireCollectible(id, { skipDialogue: true });
  }
}
