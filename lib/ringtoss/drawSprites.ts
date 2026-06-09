import type { LoadedRingTossAssets } from "@/lib/ringtoss/assets";
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  GRID_COLS,
  GRID_ROWS,
  designUniformScale,
  gridToCanvas,
  toViewport,
  viewportScale,
  type CellTarget,
  type ShelfRow,
} from "@/lib/ringtoss/boardLayout";

const BOTTLE_NATURAL_W = 135;
const BOTTLE_NATURAL_H = 244;
const RING_NATURAL_W = 194;
const RING_NATURAL_H = 96;
const BOTTLE_SIZE_BOOST = 1.2;
/** Opaque pixels end at y=212 in the 244px-tall bottle sprite */
const BOTTLE_OPAQUE_BOTTOM_RATIO = 212 / BOTTLE_NATURAL_H;
const BOTTLE_BASE_Y_OFFSET = -50;
/** Ring rests slightly below foot anchor; tuned up 2px from prior shelf offset */
const RING_SHELF_Y_NUDGE = 1;

/**
 * Extra Y added to bottle foot in design space (foot = shelfY + h/2 + offset).
 * Canvas Y grows downward, so a more negative offset moves the bottle UP.
 */
export function bottleRowYOffset(gy: ShelfRow): number {
  if (gy === 1) return BOTTLE_BASE_Y_OFFSET + 10;
  if (gy === 4) return BOTTLE_BASE_Y_OFFSET;
  return BOTTLE_BASE_Y_OFFSET;
}

/** Hub stall glow (static peak values — no animation) */
const BOTTLE_GLOW_FILTER = [
  "drop-shadow(0 0 6px rgba(255, 235, 160, 0.92))",
  "drop-shadow(0 0 11px rgba(255, 210, 80, 0.58))",
  "drop-shadow(0 0 16px rgba(255, 180, 40, 0.28))",
].join(" ");

const BONUS_BOTTLE_GLOW_FILTER = [
  "drop-shadow(0 0 6px rgba(255, 90, 90, 0.98))",
  "drop-shadow(0 0 11px rgba(255, 45, 45, 0.72))",
  "drop-shadow(0 0 18px rgba(220, 20, 20, 0.48))",
].join(" ");

/** Back rows are smaller to match background perspective */
export function bottleScaleForRow(gy: ShelfRow): number {
  const base =
    gy === 1 ? 0.24 : gy === 2 ? 0.26 : gy === 3 ? 0.3 : 0.34;
  return base * BOTTLE_SIZE_BOOST;
}

export function bottleDisplaySize(gy: ShelfRow): { w: number; h: number } {
  const scale = bottleScaleForRow(gy);
  return { w: BOTTLE_NATURAL_W * scale, h: BOTTLE_NATURAL_H * scale };
}

/** Design-space landing point at the bottle base on the shelf plane */
export function ringLandAt(gx: number, gy: number): { x: number; y: number } {
  const { x, y } = gridToCanvas(gx, gy);
  if (gy >= 1 && gy <= 4) {
    const shelfRow = gy as ShelfRow;
    const { h } = bottleDisplaySize(shelfRow);
    return { x, y: y + h / 2 + bottleRowYOffset(shelfRow) + RING_SHELF_Y_NUDGE };
  }
  return { x, y: y - 18 };
}

/** Landed ring: aligned to bottle foot in viewport; drawn before bottles for occlusion */
export function drawLandedRingSprite(
  ctx: CanvasRenderingContext2D,
  assets: LoadedRingTossAssets | null,
  gx: number,
  gy: ShelfRow,
  radius: number,
  cw: number,
  ch: number,
) {
  const land = ringLandAt(gx, gy);
  const screen = toViewport(land.x, land.y, cw, ch);
  drawRingSprite(ctx, assets, screen.x, screen.y, radius, cw, ch);
}

