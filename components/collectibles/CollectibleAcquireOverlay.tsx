"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useCollectibleStore } from "@/store/collectibleStore";

type Phase = "rise" | "fly" | "done";

const RISE_MS = 2500;
const TEXT_HOLD_MS = 1500;
const FLY_MS = 650;

export default function CollectibleAcquireOverlay() {
  const pending = useCollectibleStore((s) => s.pendingAcquireAnimation);
  const pendingDialogue = useCollectibleStore((s) => s.pendingAcquireDialogue);
  const dismiss = useCollectibleStore((s) => s.dismissAcquireAnimation);
  const [phase, setPhase] = useState<Phase>("rise");
  const [riseDone, setRiseDone] = useState(false);
  const [showText, setShowText] = useState(false);
  const [flyTarget, setFlyTarget] = useState<{ x: number; y: number } | null>(null);
  const hadDialogueRef = useRef(false);

  const isInspect = pending?.mode === "inspect";
  const waitingDialogue = !isInspect && pendingDialogue !== null;

  useEffect(() => {
    if (!pending) {
      setPhase("rise");
      setRiseDone(false);
      setShowText(false);
      setFlyTarget(null);
      hadDialogueRef.current = false;
      return;
    }

    hadDialogueRef.current = !isInspect && pendingDialogue !== null;
    setPhase("rise");
    setRiseDone(false);
    setShowText(false);
    setFlyTarget(null);

    const riseTimer = window.setTimeout(() => setRiseDone(true), RISE_MS);

    return () => window.clearTimeout(riseTimer);
  }, [pending, isInspect]);

  useEffect(() => {
    if (!pending || !riseDone) {
      setShowText(false);
      return;
    }

    if (isInspect) {
      setShowText(true);
      return;
    }

    if (waitingDialogue || hadDialogueRef.current) {
      setShowText(false);
      return;
    }

    setShowText(true);
  }, [pending, isInspect, waitingDialogue, riseDone]);

  useEffect(() => {
    if (!pending || isInspect || waitingDialogue || !riseDone || phase !== "rise") return;

    const holdMs = hadDialogueRef.current ? 0 : TEXT_HOLD_MS;
    const flyTimer = window.setTimeout(() => {
      const selector = pending.flyTargetSelector ?? "[data-backpack-fly-target]";
      const el = document.querySelector(selector);
      if (el) {
        const rect = el.getBoundingClientRect();
        setFlyTarget({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });
      } else {
        setFlyTarget({ x: window.innerWidth - 48, y: 32 });
      }
      setPhase("fly");
    }, holdMs);

    return () => window.clearTimeout(flyTimer);
  }, [pending, isInspect, waitingDialogue, riseDone, phase]);

  useEffect(() => {
    if (phase !== "fly" || isInspect) return;
    const flyTimer = window.setTimeout(() => {
      setPhase("done");
      dismiss();
    }, FLY_MS);
    return () => window.clearTimeout(flyTimer);
  }, [phase, dismiss, isInspect]);

  useEffect(() => {
    if (!isInspect) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isInspect, dismiss]);

  if (!pending || phase === "done") return null;

  const flyStyle: CSSProperties | undefined =
    phase === "fly" && flyTarget
      ? ({
          ["--fly-dx" as string]: `${flyTarget.x - window.innerWidth / 2}px`,
          ["--fly-dy" as string]: `${flyTarget.y - window.innerHeight / 2}px`,
        } as CSSProperties)
      : undefined;

  return (
    <div
      className={`collectible-acquire-overlay ${
        phase === "fly" ? "collectible-acquire-overlay--fly" : ""
      } ${isInspect ? "collectible-acquire-overlay--inspect" : "collectible-acquire-overlay--blocking"}`}
      aria-live="polite"
    >
      <button
        type="button"
        className="collectible-acquire-overlay__dim"
        onClick={isInspect ? dismiss : undefined}
        aria-label={isInspect ? "關閉" : undefined}
        tabIndex={isInspect ? 0 : -1}
      />
      <div className="collectible-acquire-overlay__content">
        <div
          className={`collectible-acquire-overlay__item-wrap ${
            phase === "fly" ? "collectible-acquire-overlay__item-wrap--fly" : ""
          }`}
          style={flyStyle}
        >
          <div className="collectible-acquire-overlay__glow" aria-hidden />
          <Image
            src={pending.image}
            alt=""
            width={160}
            height={160}
            className="collectible-acquire-overlay__item"
            unoptimized
          />
        </div>
        {showText && phase !== "fly" ? (
          <div className="collectible-acquire-overlay__text">
            {isInspect ? (
              <>
                <p className="collectible-acquire-overlay__title">{pending.itemName}</p>
                {pending.description ? (
                  <p className="collectible-acquire-overlay__desc">{pending.description}</p>
                ) : null}
              </>
            ) : (
              <>
                <p>您已獲得道具：{pending.itemName}</p>
                {pending.extraMessage ? (
                  <p className="collectible-acquire-overlay__extra">{pending.extraMessage}</p>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
