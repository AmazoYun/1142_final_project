import type { RandomRect, Vec } from "@/lib/pinball/types";
import { SPRITE_RECT } from "@/lib/pinball/spriteMeta";
import { scaleFactorFromCornerDrag, type OrientedFrame } from "@/lib/pinball/editHandles";

const MIN_HALF = 20;
const MAX_HALF = 280;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function rectRotation(r: RandomRect) {
  return r.rotation ?? 0;
}

export function rectOrientedFrame(r: RandomRect): OrientedFrame {
  return {
    cx: r.x,
    cy: r.y,
    halfW: r.w / 2,
    halfH: r.h / 2,
    rotation: rectRotation(r),
  };
}

export function rectSpriteScale(r: RandomRect) {
  return {
    sx: r.w / SPRITE_RECT.solidW,
    sy: r.h / SPRITE_RECT.solidH,
  };
}

export function rectCorners(r: RandomRect): Vec[] {
  const frame = rectOrientedFrame(r);
  const cos = Math.cos(frame.rotation);
  const sin = Math.sin(frame.rotation);
  const pts = [
    { lx: -frame.halfW, ly: -frame.halfH },
    { lx: frame.halfW, ly: -frame.halfH },
    { lx: frame.halfW, ly: frame.halfH },
    { lx: -frame.halfW, ly: frame.halfH },
  ];
  return pts.map(({ lx, ly }) => ({
    x: frame.cx + lx * cos - ly * sin,
    y: frame.cy + lx * sin + ly * cos,
  }));
}

export function rectEdges(r: RandomRect): [{ a: Vec; b: Vec }, { a: Vec; b: Vec }, { a: Vec; b: Vec }, { a: Vec; b: Vec }] {
  const c = rectCorners(r);
  return [
    { a: c[0], b: c[1] },
    { a: c[1], b: c[2] },
    { a: c[2], b: c[3] },
    { a: c[3], b: c[0] },
  ];
}

export function scaleRectByCorner(
  r: RandomRect,
  corner: number,
  pointer: Vec,
  startPointer: Vec,
  startHalfW: number,
  startHalfH: number,
): RandomRect {
  const frame = rectOrientedFrame(r);
  const factor = scaleFactorFromCornerDrag(frame, corner, pointer, startPointer);
  return {
    ...r,
    w: clamp(startHalfW * 2 * factor, MIN_HALF * 2, MAX_HALF * 2),
    h: clamp(startHalfH * 2 * factor, MIN_HALF * 2, MAX_HALF * 2),
  };
}

export function rotateRectByPointer(
  r: RandomRect,
  pointer: Vec,
  startAngle: number,
  startRotation: number,
  cx: number,
  cy: number,
): RandomRect {
  const angle = Math.atan2(pointer.y - cy, pointer.x - cx);
  return { ...r, rotation: startRotation + (angle - startAngle) };
}

export function rotateRectByDegrees(r: RandomRect, degree: number): RandomRect {
  return { ...r, rotation: rectRotation(r) + (degree * Math.PI) / 180 };
}

export function scaleRectUniform(r: RandomRect, factor: number): RandomRect {
  return {
    ...r,
    w: clamp(r.w * factor, MIN_HALF * 2, MAX_HALF * 2),
    h: clamp(r.h * factor, MIN_HALF * 2, MAX_HALF * 2),
  };
}

export function pointInOrientedRect(p: Vec, r: RandomRect) {
  const frame = rectOrientedFrame(r);
  const cos = Math.cos(-frame.rotation);
  const sin = Math.sin(-frame.rotation);
  const lx = (p.x - frame.cx) * cos - (p.y - frame.cy) * sin;
  const ly = (p.x - frame.cx) * sin + (p.y - frame.cy) * cos;
  return Math.abs(lx) <= frame.halfW && Math.abs(ly) <= frame.halfH;
}
