import type { ImageObstacle, Vec } from "@/lib/pinball/types";
import { scaleFactorFromCornerDrag, type OrientedFrame } from "@/lib/pinball/editHandles";
import { obstacleHalfExtents } from "@/lib/pinball/imageBody";
import { clampObstacleToBoard } from "@/lib/pinball/unifiedLayout";

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function obstacleFrame(obs: ImageObstacle, nativeW: number, nativeH: number): OrientedFrame {
  const { halfW, halfH } = obstacleHalfExtents({ nativeW, nativeH }, obs.scale);
  return { cx: obs.x, cy: obs.y, halfW, halfH, rotation: obs.rotation };
}

export function translateObstacle(obs: ImageObstacle, dx: number, dy: number): ImageObstacle {
  return clampObstacleToBoard({ ...obs, x: obs.x + dx, y: obs.y + dy });
}

export function scaleObstacleUniform(obs: ImageObstacle, factor: number): ImageObstacle {
  return clampObstacleToBoard({ ...obs, scale: clamp(obs.scale * factor, 0.08, 4) });
}

export function rotateObstacleDegrees(obs: ImageObstacle, degree: number): ImageObstacle {
  return { ...obs, rotation: obs.rotation + (degree * Math.PI) / 180 };
}

export function rotateObstacleByPointer(
  obs: ImageObstacle,
  pointer: Vec,
  startAngle: number,
  startRotation: number,
  cx: number,
  cy: number,
): ImageObstacle {
  const angle = Math.atan2(pointer.y - cy, pointer.x - cx);
  return { ...obs, rotation: startRotation + (angle - startAngle) };
}

export function scaleObstacleByCorner(
  obs: ImageObstacle,
  nativeW: number,
  nativeH: number,
  corner: number,
  pointer: Vec,
  startPointer: Vec,
  startScale: number,
): ImageObstacle {
  const frame = obstacleFrame(obs, nativeW, nativeH);
  const factor = scaleFactorFromCornerDrag(frame, corner, pointer, startPointer);
  return clampObstacleToBoard({ ...obs, scale: clamp(startScale * factor, 0.08, 4) });
}

export function updateObstacleByKey(
  layout: { obstacles: ImageObstacle[] },
  key: string,
  updater: (obs: ImageObstacle) => ImageObstacle,
) {
  const i = Number(key.split(":")[1]);
  layout.obstacles[i] = updater(layout.obstacles[i]);
}
