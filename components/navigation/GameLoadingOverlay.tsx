"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import ScoreBoardPanel from "@/components/ui/ScoreBoardPanel";
import { introSceneSrc } from "@/lib/narrative/introAssets";
import { leaveToiletAmbience } from "@/lib/narrative/introSounds";
import { normalizeRoutePath } from "@/lib/navigation/gameLoadingRoutes";
import { useGameLoadingStore } from "@/store/gameLoadingStore";
import { useTransitionStore } from "@/store/transitionStore";

const BODY_LOCK_CLASS = "game-loading-active";

export default function GameLoadingOverlay() {
  const pathname = usePathname();
  const visible = useGameLoadingStore((s) => s.visible);
  const targetHref = useGameLoadingStore((s) => s.targetHref);
  const tip = useGameLoadingStore((s) => s.tip);
  const dismiss = useGameLoadingStore((s) => s.dismiss);

  const toiletSrc = introSceneSrc("toilet");

  useEffect(() => {
    if (!visible) return;
    document.body.classList.add(BODY_LOCK_CLASS);
    useTransitionStore.getState().fadeOut();
    return () => {
      document.body.classList.remove(BODY_LOCK_CLASS);
    };
  }, [visible]);

  useEffect(() => {
    if (!visible || !targetHref) return;
    const target = normalizeRoutePath(targetHref);
    if (pathname !== target) return;

    const frame = window.requestAnimationFrame(() => {
      void leaveToiletAmbience();
      dismiss();
      useTransitionStore.getState().fadeIn();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, visible, targetHref, dismiss]);

  if (!visible || !toiletSrc) return null;

  return (
    <div className="game-loading-overlay" aria-live="polite" aria-busy="true">
      <div className="game-loading-overlay__backdrop" aria-hidden />

      <div className="game-loading-overlay__scene">
        <Image
          src={toiletSrc}
          alt=""
          fill
          unoptimized
          priority
          className="object-cover object-center hub-world-bg-image"
          sizes="100vw"
        />
      </div>

      <div className="game-loading-overlay__tips">
        <ScoreBoardPanel variant="modal" className="w-full">
          <div className="space-y-3 text-center">
            <h2 className="score-board-panel__title intro-loading-text">遊戲載入中</h2>
            <p className="score-board-panel__body leading-relaxed text-center">{tip}</p>
          </div>
        </ScoreBoardPanel>
      </div>
    </div>
  );
}
