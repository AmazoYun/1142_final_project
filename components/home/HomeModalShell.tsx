"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

/** 主畫面彈窗共用外殼（登入、存檔、結局選擇等） */
export default function HomeModalShell({ children, className = "" }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className={`game-panel home-modal ${className}`.trim()}>{children}</div>
    </div>
  );
}
