"use client";

import { useEffect, useState } from "react";
import {
  isMobileLikeDevice,
  isPortraitOrientation,
} from "@/lib/navigation/mobileDesktopGuard";

export { isPortraitOrientation };

/** 手機豎屏 → 需顯示旋轉提示、阻擋遊玩 */
export function shouldBlockPortraitPlay(): boolean {
  if (typeof window === "undefined") return false;
  if (!isMobileLikeDevice()) return false;
  return isPortraitOrientation();
}

/** 手機橫屏且可顯示觸控操作 */
export function shouldShowMobileTouchControls(): boolean {
  if (typeof window === "undefined") return false;
  if (!isMobileLikeDevice()) return false;
  return !isPortraitOrientation();
}

export function useMobilePlay() {
  const [showMobileControls, setShowMobileControls] = useState(false);
  const [portraitBlocked, setPortraitBlocked] = useState(false);

  useEffect(() => {
    const update = () => {
      const mobile = isMobileLikeDevice();
      const portrait = isPortraitOrientation();
      setPortraitBlocked(mobile && portrait);
      setShowMobileControls(mobile && !portrait);
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    window.screen.orientation?.addEventListener("change", update);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      window.screen.orientation?.removeEventListener("change", update);
    };
  }, []);

  return { showMobileControls, portraitBlocked };
}