/** Stretch background to fill the entire viewport canvas */
export function drawRingTossBackground(
  ctx: CanvasRenderingContext2D,
  assets: LoadedRingTossAssets | null,
  cw: number,
  ch: number,
) {
  if (assets?.background) {
    ctx.drawImage(assets.background, 0, 0, cw, ch);
    return;
  }
  ctx.fillStyle = "#1a1410";
  ctx.fillRect(0, 0, cw, ch);
}

type BottleMetrics = {
  footX: number;
  footY: number;
  visualFootY: number;
  drawW: number;
  drawH: number;
  drawX: number;
  drawY: number;
  scale: number;
};

function bottleMetrics(gx: number, gy: ShelfRow, cw: number, ch: number): BottleMetrics {
  const design = gridToCanvas(gx, gy);
  const { w, h } = bottleDisplaySize(gy);
  const scale = designUniformScale(ch);
  const drawW = w * scale;
  const drawH = h * scale;
  const foot = toViewport(design.x, design.y + h / 2 + bottleRowYOffset(gy), cw, ch);
  const drawX = foot.x - drawW / 2;
  const drawY = foot.y - drawH * BOTTLE_OPAQUE_BOTTOM_RATIO;
  return {
    footX: foot.x,
    footY: foot.y,
    visualFootY: drawY + drawH * BOTTLE_OPAQUE_BOTTOM_RATIO,
    drawW,
    drawH,
    drawX,
    drawY,
    scale,
  };
}

/** Glow follows the bottle PNG alpha silhouette, same layered drop-shadow as hub stalls */
function drawBottleImageGlow(
  ctx: CanvasRenderingContext2D,
  assets: LoadedRingTossAssets | null,
  metrics: BottleMetrics,
  filter = BOTTLE_GLOW_FILTER,
) {
  if (!assets?.bottle) return;

  ctx.save();
  ctx.filter = filter;
  ctx.drawImage(
    assets.bottle,
    metrics.drawX,
    metrics.drawY,
    metrics.drawW,
    metrics.drawH,
  );
  ctx.restore();
}

/** 本局紅光目標瓶（未套中時持續發光） */
export function drawBonusBottleGlows(
  ctx: CanvasRenderingContext2D,
  assets: LoadedRingTossAssets | null,
  targets: CellTarget[],
  cw: number,
  ch: number,
) {
  for (const { gx, gy, bonus, hit } of targets) {
    if (!bonus || hit) continue;
    drawBottleImageGlow(
      ctx,
      assets,
      bottleMetrics(gx, gy as ShelfRow, cw, ch),
      BONUS_BOTTLE_GLOW_FILTER,
    );
  }
}

