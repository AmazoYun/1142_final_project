/**
 * =============================================================================
 * lib/collectibles/acquireItem.ts — 外部呼叫入口（取得物品）
 * =============================================================================
 *
 * 【使用方式】在任意 Client Component 或事件處理中：
 *
 *   import { acquireCollectible } from "@/lib/collectibles/acquireItem";
 *
 *   // 例：套圈圈全中後
 *   const result = acquireCollectible("rocking-horse");
 *   if (result.success) {
 *     // 對話會由 CollectibleDialogueHost 自動顯示，無需在此處再寫 UI
 *   }
 *
 * 【流程】
 *   1. 呼叫端確認遊戲條件已滿足
 *   2. acquireCollectible(id) → store.tryAcquire
 *   3. 若 success：狀態寫入 localStorage，並觸發取得對話
 *   4. 若 already_acquired / unknown_id：回傳失敗，不重複發放
 *
 * 【注意】
 * - 必須在瀏覽器環境呼叫（依賴 zustand + localStorage）
 * - 對話 UI 掛在 app/layout.tsx 的 CollectibleDialogueHost，與當前路由無關
 */

"use client";

import { getCollectibleDef } from "@/data/collectibles-default";
import type { AcquireCollectibleResult, CollectibleId } from "@/lib/collectibles/types";
import { playRewardSound } from "@/lib/market/hubSounds";
import { useCollectibleStore } from "@/store/collectibleStore";

/**
 * 嘗試取得指定物品並觸發取得對話。
 *
 * @param itemId - 與 data/collectibles-default.ts 中定義的 id 相同
 * @returns AcquireCollectibleResult
 */
export function acquireCollectible(
  itemId: CollectibleId,
  options?: { skipDialogue?: boolean },
): AcquireCollectibleResult {
  if (typeof window === "undefined") {
    return { success: false, reason: "unknown_id" };
  }

  const state = useCollectibleStore.getState();
  if (!state.hydrated) {
    state.hydrate();
  }

  if (!getCollectibleDef(itemId)) {
    return { success: false, reason: "unknown_id" };
  }

  const result = state.tryAcquire(itemId, options);
  if (result.success) {
    playRewardSound();
  }
  return result;
}

/**
 * 查詢是否已取得（不修改狀態）。
 * 適合用在條件判斷：if (!hasCollectible("x")) { ... }
 */
export function hasCollectible(itemId: CollectibleId): boolean {
  if (typeof window === "undefined") return false;
  const state = useCollectibleStore.getState();
  if (!state.hydrated) state.hydrate();
  return state.hasAcquired(itemId);
}
