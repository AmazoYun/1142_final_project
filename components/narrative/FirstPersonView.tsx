"use client";

import Image from "next/image";
import type { VisualKind } from "@/lib/narrative/types";

const INTRO_MARKET_FRIENDS = "/narrative/intro-market-friends.webp";

type Props = { visual: VisualKind };

export default function FirstPersonView({ visual }: Props) {
  const desaturated = visual === "market-desaturate";
  const glowing = visual === "glowing-stall";
  const title = visual === "title-card";
  const bathroom = visual === "bathroom";
  const marketFriends = visual === "market-friends";

  if (bathroom) {
    return (
      <div className="absolute inset-0 overflow-hidden hub-world-sky flex items-center justify-center">
        <p className="game-panel px-4 py-3 text-sm tracking-widest">
          【過場】廁所場景（素材待替換）
        </p>
      </div>
    );
  }

  if (title) {
    return (
      <div className="absolute inset-0 overflow-hidden hub-shell flex flex-col items-center justify-center gap-4">
        <div className="absolute inset-0 hub-world-sky" />
        <h1 className="relative game-panel px-8 py-4 text-3xl md:text-4xl tracking-[0.3em] text-ink">
          無人夜市
        </h1>
        <p className="relative game-caption text-xs tracking-[0.2em]">
          Night Market · 2005
        </p>
      </div>
    );
  }

  if (marketFriends) {
    return (
      <div className="absolute inset-0 overflow-hidden bg-black">
        <div className="absolute inset-0 animate-[sway_6s_ease-in-out_infinite] origin-center">
          <Image
            src={INTRO_MARKET_FRIENDS}
            alt="夜市與同伴"
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`absolute inset-0 overflow-hidden ${
        desaturated ? "grayscale brightness-75 contrast-125" : ""
      } ${glowing ? "brightness-90" : ""}`}
    >
      <div
        className={`absolute inset-0 hub-world-sky ${
          visual === "market-walk-shake" ? "animate-[sway_6s_ease-in-out_infinite]" : ""
        }`}
      />
      <div className="absolute inset-0 opacity-30 bg-[repeating-linear-gradient(90deg,transparent,transparent_40px,rgba(232,228,220,0.06)_40px,rgba(232,228,220,0.06)_80px)]" />
      <div className="absolute bottom-[28%] left-[22%] w-8 h-11 border-2 border-ink bg-paper shadow-[2px_2px_0_0_#111]" />
      <div className="absolute bottom-[26%] left-[38%] w-9 h-12 border-2 border-ink bg-paper shadow-[2px_2px_0_0_#111]" />
      <div className="absolute bottom-[27%] right-[30%] w-8 h-11 border-2 border-ink bg-paper shadow-[2px_2px_0_0_#111]" />
      {glowing && (
        <div className="absolute bottom-[35%] left-1/2 -translate-x-1/2 w-32 h-20 border-2 border-accent-red bg-accent-red/20 animate-pulse" />
      )}
      {!desaturated && !glowing && visual === "market-walk-shake" && (
        <>
          <div className="absolute top-[20%] left-[10%] w-20 h-8 border border-foreground/20 bg-foreground/10" />
          <div className="absolute top-[25%] right-[15%] w-24 h-10 border border-accent-red/30 bg-accent-red/10" />
          <div className="absolute bottom-[40%] left-[55%] w-16 h-6 border border-foreground/15 bg-foreground/10" />
        </>
      )}
    </div>
  );
}
