"use client";

import { PINBALL_ASSET_PATHS } from "@/lib/pinball/assets";

const MAX_VISIBLE = 7;
const MARBLE_SRCS = PINBALL_ASSET_PATHS.pinballs;

type Props = {
  balls: number;
  peakBalls: number;
};

/** 頂部 HUD：彈珠圖示水平排列（用掉變暗、獲得變亮；超過 7 顆顯示 +N） */
export default function PinballMarbleHud({ balls, peakBalls }: Props) {
  const overflow = balls > MAX_VISIBLE ? balls - MAX_VISIBLE : 0;
  const slotCount = overflow > 0 ? MAX_VISIBLE : Math.min(Math.max(peakBalls, balls), MAX_VISIBLE);
  const brightCount = overflow > 0 ? MAX_VISIBLE : balls;

  return (
    <div className="pinball-hud-marbles" aria-label={`剩餘彈珠 ${balls} 顆`}>
      <span className="pinball-hud-marbles__label">彈珠</span>
      <div className="pinball-hud-marbles__row">
        {Array.from({ length: slotCount }, (_, i) => {
          const lit = i < brightCount;
          return (
            <div
              key={i}
              className={`pinball-hud-marbles__slot${lit ? " pinball-hud-marbles__slot--lit" : " pinball-hud-marbles__slot--dim"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={MARBLE_SRCS[i % MARBLE_SRCS.length]}
                alt=""
                className="pinball-hud-marbles__img"
                draggable={false}
              />
            </div>
          );
        })}
        {overflow > 0 ? (
          <span className="pinball-hud-marbles__overflow tabular-nums">+{overflow}</span>
        ) : null}
      </div>
    </div>
  );
}
