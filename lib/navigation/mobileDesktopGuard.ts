const EXEMPT_PATHS = new Set(["/", "/leaderboard"]);

/** 主畫面、排行榜、前導劇情（/）、Credits（主畫面 modal）、結局頁不顯示提示 */
export function isMobileDesktopGuardExempt(pathname: string): boolean {
  if (EXEMPT_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/ending")) return true;
  return false;
}

/** 是否為手機／平板等觸控行動裝置 */
export function isMobileLikeDevice(): boolean {
  if (typeof window === "undefined") return false;

  const ua = navigator.userAgent;
  const mobileUa =
    /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const noHover = window.matchMedia("(hover: none)").matches;
  const touchPrimary = navigator.maxTouchPoints > 0 && coarsePointer && noHover;

  return mobileUa || touchPrimary;
}

/** 是否為豎屏（高 > 寬） */
export function isPortraitOrientation(): boolean {
  if (typeof window === "undefined") return false;

  const orientation = window.screen.orientation?.type;
  if (orientation) {
    return orientation.startsWith("portrait");
  }

  return window.innerHeight > window.innerWidth;
}

/** 非豁免頁 + 行動裝置 + 豎屏 → 顯示旋轉提示並阻擋遊玩 */
export function shouldMobileDesktopGuardBlock(): boolean {
  if (typeof window === "undefined") return false;
  if (!isMobileLikeDevice()) return false;
  return isPortraitOrientation();
}
