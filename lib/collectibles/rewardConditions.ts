import type { BalloonColor } from "@/lib/balloonshoot/assets";
import type { CellTarget } from "@/lib/ringtoss/boardLayout";
import { BONUS_BOTTLE_COUNT } from "@/lib/ringtoss/bottleLayout";

type BalloonLike = {
  zone: "left" | "center" | "right";
  area: "A" | "B";
  alive: boolean;
};

type BalloonRewardLike = BalloonLike & {
  color?: BalloonColor;
};

function zoneAreaAllPopped(
  balloons: BalloonRewardLike[],
  zone: BalloonRewardLike["zone"],
  area: BalloonRewardLike["area"],
): boolean {
  const group = balloons.filter((b) => b.zone === zone && b.area === area);
  return group.length > 0 && group.every((b) => !b.alive);
}

function bColorAllPopped(
  balloons: BalloonRewardLike[],
  zone: BalloonRewardLike["zone"],
  color: BalloonColor,
): boolean {
  const group = balloons.filter(
    (b) => b.zone === zone && b.area === "B" && b.color === color,
  );
  return group.length > 0 && group.every((b) => !b.alive);
}

/**
 * 射飛鏢進階道具條件（須先開啟進階模式）：
 * 1. 左、右環形氣球（A 區）全破
 * 2. 左、右 B 區各破 targetColors 指定的 4 種顏色（左右顏色相同）
 * 3. 中區環形氣球（A 區）全破，且中區 B 區同樣破掉這 4 種顏色
 */
export function balloonAdvancedRewardEligible(
  balloons: BalloonRewardLike[],
  advancedMode: boolean,
  targetColors: BalloonColor[],
): boolean {
  if (!advancedMode || targetColors.length !== 4) return false;

  if (!zoneAreaAllPopped(balloons, "left", "A")) return false;
  if (!zoneAreaAllPopped(balloons, "right", "A")) return false;
  if (!zoneAreaAllPopped(balloons, "center", "A")) return false;

  for (const color of targetColors) {
    if (!bColorAllPopped(balloons, "left", color)) return false;
    if (!bColorAllPopped(balloons, "right", color)) return false;
    if (!bColorAllPopped(balloons, "center", color)) return false;
  }

  return true;
}

export function ringTossBonusHits(targets: CellTarget[]): number {
  return targets.filter((t) => t.bonus && t.hit).length;
}

export function ringTossBonusTotal(targets: CellTarget[]): number {
  return targets.filter((t) => t.bonus).length;
}

/** 套圈圈紅色模式：5 個紅光酒瓶皆套中 */
export function ringTossRewardEligible(
  targets: CellTarget[],
  redMode: boolean,
): boolean {
  if (!redMode) return false;
  const total = ringTossBonusTotal(targets);
  if (total < BONUS_BOTTLE_COUNT) return false;
  return ringTossBonusHits(targets) >= total;
}
