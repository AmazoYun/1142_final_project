"use client";

import type { KeyboardEvent, ReactNode } from "react";

const SCORE_BOARD_SRC = "/narrative/score_board.webp";

type Props = {
  children: ReactNode;
  className?: string;
  variant?: "dialogue" | "caption" | "modal";
  onClick?: () => void;
  role?: string;
  tabIndex?: number;
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void;
};

/** 分數版貼圖面板：以 img cover 鋪底，避免橫條素材被縱向拉伸成紅邊 */
export default function ScoreBoardPanel({
  children,
  className = "",
  variant = "dialogue",
  onClick,
  role,
  tabIndex,
  onKeyDown,
}: Props) {
  return (
    <div
      className={`score-board-panel score-board-panel--${variant} ${className}`.trim()}
      onClick={onClick}
      role={role}
      tabIndex={tabIndex}
      onKeyDown={onKeyDown}
    >
      <div className="score-board-panel__bg" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={SCORE_BOARD_SRC}
          alt=""
          className="score-board-panel__bg-img"
          draggable={false}
        />
      </div>
      <div className="score-board-panel__content">{children}</div>
    </div>
  );
}
