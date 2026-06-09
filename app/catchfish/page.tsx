"use client";

import { lazy, Suspense } from "react";
import GamePageFallback from "@/components/game/GamePageFallback";

const CatchFishGame = lazy(() => import("./CatchFishGame"));

export default function CatchFishPage() {
  return (
    <Suspense fallback={<GamePageFallback />}>
      <CatchFishGame />
    </Suspense>
  );
}
