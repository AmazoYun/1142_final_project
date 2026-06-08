"use client";

import { useEffect } from "react";
import { useTransitionStore } from "@/store/transitionStore";

/** 頁面掛載後解除黑幕 fade in */
export function usePageFadeIn() {
  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      useTransitionStore.getState().fadeIn();
    });
    return () => window.cancelAnimationFrame(id);
  }, []);
}
