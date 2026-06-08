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
  completedStalls: StallId[];
  playedStalls: StallId[];
  pointCardSpawnStall: StallId | null;
  marketOpeningDone: boolean;
  boundaryIndex: number;
  seenEndingId: string | null;
};

function loadPersisted(): Persisted {
  if (typeof window === "undefined") {
    return {
      introDone: false,
      editMode: false,
      overrides: {},
      visitedStalls: [],
      completedStalls: [],
      playedStalls: [],
      pointCardSpawnStall: null,
      marketOpeningDone: false,
      boundaryIndex: 0,
      seenEndingId: null,
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
        completedStalls: [],
        playedStalls: [],
        pointCardSpawnStall: null,
        marketOpeningDone: false,
        boundaryIndex: 0,
        seenEndingId: null,
      };
    }
    const parsed = JSON.parse(raw) as Persisted;
    return {
      introDone: parsed.introDone ?? false,
      editMode: parsed.editMode ?? false,
      overrides: parsed.overrides ?? {},
      visitedStalls: parsed.visitedStalls ?? [],
      completedStalls: parsed.completedStalls ?? [],
      playedStalls: parsed.playedStalls ?? [],
      pointCardSpawnStall: parsed.pointCardSpawnStall ?? null,
      marketOpeningDone: parsed.marketOpeningDone ?? false,
      boundaryIndex: parsed.boundaryIndex ?? 0,
      seenEndingId: parsed.seenEndingId ?? null,
    };
  } catch {
    return {
      introDone: false,
      editMode: false,
      overrides: {},
      visitedStalls: [],
      completedStalls: [],
      playedStalls: [],
      pointCardSpawnStall: null,
      marketOpeningDone: false,
      boundaryIndex: 0,
      seenEndingId: null,
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
  completedStalls: StallId[];
  playedStalls: StallId[];
  pointCardSpawnStall: StallId | null;
  marketOpeningDone: boolean;
  boundaryIndex: number;
  seenEndingId: string | null;
  hydrate: () => void;
  setOverride: (id: string, text: string) => void;
  getText: (id: string, fallback: string) => string;
  completeIntro: () => void;
  replayIntro: () => void;
  setEditMode: () => void;
  markStallVisited: (id: StallId) => void;
  hasVisitedStall: (id: StallId) => boolean;
  markStallCompleted: (id: StallId) => void;
  hasCompletedStall: (id: StallId) => boolean;
  markStallPlayed: (id: StallId) => void;
  hasPlayedStall: (id: StallId) => boolean;
  ensurePointCardSpawn: () => StallId | null;
  completeMarketOpening: () => void;
  nextBoundaryLine: () => string | null;
  markEndingSeen: (id: string) => void;
  resetAll: () => void;
};

export const useNarrativeStore = create<NarrativeStore>((set, get) => ({
  bundle: narrativeDefault,
  hydrated: false,
  introDone: false,
  editMode: false,
  overrides: {},
  visitedStalls: [],
  completedStalls: [],
  playedStalls: [],
  pointCardSpawnStall: null,
  marketOpeningDone: false,
  boundaryIndex: 0,
  seenEndingId: null,

  hydrate: () => {
    const p = loadPersisted();
    set({
      hydrated: true,
      introDone: p.introDone,
      editMode: false,
      overrides: p.overrides,
      visitedStalls: p.visitedStalls,
      completedStalls: p.completedStalls,
      playedStalls: p.playedStalls,
      pointCardSpawnStall: p.pointCardSpawnStall,
      marketOpeningDone: p.marketOpeningDone,
      boundaryIndex: p.boundaryIndex,
      seenEndingId: p.seenEndingId,
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

  setEditMode: () => {
    set({ editMode: false });
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

  markStallCompleted: (id) => {
    const completed = get().completedStalls.includes(id)
      ? get().completedStalls
      : [...get().completedStalls, id];
    set({ completedStalls: completed });
    const p = loadPersisted();
    savePersisted({ ...p, completedStalls: completed });
  },

  hasCompletedStall: (id) => get().completedStalls.includes(id),

  markStallPlayed: (id) => {
    const played = get().playedStalls.includes(id)
      ? get().playedStalls
      : [...get().playedStalls, id];
    set({ playedStalls: played });
    const p = loadPersisted();
    savePersisted({ ...p, playedStalls: played });
  },

  hasPlayedStall: (id) => get().playedStalls.includes(id),

  ensurePointCardSpawn: () => {
    const existing = get().pointCardSpawnStall;
    if (existing) return existing;
    const stalls: StallId[] = ["pinball", "balloonshoot", "ringtoss", "catchfish"];
    const pick = stalls[Math.floor(Math.random() * stalls.length)]!;
    set({ pointCardSpawnStall: pick });
    const p = loadPersisted();
    savePersisted({ ...p, pointCardSpawnStall: pick });
    return pick;
  },

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

  markEndingSeen: (id) => {
    set({ seenEndingId: id });
    const p = loadPersisted();
    savePersisted({ ...p, seenEndingId: id });
  },

  resetAll: () => {
    const fresh: Persisted = {
      introDone: false,
      editMode: false,
      overrides: get().overrides,
      visitedStalls: [],
      completedStalls: [],
      playedStalls: [],
      pointCardSpawnStall: null,
      marketOpeningDone: false,
      boundaryIndex: 0,
      seenEndingId: null,
    };
    savePersisted(fresh);
    set({
      introDone: false,
      visitedStalls: [],
      completedStalls: [],
      playedStalls: [],
      pointCardSpawnStall: null,
      marketOpeningDone: false,
      boundaryIndex: 0,
      seenEndingId: null,
    });
  },
}));
