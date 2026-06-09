import { backgroundCoverTransform, bucketTargetPosition } from "@/lib/catchfish/bucketLayout";
import { FISH_SPRITES } from "@/lib/catchfish/spriteMeta";

/** 設計座標下的魚與魚間距 */
export const CAUGHT_SLOT_GAP = 18;

/** 排列時略為放大，仍保留各魚原始 r 差異 */
export const CAUGHT_DISPLAY_SIZE_BOOST = 1.35;

export type CaughtFishDisplay = {
  spriteIndex: number;
  r: number;
  x: number;
  y: number;
  angle: number;
  scaleMul: number;
};

export type CaughtFishStackEntry = {
  r: number;
  spriteIndex: number;
  scaleMul?: number;
};

function fishDisplayHeight(entry: CaughtFishStackEntry): number {
  const meta = FISH_SPRITES[entry.spriteIndex];
  const mul = (entry.scaleMul ?? caughtFishDisplayScale()) * entry.r;
  if (!meta) return mul * 2;
  const scale = mul / meta.collisionRadius;
  return meta.nativeH * scale;
}

export function caughtFishDisplayScale(): number {
  return CAUGHT_DISPLAY_SIZE_BOOST;
}

/** 已撈魚垂直堆疊欄：對齊可見魚桶，窄螢幕時改釘在畫布右側 */
function caughtColumnAnchor(cw: number, ch: number) {
  const bucket = bucketTargetPosition(cw, ch);
  const pad = Math.min(cw, ch) * 0.06;
  const inset = pad + 28;

  let x = bucket.x;
  if (x > cw - inset) x = cw - inset;
  if (x < cw * 0.5) x = cw * 0.78;

  let startY = ch * 0.13;
  if (bucket.y > pad && bucket.y < ch - pad) {
    startY = Math.min(ch * 0.13, bucket.y - ch * 0.28);
  }
  startY = Math.max(pad, startY);

  return { x, startY };
}

/** 垂直堆疊：每條魚依自身尺寸占位，彼此保留 gap */
export function caughtFishSlotPosition(
  fishR: number,
  spriteIndex: number,
  previousCaught: ReadonlyArray<CaughtFishStackEntry>,
  cw: number,
  ch: number,
) {
  const displayScale = caughtFishDisplayScale();
  const { scale } = backgroundCoverTransform(cw, ch);
  const gap = CAUGHT_SLOT_GAP * scale;
  const anchor = caughtColumnAnchor(cw, ch);
  let stackTop = 0;

  for (const prev of previousCaught) {
    stackTop += fishDisplayHeight(prev) + gap;
  }

  const thisHeight = fishDisplayHeight({ r: fishR, spriteIndex, scaleMul: displayScale });

  return {
    x: anchor.x,
    y: anchor.startY + stackTop + thisHeight * 0.5,
  };
}

/** 視窗尺寸變更後，重算右側已撈魚堆疊位置 */
export function relayoutCaughtFishStack(
  caught: CaughtFishDisplay[],
  cw: number,
  ch: number,
): void {
  const entries: CaughtFishStackEntry[] = [];
  for (const fish of caught) {
    const pos = caughtFishSlotPosition(fish.r, fish.spriteIndex, entries, cw, ch);
    fish.x = pos.x;
    fish.y = pos.y;
    entries.push({
      r: fish.r,
      spriteIndex: fish.spriteIndex,
      scaleMul: fish.scaleMul,
    });
  }
}
