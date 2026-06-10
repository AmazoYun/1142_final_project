"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FORTUNE_SLIP_IMAGE } from "@/lib/collectibles/fortuneSlips";
import { pickupCharmSpawnItem } from "@/lib/collectibles/spawnFortuneSlip";
import {
  ENTER_BAR_Z_INDEX,
  LOTTERY_GROUND_Z_INDEX,
  PICKUP_ABOVE_GROUND_PX,
} from "@/lib/market/hubLayout";
import type { CharmSpawn } from "@/store/narrativeStore";

type Props = {
  spawn: CharmSpawn;
  worldX: number;
  groundY: number;
  glowing: boolean;
  visible: boolean;
};

const CORRODE_MS = 520;
const SCORE_BOARD_SRC = "/narrative/score_board.webp";

export default function CharmPickupBar({ spawn, worldX, groundY, glowing, visible }: Props) {
  const [corroding, setCorroding] = useState(false);
  const [pickupMounted, setPickupMounted] = useState(visible);
  const [fadedIn, setFadedIn] = useState(false);
  const pendingRef = useRef(false);

  const runPickup = useCallback(() => {
    pickupCharmSpawnItem(spawn.id);
  }, [spawn.id]);

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
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== " ") return;
      if (!fadedIn) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      triggerPickup();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [visible, triggerPickup, fadedIn]);

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
          src={FORTUNE_SLIP_IMAGE}
          alt=""
          className="hub-lottery-drop__ticket hub-lottery-drop__ticket--fortune"
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
            <p className="stall-enter-title">籤詩</p>
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
