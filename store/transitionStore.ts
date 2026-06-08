"use client";

import { create } from "zustand";

const FADE_MS = 450;

type TransitionStore = {
  visible: boolean;
  fadeOut: () => Promise<void>;
  fadeIn: () => void;
};

export const useTransitionStore = create<TransitionStore>((set) => ({
  visible: false,

  fadeOut: () =>
    new Promise((resolve) => {
      set({ visible: true });
      window.setTimeout(resolve, FADE_MS);
    }),

  fadeIn: () => {
    set({ visible: false });
  },
}));

export const FADE_DURATION_MS = FADE_MS;
