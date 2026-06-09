"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useGameLoadingStore } from "@/store/gameLoadingStore";
import { useTransitionStore } from "@/store/transitionStore";

export default function PageFadeOverlay() {
  const visible = useTransitionStore((s) => s.visible);
  const pathname = usePathname();

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      if (useGameLoadingStore.getState().visible) return;
      useTransitionStore.getState().fadeIn();
    });
    return () => window.cancelAnimationFrame(id);
  }, [pathname]);

  return (
    <div
      className={`page-fade-overlay ${visible ? "page-fade-overlay--visible" : ""}`}
      aria-hidden={!visible}
    />
  );
}
