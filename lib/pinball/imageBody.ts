import type { Segment, Vec } from "@/lib/pinball/types";

const ALPHA_THRESHOLD = 20;

export type ImageBody = {
  nativeW: number;
  nativeH: number;
  /** 以圖片中心為原點的本地座標邊緣線段 */
  edges: Segment[];
};

export type PlacedImage = {
  x: number;
  y: number;
  rotation: number;
  scale: number;
};

function gridIdx(cols: number, gx: number, gy: number) {
  return gy * cols + gx;
}

/** 從 PNG alpha 通道提取不透明區外輪廓（marching squares） */
export function buildImageBody(img: HTMLImageElement, step = 2): ImageBody {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { nativeW: w, nativeH: h, edges: [] };

  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, w, h);
  const cols = Math.max(2, Math.ceil(w / step));
  const rows = Math.max(2, Math.ceil(h / step));
  const grid = new Uint8Array(cols * rows);

  for (let gy = 0; gy < rows; gy += 1) {
    for (let gx = 0; gx < cols; gx += 1) {
      const px = Math.min(gx * step + Math.floor(step / 2), w - 1);
      const py = Math.min(gy * step + Math.floor(step / 2), h - 1);
      grid[gridIdx(cols, gx, gy)] = data[(py * w + px) * 4 + 3] > ALPHA_THRESHOLD ? 1 : 0;
    }
  }

  const cx = w / 2;
  const cy = h / 2;
  const toLocal = (px: number, py: number): Vec => ({ x: px - cx, y: py - cy });
  const segs: Segment[] = [];

  // marching squares：case -> 兩端點在 cell 內的歸一化位置 (0..1)
  const ms: Record<number, [[number, number], [number, number]][]> = {
    1: [[[0, 0.5], [0.5, 1]]],
    2: [[[0.5, 1], [1, 0.5]]],
    3: [[[0, 0.5], [1, 0.5]]],
    4: [[[0.5, 0], [1, 0.5]]],
    5: [[[0, 0.5], [0.5, 0]], [[0.5, 1], [1, 0.5]]],
    6: [[[0.5, 0], [0.5, 1]]],
    7: [[[0, 0.5], [0.5, 0]]],
    8: [[[0, 0.5], [0.5, 0]]],
    9: [[[0.5, 0], [0.5, 1]]],
    10: [[[0.5, 0], [1, 0.5]], [[0, 0.5], [0.5, 1]]],
    11: [[[0.5, 0], [1, 0.5]]],
    12: [[[0, 0.5], [1, 0.5]]],
    13: [[[0.5, 1], [1, 0.5]]],
    14: [[[0, 0.5], [0.5, 1]]],
  };

  for (let gy = 0; gy < rows - 1; gy += 1) {
    for (let gx = 0; gx < cols - 1; gx += 1) {
      const tl = grid[gridIdx(cols, gx, gy)];
      const tr = grid[gridIdx(cols, gx + 1, gy)];
      const bl = grid[gridIdx(cols, gx, gy + 1)];
      const br = grid[gridIdx(cols, gx + 1, gy + 1)];
      const c = tl | (tr << 1) | (br << 2) | (bl << 3);
      if (c === 0 || c === 15) continue;
      const cellX = gx * step;
      const cellY = gy * step;
      const cellW = Math.min(step, w - cellX);
      const cellH = Math.min(step, h - cellY);
      for (const [[u1, v1], [u2, v2]] of ms[c] ?? []) {
        segs.push({
          a: toLocal(cellX + u1 * cellW, cellY + v1 * cellH),
          b: toLocal(cellX + u2 * cellW, cellY + v2 * cellH),
        });
      }
    }
  }

  return { nativeW: w, nativeH: h, edges: mergeNearSegments(segs) };
}

/** 直角三角 PNG 的幾何邊（alpha 頂點約 39,42，非整張 280×280） */
export function buildTriangleBody(nativeW = 280, nativeH = 280): ImageBody {
  const cx = nativeW / 2;
  const cy = nativeH / 2;
  const sx = nativeW / 280;
  const sy = nativeH / 280;
  const toLocal = (px: number, py: number): Vec => ({
    x: px * sx - cx,
    y: py * sy - cy,
  });
  const p0 = toLocal(39, 42);
  const p1 = toLocal(251, 44);
  const p2 = toLocal(32, 251);
  return {
    nativeW,
    nativeH,
    edges: [
      { a: p0, b: p1 },
      { a: p1, b: p2 },
      { a: p2, b: p0 },
    ],
  };
}

function mergeNearSegments(segs: Segment[], eps = 1.5): Segment[] {
  if (segs.length <= 1) return segs;
  const out: Segment[] = [];
  for (const s of segs) {
    if (Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y) < eps) continue;
    out.push(s);
  }
  return out;
}

