"use client";

import { usePlayerStore } from "@/store/playerStore";

/** @deprecated 請改用 usePlayerStore.getState().scheduleCloudSnapshot() */
export function scheduleGameplayCloudSync() {
  usePlayerStore.getState().scheduleCloudSnapshot();
}

/** @deprecated 請改用 flushActiveSaveToCloud */
export async function flushGameplayCloudSync() {
  usePlayerStore.getState().snapshotActiveSave();
  await usePlayerStore.getState().flushActiveSaveToCloud();
}
