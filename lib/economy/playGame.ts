"use client";

import { PLAY_COST } from "@/lib/economy/constants";
import { useTokenStore } from "@/store/tokenStore";

export function trySpendPlayCost(): boolean {
  const state = useTokenStore.getState();
  if (!state.hydrated) state.hydrate();
  return state.spendTokens(PLAY_COST);
}

export function canAffordPlayCost(): boolean {
  const state = useTokenStore.getState();
  if (!state.hydrated) state.hydrate();
  return state.tokens >= PLAY_COST;
}
