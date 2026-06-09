"use client";

import { lazy, Suspense } from "react";
import GameShell from "@/components/game/GameShell";
import GamePageFallback from "@/components/game/GamePageFallback";
import { narrativeDefault } from "@/data/narrative-default";

const BalloonShootGame = lazy(() => import("./BalloonShootGame"));

export default function BalloonShootPage() {
  const script = narrativeDefault.stalls.balloonshoot;
  return (
    <GameShell title={script.title}>
      <Suspense fallback={<GamePageFallback />}>
        <BalloonShootGame />
      </Suspense>
    </GameShell>
  );
}
