"use client";

import { useEffect } from "react";
import { isAcquireSequenceBlocking } from "@/lib/collectibles/acquireSequence";
import { useCollectibleStore } from "@/store/collectibleStore";

/** 取得道具序列進行中：攔截鍵盤（對話期間仍允許 Space / Enter 推進） */
export default function CollectibleAcquireBlocker() {
  const pendingDialogue = useCollectibleStore((s) => s.pendingAcquireDialogue);
  const pendingAnimation = useCollectibleStore((s) => s.pendingAcquireAnimation);
  const blocking = isAcquireSequenceBlocking(pendingDialogue, pendingAnimation);

  useEffect(() => {
    if (!blocking) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (
        pendingDialogue &&
        (e.code === "Space" || e.key === " " || e.key === "Enter")
      ) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [blocking, pendingDialogue]);

  return null;
}
