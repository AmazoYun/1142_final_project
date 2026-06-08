import {
  BG_ASPECT,
  BG_NATIVE_HEIGHT,
  BG_NATIVE_WIDTH,
  PLAYER_FLOOR_RATIO,
  type HubMetrics,
} from "@/lib/market/hubLayout";
import { HUB_BACKGROUND_FRONT } from "@/lib/market/hubSceneLayers";

/** 與地上彩券垂直位置一致（NightMarketHub groundY） */
export const LOTTERY_GROUND_Y_OFFSET_PX = 14;

const FRONT_ALPHA_BLOCK_THRESHOLD = 12;
const SAMPLE_STEP_PX = 16;

type CoverRect = {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
};

export type LotteryFrontMask = {
  /** 在 playable 道路上可生成的 worldRatio 區段（0–1） */
  clearRatioRanges: { min: number; max: number }[];
};

let maskCache: { key: string; mask: LotteryFrontMask } | null = null;
let maskPromise: Promise<LotteryFrontMask> | null = null;

function resolveCoverRect(containerW: number, containerH: number): CoverRect {
  const containerRatio = containerW / containerH;
  const imageRatio = BG_ASPECT;
  if (containerRatio > imageRatio) {
    const width = containerW;
    const height = containerW / imageRatio;
    return { width, height, offsetX: 0, offsetY: (containerH - height) / 2 };
  }
  const height = containerH;
  const width = containerH * imageRatio;
  return { width, height, offsetX: (containerW - width) / 2, offsetY: 0 };
}

function maskCacheKey(metrics: HubMetrics) {
  return `${metrics.worldWidth}x${metrics.worldHeight}`;
}

function buildClearRatioRanges(
  metrics: HubMetrics,
  isClearAtWorldX: (worldX: number) => boolean,
): LotteryFrontMask {
  const minX = metrics.playableLeft;
  const maxX = metrics.playableLeft + metrics.playableWidth;
  const ranges: { min: number; max: number }[] = [];
  let rangeStart: number | null = null;

  for (let x = minX; x <= maxX; x += SAMPLE_STEP_PX) {
    const ratio = (x - metrics.playableLeft) / metrics.playableWidth;
    if (isClearAtWorldX(x)) {
      if (rangeStart === null) rangeStart = ratio;
    } else if (rangeStart !== null) {
      ranges.push({ min: rangeStart, max: ratio });
      rangeStart = null;
    }
  }

  if (rangeStart !== null) {
    ranges.push({ min: rangeStart, max: 1 });
  }

  return { clearRatioRanges: ranges };
}

export function isWorldRatioClearOnFront(
  worldRatio: number,
  mask: LotteryFrontMask,
): boolean {
  return mask.clearRatioRanges.some(
    (range) => worldRatio >= range.min && worldRatio <= range.max,
  );
}

export function loadLotteryFrontMask(metrics: HubMetrics): Promise<LotteryFrontMask> {
  const key = maskCacheKey(metrics);
  if (maskCache?.key === key) {
    return Promise.resolve(maskCache.mask);
  }
  if (maskPromise) return maskPromise;

  maskPromise = new Promise((resolve) => {
    const groundY = metrics.worldHeight * PLAYER_FLOOR_RATIO - LOTTERY_GROUND_Y_OFFSET_PX;
    const fallback = buildClearRatioRanges(metrics, () => true);

    if (typeof window === "undefined") {
      resolve(fallback);
      maskPromise = null;
      return;
    }

    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      try {
        const imageW = img.naturalWidth || BG_NATIVE_WIDTH;
        const imageH = img.naturalHeight || BG_NATIVE_HEIGHT;
        const cover = resolveCoverRect(metrics.worldWidth, metrics.worldHeight);
        const canvas = document.createElement("canvas");
        canvas.width = imageW;
        canvas.height = imageH;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          resolve(fallback);
          maskPromise = null;
          return;
        }

        ctx.drawImage(img, 0, 0, imageW, imageH);
        const imgY = ((groundY - cover.offsetY) / cover.height) * imageH;
        const row = Math.max(0, Math.min(imageH - 1, Math.round(imgY)));

        const isClearAtWorldX = (worldX: number) => {
          const imgX = ((worldX - cover.offsetX) / cover.width) * imageW;
          if (imgX < 0 || imgX >= imageW) return true;
          const col = Math.max(0, Math.min(imageW - 1, Math.round(imgX)));
          const alpha = ctx.getImageData(col, row, 1, 1).data[3] ?? 0;
          return alpha < FRONT_ALPHA_BLOCK_THRESHOLD;
        };

        const mask = buildClearRatioRanges(metrics, isClearAtWorldX);
        maskCache = { key, mask };
        resolve(mask);
      } catch {
        resolve(fallback);
      } finally {
        maskPromise = null;
      }
    };

    img.onerror = () => {
      resolve(fallback);
      maskPromise = null;
    };

    img.src = HUB_BACKGROUND_FRONT;
  });

  return maskPromise;
}
