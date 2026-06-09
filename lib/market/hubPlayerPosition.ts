"use client";

import { HUB_LAYOUT, ROAD_LEFT_RATIO, ROAD_RIGHT_RATIO } from "@/lib/market/hubLayout";
import type { StallId } from "@/lib/narrative/types";
import { usePlayerStore } from "@/store/playerStore";

const STORAGE_KEY = "night-market-hub-player-x-ratio";

type Saved = { ratio: number; stallId?: StallId };

function writeHubPosition(payload: Saved) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  usePlayerStore.getState().scheduleCloudSnapshot();
}

const GAME_PATH_TO_STALL: Record<string, StallId> = {
  "/pinball": "pinball",
  "/balloonshoot": "balloonshoot",
  "/ringtoss": "ringtoss",
  "/catchfish": "catchfish",
};

/** 攤位中心在世界寬度上的比例（與視窗尺寸無關） */
export function stallPlayerRatio(stallId: StallId): number | null {
  const stall = HUB_LAYOUT.stalls.find((s) => s.kind === "interactive" && s.id === stallId);
  if (!stall || stall.kind !== "interactive") return null;
  const playableSpan = 1 - ROAD_LEFT_RATIO - ROAD_RIGHT_RATIO;
  return ROAD_LEFT_RATIO + stall.centerRatio * playableSpan;
}

/** 離開小遊戲回到夜市時，將玩家放在對應攤位中央附近 */
export function saveHubPlayerPositionAtStall(stallId: StallId) {
  if (typeof window === "undefined") return;
  const ratio = stallPlayerRatio(stallId);
  if (ratio === null) return;
  writeHubPosition({ ratio, stallId });
}

export function saveHubReturnPositionFromGame(pathname: string) {
  const stallId = GAME_PATH_TO_STALL[pathname];
  if (!stallId) return;
  saveHubPlayerPositionAtStall(stallId);
}

/** 依世界寬度比例儲存，視窗縮放後仍能還原到相同相對位置 */
export function saveHubPlayerPosition(playerX: number, worldWidth: number) {
  if (typeof window === "undefined" || worldWidth <= 0) return;
  writeHubPosition({ ratio: playerX / worldWidth });
}

export function readHubPlayerPosition(worldWidth: number): number | null {
  if (typeof window === "undefined" || worldWidth <= 0) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const { ratio } = JSON.parse(raw) as Saved;
    if (typeof ratio !== "number" || !Number.isFinite(ratio)) return null;
    return ratio * worldWidth;
  } catch {
    return null;
  }
}

export function clearHubPlayerPosition() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  usePlayerStore.getState().scheduleCloudSnapshot();
}
