"use client";

import Image from "next/image";
import type { VisualKind } from "@/lib/narrative/types";

const INTRO_MARKET_FRIENDS = "/narrative/intro-market-friends.png";

type Props = { visual: VisualKind };

export default function FirstPersonView({ visual }: Props) {
  const desaturated = visual === "market-desaturate";
  const glowing = visual === "glowing-stall";
  const title = visual === "title-card";
  const bathroom = visual === "bathroom";
  const marketFriends = visual === "market-friends";

  if (bathroom) {
    return (
      <div className="absolute inset-0 overflow-hidden bg-zinc-800 flex items-center justify-center">
        <p className="text-zinc-300 text-sm">【過場】廁所場景（素材待替換）</p>
      </div>
    );
  }

  if (title) {
    return (
      <div className="absolute inset-0 overflow-hidden bg-black flex flex-col items-center justify-center gap-4">
        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-[0.3em]">無人夜市</h1>
        <p className="text-zinc-500 text-sm">Night Market · 2005</p>
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
        className={`absolute inset-0 bg-gradient-to-b from-amber-900/40 via-zinc-900/60 to-zinc-950 ${
          visual === "market-walk-shake" ? "animate-[sway_6s_ease-in-out_infinite]" : ""
        }`}
      />
      <div className="absolute inset-0 opacity-30 bg-[repeating-linear-gradient(90deg,transparent,transparent_40px,rgba(255,200,100,0.08)_40px,rgba(255,200,100,0.08)_80px)]" />
      <div className="absolute bottom-[28%] left-[22%] w-10 h-24 rounded-t-full bg-black/50 blur-[1px]" />
      <div className="absolute bottom-[26%] left-[38%] w-12 h-28 rounded-t-full bg-black/55" />
      <div className="absolute bottom-[27%] right-[30%] w-11 h-26 rounded-t-full bg-black/50" />
      {glowing && (
        <div className="absolute bottom-[35%] left-1/2 -translate-x-1/2 w-32 h-20 rounded-lg bg-amber-300/40 blur-xl animate-pulse" />
      )}
      {!desaturated && !glowing && visual === "market-walk-shake" && (
        <>
          <div className="absolute top-[20%] left-[10%] w-20 h-8 bg-amber-400/30 blur-md rounded" />
          <div className="absolute top-[25%] right-[15%] w-24 h-10 bg-red-400/25 blur-md rounded" />
          <div className="absolute bottom-[40%] left-[55%] w-16 h-6 bg-cyan-400/20 blur-md rounded" />
        </>
      )}
    </div>
  );
}
