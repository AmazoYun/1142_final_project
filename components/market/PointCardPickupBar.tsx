"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BACKPACK_ITEM_IMAGES } from "@/lib/collectibles/backpackLayout";
import { acquireCollectible } from "@/lib/collectibles/acquireItem";
import {
  ENTER_BAR_Z_INDEX,
  LOTTERY_GROUND_Z_INDEX,
  PICKUP_ABOVE_GROUND_PX,
} from "@/lib/market/hubLayout";

type Props = {
  worldX: number;
  groundY: number;
  glowing: boolean;
  visible: boolean;
  onPickedUp: () => void;
};

const CORRODE_MS = 520;
const SCORE_BOARD_SRC = "/narrative/score_board.webp";
const POINT_CARD_SRC = BACKPACK_ITEM_IMAGES["point-card"];

/** 地上集點卡拾取（版面與彩券一致） */
export default function PointCardPickupBar({
  worldX,
  groundY,
  glowing,
  visible,
  onPickedUp,
}: Props) {
  const [corroding, setCorroding] = useState(false);
  const [pickupMounted, setPickupMounted] = useState(visible);
  const [fadedIn, setFadedIn] = useState(false);
  const pendingRef = useRef(false);

  const runPickup = useCallback(() => {
    const result = acquireCollectible("point-card");
    if (result.success) {
      onPickedUp();
    }
  }, [onPickedUp]);

  const triggerPickup = useCallback(() => {
    if (corroding || pendingRef.current || !fadedIn) return;
    pendingRef.current = true;
    setCorroding(true);
    window.setTimeout(() => {
      runPickup();
      pendingRef.current = false;
      setCorroding(false);
    }, CORRODE_MS);
  }, [corroding, fadedIn, runPickup]);

  useEffect(() => {
    if (visible) {
      setPickupMounted(true);
      const raf = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setFadedIn(true));
      });
      return () => window.cancelAnimationFrame(raf);
    }
    setFadedIn(false);
  }, [visible]);

  useEffect(() => {
    if (visible || fadedIn) return;
    const timer = window.setTimeout(() => setPickupMounted(false), 350);
    return () => window.clearTimeout(timer);
  }, [visible, fadedIn]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== " ") return;
      if (!fadedIn) return;
      e.preventDefault();
      triggerPickup();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [triggerPickup, fadedIn]);

  return (
    <>
      <div
        className={`hub-lottery-drop__ground pointer-events-none absolute ${glowing ? "hub-lottery-drop__ground--glow" : ""}`}
        style={{
          left: worldX,
          top: groundY,
          zIndex: LOTTERY_GROUND_Z_INDEX,
          transform: "translate(-50%, -50%)",
        }}
      >
        {glowing ? <div className="hub-lottery-drop__glow" aria-hidden /> : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={POINT_CARD_SRC}
          alt=""
          className="hub-lottery-drop__ticket hub-lottery-drop__ticket--point-card"
          draggable={false}
        />
      </div>

      {pickupMounted ? (
        <div
          className={`stall-enter-anchor pointer-events-none absolute ${fadedIn ? "stall-enter-anchor--visible" : ""}`}
          style={{
            left: worldX,
            top: groundY - PICKUP_ABOVE_GROUND_PX,
            zIndex: ENTER_BAR_Z_INDEX,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="stall-enter-stack pointer-events-auto flex flex-col items-center gap-1.5">
            <p className="stall-enter-title">過期的夜市集點卡</p>
            <button
              type="button"
              className={`stall-enter-btn ${corroding ? "stall-enter-btn--corroding" : ""}`}
              onClick={triggerPickup}
              disabled={corroding || !fadedIn}
            >
              <span className="stall-enter-btn__mask" aria-hidden>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={SCORE_BOARD_SRC}
                  alt=""
                  className="stall-enter-btn__mask-img"
                  draggable={false}
                />
              </span>
              <span className="stall-enter-btn__label">拾取道具</span>
              {corroding ? <span className="stall-enter-btn__corrode" aria-hidden /> : null}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
