import type { Triangle, Vec } from "@/lib/pinball/types";
import { CHANNEL_TOP, PLAYFIELD, PLAYFIELD_RIGHT, WALL } from "@/lib/pinball/boardLayout";
import { scaleFactorFromCornerDrag, type OrientedFrame } from "@/lib/pinball/editHandles";

const PF_LEFT = WALL + 8;
const PF_RIGHT = PLAYFIELD_RIGHT - 8;
/** 頂部允許貼齊背景邊界（角落三角形需能往上移） */
const PF_TOP = PLAYFIELD.top - 36;
const PF_BOTTOM = CHANNEL_TOP - 8;
const MIN_LEG = 48;
const MAX_LEG = 340;

export type TriangleTransform = {
  /** 直角頂點（世界座標） */
  ox: number;
  oy: number;
  leg: number;
  rotation: number;
};

export type TriangleEditFrame = TriangleTransform & {
  cx: number;
  cy: number;
  half: number;
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

const ORDER: ("a" | "b" | "c")[] = ["a", "b", "c"];

function verts(t: Triangle): Vec[] {
  return [t.a, t.b, t.c];
}

function setVerts(t: Triangle, vs: Vec[]): Triangle {
  return { a: vs[0], b: vs[1], c: vs[2] };
}

/** 從三頂點還原直角三角形參數（編輯用） */
export function decomposeTriangle(t: Triangle): TriangleTransform {
  const vs = verts(t);
  let bestIdx = 0;
  let bestScore = Infinity;
  for (let i = 0; i < 3; i += 1) {
    const cur = vs[i];
    const prev = vs[(i + 2) % 3];
    const next = vs[(i + 1) % 3];
    const v1 = { x: prev.x - cur.x, y: prev.y - cur.y };
    const v2 = { x: next.x - cur.x, y: next.y - cur.y };
    const l1 = Math.hypot(v1.x, v1.y) || 1;
    const l2 = Math.hypot(v2.x, v2.y) || 1;
    const cos = (v1.x * v2.x + v1.y * v2.y) / (l1 * l2);
    const score = Math.abs(cos);
    if (score < bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  const origin = vs[bestIdx];
  const p1 = vs[(bestIdx + 1) % 3];
  const p2 = vs[(bestIdx + 2) % 3];
  const leg1 = Math.hypot(p1.x - origin.x, p1.y - origin.y);
  const leg2 = Math.hypot(p2.x - origin.x, p2.y - origin.y);
  const leg = clamp((leg1 + leg2) / 2, MIN_LEG, MAX_LEG);
  const rotation = Math.atan2(p1.y - origin.y, p1.x - origin.x);
  return { ox: origin.x, oy: origin.y, leg, rotation };
}

export function composeTriangle(tf: TriangleTransform): Triangle {
  const { ox, oy, leg, rotation } = tf;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const map = (lx: number, ly: number): Vec => ({
    x: ox + lx * cos - ly * sin,
    y: oy + lx * sin + ly * cos,
  });
  return { a: map(0, 0), b: map(leg, 0), c: map(0, leg) };
}

export function triangleEditFrame(t: Triangle): TriangleEditFrame {
  const tf = decomposeTriangle(t);
  const cos = Math.cos(tf.rotation);
  const sin = Math.sin(tf.rotation);
  const h = tf.leg / 2;
  return {
    ...tf,
    cx: tf.ox + h * cos - h * sin,
    cy: tf.oy + h * sin + h * cos,
    half: h,
  };
}

export function clampTriangleRigid(t: Triangle): Triangle {
  return clampToPlayfield(composeTriangle(decomposeTriangle(t)));
}

function clampToPlayfield(t: Triangle): Triangle {
  const xs = [t.a.x, t.b.x, t.c.x];
  const ys = [t.a.y, t.b.y, t.c.y];
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  let dx = 0;
  let dy = 0;
  if (minX < PF_LEFT) dx = PF_LEFT - minX;
  else if (maxX > PF_RIGHT) dx = PF_RIGHT - maxX;
  if (minY < PF_TOP) dy = PF_TOP - minY;
  else if (maxY > PF_BOTTOM) dy = PF_BOTTOM - maxY;
  if (dx === 0 && dy === 0) return t;
  return {
    a: { x: t.a.x + dx, y: t.a.y + dy },
    b: { x: t.b.x + dx, y: t.b.y + dy },
    c: { x: t.c.x + dx, y: t.c.y + dy },
  };
}

export function translateTriangle(t: Triangle, dx: number, dy: number): Triangle {
  const tf = decomposeTriangle(t);
  tf.ox += dx;
  tf.oy += dy;
  return clampToPlayfield(composeTriangle(tf));
}

export function triangleOrientedFrame(t: Triangle): OrientedFrame {
  const f = triangleEditFrame(t);
  return { cx: f.cx, cy: f.cy, halfW: f.half, halfH: f.half, rotation: f.rotation };
}

export function scaleTriangleUniform(t: Triangle, factor: number): Triangle {
  const frame = triangleEditFrame(t);
  const tf = decomposeTriangle(t);
  tf.leg = clamp(tf.leg * factor, MIN_LEG, MAX_LEG);
  let next = composeTriangle(tf);
  const nf = triangleEditFrame(next);
  return clampTriangleRigid(translateTriangle(next, frame.cx - nf.cx, frame.cy - nf.cy));
}

export function rotateTriangleByDegrees(t: Triangle, degree: number): Triangle {
  const tf = decomposeTriangle(t);
  const frameBefore = triangleEditFrame(t);
  tf.rotation += (degree * Math.PI) / 180;
  let next = composeTriangle(tf);
  const frameAfter = triangleEditFrame(next);
  return clampTriangleRigid(
    translateTriangle(next, frameBefore.cx - frameAfter.cx, frameBefore.cy - frameAfter.cy),
  );
}

export function scaleTriangleByCorner(
  t: Triangle,
  corner: number,
  pointer: Vec,
  startPointer: Vec,
  startLeg: number,
): Triangle {
  const oriented = triangleOrientedFrame(t);
  const factor = scaleFactorFromCornerDrag(oriented, corner, pointer, startPointer);
  const center = { x: oriented.cx, y: oriented.cy };
  const tf = decomposeTriangle(t);
  tf.leg = clamp(startLeg * factor, MIN_LEG, MAX_LEG);
  let next = composeTriangle(tf);
  const nf = triangleEditFrame(next);
  next = translateTriangle(next, center.x - nf.cx, center.y - nf.cy);
  return next;
}

export function rotateTriangleByPointer(
  t: Triangle,
  pointer: Vec,
  startAngle: number,
  startRotation: number,
  cx: number,
  cy: number,
): Triangle {
  const angle = Math.atan2(pointer.y - cy, pointer.x - cx);
  const tf = decomposeTriangle(t);
  tf.rotation = startRotation + (angle - startAngle);
  const frameBefore = triangleEditFrame(t);
  let next = composeTriangle(tf);
  const frameAfter = triangleEditFrame(next);
  return clampTriangleRigid(
    translateTriangle(next, frameBefore.cx - frameAfter.cx, frameBefore.cy - frameAfter.cy),
  );
}

export function pointInTriangle(p: Vec, t: Triangle): boolean {
  const sign = (p1: Vec, p2: Vec, p3: Vec) =>
    (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
  const d1 = sign(p, t.a, t.b);
  const d2 = sign(p, t.b, t.c);
  const d3 = sign(p, t.c, t.a);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

export function drawRightTriangle(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  t: Triangle,
) {
  const tf = decomposeTriangle(t);
  ctx.save();
  ctx.translate(tf.ox, tf.oy);
  ctx.rotate(tf.rotation);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(tf.leg, 0);
  ctx.lineTo(0, tf.leg);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, 0, 0, tf.leg, tf.leg);
  ctx.restore();
}
