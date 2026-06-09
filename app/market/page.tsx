"use client";

import { lazy, Suspense } from "react";
import GamePageFallback from "@/components/game/GamePageFallback";

const NightMarketHub = lazy(() => import("@/components/market/NightMarketHub"));

export default function MarketPage() {
  return (
    <Suspense fallback={<GamePageFallback />}>
      <NightMarketHub />
    </Suspense>
  );
}
