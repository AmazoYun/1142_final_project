"use client";

import type { LoadedCatchFishAssets } from "@/lib/catchfish/assets";
import { INITIAL_NETS } from "@/store/gameStore";

type Props = {
  netsRemaining: number;
  durability: number;
  assets: LoadedCatchFishAssets | null;
  breakingSlot: number | null;
};

export default function NetInventory({
  netsRemaining,
  durability,
  assets,
  breakingSlot,
}: Props) {
  const brokenCount = INITIAL_NETS - netsRemaining;
  const activeSlot = brokenCount;

  return (
    <div
      className="catchfish-net-inventory"
      aria-label={`剩餘撈網 ${netsRemaining} 張`}
    >
      {Array.from({ length: INITIAL_NETS }, (_, i) => {
        const isBroken = i < brokenCount;
        const isActive = i === activeSlot && netsRemaining > 0;
        const isBreaking = breakingSlot === i;

        return (
          <div
            key={i}
            className={`catchfish-net-slot${isBreaking ? " catchfish-net-slot--breaking" : ""}${isActive ? " catchfish-net-slot--active" : ""}`}
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
                className={`catchfish-net-slot__img${isBroken && !assets.netBroken ? " catchfish-net-slot__img--broken-fallback" : ""}`}
                draggable={false}
              />
            ) : (
              <span className="catchfish-net-slot__fallback" aria-hidden />
            )}
            {isActive && !isBroken ? (
              <span className="catchfish-net-slot__durability">{Math.round(durability)}%</span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
