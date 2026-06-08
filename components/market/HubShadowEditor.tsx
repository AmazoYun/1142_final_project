"use client";

import { useCallback, useRef } from "react";
import type { HubMetrics } from "@/lib/market/hubLayout";
import {
  HUB_SHADOW_EDITOR_Z_INDEX,
  shadowDimensions,
  type HubShadowPlacement,
} from "@/lib/market/hubSceneLayers";
import {
  placementFromWorldPosition,
  placementWorldPosition,
} from "@/lib/market/hubShadowLayout";

type Props = {
  metrics: HubMetrics;
  placements: HubShadowPlacement[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (placements: HubShadowPlacement[]) => void;
};

type DragState = {
  id: string;
  startClientX: number;
  startClientY: number;
  startWorldX: number;
  startTop: number;
};

/** 可拖曳的陰影圖層（在世界座標內） */
export default function HubShadowEditor({
  metrics,
  placements,
  selectedId,
  onSelect,
  onChange,
}: Props) {
  const dragRef = useRef<DragState | null>(null);

  const updatePlacement = useCallback(
    (id: string, next: HubShadowPlacement) => {
      onChange(placements.map((p) => (p.id === id ? next : p)));
    },
    [onChange, placements],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, placement: HubShadowPlacement) => {
      e.stopPropagation();
      onSelect(placement.id);
      const { worldX, top } = placementWorldPosition(placement, metrics);
      dragRef.current = {
        id: placement.id,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startWorldX: worldX,
        startTop: top,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [metrics, onSelect],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const placement = placements.find((p) => p.id === drag.id);
      if (!placement) return;

      const dx = e.clientX - drag.startClientX;
      const dy = e.clientY - drag.startClientY;
      const next = placementFromWorldPosition(
        placement,
        drag.startWorldX + dx,
        drag.startTop + dy,
        metrics,
      );
      updatePlacement(drag.id, next);
    },
    [metrics, placements, updatePlacement],
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    dragRef.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  return (
    <>
      {placements.map((placement) => {
        const { worldX, top } = placementWorldPosition(placement, metrics);
        const { width, height } = shadowDimensions(placement, metrics);
        const isSelected = placement.id === selectedId;

        return (
          <div
            key={placement.id}
            className={`absolute hub-shadow-slot hub-shadow-slot--editable${isSelected ? " hub-shadow-slot--selected" : ""}`}
            style={{
              left: worldX,
              top,
              zIndex: HUB_SHADOW_EDITOR_Z_INDEX,
            }}
            onPointerDown={(e) => handlePointerDown(e, placement)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={placement.image}
              alt=""
              width={width}
              height={height}
              className="hub-shadow-image"
              style={{ width, height }}
              draggable={false}
            />
            {isSelected ? (
              <span className="hub-shadow-editor-handle" aria-hidden>
                ⠿
              </span>
            ) : null}
          </div>
        );
      })}
    </>
  );
}
