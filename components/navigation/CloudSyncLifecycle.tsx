"use client";

import { useEffect } from "react";
import { usePlayerStore } from "@/store/playerStore";

/** 關閉分頁或切至背景時，立即將存檔推送至雲端 */
export default function CloudSyncLifecycle() {
  useEffect(() => {
    const flush = () => {
      const store = usePlayerStore.getState();
      if (!store.loggedInNickname) return;
      store.snapshotActiveSave();
      void store.flushActiveSaveToCloud();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") flush();
    };

    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return null;
}
