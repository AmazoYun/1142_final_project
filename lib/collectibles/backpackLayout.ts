import type { CollectibleId } from "@/lib/collectibles/types";

/** 背包背景（含拓寬外圍）；槽位座標以圖片寬高比例表示 */
export const BACKPACK_BACKGROUND = "/backpack/backpack.webp";

export const BACKPACK_IMAGE_WIDTH = 2752;
export const BACKPACK_IMAGE_HEIGHT = 1536;

export type BackpackSlotRect = {
  cx: number;
  cy: number;
  w: number;
  h: number;
};

export type CoverRect = {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
};

/** object-fit: cover 時，圖片在容器內的實際渲染區域 */
export function resolveCoverRect(
  containerW: number,
  containerH: number,
  imageW = BACKPACK_IMAGE_WIDTH,
  imageH = BACKPACK_IMAGE_HEIGHT,
): CoverRect {
  const containerRatio = containerW / containerH;
  const imageRatio = imageW / imageH;
  if (containerRatio > imageRatio) {
    const width = containerW;
    const height = containerW / imageRatio;
    return { width, height, offsetX: 0, offsetY: (containerH - height) / 2 };
  }
  const height = containerH;
  const width = containerH * imageRatio;
  return { width, height, offsetX: (containerW - width) / 2, offsetY: 0 };
}

export function slotStyleInCover(
  rect: BackpackSlotRect,
  cover: CoverRect,
): { left: number; top: number; width: number; height: number } {
  return {
    left: cover.offsetX + (rect.cx - rect.w / 2) * cover.width,
    top: cover.offsetY + (rect.cy - rect.h / 2) * cover.height,
    width: rect.w * cover.width,
    height: rect.h * cover.height,
  };
}

function slot(cx: number, cy: number, w: number, h: number): BackpackSlotRect {
  return { cx, cy, w, h };
}

/**
 * 右側 3×4 道具格（依標註圖黃框偵測；由左至右、上至下索引 0–11）
 */
export const GRID_SLOTS: BackpackSlotRect[] = [
  slot(0.51611, 0.3009, 0.09082, 0.17658),
  slot(0.60986, 0.3009, 0.09668, 0.17658),
  slot(0.70654, 0.3009, 0.09668, 0.17658),
  slot(0.80029, 0.3009, 0.09082, 0.17658),
  slot(0.51611, 0.47838, 0.09082, 0.17838),
  slot(0.60986, 0.47838, 0.09668, 0.17838),
  slot(0.70654, 0.47838, 0.09668, 0.17838),
  slot(0.80029, 0.47838, 0.09082, 0.17838),
  slot(0.51611, 0.65495, 0.09082, 0.17477),
  slot(0.60986, 0.65495, 0.09668, 0.17477),
  slot(0.70654, 0.65495, 0.09668, 0.17477),
  slot(0.80029, 0.65495, 0.09082, 0.17477),
];

/** 左側詳情：道具圖（大黃框上半） */
export const BACKPACK_DETAIL_IMAGE: BackpackSlotRect = {
  cx: 0.32471,
  cy: 0.355,
  w: 0.29199,
  h: 0.32,
};

/** 左側詳情：道具名稱 */
export const BACKPACK_DETAIL_NAME: BackpackSlotRect = {
  cx: 0.32471,
  cy: 0.52,
  w: 0.29199,
  h: 0.055,
};

/** 左側詳情：說明文字（大黃框下半；寬度為名稱欄 80%） */
export const BACKPACK_DETAIL_DESC: BackpackSlotRect = {
  cx: 0.32471,
  cy: 0.645,
  w: 0.23359,
  h: 0.19,
};

/** 兌獎鈕（紅框） */
export const BACKPACK_REDEEM_BUTTON: BackpackSlotRect = {
  cx: 0.806,
  cy: 0.182,
  w: 0.048,
  h: 0.038,
};

export const BACKPACK_ITEM_IMAGES: Record<CollectibleId, string> = {
  "rust-coin": "/backpack/coin.webp",
  whistle: "/backpack/whistler.webp",
  keychain: "/backpack/flashlight.webp",
  bracelet: "/backpack/handlace.webp",
  "point-card": "/backpack/card.webp",
  "plastic-mask": "/backpack/mask.webp",
};

/** 道具在槽內顯示尺寸（佔槽寬比例，統一大小） */
export const BACKPACK_ITEM_SIZE_RATIO = 0.68;

/** 彩票貼圖 */
export const LOTTERY_TICKET_IMAGES = {
  ticket10: "/backpack/10_dollars.webp",
  ticket50: "/backpack/50_dollars.webp",
} as const;

/** 遊戲代幣貼圖 */
export const TOKEN_IMAGE = "/backpack/token.webp";
