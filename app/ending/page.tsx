"use client";

import { lazy, Suspense } from "react";
import GamePageFallback from "@/components/game/GamePageFallback";

const EndingPageClient = lazy(() => import("./EndingPageClient"));

export default function EndingPage() {
  return (
    <Suspense fallback={<GamePageFallback />}>
      <EndingPageClient />
    </Suspense>
  );
}
