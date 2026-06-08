import { GAME_COLLECTIBLE_IDS } from "@/lib/collectibles/stallRewards";
import type { CollectibleId } from "@/lib/collectibles/types";
import type { EndingId } from "./types";

function countGameItems(acquired: CollectibleId[]) {
  return GAME_COLLECTIBLE_IDS.filter((id) => acquired.includes(id)).length;
}

function hasAllGameItems(acquired: CollectibleId[]) {
  return countGameItems(acquired) >= 4;
}

/**
 * 四結局判定：
 * - true（結局四）：集滿 1–4 道具 + 集點卡 + 超人面具
 * - basic（結局一）：集滿 1–4 道具（無論有無集點卡）
 * - stuck（結局三）：只有集點卡，未取得任何遊戲道具
 * - loop（結局二）：未集滿 1–4 道具
 */
export function resolveEndingId(acquired: CollectibleId[]): EndingId {
  const gameCount = countGameItems(acquired);
  const hasCard = acquired.includes("point-card");
  const hasMask = acquired.includes("plastic-mask");

  if (hasAllGameItems(acquired) && hasCard && hasMask) {
    return "true";
  }

  if (hasAllGameItems(acquired)) {
    return "basic";
  }

  if (gameCount === 0 && hasCard && !hasMask) {
    return "stuck";
  }

  return "loop";
}
