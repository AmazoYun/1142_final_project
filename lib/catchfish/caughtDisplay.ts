import { designToCanvas } from "@/lib/catchfish/bucketLayout";
import { FISH_SPRITES } from "@/lib/catchfish/spriteMeta";

/** 右側魚桶區：已撈起的魚由上方開始垂直排列 */
export const CAUGHT_COLUMN_ORIGIN = { x: 2410, y: 370 };
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

/** 垂直堆疊：每條魚依自身尺寸占位，彼此保留 gap */
export function caughtFishSlotPosition(
  fishR: number,
  spriteIndex: number,
  previousCaught: ReadonlyArray<CaughtFishStackEntry>,
  cw: number,
  ch: number,
) {
  const displayScale = caughtFishDisplayScale();
  let stackTop = 0;

  for (const prev of previousCaught) {
    stackTop += fishDisplayHeight(prev) + CAUGHT_SLOT_GAP;
  }

  const thisHeight = fishDisplayHeight({ r: fishR, spriteIndex, scaleMul: displayScale });
  const designY = CAUGHT_COLUMN_ORIGIN.y + stackTop + thisHeight * 0.5;

  return designToCanvas(CAUGHT_COLUMN_ORIGIN.x, designY, cw, ch);
}
