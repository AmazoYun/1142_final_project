import {
  DEFAULT_BALLOON_LAYOUT,
  aHookPositionFromLayout,
  aZoneRotationCenterFromLayout,
  bHookPositionFromLayout,
  type BalloonLayoutData,
  type BalloonZone,
} from "./layoutData";

export type { BalloonZone };
export { aZoneRotationCenterFromLayout };

/** Canvas hook positions aligned to `public/balloonshoot/background.webp` (960×480 cover). */
export const A_ZONE_CENTER = DEFAULT_BALLOON_LAYOUT.aZoneCenter;

/** Heart-hook offsets from zone center; rotated each frame for A 區. */
export const A_HOOK_OFFSETS = DEFAULT_BALLOON_LAYOUT.aHookOffsets;

/** B 區 2×4 hook positions [row][col]. */
export const B_HOOKS = DEFAULT_BALLOON_LAYOUT.bHooks;

/** Sprite tie point: distance from hook to balloon body center (for hit tests). */
export const BALLOON_BODY_DROP = 0.95;

/** Sprite tie point: hook sits near the top of the balloon image. */
export const BALLOON_TIE_Y_RATIO = 0.08;

export function aHookPosition(
  zone: BalloonZone,
  ringIndex: number,
  angle: number,
  layout: BalloonLayoutData = DEFAULT_BALLOON_LAYOUT,
) {
  return aHookPositionFromLayout(layout, zone, ringIndex, angle);
}

export function bHookPosition(
  zone: BalloonZone,
  row: number,
  col: number,
  layout: BalloonLayoutData = DEFAULT_BALLOON_LAYOUT,
) {
  return bHookPositionFromLayout(layout, zone, row, col);
}
