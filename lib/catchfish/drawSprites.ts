import type { LoadedCatchFishAssets } from "@/lib/catchfish/assets";
import {
  FISH_SPRITES,
  NET_SPRITE,
  netDrawScale,
  type FishSpriteMeta,
} from "@/lib/catchfish/spriteMeta";

type FishDrawState = {
  x: number;
  y: number;
  angle: number;
  r: number;
  spriteIndex: number;
  scaleMul?: number;
  alpha?: number;
  shakeX?: number;
  shakeY?: number;
};

/** 背景 cover 鋪滿整個 canvas */
export function drawCatchFishBackground(
  ctx: CanvasRenderingContext2D,
  assets: LoadedCatchFishAssets | null,
  cw: number,
  ch: number,
) {
  if (!assets?.background) {
    ctx.fillStyle = "#2a2218";
    ctx.fillRect(0, 0, cw, ch);
    return;
  }

  const img = assets.background;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.max(cw / iw, ch / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (cw - dw) / 2;
  const dy = (ch - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function fishDrawMetrics(meta: FishSpriteMeta, gameRadius: number) {
  const scale = gameRadius / meta.collisionRadius;
  return {
    scale,
    drawW: meta.nativeW * scale,
    drawH: meta.nativeH * scale,
    anchorX: meta.solidCx * scale,
    anchorY: meta.solidCy * scale,
  };
}

/**
 * 魚素材頭部在左側；翻轉 X 後再依 angle 旋轉，使頭部朝向游動方向。
 * 繪製錨點為 alpha 不透明區中心，與碰撞圓心一致。
 */
export function drawFishSprite(
  ctx: CanvasRenderingContext2D,
  assets: LoadedCatchFishAssets | null,
  fish: FishDrawState,
) {
  const meta = FISH_SPRITES[fish.spriteIndex];
  if (!meta) return;

  const img = assets?.fish[fish.spriteIndex];
  const scaleMul = fish.scaleMul ?? 1;
  const { drawW, drawH, anchorX, anchorY } = fishDrawMetrics(meta, fish.r * scaleMul);

  ctx.save();
  ctx.globalAlpha = fish.alpha ?? 1;
  ctx.translate(fish.x + (fish.shakeX ?? 0), fish.y + (fish.shakeY ?? 0));
  ctx.rotate(fish.angle);
  ctx.scale(-1, 1);

  if (img) {
    ctx.drawImage(img, -anchorX, -anchorY, drawW, drawH);
  } else {
    ctx.fillStyle = "#a3a3a3";
    ctx.beginPath();
    ctx.ellipse(0, 0, fish.r * 1.5, fish.r, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/** 撈網：網口中心對齊 (x,y)，素材錨點為網口中心 */
export function drawNetSprite(
  ctx: CanvasRenderingContext2D,
  assets: LoadedCatchFishAssets | null,
  x: number,
  y: number,
  catchRadius: number,
  opts?: { broken?: boolean; shakeX?: number; alpha?: number },
) {
  const scale = netDrawScale(catchRadius);
  const drawW = NET_SPRITE.nativeW * scale;
  const drawH = NET_SPRITE.nativeH * scale;
  const anchorX = NET_SPRITE.scoopCx * scale;
  const anchorY = NET_SPRITE.scoopCy * scale;
  const shakeX = opts?.shakeX ?? 0;

  ctx.save();
  ctx.globalAlpha = opts?.alpha ?? 1;

  const img =
    opts?.broken && assets?.netBroken ? assets.netBroken : assets?.net;

  if (img) {
    ctx.drawImage(img, x - anchorX + shakeX, y - anchorY, drawW, drawH);
    if (opts?.broken && !assets?.netBroken) {
      ctx.strokeStyle = "rgba(40, 20, 10, 0.85)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - anchorX + shakeX + drawW * 0.35, y - anchorY + drawH * 0.25);
      ctx.lineTo(x - anchorX + shakeX + drawW * 0.55, y - anchorY + drawH * 0.45);
      ctx.lineTo(x - anchorX + shakeX + drawW * 0.4, y - anchorY + drawH * 0.65);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  ctx.strokeStyle = "#78350f";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(x + shakeX, y, catchRadius, Math.PI, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** 撈魚進度條（顯示於魚上方） */
export function drawScoopProgressBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  fishR: number,
  progress: number,
) {
  const barW = Math.max(36, fishR * 2.2);
  const barH = 5;
  const bx = x - barW / 2;
  const by = y - fishR - 16;

  ctx.save();
  ctx.fillStyle = "rgba(10, 10, 10, 0.55)";
  ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
  ctx.fillStyle = "rgba(60, 60, 60, 0.8)";
  ctx.fillRect(bx, by, barW, barH);
  ctx.fillStyle = progress >= 1 ? "#fbbf24" : "#4ade80";
  ctx.fillRect(bx, by, barW * Math.max(0, Math.min(1, progress)), barH);
  ctx.restore();
}
