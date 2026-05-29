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
    <div className="min-h-screen bg-neutral-100 text-neutral-900 flex flex-col">
      <header className="shrink-0 flex items-center justify-between border-b border-neutral-300 bg-white px-4 py-2.5">
        <Link
          href="/market"
          className="text-sm text-neutral-700 hover:text-neutral-900 transition-colors"
        >
          ← 返回夜市
        </Link>
        <h1 className="text-base font-semibold text-neutral-800">{title}</h1>
        <div className="w-[72px]" />
      </header>
      <div className="flex-1 min-h-0 w-full">{children}</div>
    </div>
  );
}
