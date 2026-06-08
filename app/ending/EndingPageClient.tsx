"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import StorySequencePlayer from "@/components/narrative/StorySequencePlayer";
import { getEndingScript } from "@/data/endings-default";
import { prepareItemsForLeave } from "@/lib/endings/prepareLeave";
import { navigateWithFade } from "@/lib/navigation/navigateWithFade";
import { usePageFadeIn } from "@/lib/navigation/usePageFadeIn";
import type { EndingId } from "@/lib/endings/types";
import { usePlayerStore } from "@/store/playerStore";
import { useNarrativeStore } from "@/store/narrativeStore";

export default function EndingPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const loopRestart = searchParams.get("loop") === "1";
  const hydrate = useNarrativeStore((s) => s.hydrate);
  const markEndingSeen = useNarrativeStore((s) => s.markEndingSeen);
  const replayIntro = useNarrativeStore((s) => s.replayIntro);
  const finishRun = usePlayerStore((s) => s.finishRun);
  const hydratePlayers = usePlayerStore((s) => s.hydrate);

  usePageFadeIn();

  const [endingId, setEndingId] = useState<EndingId | null>(
    loopRestart ? "loop" : null,
  );
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    hydrate();
    hydratePlayers();
    if (loopRestart) {
      markEndingSeen("loop");
      return;
    }
    const id = prepareItemsForLeave();
    setEndingId(id);
    markEndingSeen(id);
    finishRun(id);
  }, [hydrate, hydratePlayers, loopRestart, markEndingSeen, finishRun]);

  const script = useMemo(
    () => (endingId ? getEndingScript(endingId) : null),
    [endingId],
  );

  const onComplete = useCallback(() => {
    setPlaying(false);
    if (script?.restartMarket) {
      void navigateWithFade(router, "/market?loop=1");
    }
  }, [script?.restartMarket, router]);

  if (!endingId || !script) {
    return (
      <div className="min-h-screen flex items-center justify-center hub-shell">
        <p className="text-sm opacity-70">載入結局中…</p>
      </div>
    );
  }

  if (playing) {
    return (
      <div className="fixed inset-0 z-50 hub-shell">
        <StorySequencePlayer lines={script.lines} onComplete={onComplete} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center hub-shell px-6 gap-6">
      <h1 className="game-title text-xl">{script.title}</h1>
      {script.restartMarket ? (
        <button
          type="button"
          className="game-btn-primary"
          onClick={() => void navigateWithFade(router, "/market?loop=1")}
        >
          再次走入夜市
        </button>
      ) : (
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            type="button"
            className="game-btn-ghost"
            onClick={() => void navigateWithFade(router, "/market")}
          >
            回到夜市
          </button>
          <button
            type="button"
            className="game-btn-primary"
            onClick={() => {
              replayIntro();
              void navigateWithFade(router, "/");
            }}
          >
            從頭開始
          </button>
        </div>
      )}
    </div>
  );
}
