"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
};

/** 四款小遊戲共用頂欄；遊戲本體自行排版，外殼不擠壓版面 */
export default function GameShell({ title, children }: Props) {
  useEffect(() => {
    document.title = `${title}｜無人夜市`;
  }, [title]);

  return (
    <div className="game-stage-shell min-h-screen flex flex-col">
      <header className="game-header shrink-0 flex items-center justify-between px-4 py-2.5">
        <Link
          href="/market"
          className="text-xs tracking-widest text-foreground/70 uppercase hover:text-foreground transition-colors"
        >
          ← 返回夜市
        </Link>
        <h1 className="game-title text-sm sm:text-base">{title}</h1>
        <div className="w-[72px]" />
      </header>
      <div className="flex-1 min-h-0 w-full">{children}</div>
    </div>
  );
}
