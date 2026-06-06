import type { LoadedPinballAssets } from "@/lib/pinball/assets";
import { chargeMeterBounds } from "@/lib/pinball/boardLayout";
import { PINBALL_COLOR_KEYS, PINBALL_SOLID } from "@/lib/pinball/spriteMeta";
import type { ImageObstacle, LayoutData } from "@/lib/pinball/types";
import { obstacleHalfExtents } from "@/lib/pinball/imageBody";
import { drawOrientedSelection } from "@/lib/pinball/editHandles";
import type { OrientedFrame } from "@/lib/pinball/editHandles";
import { obstacleKey } from "@/lib/pinball/unifiedLayout";

export function obstacleOrientedFrame(
  obs: ImageObstacle,
  body: { nativeW: number; nativeH: number },
): OrientedFrame {
  const { halfW, halfH } = obstacleHalfExtents(body, obs.scale);
  return { cx: obs.x, cy: obs.y, halfW, halfH, rotation: obs.rotation };
}

function drawImageObstacle(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  obs: ImageObstacle,
) {
  const w = img.naturalWidth * obs.scale;
  const h = img.naturalHeight * obs.scale;
  ctx.save();
  ctx.translate(obs.x, obs.y);
  ctx.rotate(obs.rotation);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

/** 滿版繪製背景，不裁切 */
export function drawPinballBackground(
  ctx: CanvasRenderingContext2D,
  assets: LoadedPinballAssets | null,
  width: number,
  height: number,
) {
  if (assets?.background) {
    ctx.drawImage(assets.background, 0, 0, width, height);
    return;
  }
  ctx.fillStyle = "#2a2018";
  ctx.fillRect(0, 0, width, height);
}

/** 依統一 layout 繪製障礙物（繪製 = 碰撞用的同一張圖） */
export function drawObstacleSprites(
  ctx: CanvasRenderingContext2D,
  assets: LoadedPinballAssets | null,
  layout: LayoutData,
  selectedKey = "",
  editMode = false,
) {
  if (!assets) return;

  layout.obstacles.forEach((obs, i) => {
    const img =
      obs.kind === "round"
        ? assets.obstacleRound
        : obs.kind === "line"
          ? assets.obstacleLine
          : obs.kind === "triangle"
            ? assets.obstacleTriangle
            : assets.obstacleRect;
    drawImageObstacle(ctx, img, obs);
    if (editMode && selectedKey === obstacleKey(i)) {
      const body = assets.bodies[obs.kind];
      drawOrientedSelection(ctx, obstacleOrientedFrame(obs, body), true);
    }
  });
}

export function drawPinballSprite(
  ctx: CanvasRenderingContext2D,
  assets: LoadedPinballAssets | null,
  x: number,
  y: number,
  colorIndex: number,
) {
  if (x < -100 || y < -100) return;
  const key = PINBALL_COLOR_KEYS[colorIndex] ?? "blue";
  const meta = PINBALL_SOLID[key];
  const img = assets?.pinballs[colorIndex];
  if (img) {
    ctx.drawImage(
      img,
      x - meta.nativeW / 2,
      y - meta.nativeH / 2,
      meta.nativeW,
      meta.nativeH,
    );
    return;
  }
  ctx.fillStyle = ["#5eb3ff", "#6bdd6b", "#ffb04d"][colorIndex] ?? "#95dfff";
  ctx.beginPath();
  ctx.arc(x, y, meta.collisionRadius, 0, Math.PI * 2);
  ctx.fill();
}

/** 棋盤右下角木槽內的力度條（僅此處使用木頭材質） */
export function drawChargeMeter(
  ctx: CanvasRenderingContext2D,
  assets: LoadedPinballAssets | null,
  ratio: number,
) {
  const { left, top, right, bottom } = chargeMeterBounds();
  const w = right - left;
  const h = bottom - top;
  if (w <= 0 || h <= 0) return;

  ctx.save();

  if (assets?.channelWood) {
    ctx.drawImage(assets.channelWood, left, top, w, h);
  } else {
    ctx.fillStyle = "#4a3220";
    ctx.fillRect(left, top, w, h);
  }

  const padX = 4;
  const padY = 5;
  const ix = left + padX;
  const iy = top + padY;
  const iw = w - padX * 2;
  const ih = h - padY * 2;
  if (iw <= 0 || ih <= 0) {
    ctx.restore();
    return;
  }

  const clamped = Math.max(0, Math.min(1, ratio));
  if (clamped <= 0.004) {
    ctx.restore();
    return;
  }

  const fillH = Math.max(2, ih * clamped);
  const fillTop = iy + ih - fillH;
  const cornerR = Math.min(iw * 0.32, fillH * 0.42, 7);

  ctx.beginPath();
  ctx.roundRect(ix, fillTop, iw, fillH, cornerR);
  ctx.clip();

  const vert = ctx.createLinearGradient(ix, iy + ih, ix, iy);
  vert.addColorStop(0, "rgba(120, 58, 42, 0.72)");
  vert.addColorStop(0.45, "rgba(185, 52, 42, 0.82)");
  vert.addColorStop(0.78, "rgba(235, 95, 58, 0.9)");
  vert.addColorStop(1, "rgba(255, 228, 175, 0.98)");
  ctx.fillStyle = vert;
  ctx.fillRect(ix, fillTop - cornerR, iw, fillH + cornerR);

  const horiz = ctx.createLinearGradient(ix, 0, ix + iw, 0);
  horiz.addColorStop(0, "rgba(0, 0, 0, 0)");
  horiz.addColorStop(0.22, "rgba(0, 0, 0, 0.55)");
  horiz.addColorStop(0.5, "rgba(0, 0, 0, 1)");
  horiz.addColorStop(0.78, "rgba(0, 0, 0, 0.55)");
  horiz.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.globalCompositeOperation = "destination-in";
  ctx.fillStyle = horiz;
  ctx.fillRect(ix, fillTop - cornerR, iw, fillH + cornerR);

  const topFade = ctx.createLinearGradient(0, fillTop, 0, fillTop + fillH);
  topFade.addColorStop(0, "rgba(0, 0, 0, 0)");
  topFade.addColorStop(0.12, "rgba(0, 0, 0, 0.55)");
  topFade.addColorStop(0.28, "rgba(0, 0, 0, 1)");
  topFade.addColorStop(1, "rgba(0, 0, 0, 1)");
  ctx.fillStyle = topFade;
  ctx.fillRect(ix, fillTop - cornerR, iw, fillH + cornerR);

  ctx.globalCompositeOperation = "source-over";
  ctx.restore();
}
