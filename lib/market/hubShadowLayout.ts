import type { HubMetrics } from "@/lib/market/hubLayout";
import {
  HUB_SHADOW_IMAGES,
  HUB_SHADOW_PLACEMENTS,
  type HubShadowPlacement,
} from "@/lib/market/hubSceneLayers";
import { shadowTop, shadowWorldX } from "@/lib/market/hubSceneLayers";

export type { HubShadowPlacement };

const VALID_IMAGES = new Set<string>(HUB_SHADOW_IMAGES);

export function getDefaultShadowPlacements(): HubShadowPlacement[] {
  return HUB_SHADOW_PLACEMENTS.map((p) => ({ ...p }));
}

export function normalizeShadowPlacements(raw: unknown): HubShadowPlacement[] {
  if (!Array.isArray(raw)) return getDefaultShadowPlacements();

  const parsed: HubShadowPlacement[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Partial<HubShadowPlacement>;
    if (typeof row.id !== "string" || !row.id) continue;
    if (typeof row.image !== "string" || !VALID_IMAGES.has(row.image)) continue;
    parsed.push({
      id: row.id,
      image: row.image,
      worldRatio: clamp(Number(row.worldRatio) || 0, 0, 1),
      worldJitter: clamp(Number(row.worldJitter) || 0, -0.2, 0.2),
      floorOffset: clamp(Number(row.floorOffset) || 0, -0.2, 0.3),
      scale: clamp(Number(row.scale) || 0.85, 0.2, 3),
    });
  }

  return parsed.length > 0 ? parsed : getDefaultShadowPlacements();
}

export function placementWorldPosition(
  placement: HubShadowPlacement,
  metrics: HubMetrics,
) {
  return {
    worldX: shadowWorldX(placement, metrics),
    top: shadowTop(placement, metrics),
  };
}

export function placementFromWorldPosition(
  placement: HubShadowPlacement,
  worldX: number,
  top: number,
  metrics: HubMetrics,
): HubShadowPlacement {
  const baseTop = shadowTop({ ...placement, floorOffset: 0 }, metrics);
  const floorOffset = (top - baseTop) / metrics.worldHeight;
  const ratio = worldX / metrics.worldWidth;

  return {
    ...placement,
    worldRatio: clamp(ratio, 0, 1),
    worldJitter: 0,
    floorOffset: clamp(floorOffset, -0.2, 0.3),
  };
}

export function createShadowPlacement(
  worldX: number,
  top: number,
  metrics: HubMetrics,
  image: HubShadowPlacement["image"] = HUB_SHADOW_IMAGES[0],
): HubShadowPlacement {
  const seed: HubShadowPlacement = {
    id: `shadow-${Date.now()}`,
    image,
    worldRatio: 0.5,
    worldJitter: 0,
    floorOffset: 0.04,
    scale: 0.85,
  };
  return placementFromWorldPosition(seed, worldX, top, metrics);
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
