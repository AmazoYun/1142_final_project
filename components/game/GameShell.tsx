"use client";

import { useEffect, type ReactNode } from "react";
import GamePageHeader from "@/components/game/GamePageHeader";
import { GameRoundActiveProvider } from "@/components/game/GameRoundActiveContext";
import { startHubBgm } from "@/lib/market/hubSounds";
import { createAmbientRandomSfx } from "@/lib/sfx/randomSfx";
import { usePageFadeIn } from "@/lib/navigation/usePageFadeIn";

type Props = {
  title: string;
  children: ReactNode;
  className?: string;
  backpack?: ReactNode;
};

/** 四款小遊戲共用頂欄；遊戲本體自行排版，外殼不擠壓版面 */
export default function GameShell({ title, children, className = "", backpack }: Props) {
  usePageFadeIn();

  useEffect(() => {
    document.title = `${title}｜無人夜市`;
  }, [title]);

  useEffect(() => {
    const ambient = createAmbientRandomSfx();
    ambient.preload();
    startHubBgm();
    ambient.start();
    return () => ambient.dispose();
  }, []);

  return (
    <GameRoundActiveProvider>
      <div className={`game-stage-shell min-h-screen flex flex-col ${className}`.trim()}>
        <GamePageHeader title={title} backpack={backpack} />
        <div className="flex-1 min-h-0 w-full">{children}</div>
      </div>
    </GameRoundActiveProvider>
  );
}
