"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTransitionStore } from "@/store/transitionStore";

export default function PageFadeOverlay() {
  const visible = useTransitionStore((s) => s.visible);
  const pathname = usePathname();

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
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
