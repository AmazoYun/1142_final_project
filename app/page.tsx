"use client";

import { lazy, Suspense } from "react";
import GamePageFallback from "@/components/game/GamePageFallback";

const StartPage = lazy(() => import("@/components/home/StartPage"));

export default function Home() {
  return (
    <Suspense fallback={<GamePageFallback />}>
      <StartPage />
    </Suspense>
  );
}
