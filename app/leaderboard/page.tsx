"use client";

import { lazy, Suspense } from "react";
import GamePageFallback from "@/components/game/GamePageFallback";

const LeaderboardPageClient = lazy(() => import("@/components/leaderboard/LeaderboardPageClient"));

export default function LeaderboardPage() {
  return (
    <Suspense fallback={<GamePageFallback />}>
      <LeaderboardPageClient />
    </Suspense>
  );
}
