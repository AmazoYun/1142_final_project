import type { StallId } from "@/lib/narrative/types";

const HOME_PATH = "/";
const HUB_PATH = "/market";

export const GAME_PATH_TO_STALL: Record<string, StallId> = {
  "/pinball": "pinball",
  "/balloonshoot": "balloonshoot",
  "/ringtoss": "ringtoss",
  "/catchfish": "catchfish",
};

export function normalizeRoutePath(href: string): string {
  return href.split("?")[0] ?? href;
}

/** 僅主畫面 ↔ 夜市 HUB 使用廁所過場 */
export function usesGameLoading(href: string): boolean {
  if (typeof window === "undefined") return false;
  const from = normalizeRoutePath(window.location.pathname);
  const to = normalizeRoutePath(href);
  return (
    (from === HOME_PATH && to === HUB_PATH) ||
    (from === HUB_PATH && to === HOME_PATH)
  );
}

export function stallIdFromHref(href: string): StallId | null {
  return GAME_PATH_TO_STALL[normalizeRoutePath(href)] ?? null;
}

export function stallIdFromPathname(pathname: string): StallId | null {
  return GAME_PATH_TO_STALL[pathname] ?? null;
}
