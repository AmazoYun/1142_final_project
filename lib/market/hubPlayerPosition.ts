const STORAGE_KEY = "night-market-hub-player-x-ratio";

type Saved = { ratio: number };

/** 依世界寬度比例儲存，視窗縮放後仍能還原到相同相對位置 */
export function saveHubPlayerPosition(playerX: number, worldWidth: number) {
  if (typeof window === "undefined" || worldWidth <= 0) return;
  const payload: Saved = { ratio: playerX / worldWidth };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
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
}
