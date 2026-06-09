"use client";

import Image from "next/image";
import { useEffect, type CSSProperties } from "react";
import HubSceneOverlay from "@/components/narrative/HubSceneOverlay";
import IntroTransitionGlitch from "@/components/narrative/IntroTransitionGlitch";
import { INTRO_TRANSITION_FLASH, introSceneSrc } from "@/lib/narrative/introAssets";
import type { TransitionKind, VisualKind } from "@/lib/narrative/types";

/** 一般 transition 圖片（閃光、fade-reveal 等）顯示時長 */
export const INTRO_TRANSITION_IMAGE_MS = 400;
/** weird → glowing 交叉淡化時長 */
export const INTRO_GLOW_CROSSFADE_MS = 3000;

export function introTransitionDurationMs(kind: TransitionKind): number {
  if (kind === "fade-glowing") return INTRO_GLOW_CROSSFADE_MS;
  if (kind === "game-hint") return 1000;
  return INTRO_TRANSITION_IMAGE_MS;
}

export function introTransitionStyle(kind: TransitionKind): CSSProperties {
  return {
    "--intro-transition-duration": `${INTRO_TRANSITION_IMAGE_MS}ms`,
    ...(kind === "fade-glowing"
      ? { "--intro-glow-crossfade-duration": `${INTRO_GLOW_CROSSFADE_MS}ms` }
      : {}),
  } as CSSProperties;
}

type Props = {
  kind: TransitionKind;
  reveals?: VisualKind;
  overlay?: boolean;
  onDone: () => void;
};

export default function IntroTransition({ kind, reveals, overlay = false, onDone }: Props) {
  useEffect(() => {
    const doneTimer = window.setTimeout(onDone, introTransitionDurationMs(kind));
    return () => clearTimeout(doneTimer);
  }, [kind, onDone]);

  const rootClass = overlay
    ? "intro-transition intro-transition--overlay absolute inset-0 z-[15] pointer-events-none"
    : "intro-transition fixed inset-0 z-[80]";
  const rootStyle = introTransitionStyle(kind);

  if (kind === "flash-transition") {
    return (
      <div className={`${rootClass} intro-transition--flash bg-black`} style={rootStyle}>
        <div className="intro-transition__flash intro-transition__image-wrap--glitch">
          <Image
            src={INTRO_TRANSITION_FLASH}
            alt=""
            fill
            unoptimized
            className="object-cover object-center hub-world-bg-image intro-transition__flash-image"
            sizes="100vw"
            priority
          />
          <IntroTransitionGlitch />
        </div>
        <HubSceneOverlay />
      </div>
    );
  }

  if (kind === "fade-reveal") {
    const revealSrc =
      (reveals && introSceneSrc(reveals)) ?? introSceneSrc("market-weird")!;
    return (
      <div className={`${rootClass} intro-transition--reveal bg-black hub-world-bg`} style={rootStyle}>
        <div className="intro-transition__reveal-scene intro-transition__image-wrap--glitch">
          <Image
            src={revealSrc}
            alt=""
            fill
            unoptimized
            className="object-cover object-center hub-world-bg-image intro-transition__reveal-image"
            sizes="100vw"
            priority
          />
          <IntroTransitionGlitch />
        </div>
        <HubSceneOverlay />
      </div>
    );
  }

  if (kind === "fade-glowing") {
    const fromSrc = introSceneSrc("market-weird")!;
    const toSrc = introSceneSrc(reveals ?? "glowing-stall")!;
    return (
      <div className={`${rootClass} intro-transition--glow bg-black hub-world-bg`} style={rootStyle}>
        <div className="intro-transition__glow-from">
          <Image
            src={fromSrc}
            alt=""
            fill
            unoptimized
            className="object-cover object-center hub-world-bg-image"
            sizes="100vw"
            priority
          />
        </div>
        <div className="intro-transition__glow-to">
          <Image
            src={toSrc}
            alt=""
            fill
            unoptimized
            className="object-cover object-center hub-world-bg-image"
            sizes="100vw"
            priority
          />
        </div>
        <HubSceneOverlay />
      </div>
    );
  }

  if (kind === "fade-dark") {
    return <div className={`${rootClass} intro-transition--fade-dark bg-black`} style={rootStyle} />;
  }

  return (
    <div className={`${rootClass} hub-shell flex items-center justify-center`}>
      <p className="game-panel px-6 py-4 text-sm tracking-widest">遊戲提示（待輸入）</p>
    </div>
  );
}