export function transformLocalPoint(p: Vec, placed: PlacedImage): Vec {
  const cos = Math.cos(placed.rotation);
  const sin = Math.sin(placed.rotation);
  const sx = p.x * placed.scale;
  const sy = p.y * placed.scale;
  return {
    x: placed.x + sx * cos - sy * sin,
    y: placed.y + sx * sin + sy * cos,
  };
}

export function worldEdges(body: ImageBody, placed: PlacedImage): Segment[] {
  return body.edges.map((e) => ({
    a: transformLocalPoint(e.a, placed),
    b: transformLocalPoint(e.b, placed),
  }));
}

export function obstacleHalfExtents(body: { nativeW: number; nativeH: number }, scale: number) {
  return { halfW: (body.nativeW * scale) / 2, halfH: (body.nativeH * scale) / 2 };
}

/** 球心 vs 圖片邊緣線段 */
export function collideBallWithSegment(
  ballPos: Vec,
  ballRadius: number,
  seg: Segment,
  bounce: number,
): { hit: boolean; pos: Vec; velDelta: Vec; normal: Vec; contact: Vec } | null {
  const ab = { x: seg.b.x - seg.a.x, y: seg.b.y - seg.a.y };
  const ap = { x: ballPos.x - seg.a.x, y: ballPos.y - seg.a.y };
  const abLen2 = ab.x * ab.x + ab.y * ab.y || 1;
  const t = Math.max(0, Math.min(1, (ap.x * ab.x + ap.y * ab.y) / abLen2));
  const cx = seg.a.x + ab.x * t;
  const cy = seg.a.y + ab.y * t;
  const offX = ballPos.x - cx;
  const offY = ballPos.y - cy;
  const dist = Math.hypot(offX, offY);
  const pad = ballRadius + 1.6;
  if (dist >= pad) return null;
  const len = dist || 1;
  const nx = offX / len;
  const ny = offY / len;
  return {
    hit: true,
    pos: { x: cx + nx * pad, y: cy + ny * pad },
    velDelta: { x: 0, y: 0 },
    normal: { x: nx, y: ny },
    contact: { x: cx, y: cy },
  };
}

/** 球心是否貼在障礙物邊緣（供卡住偵測用） */
export function isBallTouchingImageBody(
  ballPos: Vec,
  ballRadius: number,
  body: ImageBody,
  placed: PlacedImage,
): { normal: Vec; contact: Vec } | null {
  for (const ws of worldEdges(body, placed)) {
    const res = collideBallWithSegment(ballPos, ballRadius, ws, 1);
    if (res) return { normal: res.normal, contact: res.contact };
  }
  return null;
}

export function collideBallWithImageBody(
  ballPos: Vec,
  ballVel: Vec,
  ballRadius: number,
  body: ImageBody,
  placed: PlacedImage,
  restitution = 0.94,
): { hit: boolean; pos: Vec; vel: Vec; contact: Vec; normal: Vec } {
  let best: {
    dist: number;
    pos: Vec;
    vel: Vec;
    contact: Vec;
    normal: Vec;
  } | null = null;

  for (const ws of worldEdges(body, placed)) {
    const res = collideBallWithSegment(ballPos, ballRadius, ws, restitution);
    if (!res) continue;
    const dist = Math.hypot(ballPos.x - res.contact.x, ballPos.y - res.contact.y);
    if (best && dist >= best.dist) continue;
    const d = ballVel.x * res.normal.x + ballVel.y * res.normal.y;
    best = {
      dist,
      pos: res.pos,
      vel: {
        x: (ballVel.x - 2 * d * res.normal.x) * restitution,
        y: (ballVel.y - 2 * d * res.normal.y) * restitution,
      },
      contact: res.contact,
      normal: res.normal,
    };
  }

  if (!best) {
    return { hit: false, pos: ballPos, vel: ballVel, contact: ballPos, normal: { x: 0, y: -1 } };
  }
  return { hit: true, pos: best.pos, vel: best.vel, contact: best.contact, normal: best.normal };
}

/** 指標是否落在不透明像素上（編輯選取用） */
export function hitTestImageBody(
  body: ImageBody,
  img: HTMLImageElement,
  placed: PlacedImage,
  worldX: number,
  worldY: number,
): boolean {
  const cos = Math.cos(-placed.rotation);
  const sin = Math.sin(-placed.rotation);
  const dx = worldX - placed.x;
  const dy = worldY - placed.y;
  const lx = (dx * cos - dy * sin) / placed.scale + body.nativeW / 2;
  const ly = (dx * sin + dy * cos) / placed.scale + body.nativeH / 2;
  if (lx < 0 || ly < 0 || lx >= body.nativeW || ly >= body.nativeH) return false;

  const canvas = document.createElement("canvas");
  canvas.width = body.nativeW;
  canvas.height = body.nativeH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return false;
  ctx.drawImage(img, 0, 0);
  const a = ctx.getImageData(Math.floor(lx), Math.floor(ly), 1, 1).data[3];
  return a > ALPHA_THRESHOLD;
}
