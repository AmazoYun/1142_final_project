import type { ImageObstacle, LayoutData, LegacyLayoutData, ObstacleKind } from "@/lib/pinball/types";
import { BOARD_HEIGHT, CHANNEL_TOP, PLAYFIELD, PLAYFIELD_RIGHT, PLAYFIELD_TOP, WALL } from "@/lib/pinball/boardLayout";
import { decomposeTriangle } from "@/lib/pinball/triangleEdit";
import { obstacleHalfExtents } from "@/lib/pinball/imageBody";

const NATIVE_SIZE: Record<ObstacleKind, { w: number; h: number }> = {
  round: { w: 148, h: 148 },
  line: { w: 180, h: 180 },
  triangle: { w: 280, h: 280 },
  rect: { w: 132, h: 133 },
};

const ROUND_NATIVE = 148;
const LINE_NATIVE = 180;
const TRI_NATIVE = 280;
const RECT_NATIVE_W = 132;
const RECT_NATIVE_H = 133;
const LINE_REF_LEN = 158;
/** 低於此縮放且無 score 的障礙物視為不可見殘留，自動移除 */
const MIN_VISIBLE_SCALE = 0.45;

export const LAYOUT_VERSION = 2;

export function isUnifiedLayout(data: LayoutData): data is LayoutData & { version: 2; obstacles: ImageObstacle[] } {
  return data.version === 2 && Array.isArray(data.obstacles);
}

/** 舊格式 → 統一 2750×1536 圖片物件座標（中心點 + rotation + scale） */
export function migrateToUnifiedLayout(raw: unknown): LayoutData {
  const data = raw as LayoutData & LegacyLayoutData;
  if (isUnifiedLayout(data)) {
    return normalizeUnified(data);
  }
  const legacy = data as LegacyLayoutData;
  const obstacles: ImageObstacle[] = [];

  const px = (x: number, y: number) => {
    if (x > 900) return { x, y };
    const legacyWall = 18;
    const legacyRight = 366;
    const legacyTop = 50;
    const legacyChannelTop = 472;
    const pfW = PLAYFIELD_RIGHT - WALL;
    const pfH = CHANNEL_TOP - PLAYFIELD_TOP;
    return {
      x: WALL + ((x - legacyWall) / (legacyRight - legacyWall)) * pfW,
      y: PLAYFIELD_TOP + ((y - legacyTop) / (legacyChannelTop - legacyTop)) * pfH,
    };
  };

  const pr = (r: number) => (r > 900 ? r : r * ((PLAYFIELD_RIGHT - WALL) / 348));

  for (const b of legacy.bumpers ?? []) {
    const p = px(b.x, b.y);
    const radius = b.r > 0 ? pr(b.r) : 58;
    obstacles.push({
      kind: "round",
      x: p.x,
      y: p.y,
      rotation: 0,
      scale: (radius * 2) / ROUND_NATIVE,
      score: b.score,
    });
  }

  for (const s of legacy.rails ?? []) {
    const a = px(s.a.x, s.a.y);
    const b = px(s.b.x, s.b.y);
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    obstacles.push({
      kind: "line",
      x: cx,
      y: cy,
      rotation: Math.atan2(b.y - a.y, b.x - a.x),
      scale: len / LINE_REF_LEN,
    });
  }

  for (const t of legacy.cornerTriangles ?? []) {
    const tf = decomposeTriangle({
      a: px(t.a.x, t.a.y),
      b: px(t.b.x, t.b.y),
      c: px(t.c.x, t.c.y),
    });
    const cos = Math.cos(tf.rotation);
    const sin = Math.sin(tf.rotation);
    const h = tf.leg / 2;
    obstacles.push({
      kind: "triangle",
      x: tf.ox + h * cos - h * sin,
      y: tf.oy + h * sin + h * cos,
      rotation: tf.rotation,
      scale: tf.leg / TRI_NATIVE,
    });
  }

  for (const obs of legacy.randomObstacles ?? []) {
    if (obs.kind === "circle") {
      const p = px(obs.x, obs.y);
      const radius = obs.r > 0 ? pr(obs.r) : 28;
      obstacles.push({
        kind: "round",
        x: p.x,
        y: p.y,
        rotation: 0,
        scale: (radius * 2) / ROUND_NATIVE,
      });
    } else if (obs.kind === "bar") {
      const a = px(obs.segment.a.x, obs.segment.a.y);
      const b = px(obs.segment.b.x, obs.segment.b.y);
      obstacles.push({
        kind: "line",
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
        rotation: Math.atan2(b.y - a.y, b.x - a.x),
        scale: Math.hypot(b.x - a.x, b.y - a.y) / LINE_REF_LEN,
      });
    } else if (obs.kind === "rect") {
      const p = px(obs.x, obs.y);
      const w = obs.w > 50 ? obs.w : obs.w * ((PLAYFIELD_RIGHT - WALL) / 348);
      const h = obs.h > 50 ? obs.h : obs.h * ((PLAYFIELD_RIGHT - WALL) / 348);
      obstacles.push({
        kind: "rect",
        x: p.x,
        y: p.y,
        rotation: obs.rotation ?? 0,
        scale: Math.max(w / RECT_NATIVE_W, h / RECT_NATIVE_H),
      });
    }
  }

  return normalizeUnified({ version: LAYOUT_VERSION, obstacles });
}

