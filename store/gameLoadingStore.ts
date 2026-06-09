"use client";

import { create } from "zustand";
import { pickRandomLoadingTip } from "@/data/loading-tips";

type GameLoadingStore = {
  visible: boolean;
  targetHref: string | null;
  tip: string | null;
  show: (opts: { href: string }) => void;
  dismiss: () => void;
};

export const useGameLoadingStore = create<GameLoadingStore>((set) => ({
  visible: false,
  targetHref: null,
  tip: null,

  show: ({ href }) => {
    set({
      visible: true,
      targetHref: href,
      tip: pickRandomLoadingTip(),
    });
  },

  dismiss: () => {
    set({ visible: false, targetHref: null, tip: null });
  },
}));
