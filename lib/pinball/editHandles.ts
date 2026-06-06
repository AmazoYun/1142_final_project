import type { Vec } from "@/lib/pinball/types";

export type OrientedFrame = {
  cx: number;
  cy: number;
  halfW: number;
  halfH: number;
  rotation: number;
};

export type HandleKind = "rotate" | "corner";
export type HandleHit = { kind: HandleKind; corner?: number } | null;

const HANDLE_R = 16;
const ROTATE_OFFSET = 52;

function localToWorld(frame: OrientedFrame, lx: number, ly: number): Vec {
  const cos = Math.cos(frame.rotation);
  const sin = Math.sin(frame.rotation);
  return {
    x: frame.cx + lx * cos - ly * sin,
    y: frame.cy + lx * sin + ly * cos,
  };
}

export function orientedCorners(frame: OrientedFrame): Vec[] {
  const { halfW, halfH } = frame;
  return [
    localToWorld(frame, -halfW, -halfH),
    localToWorld(frame, halfW, -halfH),
    localToWorld(frame, halfW, halfH),
    localToWorld(frame, -halfW, halfH),
  ];
}

export function rotateHandlePos(frame: OrientedFrame): Vec {
  return localToWorld(frame, 0, -frame.halfH - ROTATE_OFFSET);
}

export function hitTestHandles(frame: OrientedFrame, p: Vec): HandleHit {
  const rh = rotateHandlePos(frame);
  if (Math.hypot(p.x - rh.x, p.y - rh.y) <= HANDLE_R) {
    return { kind: "rotate" };
  }
  const corners = orientedCorners(frame);
  for (let i = 0; i < corners.length; i += 1) {
    const c = corners[i];
    if (Math.hypot(p.x - c.x, p.y - c.y) <= HANDLE_R) {
      return { kind: "corner", corner: i };
    }
  }
  return null;
}

export function drawOrientedSelection(
  ctx: CanvasRenderingContext2D,
  frame: OrientedFrame,
  selected: boolean,
) {
  if (!selected) return;
  const corners = orientedCorners(frame);
  const rh = rotateHandlePos(frame);
  const topMid = localToWorld(frame, 0, -frame.halfH);

  ctx.save();
  ctx.strokeStyle = "rgba(255, 196, 60, 0.95)";
  ctx.lineWidth = 2.5;
  ctx.setLineDash([9, 6]);
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < corners.length; i += 1) ctx.lineTo(corners[i].x, corners[i].y);
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = "rgba(255, 196, 60, 0.7)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(topMid.x, topMid.y);
  ctx.lineTo(rh.x, rh.y);
  ctx.stroke();

  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "rgba(255, 196, 60, 1)";
  ctx.lineWidth = 2.5;
  for (const c of corners) {
    ctx.beginPath();
    ctx.arc(c.x, c.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(rh.x, rh.y, 10, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(255, 196, 60, 0.95)";
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("↻", rh.x, rh.y + 1);
  ctx.restore();
}

/** 對角縮放：固定對角，依指標距離計算比例 */
export function scaleFactorFromCornerDrag(
  frame: OrientedFrame,
  corner: number,
  pointer: Vec,
  startPointer: Vec,
): number {
  const corners = orientedCorners(frame);
  const anchor = corners[(corner + 2) % 4];
  const startSpan = Math.hypot(startPointer.x - anchor.x, startPointer.y - anchor.y) || 1;
  const newSpan = Math.hypot(pointer.x - anchor.x, pointer.y - anchor.y);
  return newSpan / startSpan;
}

export function rotationFromDrag(frame: OrientedFrame, pointer: Vec, startAngle: number, startRotation: number) {
  const angle = Math.atan2(pointer.y - frame.cy, pointer.x - frame.cx);
  return startRotation + (angle - startAngle);
}
