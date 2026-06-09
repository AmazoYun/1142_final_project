import type { StallId } from "@/lib/narrative/types";
import type { CollectibleId } from "@/lib/collectibles/types";

/** 各攤位對應的籤詩道具（玩過一輪且得分後於攤位旁生成） */
export const STALL_FORTUNE_SLIP: Partial<Record<StallId, CollectibleId>> = {
  pinball: "fortune-slip-jia",
  balloonshoot: "fortune-slip-yi",
  catchfish: "fortune-slip-bing",
};

export const FORTUNE_SLIP_IDS = Object.values(STALL_FORTUNE_SLIP) as CollectibleId[];

export const FORTUNE_SLIP_IMAGE = "/backpack/charm.webp";

export function fortuneSlipForStall(stallId: StallId): CollectibleId | null {
  return STALL_FORTUNE_SLIP[stallId] ?? null;
}
