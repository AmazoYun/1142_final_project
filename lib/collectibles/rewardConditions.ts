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

function centerBColorPoppedCount(
  balloons: BalloonRewardLike[],
  color: BalloonColor,
): number {
  return balloons.filter(
    (b) => b.zone === "center" && b.area === "B" && b.color === color && !b.alive,
  ).length;
}

/**
 * 射氣球進階道具（須先開啟進階模式）：
 * 1. 左、中、右旋轉環（A 區）全破
 * 2. 左、右 B 區的 4 種目標色全破（進階開始時自動清除）
 * 3. 中區 B 區：每種目標色恰好破一顆（破兩顆同色即無法達成）
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

    const existsInCenter = balloons.some(
      (b) => b.zone === "center" && b.area === "B" && b.color === color,
    );
    if (!existsInCenter) return false;
    if (centerBColorPoppedCount(balloons, color) !== 1) return false;
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
