"use client";

import { lazy, Suspense } from "react";
import GameShell from "@/components/game/GameShell";
import GamePageFallback from "@/components/game/GamePageFallback";
import { narrativeDefault } from "@/data/narrative-default";

const PinballGame = lazy(() => import("./PinballGame"));

export default function PinballPage() {
  const script = narrativeDefault.stalls.pinball;
  return (
    <GameShell title={script.title}>
      <Suspense fallback={<GamePageFallback />}>
        <PinballGame />
      </Suspense>
    </GameShell>
  );
}
