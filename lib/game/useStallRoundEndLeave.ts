"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import type { StallId } from "@/lib/narrative/types";
import {
  consumeStallRoundDismissed,
  markStallRoundDismissed,
} from "@/lib/game/stallRoundLeave";

/** 回合結束畫面未按鈕就離開時，下次進入不再顯示結算彈窗 */
export function useStallRoundEndLeave(
  stallId: StallId,
  roundComplete: boolean,
  onDismissRoundEnd: () => void,
) {
  const pathname = usePathname();
  const roundCompleteRef = useRef(roundComplete);
  const onDismissRef = useRef(onDismissRoundEnd);

  roundCompleteRef.current = roundComplete;
  onDismissRef.current = onDismissRoundEnd;

  useEffect(() => {
    if (!consumeStallRoundDismissed(stallId)) return;
    const raf = requestAnimationFrame(() => {
      onDismissRef.current();
    });
    return () => cancelAnimationFrame(raf);
  }, [stallId, pathname]);

  useEffect(() => {
    const markLeave = () => {
      if (!roundCompleteRef.current) return;
      markStallRoundDismissed(stallId);
    };

    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted || !roundCompleteRef.current) return;
      markStallRoundDismissed(stallId);
      onDismissRef.current();
    };

    window.addEventListener("pagehide", markLeave);
    window.addEventListener("pageshow", onPageShow);

    return () => {
      markLeave();
      window.removeEventListener("pagehide", markLeave);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [stallId]);
}
