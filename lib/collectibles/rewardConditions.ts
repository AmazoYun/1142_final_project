import type { CellTarget } from "@/lib/ringtoss/boardLayout";
import { BONUS_BOTTLE_COUNT } from "@/lib/ringtoss/bottleLayout";

type BalloonLike = {
  zone: "left" | "center" | "right";
  area: "A" | "B";
  alive: boolean;
};

const ZONES = ["left", "center", "right"] as const;

/** 射飛鏢：任選左／中／右一區，旋轉環（A 區）全破且同區 B 區至少四顆 */
export function balloonRewardEligible(balloons: BalloonLike[]): boolean {
  return ZONES.some((zone) => {
    const aBalloons = balloons.filter((b) => b.zone === zone && b.area === "A");
    const aComplete = aBalloons.length > 0 && aBalloons.every((b) => !b.alive);
    const bPopped = balloons.filter(
      (b) => b.zone === zone && b.area === "B" && !b.alive,
    ).length;
    return aComplete && bPopped >= 4;
  });
}

export function ringTossBonusHits(targets: CellTarget[]): number {
  return targets.filter((t) => t.bonus && t.hit).length;
}

export function ringTossBonusTotal(targets: CellTarget[]): number {
  return targets.filter((t) => t.bonus).length;
}

/** 套圈圈：本局 5 個紅光酒瓶皆套中 */
export function ringTossRewardEligible(targets: CellTarget[]): boolean {
  const total = ringTossBonusTotal(targets);
  if (total < BONUS_BOTTLE_COUNT) return false;
  return ringTossBonusHits(targets) >= total;
}
