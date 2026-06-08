/** PNG alpha 不透明區邊界（用於繪製錨點與碰撞半徑換算） */

export type AlphaBBox = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export type FishSpriteMeta = {
  nativeW: number;
  nativeH: number;
  bbox: AlphaBBox;
  /** 不透明區外接半徑（max(bw,bh)/2） */
  collisionRadius: number;
  /** 不透明區中心（圖片本地座標） */
  solidCx: number;
  solidCy: number;
};

export type NetSpriteMeta = {
  nativeW: number;
  nativeH: number;
  bbox: AlphaBBox;
  /** 網口中心（撈取判定錨點） */
  scoopCx: number;
  scoopCy: number;
  /** 網口半徑（原生像素，對應 catchRadius 縮放） */
  scoopRadius: number;
};

function bboxMetrics(bbox: AlphaBBox): Pick<FishSpriteMeta, "collisionRadius" | "solidCx" | "solidCy"> {
  const bw = bbox.maxX - bbox.minX + 1;
  const bh = bbox.maxY - bbox.minY + 1;
  return {
    collisionRadius: Math.max(bw, bh) / 2,
    solidCx: (bbox.minX + bbox.maxX) / 2,
    solidCy: (bbox.minY + bbox.maxY) / 2,
  };
}

export const FISH_SPRITES: FishSpriteMeta[] = [
  {
    nativeW: 232,
    nativeH: 119,
    bbox: { minX: 32, minY: 28, maxX: 228, maxY: 92 },
    ...bboxMetrics({ minX: 32, minY: 28, maxX: 228, maxY: 92 }),
  },
  {
    nativeW: 341,
    nativeH: 223,
    bbox: { minX: 20, minY: 56, maxX: 311, maxY: 188 },
    ...bboxMetrics({ minX: 20, minY: 56, maxX: 311, maxY: 188 }),
  },
  {
    nativeW: 285,
    nativeH: 210,
    bbox: { minX: 18, minY: 68, maxX: 259, maxY: 135 },
    ...bboxMetrics({ minX: 18, minY: 68, maxX: 259, maxY: 135 }),
  },
  {
    nativeW: 268,
    nativeH: 207,
    bbox: { minX: 26, minY: 57, maxX: 242, maxY: 166 },
    ...bboxMetrics({ minX: 26, minY: 57, maxX: 242, maxY: 166 }),
  },
  {
    nativeW: 534,
    nativeH: 417,
    bbox: { minX: 44, minY: 59, maxX: 481, maxY: 390 },
    ...bboxMetrics({ minX: 44, minY: 59, maxX: 481, maxY: 390 }),
  },
  {
    nativeW: 381,
    nativeH: 288,
    bbox: { minX: 40, minY: 98, maxX: 337, maxY: 219 },
    ...bboxMetrics({ minX: 40, minY: 98, maxX: 337, maxY: 219 }),
  },
];

export const NET_SPRITE: NetSpriteMeta = {
  nativeW: 1326,
  nativeH: 809,
  bbox: { minX: 62, minY: 62, maxX: 1265, maxY: 712 },
  scoopCx: 920,
  scoopCy: 200,
  scoopRadius: 150,
};

/** fish_1、fish_3 小魚；fish_2、fish_4、fish_6 中魚；fish_5 大魚 */
const SMALL_SPRITES = [0, 2];
const MEDIUM_SPRITES = [1, 3, 5];
const LARGE_SPRITES = [4];

export function sizeFromSpriteIndex(spriteIndex: number): "small" | "medium" | "large" {
  if (SMALL_SPRITES.includes(spriteIndex)) return "small";
  if (LARGE_SPRITES.includes(spriteIndex)) return "large";
  return "medium";
}

/** 依體型挑選魚的素材索引 */
export function pickFishSpriteIndex(size: "small" | "medium" | "large"): number {
  if (size === "small") {
    return SMALL_SPRITES[Math.floor(Math.random() * SMALL_SPRITES.length)]!;
  }
  if (size === "large") {
    return LARGE_SPRITES[0]!;
  }
  return MEDIUM_SPRITES[Math.floor(Math.random() * MEDIUM_SPRITES.length)]!;
}

export function netDrawScale(catchRadius: number): number {
  return catchRadius / NET_SPRITE.scoopRadius;
}

/** 撈網網口中心在圓池內活動時的邊界預留（以網口半徑為準，把手可超出圓池） */
export function netArenaMargin(catchRadius: number): number {
  return catchRadius;
}
