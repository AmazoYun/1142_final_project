"use client";

import { lazy, Suspense } from "react";
import GamePageFallback from "@/components/game/GamePageFallback";

const RingTossGame = lazy(() => import("./RingTossGame"));

export default function RingTossPage() {
  return (
    <Suspense fallback={<GamePageFallback />}>
      <RingTossGame />
    </Suspense>
  );
}
