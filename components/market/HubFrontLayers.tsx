"use client";

import type { HubMetrics } from "@/lib/market/hubLayout";
import {
  HUB_BACKGROUND_FRONT,
  HUB_FRONT_LAYER_Z_INDEX,
  HUB_SHADOW_LAYER_Z_INDEX,
  shadowDimensions,
  shadowTop,
  shadowWorldX,
  type HubShadowPlacement,
} from "@/lib/market/hubSceneLayers";
import HubShadowEditor from "./HubShadowEditor";

type Props = {
  metrics: HubMetrics;
  shadowPlacements: HubShadowPlacement[];
  shadowEditMode?: boolean;
  selectedShadowId?: string | null;
  onSelectShadow?: (id: string | null) => void;
  onShadowPlacementsChange?: (placements: HubShadowPlacement[]) => void;
};

export default function HubFrontLayers({
  metrics,
  shadowPlacements,
  shadowEditMode = false,
  selectedShadowId = null,
  onSelectShadow,
  onShadowPlacementsChange,
}: Props) {
  return (
    <>
      <div
        className="absolute top-0 left-0 hub-background-front-layer"
        style={{
          width: metrics.worldWidth,
          height: metrics.worldHeight,
          zIndex: HUB_FRONT_LAYER_Z_INDEX,
        }}
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HUB_BACKGROUND_FRONT}
          alt=""
          className="hub-background-front-image"
          style={{
            width: metrics.worldWidth,
            height: metrics.worldHeight,
          }}
          decoding="async"
          draggable={false}
        />
      </div>

      {shadowEditMode && onSelectShadow && onShadowPlacementsChange ? (
        <HubShadowEditor
          metrics={metrics}
          placements={shadowPlacements}
          selectedId={selectedShadowId}
          onSelect={onSelectShadow}
          onChange={onShadowPlacementsChange}
        />
      ) : (
        shadowPlacements.map((placement) => {
          const { width, height } = shadowDimensions(placement, metrics);
          return (
            <div
              key={placement.id}
              className="absolute hub-shadow-slot"
              style={{
                left: shadowWorldX(placement, metrics),
                top: shadowTop(placement, metrics),
                zIndex: HUB_SHADOW_LAYER_Z_INDEX,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={placement.image}
                alt=""
                width={width}
                height={height}
                className="hub-shadow-image"
                style={{ width, height }}
                decoding="async"
                loading="eager"
                draggable={false}
              />
            </div>
          );
        })
      )}
    </>
  );
}
