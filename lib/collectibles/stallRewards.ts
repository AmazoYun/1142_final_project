import type { StallId } from "@/lib/narrative/types";
import type { CollectibleId } from "@/lib/collectibles/types";

/** 四個小遊戲通關獎品（對應 PDF 劇情物件） */
export const STALL_REWARD: Record<StallId, CollectibleId> = {
  pinball: "rust-coin",
  balloonshoot: "whistle",
  ringtoss: "keychain",
  catchfish: "bracelet",
};

export const GAME_COLLECTIBLE_IDS = Object.values(STALL_REWARD);

/** 離開夜市時撿到的氛圍物品（非小遊戲取得） */
export const AMBIENT_COLLECTIBLE_IDS: CollectibleId[] = [
  "point-card",
  "plastic-mask",
];
