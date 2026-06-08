"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { startHubBgm } from "@/lib/market/hubSounds";
import { navigateWithFade } from "@/lib/navigation/navigateWithFade";
import { usePageFadeIn } from "@/lib/navigation/usePageFadeIn";

type Props = {
  title: string;
  children: ReactNode;
  className?: string;
};

/** 四款小遊戲共用頂欄；遊戲本體自行排版，外殼不擠壓版面 */
export default function GameShell({ title, children, className = "" }: Props) {
  const router = useRouter();
  usePageFadeIn();

  useEffect(() => {
    document.title = `${title}｜無人夜市`;
  }, [title]);

  useEffect(() => {
    startHubBgm();
  }, []);

  return (
    <div className={`game-stage-shell min-h-screen flex flex-col ${className}`.trim()}>
      <header className="game-header shrink-0 flex items-center justify-between px-4 py-2.5">
        <button
          type="button"
          className="text-xs tracking-widest text-foreground/70 uppercase hover:text-foreground transition-colors"
          onClick={() => void navigateWithFade(router, "/market")}
        >
          ← 返回夜市
        </button>
        <h1 className="game-title text-sm sm:text-base">{title}</h1>
        <div className="w-[72px]" />
      </header>
      <div className="flex-1 min-h-0 w-full">{children}</div>
    </div>
  );
}
