"use client";

import type { StallId } from "@/lib/narrative/types";

const DISMISS_KEY_PREFIX = "stall-round-dismissed:";

export function markStallRoundDismissed(stallId: StallId) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(`${DISMISS_KEY_PREFIX}${stallId}`, "1");
}

export function consumeStallRoundDismissed(stallId: StallId): boolean {
  if (typeof window === "undefined") return false;
  const key = `${DISMISS_KEY_PREFIX}${stallId}`;
  if (sessionStorage.getItem(key) !== "1") return false;
  sessionStorage.removeItem(key);
  return true;
}

export function clearStallRoundDismissed(stallId: StallId) {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(`${DISMISS_KEY_PREFIX}${stallId}`);
}
