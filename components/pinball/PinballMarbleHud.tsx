"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PINBALL_ASSET_PATHS } from "@/lib/pinball/assets";

const MAX_VISIBLE = 7;
const MARBLE_SRCS = PINBALL_ASSET_PATHS.pinballs;
/** 向下拖曳超過此距離即取得彈珠 */
const PULL_THRESHOLD_PX = 30;

type Props = {
  balls: number;
  peakBalls: number;
  /** 持有籤詩甲、尚未取得彈珠、且仍有剩餘彈珠時可拖曳 */
  grabEnabled?: boolean;
  onGrabMarble?: () => void;
};

/** 頂部 HUD：彈珠圖示水平排列；進階時可從任一顆剩餘彈珠向下拖曳取得道具 */
export default function PinballMarbleHud({
  balls,
  peakBalls,
  grabEnabled = false,
  onGrabMarble,
}: Props) {
  const overflow = balls > MAX_VISIBLE ? balls - MAX_VISIBLE : 0;
  const slotCount = overflow > 0 ? MAX_VISIBLE : Math.min(Math.max(peakBalls, balls), MAX_VISIBLE);
  const brightCount = overflow > 0 ? MAX_VISIBLE : balls;

  const dragRef = useRef<{
    slotIndex: number;
    pointerId: number;
    startY: number;
  } | null>(null);
  const [pullOffset, setPullOffset] = useState(0);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);

  const finishDrag = useCallback(
    (completed: boolean) => {
      if (completed && onGrabMarble) onGrabMarble();
      dragRef.current = null;
      setActiveSlot(null);
      setPullOffset(0);
    },
    [onGrabMarble],
  );

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;
      const delta = Math.max(0, e.clientY - drag.startY);
      setPullOffset(delta);
    };

    const onPointerUp = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;
      finishDrag(e.clientY - drag.startY >= PULL_THRESHOLD_PX);
    };

    const onPointerCancel = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;
      finishDrag(false);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
    };
  }, [finishDrag]);

  const onSlotPointerDown = (slotIndex: number, lit: boolean) => (e: React.PointerEvent) => {
    if (!grabEnabled || !lit || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      slotIndex,
      pointerId: e.pointerId,
      startY: e.clientY,
    };
    setActiveSlot(slotIndex);
    setPullOffset(0);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  return (
    <div className="pinball-hud-marbles" aria-label={`剩餘彈珠 ${balls} 顆`}>
      <span className="pinball-hud-marbles__label">彈珠</span>
      <div className="pinball-hud-marbles__row">
        {Array.from({ length: slotCount }, (_, i) => {
          const lit = i < brightCount;
          const grabbable = grabEnabled && lit;
          const dragging = activeSlot === i;
          return (
            <div
              key={i}
              className={[
                "pinball-hud-marbles__slot",
                lit ? "pinball-hud-marbles__slot--lit" : "pinball-hud-marbles__slot--dim",
                grabbable ? "pinball-hud-marbles__slot--grabbable" : "",
                dragging ? "pinball-hud-marbles__slot--dragging" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onPointerDown={onSlotPointerDown(i, lit)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={MARBLE_SRCS[i % MARBLE_SRCS.length]}
                alt=""
                className="pinball-hud-marbles__img"
                draggable={false}
                style={
                  dragging
                    ? { transform: `translateY(${Math.min(pullOffset, 48)}px)` }
                    : undefined
                }
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
