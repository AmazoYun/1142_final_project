import {
  HUB_LAYOUT,
  stallCenterX,
  type HubMetrics,
} from "@/lib/market/hubLayout";
import { buildLotteryRoadCandidates } from "@/lib/market/lotterySpawnPlacement";
import {
  loadLotteryFrontMask,
  type LotteryFrontMask,
} from "@/lib/market/lotteryFrontMask";
import type { HubShadowPlacement } from "@/lib/market/hubSceneLayers";
import type { StallId } from "@/lib/narrative/types";

/** 優先選離攤位中心此距離內的落點；不足時改選全道路最近點 */
const CHARM_PREFER_NEAR_STALL_PX = 520;

const ALL_CLEAR_FRONT_MASK: LotteryFrontMask = {
  clearRatioRanges: [{ min: 0, max: 1 }],
};

function pickNearestToStall(
  candidates: number[],
  centerX: number,
  preferRadius: number,
): number | null {
  if (candidates.length === 0) return null;
  const near = candidates.filter((x) => Math.abs(x - centerX) <= preferRadius);
  const pool = near.length > 0 ? near : candidates;
  return pool.reduce((best, x) =>
    Math.abs(x - centerX) < Math.abs(best - centerX) ? x : best,
  );
}

export type CharmPlacement = {
  worldX: number;
  worldRatio: number;
  stallId: StallId;
};

export function pickCharmPlacement(
  stallId: StallId,
  metrics: HubMetrics,
  shadowPlacements: HubShadowPlacement[],
  frontMask: LotteryFrontMask | null,
): CharmPlacement | null {
  const stall = HUB_LAYOUT.stalls.find((s) => s.kind === "interactive" && s.id === stallId);
  if (!stall || stall.kind !== "interactive") return null;

  const centerX = stallCenterX(stall, metrics);
  const mask = frontMask ?? ALL_CLEAR_FRONT_MASK;

  let candidates = buildLotteryRoadCandidates(metrics, shadowPlacements, mask);
  if (candidates.length === 0 && frontMask) {
    candidates = buildLotteryRoadCandidates(metrics, shadowPlacements, ALL_CLEAR_FRONT_MASK);
  }
  if (candidates.length === 0) return null;

  const worldX = pickNearestToStall(candidates, centerX, CHARM_PREFER_NEAR_STALL_PX);
  if (worldX == null) return null;

  const worldRatio = (worldX - metrics.playableLeft) / metrics.playableWidth;
  return { worldX, worldRatio, stallId };
}

/** 以 Hub 實際尺寸解析各籤詩掉落點 */
export async function resolveCharmWorldPositions(
  spawns: ReadonlyArray<{ id: string; stallId: StallId }>,
  metrics: HubMetrics,
  shadowPlacements: HubShadowPlacement[],
): Promise<Record<string, number>> {
  const frontMask = await loadLotteryFrontMask(metrics);
  const result: Record<string, number> = {};

  for (const spawn of spawns) {
    const placement = pickCharmPlacement(
      spawn.stallId,
      metrics,
      shadowPlacements,
      frontMask,
    );
    if (placement) {
      result[spawn.id] = placement.worldX;
    }
  }

  return result;
}
