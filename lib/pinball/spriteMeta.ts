/** 障礙物／彈珠 PNG 的原生尺寸與不透明區域（alpha bbox） */

export type SolidCircle = {
  nativeW: number;
  nativeH: number;
  /** 繪製時以 (x,y) 為錨點的偏移（通常為圖片中心） */
  anchorX: number;
  anchorY: number;
  collisionRadius: number;
};

export type SolidBar = {
  nativeW: number;
  nativeH: number;
  /** 不透明區域中心（圖片本地座標） */
  solidCx: number;
  solidCy: number;
  solidHalfLength: number;
  solidHalfThickness: number;
  /** 不透明長條在圖片中的角度（弧度，0=向右） */
  solidAngle: number;
};

export type SolidRect = {
  nativeW: number;
  nativeH: number;
  solidW: number;
  solidH: number;
};

export const SPRITE_ROUND: SolidCircle = {
  nativeW: 148,
  nativeH: 148,
  anchorX: 74,
  anchorY: 78,
  collisionRadius: 58,
};

export const SPRITE_LINE: SolidBar = {
  nativeW: 180,
  nativeH: 180,
  solidCx: 89.5,
  solidCy: 91,
  solidHalfLength: 79,
  solidHalfThickness: 48,
  solidAngle: Math.atan2(96, 159),
};

export const SPRITE_RECT: SolidRect = {
  nativeW: 132,
  nativeH: 133,
  solidW: 95,
  solidH: 68,
};

export const SPRITE_TRIANGLE = {
  nativeW: 280,
  nativeH: 280,
  anchorX: 140,
  anchorY: 140,
};

export const PINBALL_SOLID: Record<
  "blue" | "green" | "orange",
  { nativeW: number; nativeH: number; collisionRadius: number }
> = {
  blue: { nativeW: 114, nativeH: 114, collisionRadius: 39 },
  green: { nativeW: 117, nativeH: 112, collisionRadius: 39 },
  orange: { nativeW: 95, nativeH: 95, collisionRadius: 38 },
};

export const PINBALL_COLOR_KEYS = ["blue", "green", "orange"] as const;

export function lineSolidSegment(
  x: number,
  y: number,
  rotation: number,
): { a: { x: number; y: number }; b: { x: number; y: number } } {
  const cos = Math.cos(rotation + SPRITE_LINE.solidAngle);
  const sin = Math.sin(rotation + SPRITE_LINE.solidAngle);
  const hl = SPRITE_LINE.solidHalfLength;
  const lx = SPRITE_LINE.solidCx - SPRITE_LINE.nativeW / 2;
  const ly = SPRITE_LINE.solidCy - SPRITE_LINE.nativeH / 2;
  const ox = x - SPRITE_LINE.nativeW / 2 + lx;
  const oy = y - SPRITE_LINE.nativeH / 2 + ly;
  return {
    a: { x: ox - cos * hl, y: oy - sin * hl },
    b: { x: ox + cos * hl, y: oy + sin * hl },
  };
}
