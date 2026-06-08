"use client";

import type { LoadedCatchFishAssets } from "@/lib/catchfish/assets";
import { INITIAL_NETS } from "@/store/gameStore";

type Props = {
  netsRemaining: number;
  durability: number;
  assets: LoadedCatchFishAssets | null;
  breakingSlot: number | null;
};

/** 頂部 HUD 內：剩餘撈網圖示 + 使用中網的耐久 */
export default function CatchfishNetHud({
  netsRemaining,
  durability,
  assets,
  breakingSlot,
}: Props) {
  const brokenCount = INITIAL_NETS - netsRemaining;
  const activeSlot = brokenCount;

  return (
    <div className="catchfish-hud-nets" aria-label={`剩餘撈網 ${netsRemaining} 張`}>
      <span className="catchfish-hud-nets__label">剩餘網子</span>
      <div className="catchfish-hud-nets__row">
        {Array.from({ length: INITIAL_NETS }, (_, i) => {
          const isBroken = i < brokenCount;
          const isActive = i === activeSlot && netsRemaining > 0;
          const isBreaking = breakingSlot === i;

          return (
            <div
              key={i}
              className={`catchfish-hud-nets__slot${isBreaking ? " catchfish-hud-nets__slot--breaking" : ""}${isActive ? " catchfish-hud-nets__slot--active" : ""}${isBroken ? " catchfish-hud-nets__slot--broken" : ""}`}
            >
              {assets?.net ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={
                    isBroken && assets.netBroken
                      ? assets.netBroken.src
                      : assets.net.src
                  }
                  alt=""
                  className="catchfish-hud-nets__img"
                  draggable={false}
                />
              ) : (
                <span className="catchfish-hud-nets__fallback" aria-hidden />
              )}
              {isActive && !isBroken ? (
                <span className="catchfish-hud-nets__durability">{Math.round(durability)}%</span>
              ) : null}
            </div>
          );
        })}
      </div>
      <span className="catchfish-hud-nets__count tabular-nums">{netsRemaining}</span>
    </div>
  );
}
