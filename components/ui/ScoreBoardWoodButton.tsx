"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

const SCORE_BOARD_SRC = "/narrative/score_board.webp";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  muted?: boolean;
};

/** 木質感分數版按鈕：沿用攤位進入按鈕的 img 遮罩作法 */
export default function ScoreBoardWoodButton({
  children,
  muted = false,
  className = "",
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={`score-board-wood-btn ${muted ? "score-board-wood-btn--muted" : ""} ${className}`.trim()}
      {...rest}
    >
      <span className="score-board-wood-btn__bg" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={SCORE_BOARD_SRC}
          alt=""
          className="score-board-wood-btn__bg-img"
          draggable={false}
        />
      </span>
      <span className="score-board-wood-btn__label">{children}</span>
    </button>
  );
}
