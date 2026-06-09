"use client";

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { spawnFortuneSlipAfterRound } from "@/lib/collectibles/spawnFortuneSlip";
import { markStallRoundDismissed } from "@/lib/game/stallRoundLeave";
import { saveHubReturnPositionFromGame } from "@/lib/market/hubPlayerPosition";
import { navigateWithFade } from "@/lib/navigation/navigateWithFade";
import type { StallId } from "@/lib/narrative/types";
import { usePlayerStore } from "@/store/playerStore";
import { useTokenStore } from "@/store/tokenStore";

function rememberHubReturnPosition() {
  if (typeof window === "undefined") return;
  saveHubReturnPositionFromGame(window.location.pathname);
}

/** 小遊戲中返回夜市：記住當前攤位位置後轉場 */
export async function navigateToMarketFromGame(router: AppRouterInstance) {
  rememberHubReturnPosition();
  usePlayerStore.getState().snapshotActiveSave();
  await navigateWithFade(router, "/market");
}

type RoundReturnOptions = {
  stallId: StallId;
  score: number;
};

/** 回合結束後返回夜市：依代幣量生成路邊彩票，並於得分後生成籤詩 */
export async function returnToMarketAfterRound(
  router: AppRouterInstance,
  options: RoundReturnOptions,
  onBeforeNavigate?: () => void,
) {
  markStallRoundDismissed(options.stallId);
  onBeforeNavigate?.();
  const state = useTokenStore.getState();
  if (!state.hydrated) state.hydrate();
  await state.spawnRoadLottery();
  spawnFortuneSlipAfterRound(options.stallId, options.score);
  rememberHubReturnPosition();
  usePlayerStore.getState().snapshotActiveSave();
  void navigateWithFade(router, "/market");
}