function drawBottleShadow(ctx: CanvasRenderingContext2D, metrics: BottleMetrics) {
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
  ctx.beginPath();
  ctx.ellipse(
    metrics.footX,
    metrics.visualFootY + metrics.scale * 0.35,
    metrics.drawW * 0.38,
    metrics.drawH * 0.05,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();
}

export function drawBottleSprite(
  ctx: CanvasRenderingContext2D,
  assets: LoadedRingTossAssets | null,
  gx: number,
  gy: ShelfRow,
  cw: number,
  ch: number,
  broken = false,
) {
  const metrics = bottleMetrics(gx, gy, cw, ch);
  drawBottleShadow(ctx, metrics);

  const sprite = broken ? assets?.bottleBroken : assets?.bottle;
  if (sprite) {
    ctx.drawImage(sprite, metrics.drawX, metrics.drawY, metrics.drawW, metrics.drawH);
  } else {
    ctx.fillStyle = broken ? "#6a5040" : "#a08060";
    ctx.fillRect(metrics.drawX, metrics.drawY, metrics.drawW, metrics.drawH);
  }
}

/** 以設計座標（720×640）判斷彈珠是否落在酒瓶上 */
export function findBottleTargetAtBoardPoint(
  targets: CellTarget[],
  boardX: number,
  boardY: number,
): CellTarget | undefined {
  let best: { target: CellTarget; dist: number } | null = null;

  for (const target of targets) {
    if (target.broken || target.hit) continue;
    const gy = target.gy as ShelfRow;
    const design = gridToCanvas(target.gx, gy);
    const { w, h } = bottleDisplaySize(gy);
    const footY = design.y + h / 2 + bottleRowYOffset(gy);
    const cx = design.x;
    const cy = footY - h * BOTTLE_OPAQUE_BOTTOM_RATIO * 0.52;
    const hitR = Math.max(w, h) * 0.58;
    const dist = Math.hypot(boardX - cx, boardY - cy);
    if (dist <= hitR && (!best || dist < best.dist)) {
      best = { target, dist };
    }
  }

  return best?.target;
}

export function drawHitLabel(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: ShelfRow,
  cw: number,
  ch: number,
) {
  const metrics = bottleMetrics(gx, gy, cw, ch);
  const fontSize = Math.max(12, 14 * metrics.scale);
  const labelY =
    gy === 4
      ? metrics.drawY + metrics.drawH * 0.3
      : metrics.drawY - 6 * metrics.scale;

  ctx.save();
  ctx.font = `700 ${fontSize}px var(--font-dot-gothic), sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = gy === 4 ? "middle" : "bottom";
  ctx.fillStyle = "#4ade80";
  ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
  ctx.lineWidth = Math.max(2, 3 * metrics.scale);
  ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
  ctx.shadowBlur = 4;
  ctx.strokeText("已套中", metrics.footX, labelY);
  ctx.fillText("已套中", metrics.footX, labelY);
  ctx.restore();
}

export function drawRingSprite(
  ctx: CanvasRenderingContext2D,
  assets: LoadedRingTossAssets | null,
  cx: number,
  cy: number,
  radius: number,
  cw: number,
  ch: number,
) {
  const { sx, sy } = viewportScale(cw, ch);
  const avgScale = (sx + sy) / 2;
  const scaledRadius = radius * avgScale;
  const scale = (scaledRadius * 2) / RING_NATURAL_W;
  const w = RING_NATURAL_W * scale;
  const h = RING_NATURAL_H * scale;

  if (assets?.ring) {
    ctx.drawImage(assets.ring, cx - w / 2, cy - h / 2, w, h);
    return;
  }

  ctx.strokeStyle = "#8a7a9a";
  ctx.lineWidth = 4 * avgScale;
  ctx.beginPath();
  ctx.ellipse(cx, cy, scaledRadius, scaledRadius * 0.45, 0, 0, Math.PI * 2);
  ctx.stroke();
}

export function drawAimCrosshair(
  ctx: CanvasRenderingContext2D,
  assets: LoadedRingTossAssets | null,
  gx: number,
  gy: number,
  cw: number,
  ch: number,
) {
  drawBottleImageGlow(ctx, assets, bottleMetrics(gx, gy as ShelfRow, cw, ch));
}

export function drawTargetHighlights(
  ctx: CanvasRenderingContext2D,
  assets: LoadedRingTossAssets | null,
  targets: CellTarget[],
  hlX: number | null,
  hlY: number | null,
  phase: "x" | "y" | "flying",
  lockedX: number | null,
  lockedY: number | null,
  cw: number,
  ch: number,
) {
  for (let gy = GRID_ROWS; gy >= 1; gy -= 1) {
    for (let gx = 1; gx <= GRID_COLS; gx += 1) {
      const colHL = hlX === gx;
      const rowHL = hlY === gy;
      const target = targets.find((t) => t.gx === gx && t.gy === gy);
      const cellHL =
        target &&
        !target.hit &&
        ((phase === "x" && colHL) ||
          (phase === "y" && lockedX === gx && rowHL) ||
          (phase === "flying" && lockedX === gx && lockedY === gy));

      if (!cellHL) continue;

      drawBottleImageGlow(
        ctx,
        assets,
        bottleMetrics(gx, gy as ShelfRow, cw, ch),
      );
    }
  }
}
