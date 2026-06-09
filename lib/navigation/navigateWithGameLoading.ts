"use client";

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { crossfadeToToiletAmbience } from "@/lib/narrative/introSounds";
import { preloadForGameLoading } from "@/lib/navigation/gameLoadingPreload";
import { useGameLoadingStore } from "@/store/gameLoadingStore";
import { useTransitionStore } from "@/store/transitionStore";

export const GAME_LOADING_MIN_MS = 3500;

export async function navigateWithGameLoading(
  router: AppRouterInstance,
  href: string,
) {
  await useTransitionStore.getState().fadeOut();
  useGameLoadingStore.getState().show({ href });
  crossfadeToToiletAmbience();

  await Promise.all([
    preloadForGameLoading(href),
    new Promise<void>((resolve) => window.setTimeout(resolve, GAME_LOADING_MIN_MS)),
  ]);

  router.push(href);
}
