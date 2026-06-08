"use client";

import {
  EDGE_STALL_Z_INDEX,
  edgeStallCenterX,
  edgeStallDimensions,
  isPlayerNearStallGlow,
  stallCenterX,
  stallDimensions,
  stallGlowClass,
  type HubLayout,
  type HubMetrics,
} from "@/lib/market/hubLayout";
import type { StallId } from "@/lib/narrative/types";

type Props = {
  hubLayout: HubLayout;
  metrics: HubMetrics;
  playerX: number;
  pointCardStallId: StallId | null;
  pointCardNear: boolean;
};

export default function HubStallLayers({
  hubLayout,
  metrics,
  playerX,
  pointCardStallId,
  pointCardNear,
}: Props) {
  return (
    <>
      {hubLayout.edgeStalls.map((stall, i) => {
        const centerX = edgeStallCenterX(stall, metrics);
        const { width, height } = edgeStallDimensions(stall, metrics);

        return (
          <div
            key={`edge-${i}`}
            className="absolute hub-stall-slot"
            style={{ left: centerX, zIndex: EDGE_STALL_Z_INDEX }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={stall.image}
              alt="夜市攤位"
              width={width}
              height={height}
              className="hub-stall-image hub-stall-image--edge"
              style={{ width, height }}
              decoding="async"
              draggable={false}
            />
          </div>
        );
      })}

      {hubLayout.stalls
        .slice()
        .sort((a, b) => {
          if (a.kind === b.kind) return 0;
          return a.kind === "decorative" ? -1 : 1;
        })
        .map((stall, i) => {
          const centerX = stallCenterX(stall, metrics);
          const { width, height } = stallDimensions(stall, metrics);
          const nearGlow = Boolean(
            (stall.kind === "interactive" &&
              isPlayerNearStallGlow(playerX, centerX, width)) ||
              (pointCardStallId &&
                stall.kind === "interactive" &&
                stall.id === pointCardStallId &&
                pointCardNear),
          );

          return (
            <div
              key={`${stall.kind}-${stall.kind === "interactive" ? stall.id : stall.image}-${i}`}
              className="absolute hub-stall-slot"
              style={{ left: centerX, zIndex: stall.zIndex }}
            >
              <div className={`hub-stall-inner ${stallGlowClass(nearGlow)}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={stall.image}
                  alt={stall.kind === "interactive" ? stall.label : "夜市攤位"}
                  width={width}
                  height={height}
                  className={
                    stall.kind === "interactive"
                      ? "hub-stall-image"
                      : "hub-stall-image hub-stall-image--decorative"
                  }
                  style={{ width, height }}
                  decoding="async"
                  loading={stall.kind === "interactive" ? "eager" : "lazy"}
                  draggable={false}
                />
              </div>
            </div>
          );
        })}
    </>
  );
}
