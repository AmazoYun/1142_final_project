import type { Segment, Vec } from "@/lib/pinball/types";
import { SPRITE_LINE } from "@/lib/pinball/spriteMeta";
import { scaleFactorFromCornerDrag, type OrientedFrame } from "@/lib/pinball/editHandles";

const MIN_HALF = 28;
const MAX_HALF = 420;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/** layout 線段 = 不透明碰撞區；繪製時反推 sprite 中心 */
export function segmentDrawCenter(seg: Segment): Vec {
  const ox = (seg.a.x + seg.b.x) / 2;
  const oy = (seg.a.y + seg.b.y) / 2;
  const lx = SPRITE_LINE.solidCx - SPRITE_LINE.nativeW / 2;
  const ly = SPRITE_LINE.solidCy - SPRITE_LINE.nativeH / 2;
  return {
    x: ox + SPRITE_LINE.nativeW / 2 - lx,
    y: oy + SPRITE_LINE.nativeH / 2 - ly,
  };
}

export function segmentSpriteRotation(seg: Segment) {
  return Math.atan2(seg.b.y - seg.a.y, seg.b.x - seg.a.x) - SPRITE_LINE.solidAngle;
}

export function segmentOrientedFrame(seg: Segment): OrientedFrame {
  const cx = (seg.a.x + seg.b.x) / 2;
  const cy = (seg.a.y + seg.b.y) / 2;
  const halfLen = Math.hypot(seg.b.x - seg.a.x, seg.b.y - seg.a.y) / 2;
  return {
    cx,
    cy,
    halfW: halfLen,
    halfH: SPRITE_LINE.solidHalfThickness,
    rotation: Math.atan2(seg.b.y - seg.a.y, seg.b.x - seg.a.x),
  };
}

export function segmentFromFrame(frame: OrientedFrame): Segment {
  const cos = Math.cos(frame.rotation);
  const sin = Math.sin(frame.rotation);
  return {
    a: { x: frame.cx - cos * frame.halfW, y: frame.cy - sin * frame.halfW },
    b: { x: frame.cx + cos * frame.halfW, y: frame.cy + sin * frame.halfW },
  };
}

export function translateSegment(seg: Segment, dx: number, dy: number): Segment {
  return {
    a: { x: seg.a.x + dx, y: seg.a.y + dy },
    b: { x: seg.b.x + dx, y: seg.b.y + dy },
  };
}

export function scaleSegmentByCorner(
  seg: Segment,
  corner: number,
  pointer: Vec,
  startPointer: Vec,
  startHalfLen: number,
): Segment {
  const frame = segmentOrientedFrame(seg);
  const factor = scaleFactorFromCornerDrag(frame, corner, pointer, startPointer);
  const halfLen = clamp(startHalfLen * factor, MIN_HALF, MAX_HALF);
  return segmentFromFrame({ ...frame, halfW: halfLen });
}

export function rotateSegmentByPointer(
  seg: Segment,
  pointer: Vec,
  startAngle: number,
  startRotation: number,
  cx: number,
  cy: number,
): Segment {
  const angle = Math.atan2(pointer.y - cy, pointer.x - cx);
  const halfLen = Math.hypot(seg.b.x - seg.a.x, seg.b.y - seg.a.y) / 2;
  const rotation = startRotation + (angle - startAngle);
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return {
    a: { x: cx - cos * halfLen, y: cy - sin * halfLen },
    b: { x: cx + cos * halfLen, y: cy + sin * halfLen },
  };
}

export function rotateSegmentByDegrees(seg: Segment, degree: number): Segment {
  const frame = segmentOrientedFrame(seg);
  const rad = (degree * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rot = (p: Vec): Vec => ({
    x: frame.cx + (p.x - frame.cx) * cos - (p.y - frame.cy) * sin,
    y: frame.cy + (p.x - frame.cx) * sin + (p.y - frame.cy) * cos,
  });
  return { a: rot(seg.a), b: rot(seg.b) };
}

export function scaleSegmentUniform(seg: Segment, factor: number): Segment {
  const frame = segmentOrientedFrame(seg);
  const halfLen = clamp(frame.halfW * factor, MIN_HALF, MAX_HALF);
  return segmentFromFrame({ ...frame, halfW: halfLen });
}
