/** 寬度達此值以上（且為手機）才解除遮罩 */
export const MOBILE_DESKTOP_GUARD_MIN_WIDTH = 768;

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

export function isViewportTooNarrowForPlay(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < MOBILE_DESKTOP_GUARD_MIN_WIDTH;
}

/** 非豁免頁 + 行動裝置 + 窄螢幕 → 顯示遮罩 */
export function shouldMobileDesktopGuardBlock(): boolean {
  if (typeof window === "undefined") return false;
  if (!isMobileLikeDevice()) return false;
  return isViewportTooNarrowForPlay();
}
