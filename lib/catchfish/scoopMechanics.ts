import type { FishSize } from "@/store/gameStore";

/** 按住期間每 0.5 秒扣一次耐久 */
export const HOLD_DRAIN_INTERVAL = 0.5;

/** 各體型需維持按住秒數 */
export const SCOOP_HOLD_SEC: Record<FishSize, number> = {
  small: 0.5,
  medium: 1.5,
  large: 2.5,
};

/** 按住期間每 0.5 秒扣除的耐久（%） */
export const HOLD_DRAIN_PER_INTERVAL: Record<FishSize, number> = {
  small: 5,
  medium: 10,
  large: 15,
};

/** 成功撈到瞬間額外扣除的耐久（%） */
export const CATCH_DURABILITY_COST: Record<FishSize, number> = {
  small: 15,
  medium: 20,
  large: 25,
};

export function holdDrainPerSecond(size: FishSize): number {
  return HOLD_DRAIN_PER_INTERVAL[size] / HOLD_DRAIN_INTERVAL;
}

export function catchDurabilityCost(size: FishSize): number {
  return CATCH_DURABILITY_COST[size];
}

export function scoopHoldDuration(size: FishSize): number {
  return SCOOP_HOLD_SEC[size];
}

/** 按住 + 撈到合計耐久消耗（%） */
export function totalScoopDurabilityCost(size: FishSize): number {
  const holdTicks = SCOOP_HOLD_SEC[size] / HOLD_DRAIN_INTERVAL;
  return holdTicks * HOLD_DRAIN_PER_INTERVAL[size] + CATCH_DURABILITY_COST[size];
}

/** 魚閃躲：網子進入此距離後，延遲一段時間再逃離 */
export const FLEE_RADIUS = 220;
export const FLEE_DELAY_SEC = 0.15;
export const FLEE_SPEED_MUL = 4.2;
/** 網口碰到魚時的逃離倍率 */
export const FLEE_CONTACT_SPEED_MUL = 7.5;
/** 按住撈魚時，非目標魚的逃離倍率 */
export const FLEE_SCOOP_NEAR_MUL = 6.0;
/** 按住空白鍵時，非目標魚在較遠距離的逃離倍率 */
export const FLEE_SCOOP_FAR_MUL = 3.8;
/** 被撈中魚的掙扎移動倍率 */
export const SCOOP_STRUGGLE_SPEED_MUL = 0.07;
export const SCOOP_STRUGGLE_JITTER = 110;
