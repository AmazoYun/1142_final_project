import { pickCharmPlacement } from "@/lib/market/charmSpawnPlacement";
import { loadLotteryFrontMask } from "@/lib/market/lotteryFrontMask";
import type { HubMetrics } from "@/lib/market/hubLayout";
import type { HubShadowPlacement } from "@/lib/market/hubSceneLayers";
import type { StallId } from "@/lib/narrative/types";

/** 解析集點卡道路落點（避開陰影與前景遮罩，規則同路邊籤詩） */
export async function resolvePointCardWorldX(
  stallId: StallId,
  metrics: HubMetrics,
  shadowPlacements: HubShadowPlacement[],
): Promise<number | null> {
  const frontMask = await loadLotteryFrontMask(metrics);
  const placement = pickCharmPlacement(stallId, metrics, shadowPlacements, frontMask);
  return placement?.worldX ?? null;
}
