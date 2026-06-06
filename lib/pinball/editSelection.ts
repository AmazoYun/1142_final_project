import type { LayoutData } from "@/lib/pinball/types";
import type { LoadedPinballAssets } from "@/lib/pinball/assets";
import { hitTestHandles, type HandleHit, type OrientedFrame } from "@/lib/pinball/editHandles";
import { hitTestImageBody } from "@/lib/pinball/imageBody";
import { imageForKind, obstacleKey } from "@/lib/pinball/unifiedLayout";
import { obstacleOrientedFrame } from "@/lib/pinball/drawSprites";

export function listEditableKeys(layout: LayoutData): string[] {
  return layout.obstacles.map((_, i) => obstacleKey(i));
}

export function selectionFrameForKey(
  key: string,
  layout: LayoutData,
  assets: LoadedPinballAssets | null,
): OrientedFrame | null {
  if (!key.startsWith("obs:") || !assets) return null;
  const i = Number(key.split(":")[1]);
  const obs = layout.obstacles[i];
  if (!obs) return null;
  return obstacleOrientedFrame(obs, assets.bodies[obs.kind]);
}

export function pickObstacleHandle(
  x: number,
  y: number,
  layout: LayoutData,
  assets: LoadedPinballAssets | null,
  preferredKey = "",
): { key: string; hit: Exclude<HandleHit, null>; frame: OrientedFrame } | null {
  if (!assets) return null;
  const p = { x, y };
  const keys = preferredKey
    ? [preferredKey, ...listEditableKeys(layout).filter((k) => k !== preferredKey)]
    : listEditableKeys(layout);

  for (const key of keys) {
    const frame = selectionFrameForKey(key, layout, assets);
    if (!frame) continue;
    const hit = hitTestHandles(frame, p);
    if (hit) return { key, hit, frame };
  }
  return null;
}

export function pickObstacleAtPoint(
  x: number,
  y: number,
  layout: LayoutData,
  assets: LoadedPinballAssets | null,
): string {
  if (!assets) return "";
  for (let i = layout.obstacles.length - 1; i >= 0; i -= 1) {
    const obs = layout.obstacles[i];
    const body = assets.bodies[obs.kind];
    const img = imageForKind(obs.kind, assets);
    if (hitTestImageBody(body, img, { x: obs.x, y: obs.y, rotation: obs.rotation, scale: obs.scale }, x, y)) {
      return obstacleKey(i);
    }
  }
  return "";
}