function sanitizeObstacle(o: ImageObstacle): ImageObstacle | null {
  if (o.scale < MIN_VISIBLE_SCALE && o.score == null) return null;
  return o;
}

function normalizeUnified(layout: LayoutData): LayoutData {
  return {
    version: LAYOUT_VERSION,
    obstacles: (layout.obstacles ?? [])
      .map((o) => ({
        ...o,
        rotation: o.rotation ?? 0,
        scale: Math.max(0.08, o.scale || 1),
      }))
      .map((o) => sanitizeObstacle(o))
      .filter((o): o is ImageObstacle => o != null),
  };
}

export function createDefaultUnifiedLayout(): LayoutData {
  return migrateToUnifiedLayout({
    bumpers: [
      { x: 136, y: 150, r: 20, score: 20 },
      { x: 244, y: 150, r: 20, score: 20 },
      { x: 190, y: 248, r: 24, score: 50 },
      { x: 130, y: 356, r: 18, score: 15 },
      { x: 250, y: 356, r: 18, score: 15 },
      { x: 190, y: 450, r: 22, score: 30 },
    ],
    rails: [
      { a: { x: 102, y: 262 }, b: { x: 158, y: 236 } },
      { a: { x: 222, y: 236 }, b: { x: 278, y: 262 } },
    ],
    cornerTriangles: [
      { a: { x: 44, y: 92 }, b: { x: 140, y: 92 }, c: { x: 44, y: 188 } },
      { a: { x: 342, y: 92 }, b: { x: 246, y: 92 }, c: { x: 342, y: 188 } },
    ],
    randomObstacles: [
      { kind: "circle", x: 104, y: 388, r: 15 },
      { kind: "circle", x: 268, y: 388, r: 15 },
      { kind: "bar", segment: { a: { x: 96, y: 334 }, b: { x: 138, y: 376 } } },
      { kind: "bar", segment: { a: { x: 276, y: 334 }, b: { x: 234, y: 376 } } },
      { kind: "rect", x: 190, y: 320, w: 95, h: 68, rotation: 0 },
    ],
  });
}

export function obstacleKey(index: number) {
  return `obs:${index}`;
}

/** 編輯時邊界：整張 2750×1536 畫布皆可放置（僅留少量邊距） */
export function clampObstacleToBoard(o: ImageObstacle): ImageObstacle {
  const pad = 8;
  const native = NATIVE_SIZE[o.kind];
  const { halfW, halfH } = obstacleHalfExtents(
    { nativeW: native.w, nativeH: native.h },
    o.scale,
  );
  const minX = WALL + pad + halfW;
  const maxX = PLAYFIELD_RIGHT - pad - halfW;
  // 不再用 PLAYFIELD.top 當上界（會在 y≈510 形成無形牆，擋住上方 1/3）
  const minY = pad + halfH * 0.35;
  const maxY = BOARD_HEIGHT - pad - halfH * 0.35;

  return {
    ...o,
    x: Math.max(minX, Math.min(maxX, o.x)),
    y: Math.max(minY, Math.min(maxY, o.y)),
  };
}

export function imageForKind(
  kind: ObstacleKind,
  assets: {
    obstacleRound: HTMLImageElement;
    obstacleLine: HTMLImageElement;
    obstacleTriangle: HTMLImageElement;
    obstacleRect: HTMLImageElement;
  },
) {
  switch (kind) {
    case "round":
      return assets.obstacleRound;
    case "line":
      return assets.obstacleLine;
    case "triangle":
      return assets.obstacleTriangle;
    case "rect":
      return assets.obstacleRect;
  }
}
