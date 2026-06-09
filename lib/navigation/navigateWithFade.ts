"use client";

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { usesGameLoading } from "@/lib/navigation/gameLoadingRoutes";
import { navigateWithGameLoading } from "@/lib/navigation/navigateWithGameLoading";
import { FADE_DURATION_MS, useTransitionStore } from "@/store/transitionStore";

export async function navigateWithFade(router: AppRouterInstance, href: string) {
  if (usesGameLoading(href)) {
    await navigateWithGameLoading(router, href);
    return;
  }

  await useTransitionStore.getState().fadeOut();
  router.push(href);
  window.setTimeout(() => {
    useTransitionStore.getState().fadeIn();
  }, FADE_DURATION_MS + 50);
}
