"use client";

import { useEffect } from "react";

/** Space / Enter advances story dialogue (same as clicking the panel). */
export function useStoryKeyAdvance(onAdvance?: () => void, enabled = true) {
  useEffect(() => {
    if (!onAdvance || !enabled) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== "Enter") return;
      if (e.repeat) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "BUTTON") return;
      e.preventDefault();
      onAdvance();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onAdvance, enabled]);
}
