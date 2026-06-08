"use client";

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { navigateWithFade } from "@/lib/navigation/navigateWithFade";
import { useTokenStore } from "@/store/tokenStore";

/** 回合結束後返回夜市：依代幣量生成路邊彩票 */
export async function returnToMarketAfterRound(router: AppRouterInstance) {
  const state = useTokenStore.getState();
  if (!state.hydrated) state.hydrate();
  await state.spawnRoadLottery();
  void navigateWithFade(router, "/market");
}
