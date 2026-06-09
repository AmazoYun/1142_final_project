import { BUCKET_DESIGN, designToCanvas } from "@/lib/catchfish/bucketLayout";
import type { CaughtFishDisplay } from "@/lib/catchfish/caughtDisplay";
import { FISH_SPRITES } from "@/lib/catchfish/spriteMeta";
import { hasCollectible } from "@/lib/collectibles/acquireItem";
import { STALL_REWARD } from "@/lib/collectibles/stallRewards";
import { FISH_SIZE_CONFIG } from "@/store/gameStore";

function caughtFishPickRadius(c: CaughtFishDisplay): number {
  const meta = FISH_SPRITES[c.spriteIndex];
  const gameRadius = c.r * c.scaleMul;
  if (!meta) return gameRadius * 1.5;
  const scale = gameRadius / meta.collisionRadius;
  const drawW = meta.nativeW * scale;
  const drawH = meta.nativeH * scale;
  return Math.max(drawW, drawH) * 0.52;
}

export type CatchArena = { cx: number; cy: number; r: number };

export function isLargeCaughtFish(r: number): boolean {
  return r >= FISH_SIZE_CONFIG.large.radius * 0.9;
}

export function throwBackUnlocked(): boolean {
  return (
    hasCollectible("fortune-slip-bing") &&
    !hasCollectible(STALL_REWARD.catchfish)
  );
}

export function canThrowBackCaught(
  caught: ReadonlyArray<CaughtFishDisplay>,
  rewardGranted: boolean,
): boolean {
  return (
    throwBackUnlocked() &&
    !rewardGranted &&
    caught.some((c) => isLargeCaughtFish(c.r))
  );
}

/** 由後往前測試，優先選堆疊最上方的大魚 */
export function findLargeCaughtFishAt(
  x: number,
  y: number,
  caught: ReadonlyArray<CaughtFishDisplay>,
): number {
  for (let i = caught.length - 1; i >= 0; i--) {
    const c = caught[i];
    if (!isLargeCaughtFish(c.r)) continue;
    if (Math.hypot(c.x - x, c.y - y) <= caughtFishPickRadius(c)) return i;
  }
  return -1;
}

/** 遊戲邏輯用的小圓池（魚游動範圍） */
export function isPointInArena(x: number, y: number, arena: CatchArena): boolean {
  return Math.hypot(x - arena.cx, y - arena.cy) <= arena.r;
}

/**
 * 丟回大魚的投放區：比遊戲邏輯圓池大，對應背景魚池視覺；
 * 仍排除右側瓷碗區，避免在桶內放開也算成功。
 */
export function isPointInThrowBackPool(
  x: number,
  y: number,
  arena: CatchArena,
  cw: number,
  ch: number,
): boolean {
  const bowl = designToCanvas(BUCKET_DESIGN.x, BUCKET_DESIGN.y, cw, ch);
  if (x >= bowl.x - 110 && Math.hypot(x - bowl.x, y - bowl.y) < 150) {
    return false;
  }
  const visualR = Math.max(arena.r * 1.35, Math.min(cw, ch) * 0.44);
  return Math.hypot(x - arena.cx, y - arena.cy) <= visualR;
}
