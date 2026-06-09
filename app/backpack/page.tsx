"use client";

import { lazy, Suspense } from "react";
import GamePageFallback from "@/components/game/GamePageFallback";

const BackpackView = lazy(() => import("@/components/collectibles/BackpackView"));

export default function BackpackPage() {
  return (
    <Suspense fallback={<GamePageFallback />}>
      <BackpackView />
    </Suspense>
  );
}
