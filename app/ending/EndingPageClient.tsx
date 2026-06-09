"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import StorySequencePlayer from "@/components/narrative/StorySequencePlayer";
import { getEndingScript } from "@/data/endings-default";
import { prepareItemsForLeave } from "@/lib/endings/prepareLeave";
import { startMainBgm, stopHubBgm } from "@/lib/market/hubSounds";
import { navigateWithFade } from "@/lib/navigation/navigateWithFade";
import { usePageFadeIn } from "@/lib/navigation/usePageFadeIn";
import type { EndingId } from "@/lib/endings/types";
import { usePlayerStore } from "@/store/playerStore";
import { useNarrativeStore } from "@/store/narrativeStore";

const ENDING_FADE_MS = 1200;

function parsePreviewEndingId(raw: string | null): EndingId | null {
  if (!raw) return null;
  const script = getEndingScript(raw);
  return script ? (raw as EndingId) : null;
}

export default function EndingPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const previewEndingId = parsePreviewEndingId(searchParams.get("preview"));
  const isPreview = previewEndingId !== null;
  const hydrate = useNarrativeStore((s) => s.hydrate);
  const markEndingSeen = useNarrativeStore((s) => s.markEndingSeen);
  const finishRun = usePlayerStore((s) => s.finishRun);
  const hydratePlayers = usePlayerStore((s) => s.hydrate);

  usePageFadeIn();

  const [endingId, setEndingId] = useState<EndingId | null>(previewEndingId);
  const [playing, setPlaying] = useState(true);
  const [fadingOut, setFadingOut] = useState(false);
  const onCompleteCalledRef = useRef(false);

  useEffect(() => {
    stopHubBgm();
    startMainBgm();
  }, []);

  useEffect(() => {
    hydrate();
    hydratePlayers();
    if (isPreview) {
      setEndingId(previewEndingId);
      return;
    }
    const id = prepareItemsForLeave();
    setEndingId(id);
    markEndingSeen(id);
    finishRun(id);
  }, [
    hydrate,
    hydratePlayers,
    isPreview,
    previewEndingId,
    markEndingSeen,
    finishRun,
  ]);

  const script = useMemo(
    () => (endingId ? getEndingScript(endingId) : null),
    [endingId],
  );

  const goHome = useCallback(() => {
    void navigateWithFade(router, "/");
  }, [router]);

  const onComplete = useCallback(() => {
    if (onCompleteCalledRef.current) return;
    onCompleteCalledRef.current = true;
    setFadingOut(true);
    window.setTimeout(() => {
      setPlaying(false);
    }, ENDING_FADE_MS);
  }, []);

  if (!endingId || !script) {
    return (
      <div className="min-h-screen flex items-center justify-center hub-shell">
        <p className="text-sm opacity-70">載入結局中…</p>
      </div>
    );
  }

  if (playing) {
    return (
      <div className="fixed inset-0 z-50 hub-shell bg-black">
        <StorySequencePlayer
          lines={script.lines}
          endingId={endingId}
          onComplete={onComplete}
        />
        {fadingOut && <div className="ending-fade-out" aria-hidden />}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center hub-shell px-6 gap-6 bg-black">
      <h1 className="game-title text-xl">{script.title}</h1>
      <button type="button" className="game-btn-primary" onClick={goHome}>
        返回主畫面
      </button>
    </div>
  );
}
