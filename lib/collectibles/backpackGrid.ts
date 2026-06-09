import { narrativeDefault } from "@/data/narrative-default";
import { STALL_REWARD } from "@/lib/collectibles/stallRewards";
import type { CollectibleId } from "@/lib/collectibles/types";
import type { StallId } from "@/lib/narrative/types";
import type { LotteryTicketType } from "@/store/tokenStore";

/** 上方四格固定順序：四個攤位專屬道具 */
export const SPECIAL_SLOT_ITEMS: CollectibleId[] = [
  STALL_REWARD.pinball,
  STALL_REWARD.balloonshoot,
  STALL_REWARD.ringtoss,
  STALL_REWARD.catchfish,
];

export const SPECIAL_ITEM_STALL: Record<CollectibleId, StallId> = {
  [STALL_REWARD.pinball]: "pinball",
  [STALL_REWARD.balloonshoot]: "balloonshoot",
  [STALL_REWARD.ringtoss]: "ringtoss",
  [STALL_REWARD.catchfish]: "catchfish",
};

export type BackpackGridEntry =
  | { kind: "special"; id: CollectibleId; slotIndex: number; acquired: boolean }
  | { kind: "collectible"; id: CollectibleId; slotIndex: number }
  | { kind: "lottery"; ticketType: LotteryTicketType; count: number; slotIndex: number };

export function lockedSpecialHint(stallId: StallId): string {
  const title = narrativeDefault.stalls[stallId]?.title ?? stallId;
  return `?????\n提示：在${title}取得。`;
}

export function buildBackpackGridEntries(
  acquired: CollectibleId[],
  ticket10: number,
  ticket50: number,
): BackpackGridEntry[] {
  const entries: BackpackGridEntry[] = [];
  const specialSet = new Set(SPECIAL_SLOT_ITEMS);

  for (let i = 0; i < SPECIAL_SLOT_ITEMS.length; i += 1) {
    const id = SPECIAL_SLOT_ITEMS[i]!;
    entries.push({
      kind: "special",
      id,
      slotIndex: i,
      acquired: acquired.includes(id),
    });
  }

  let slotIndex = 4;
  for (const id of acquired) {
    if (specialSet.has(id)) continue;
    if (slotIndex >= 12) break;
    entries.push({ kind: "collectible", id, slotIndex });
    slotIndex += 1;
  }

  if (ticket10 > 0 && slotIndex < 12) {
    entries.push({ kind: "lottery", ticketType: "ticket10", count: ticket10, slotIndex });
    slotIndex += 1;
  }
  if (ticket50 > 0 && slotIndex < 12) {
    entries.push({ kind: "lottery", ticketType: "ticket50", count: ticket50, slotIndex });
  }

  return entries;
}
