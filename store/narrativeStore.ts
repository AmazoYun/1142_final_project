"use client";

import { create } from "zustand";
import { narrativeDefault } from "@/data/narrative-default";
import type { NarrativeBundle, StallId } from "@/lib/narrative/types";

const STORAGE_KEY = "night-market-narrative-v1";

type Overrides = Record<string, string>;

type Persisted = {
  introDone: boolean;
  editMode: boolean;
  overrides: Overrides;
  visitedStalls: StallId[];
  marketOpeningDone: boolean;
  boundaryIndex: number;
};

function loadPersisted(): Persisted {
  if (typeof window === "undefined") {
    return {
      introDone: false,
      editMode: false,
      overrides: {},
      visitedStalls: [],
      marketOpeningDone: false,
      boundaryIndex: 0,
    };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        introDone: false,
        editMode: false,
        overrides: {},
        visitedStalls: [],
        marketOpeningDone: false,
        boundaryIndex: 0,
      };
    }
    return JSON.parse(raw) as Persisted;
  } catch {
    return {
      introDone: false,
      editMode: false,
      overrides: {},
      visitedStalls: [],
      marketOpeningDone: false,
      boundaryIndex: 0,
    };
  }
}

function savePersisted(data: Persisted) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

type NarrativeStore = {
  bundle: NarrativeBundle;
  hydrated: boolean;
  introDone: boolean;
  editMode: boolean;
  overrides: Overrides;
  visitedStalls: StallId[];
  marketOpeningDone: boolean;
  boundaryIndex: number;
  hydrate: () => void;
  setOverride: (id: string, text: string) => void;
  getText: (id: string, fallback: string) => string;
  completeIntro: () => void;
  replayIntro: () => void;
  setEditMode: (on: boolean) => void;
  markStallVisited: (id: StallId) => void;
  hasVisitedStall: (id: StallId) => boolean;
  completeMarketOpening: () => void;
  nextBoundaryLine: () => string | null;
  resetAll: () => void;
};

export const useNarrativeStore = create<NarrativeStore>((set, get) => ({
  bundle: narrativeDefault,
  hydrated: false,
  introDone: false,
  editMode: false,
  overrides: {},
  visitedStalls: [],
  marketOpeningDone: false,
  boundaryIndex: 0,

  hydrate: () => {
    const p = loadPersisted();
    set({
      hydrated: true,
      introDone: p.introDone,
      editMode: p.editMode,
      overrides: p.overrides,
      visitedStalls: p.visitedStalls,
      marketOpeningDone: p.marketOpeningDone,
      boundaryIndex: p.boundaryIndex,
    });
  },

  setOverride: (id, text) => {
    const overrides = { ...get().overrides, [id]: text };
    set({ overrides });
    const p = loadPersisted();
    savePersisted({ ...p, overrides });
  },

  getText: (id, fallback) => get().overrides[id] ?? fallback,

  completeIntro: () => {
    set({ introDone: true });
    const p = loadPersisted();
    savePersisted({ ...p, introDone: true });
  },

  replayIntro: () => {
    set({ introDone: false });
    const p = loadPersisted();
    savePersisted({ ...p, introDone: false });
  },

  setEditMode: (on) => {
    set({ editMode: on });
    const p = loadPersisted();
    savePersisted({ ...p, editMode: on });
  },

  markStallVisited: (id) => {
    const visited = get().visitedStalls.includes(id)
      ? get().visitedStalls
      : [...get().visitedStalls, id];
    set({ visitedStalls: visited });
    const p = loadPersisted();
    savePersisted({ ...p, visitedStalls: visited });
  },

  hasVisitedStall: (id) => get().visitedStalls.includes(id),

  completeMarketOpening: () => {
    set({ marketOpeningDone: true });
    const p = loadPersisted();
    savePersisted({ ...p, marketOpeningDone: true });
  },

  nextBoundaryLine: () => {
    const lines = narrativeDefault.boundaryLines;
    const idx = get().boundaryIndex % lines.length;
    const line = lines[idx];
    set({ boundaryIndex: idx + 1 });
    const p = loadPersisted();
    savePersisted({ ...p, boundaryIndex: idx + 1 });
    return get().getText(line.id, line.text);
  },

  resetAll: () => {
    const fresh: Persisted = {
      introDone: false,
      editMode: false,
      overrides: get().overrides,
      visitedStalls: [],
      marketOpeningDone: false,
      boundaryIndex: 0,
    };
    savePersisted(fresh);
    set({
      introDone: false,
      visitedStalls: [],
      marketOpeningDone: false,
      boundaryIndex: 0,
    });
  },
}));
