import {
  caughtFishDisplayScale,
  caughtFishSlotPosition,
  type CaughtFishStackEntry,
} from "@/lib/catchfish/caughtDisplay";
import { catchDurabilityCost } from "@/lib/catchfish/scoopMechanics";
import type { FishSize } from "@/store/gameStore";

export type CatchAnimation = {
  spriteIndex: number;
  r: number;
  fromX: number;
  fromY: number;
  fromAngle: number;
  toX: number;
  toY: number;
  displayAngle: number;
  displayScale: number;
  slotIndex: number;
  progress: number;
  duration: number;
  points: number;
  catchCost: number;
};

export const CATCH_ANIM_DURATION = 0.65;

export function createCatchAnimation(
  fish: {
    x: number;
    y: number;
    r: number;
    angle: number;
    spriteIndex: number;
    points: number;
    size: FishSize;
  },
  cw: number,
  ch: number,
  slotIndex: number,
  previousCaught: ReadonlyArray<CaughtFishStackEntry>,
): CatchAnimation {
  const slot = caughtFishSlotPosition(fish.r, fish.spriteIndex, previousCaught, cw, ch);
  return {
    spriteIndex: fish.spriteIndex,
    r: fish.r,
    fromX: fish.x,
    fromY: fish.y,
    fromAngle: fish.angle,
    toX: slot.x,
    toY: slot.y,
    displayAngle: 0,
    displayScale: caughtFishDisplayScale(),
    slotIndex,
    progress: 0,
    duration: CATCH_ANIM_DURATION,
    points: fish.points,
    catchCost: catchDurabilityCost(fish.size),
  };
}

export function catchAnimPose(anim: CatchAnimation) {
  const t = Math.max(0, Math.min(1, anim.progress));
  const ease = t * t * (3 - 2 * t);
  const x = anim.fromX + (anim.toX - anim.fromX) * ease;
  const y = anim.fromY + (anim.toY - anim.fromY) * ease - Math.sin(t * Math.PI) * 24;

  let angleDiff = anim.displayAngle - anim.fromAngle;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
  const angle = anim.fromAngle + angleDiff * ease;
  const scale = 1 + (anim.displayScale - 1) * ease;

  return { x, y, angle, scale };
}

export function catchAnimToDisplay(anim: CatchAnimation): {
  spriteIndex: number;
  r: number;
  x: number;
  y: number;
  angle: number;
  scaleMul: number;
} {
  return {
    spriteIndex: anim.spriteIndex,
    r: anim.r,
    x: anim.toX,
    y: anim.toY,
    angle: anim.displayAngle,
    scaleMul: anim.displayScale,
  };
}
