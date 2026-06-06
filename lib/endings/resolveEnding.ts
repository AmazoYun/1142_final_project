import {
  AMBIENT_COLLECTIBLE_IDS,
  GAME_COLLECTIBLE_IDS,
} from "@/lib/collectibles/stallRewards";
import type { CollectibleId } from "@/lib/collectibles/types";
import type { EndingId } from "./types";

function countGameItems(acquired: CollectibleId[]) {
  return GAME_COLLECTIBLE_IDS.filter((id) => acquired.includes(id)).length;
}

function hasAllAmbient(acquired: CollectibleId[]) {
  return AMBIENT_COLLECTIBLE_IDS.every((id) => acquired.includes(id));
}

/**
 * 依 PDF 四結局判定：
 * - true：四個遊戲獎品集滿
 * - stuck：未集滿四獎品，但持有兩件氛圍物
 * - loop：未集滿且無氛圍物組合（直接離開）
 * - basic：保留（四獎品時與 true 相同，由資料選 true）
 */
export function resolveEndingId(acquired: CollectibleId[]): EndingId {
  const gameCount = countGameItems(acquired);

  if (gameCount >= 4) {
    return "true";
  }

  if (gameCount === 0 && hasAllAmbient(acquired)) {
    return "stuck";
  }

  return "loop";
}
