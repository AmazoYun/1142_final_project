"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  isMobileDesktopGuardExempt,
  shouldMobileDesktopGuardBlock,
} from "@/lib/navigation/mobileDesktopGuard";

const GUARD_MESSAGE = "請將手機轉為橫向，或使用電腦瀏覽器遊玩";

/** 攔截遊戲用的事件，但不 preventDefault，保留瀏覽器重新整理／上一頁等操作 */
function stopGameEvent(event: Event) {
  event.stopPropagation();
  event.stopImmediatePropagation();
}

export default function MobileDesktopGuard() {
  const pathname = usePathname();
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (isMobileDesktopGuardExempt(pathname)) {
      setBlocked(false);
      return;
    }

    const update = () => setBlocked(shouldMobileDesktopGuardBlock());
    update();

    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    window.screen.orientation?.addEventListener("change", update);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      window.screen.orientation?.removeEventListener("change", update);
    };
  }, [pathname]);

  useEffect(() => {
    document.body.classList.toggle("mobile-desktop-guard-active", blocked);
    return () => {
      document.body.classList.remove("mobile-desktop-guard-active");
    };
  }, [blocked]);

  useEffect(() => {
    if (!blocked) return;

    const opts: AddEventListenerOptions = { capture: true };
    const types = [
      "keydown",
      "keyup",
      "keypress",
      "pointerdown",
      "pointerup",
      "pointermove",
      "touchstart",
      "touchmove",
      "touchend",
      "wheel",
      "click",
    ] as const;

    for (const type of types) {
      window.addEventListener(type, stopGameEvent, opts);
    }

    return () => {
      for (const type of types) {
        window.removeEventListener(type, stopGameEvent, opts);
      }
    };
  }, [blocked]);

  if (!blocked) return null;

  return (
    <div
      className="mobile-desktop-guard"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-desktop-guard-title"
      onPointerDown={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="mobile-desktop-guard__scrim" aria-hidden />
      <div className="mobile-desktop-guard__panel">
        <div className="mobile-desktop-guard__rotate" aria-hidden>
          <svg className="mobile-desktop-guard__rotate-icon" viewBox="0 0 120 120" fill="none">
            <path
              className="mobile-desktop-guard__rotate-arc"
              d="M 88 28 A 40 40 0 1 0 92 72"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              className="mobile-desktop-guard__rotate-head"
              d="M 92 72 L 104 68 L 96 58 Z"
              fill="currentColor"
            />
          </svg>
        </div>
        <p id="mobile-desktop-guard-title" className="mobile-desktop-guard__message">
          {GUARD_MESSAGE}
        </p>
      </div>
    </div>
  );
}
