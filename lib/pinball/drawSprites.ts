import type { LoadedPinballAssets } from "@/lib/pinball/assets";
import {
  CHANNEL_BOTTOM,
  CHANNEL_DIVIDER_X,
  CHANNEL_TOP,
  channelDividerSegment,
  chargeMeterBounds,
  launchDividerFilletCenter,
  launchDividerVerticalSegment,
  LAUNCH_DIVIDER_FILLET_R,
  PLAYFIELD_CEILING,
  PLAYFIELD_RIGHT,
  WALL,
} from "@/lib/pinball/boardLayout";
import { PINBALL_COLOR_KEYS, PINBALL_SOLID } from "@/lib/pinball/spriteMeta";
import type { ImageObstacle, LayoutData, Segment } from "@/lib/pinball/types";
import { obstacleHalfExtents, worldEdges } from "@/lib/pinball/imageBody";
import type { OrientedFrame } from "@/lib/pinball/editHandles";

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
) {
  if (!assets) return;

  for (const obs of layout.obstacles) {
    const img =
      obs.kind === "round"
        ? assets.obstacleRound
        : obs.kind === "line"
          ? assets.obstacleLine
          : obs.kind === "triangle"
            ? assets.obstacleTriangle
            : assets.obstacleRect;
    drawImageObstacle(ctx, img, obs);
  }
}

type CollisionDebugBall = { x: number; y: number; radius: number };

/** 以紅線標示所有碰撞邊界（障礙物邊緣、牆、隔板、彈珠碰撞圓） */
export function drawPinballCollisionDebug(
  ctx: CanvasRenderingContext2D,
  assets: LoadedPinballAssets | null,
  layout: LayoutData,
  balls: CollisionDebugBall[],
) {
  ctx.save();
  ctx.strokeStyle = "rgba(255, 40, 40, 0.9)";
  ctx.lineWidth = 1.5;

  const strokeSeg = (s: Segment) => {
    ctx.beginPath();
    ctx.moveTo(s.a.x, s.a.y);
    ctx.lineTo(s.b.x, s.b.y);
    ctx.stroke();
  };

  strokeSeg({ a: { x: WALL, y: PLAYFIELD_CEILING }, b: { x: WALL, y: CHANNEL_TOP } });
  strokeSeg({
    a: { x: PLAYFIELD_RIGHT, y: PLAYFIELD_CEILING },
    b: { x: PLAYFIELD_RIGHT, y: CHANNEL_TOP },
  });
  strokeSeg({
    a: { x: WALL, y: PLAYFIELD_CEILING },
    b: { x: PLAYFIELD_RIGHT, y: PLAYFIELD_CEILING },
  });
  strokeSeg(launchDividerVerticalSegment());

  const fillet = launchDividerFilletCenter();
  ctx.beginPath();
  ctx.arc(
    fillet.x,
    fillet.y,
    LAUNCH_DIVIDER_FILLET_R,
    -Math.PI / 2,
    0,
  );
  ctx.stroke();

  for (const x of CHANNEL_DIVIDER_X) {
    strokeSeg(channelDividerSegment(x));
  }

  if (assets) {
    for (const obs of layout.obstacles) {
      const body = assets.bodies[obs.kind];
      const placed = { x: obs.x, y: obs.y, rotation: obs.rotation, scale: obs.scale };
      for (const seg of worldEdges(body, placed)) strokeSeg(seg);
    }
  }

  for (const ball of balls) {
    if (ball.x < -100 || ball.y < -100) continue;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
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
  vert.addColorStop(0, "rgba(150, 38, 32, 0.88)");
  vert.addColorStop(0.42, "rgba(210, 72, 38, 0.9)");
  vert.addColorStop(0.72, "rgba(240, 140, 42, 0.94)");
  vert.addColorStop(1, "rgba(255, 228, 88, 0.98)");
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

  const edgeFade = Math.min(ih * 0.16, 26);
  const edgeMask = ctx.createLinearGradient(0, iy, 0, iy + ih);
  edgeMask.addColorStop(0, "rgba(0, 0, 0, 0)");
  edgeMask.addColorStop(edgeFade / ih, "rgba(0, 0, 0, 1)");
  edgeMask.addColorStop(1 - edgeFade / ih, "rgba(0, 0, 0, 1)");
  edgeMask.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = edgeMask;
  ctx.fillRect(ix, iy, iw, ih);

  ctx.globalCompositeOperation = "source-over";
  ctx.restore();
}
