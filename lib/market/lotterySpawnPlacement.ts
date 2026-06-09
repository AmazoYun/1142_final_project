import {
  findNearestInteractiveStall,
  HUB_LAYOUT,
  PLAYER_FLOOR_RATIO,
  resolveHubMetrics,
  type HubMetrics,
} from "@/lib/market/hubLayout";
import {
  isWorldRatioClearOnFront,
  loadLotteryFrontMask,
  LOTTERY_GROUND_Y_OFFSET_PX,
  type LotteryFrontMask,
} from "@/lib/market/lotteryFrontMask";
import {
  shadowDimensions,
  shadowTop,
  shadowWorldX,
  type HubShadowPlacement,
} from "@/lib/market/hubSceneLayers";
import type { StallId } from "@/lib/narrative/types";

export const LOTTERY_ROAD_MARGIN_PX = 500;
const MIN_SPAWN_GAP_PX = 96;
const CANDIDATE_STEP_PX = 24;

export type LotteryPlacement = {
  worldX: number;
  worldRatio: number;
  stallId: StallId;
};

function lotteryGroundY(metrics: HubMetrics) {
  return metrics.worldHeight * PLAYER_FLOOR_RATIO - LOTTERY_GROUND_Y_OFFSET_PX;
}

function roadSpawnBounds(metrics: HubMetrics) {
  return {
    minX: metrics.playableLeft + LOTTERY_ROAD_MARGIN_PX,
    maxX: metrics.playableLeft + metrics.playableWidth - LOTTERY_ROAD_MARGIN_PX,
  };
}

function isBlockedByShadow(
  worldX: number,
  groundY: number,
  placements: HubShadowPlacement[],
  metrics: HubMetrics,
): boolean {
  for (const placement of placements) {
    const centerX = shadowWorldX(placement, metrics);
    const { width, height } = shadowDimensions(placement, metrics);
    const bottom = shadowTop(placement, metrics);
    const left = centerX - width / 2;
    const right = centerX + width / 2;
    const top = bottom - height;
    if (worldX >= left && worldX <= right && groundY >= top && groundY <= bottom) {
      return true;
    }
  }
  return false;
}

function isValidLotteryWorldX(
  worldX: number,
  metrics: HubMetrics,
  shadowPlacements: HubShadowPlacement[],
  frontMask: LotteryFrontMask,
): boolean {
  const { minX, maxX } = roadSpawnBounds(metrics);
  if (worldX < minX || worldX > maxX) return false;

  const groundY = lotteryGroundY(metrics);
  if (isBlockedByShadow(worldX, groundY, shadowPlacements, metrics)) return false;

  const worldRatio = (worldX - metrics.playableLeft) / metrics.playableWidth;
  return isWorldRatioClearOnFront(worldRatio, frontMask);
}

/** 道路上可見且避開陰影的落點候選（與路邊彩券相同規則） */
export function buildLotteryRoadCandidates(
  metrics: HubMetrics,
  shadowPlacements: HubShadowPlacement[],
  frontMask: LotteryFrontMask,
): number[] {
  const { minX, maxX } = roadSpawnBounds(metrics);
  if (maxX <= minX) return [];

  const candidates: number[] = [];
  for (let x = minX; x <= maxX; x += CANDIDATE_STEP_PX) {
    if (isValidLotteryWorldX(x, metrics, shadowPlacements, frontMask)) {
      candidates.push(x);
    }
  }
  return candidates;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

export function pickLotteryPlacements(
  count: number,
  metrics: HubMetrics,
  shadowPlacements: HubShadowPlacement[],
  frontMask: LotteryFrontMask,
): LotteryPlacement[] {
  if (count <= 0) return [];

  const candidates = shuffle(buildLotteryRoadCandidates(metrics, shadowPlacements, frontMask));
  if (candidates.length === 0) return [];

  const picked: number[] = [];
  for (const x of candidates) {
    if (picked.every((prev) => Math.abs(prev - x) >= MIN_SPAWN_GAP_PX)) {
      picked.push(x);
    }
    if (picked.length >= count) break;
  }

  return picked.map((worldX) => {
    const worldRatio = (worldX - metrics.playableLeft) / metrics.playableWidth;
    return {
      worldX,
      worldRatio,
      stallId: findNearestInteractiveStall(worldX, HUB_LAYOUT, metrics),
    };
  });
}

export function estimateHubMetricsForSpawn(): HubMetrics {
  if (typeof window === "undefined") {
    return resolveHubMetrics(960, 500, HUB_LAYOUT);
  }
  const header = document.querySelector(".game-header");
  const headerHeight = header?.getBoundingClientRect().height ?? 48;
  const sceneHeight = Math.max(360, window.innerHeight - headerHeight);
  const sceneWidth = window.innerWidth;
  return resolveHubMetrics(sceneWidth, sceneHeight, HUB_LAYOUT);
}

export async function prepareLotteryPlacements(
  count: number,
  shadowPlacements: HubShadowPlacement[],
): Promise<LotteryPlacement[]> {
  const metrics = estimateHubMetricsForSpawn();
  const frontMask = await loadLotteryFrontMask(metrics);
  return pickLotteryPlacements(count, metrics, shadowPlacements, frontMask);
}
