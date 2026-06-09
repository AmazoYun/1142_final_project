"use client";

import { usePlayerStore } from "@/store/playerStore";
import { create } from "zustand";
import { narrativeDefault } from "@/data/narrative-default";
import type { CollectibleId } from "@/lib/collectibles/types";
import type { EndingId } from "@/lib/endings/types";
import type { NarrativeBundle, StallId } from "@/lib/narrative/types";

const STORAGE_KEY = "night-market-narrative-v1";

type Overrides = Record<string, string>;

export type CharmSpawn = {
  id: string;
  stallId: StallId;
  itemId: CollectibleId;
};

type Persisted = {
  introDone: boolean;
  pendingDirectLeavePenalty?: boolean;
  editMode: boolean;
  overrides: Overrides;
  visitedStalls: StallId[];
  completedStalls: StallId[];
  playedStalls: StallId[];
  pointCardSpawnStall: StallId | null;
  charmSpawns: CharmSpawn[];
  marketOpeningDone: boolean;
  boundaryIndex: number;
  seenEndingId: string | null;
  seenEndingIds?: EndingId[];
  directLeavePenaltyApplied?: boolean;
};

function normalizeSeenEndingIds(parsed: Partial<Persisted>): EndingId[] {
  if (Array.isArray(parsed.seenEndingIds)) {
    return parsed.seenEndingIds.filter(
      (id): id is EndingId =>
        id === "basic" || id === "loop" || id === "stuck" || id === "true",
    );
  }
  if (
    parsed.seenEndingId === "basic" ||
    parsed.seenEndingId === "loop" ||
    parsed.seenEndingId === "stuck" ||
    parsed.seenEndingId === "true"
  ) {
    return [parsed.seenEndingId];
  }
  return [];
}

function emptyPersisted(): Persisted {
  return {
    introDone: false,
    pendingDirectLeavePenalty: false,
    editMode: false,
    overrides: {},
    visitedStalls: [],
    completedStalls: [],
    playedStalls: [],
    pointCardSpawnStall: null,
    charmSpawns: [],
    marketOpeningDone: false,
    boundaryIndex: 0,
    seenEndingId: null,
    seenEndingIds: [],
    directLeavePenaltyApplied: false,
  };
}

function loadPersisted(): Persisted {
  if (typeof window === "undefined") {
    return emptyPersisted();
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return emptyPersisted();
    }
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    const seenEndingIds = normalizeSeenEndingIds(parsed);
    return {
      introDone: parsed.introDone ?? false,
      pendingDirectLeavePenalty: parsed.pendingDirectLeavePenalty ?? false,
      editMode: parsed.editMode ?? false,
      overrides: parsed.overrides ?? {},
      visitedStalls: parsed.visitedStalls ?? [],
      completedStalls: parsed.completedStalls ?? [],
      playedStalls: parsed.playedStalls ?? [],
      pointCardSpawnStall: parsed.pointCardSpawnStall ?? null,
      charmSpawns: (parsed.charmSpawns ?? []).map((spawn) => ({
        id: spawn.id,
        stallId: spawn.stallId,
        itemId: spawn.itemId,
      })),
      marketOpeningDone: parsed.marketOpeningDone ?? false,
      boundaryIndex: parsed.boundaryIndex ?? 0,
      seenEndingId: parsed.seenEndingId ?? seenEndingIds.at(-1) ?? null,
      seenEndingIds,
      directLeavePenaltyApplied: parsed.directLeavePenaltyApplied ?? false,
    };
  } catch {
    return emptyPersisted();
  }
}

function savePersisted(data: Persisted) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function persistAndSync(data: Persisted) {
  savePersisted(data);
  usePlayerStore.getState().scheduleCloudSnapshot();
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
  charmSpawns: CharmSpawn[];
  marketOpeningDone: boolean;
  boundaryIndex: number;
  seenEndingId: string | null;
  seenEndingIds: EndingId[];
  directLeavePenaltyApplied: boolean;
  pendingDirectLeavePenalty: boolean;
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
  addCharmSpawn: (spawn: { stallId: StallId; itemId: CollectibleId }) => void;
  pickupCharmSpawn: (id: string) => CharmSpawn | null;
  completeMarketOpening: () => void;
  nextBoundaryLine: () => string | null;
  markEndingSeen: (id: string) => void;
  markDirectLeavePenaltyApplied: () => void;
  markPendingDirectLeavePenalty: () => void;
  consumePendingDirectLeavePenalty: () => boolean;
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
  charmSpawns: [],
  marketOpeningDone: false,
  boundaryIndex: 0,
  seenEndingId: null,
  seenEndingIds: [],
  directLeavePenaltyApplied: false,
  pendingDirectLeavePenalty: false,

  hydrate: () => {
    const p = loadPersisted();
    set({
      hydrated: true,
      introDone: p.introDone,
      pendingDirectLeavePenalty: p.pendingDirectLeavePenalty ?? false,
      editMode: false,
      overrides: p.overrides,
      visitedStalls: p.visitedStalls,
      completedStalls: p.completedStalls,
      playedStalls: p.playedStalls,
      pointCardSpawnStall: p.pointCardSpawnStall,
      charmSpawns: p.charmSpawns,
      marketOpeningDone: p.marketOpeningDone,
      boundaryIndex: p.boundaryIndex,
      seenEndingId: p.seenEndingId,
      seenEndingIds: p.seenEndingIds,
      directLeavePenaltyApplied: p.directLeavePenaltyApplied ?? false,
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
    persistAndSync({ ...p, introDone: true });
  },

  replayIntro: () => {
    set({ introDone: false });
    const p = loadPersisted();
    persistAndSync({ ...p, introDone: false });
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
    persistAndSync({ ...p, visitedStalls: visited });
  },

  hasVisitedStall: (id) => get().visitedStalls.includes(id),

  markStallCompleted: (id) => {
    const completed = get().completedStalls.includes(id)
      ? get().completedStalls
      : [...get().completedStalls, id];
    set({ completedStalls: completed });
    const p = loadPersisted();
    persistAndSync({ ...p, completedStalls: completed });
  },

  hasCompletedStall: (id) => get().completedStalls.includes(id),

  markStallPlayed: (id) => {
    const played = get().playedStalls.includes(id)
      ? get().playedStalls
      : [...get().playedStalls, id];
    set({ playedStalls: played });
    const p = loadPersisted();
    persistAndSync({ ...p, playedStalls: played });
  },

  hasPlayedStall: (id) => get().playedStalls.includes(id),

  ensurePointCardSpawn: () => {
    const existing = get().pointCardSpawnStall;
    if (existing) return existing;
    const stalls: StallId[] = ["pinball", "balloonshoot", "ringtoss", "catchfish"];
    const pick = stalls[Math.floor(Math.random() * stalls.length)]!;
    set({ pointCardSpawnStall: pick });
    const p = loadPersisted();
    persistAndSync({ ...p, pointCardSpawnStall: pick });
    return pick;
  },

  addCharmSpawn: (spawn) => {
    const id = `charm-${spawn.stallId}-${Date.now()}`;
    const next = [...get().charmSpawns, { ...spawn, id }];
    set({ charmSpawns: next });
    const p = loadPersisted();
    persistAndSync({ ...p, charmSpawns: next });
  },

  pickupCharmSpawn: (id) => {
    const found = get().charmSpawns.find((s) => s.id === id) ?? null;
    if (!found) return null;
    const next = get().charmSpawns.filter((s) => s.id !== id);
    set({ charmSpawns: next });
    const p = loadPersisted();
    persistAndSync({ ...p, charmSpawns: next });
    return found;
  },

  completeMarketOpening: () => {
    set({ marketOpeningDone: true });
    const p = loadPersisted();
    persistAndSync({ ...p, marketOpeningDone: true });
  },

  nextBoundaryLine: () => {
    const lines = narrativeDefault.boundaryLines;
    const idx = get().boundaryIndex % lines.length;
    const line = lines[idx];
    set({ boundaryIndex: idx + 1 });
    const p = loadPersisted();
    persistAndSync({ ...p, boundaryIndex: idx + 1 });
    return get().getText(line.id, line.text);
  },

  markEndingSeen: (id) => {
    const endingId = id as EndingId;
    const prev = get().seenEndingIds;
    const seenEndingIds = prev.includes(endingId) ? prev : [...prev, endingId];
    set({ seenEndingId: id, seenEndingIds });
    const p = loadPersisted();
    persistAndSync({ ...p, seenEndingId: id, seenEndingIds });
  },

  markDirectLeavePenaltyApplied: () => {
    set({ directLeavePenaltyApplied: true, pendingDirectLeavePenalty: false });
    const p = loadPersisted();
    persistAndSync({
      ...p,
      directLeavePenaltyApplied: true,
      pendingDirectLeavePenalty: false,
    });
  },

  markPendingDirectLeavePenalty: () => {
    set({ pendingDirectLeavePenalty: true });
    const p = loadPersisted();
    persistAndSync({ ...p, pendingDirectLeavePenalty: true });
  },

  consumePendingDirectLeavePenalty: () => {
    const pending = get().pendingDirectLeavePenalty;
    if (!pending) return false;
    set({ pendingDirectLeavePenalty: false });
    const p = loadPersisted();
    persistAndSync({ ...p, pendingDirectLeavePenalty: false });
    return true;
  },

  resetAll: () => {
    const fresh: Persisted = {
      introDone: false,
      pendingDirectLeavePenalty: false,
      editMode: false,
      overrides: get().overrides,
      visitedStalls: [],
      completedStalls: [],
      playedStalls: [],
      pointCardSpawnStall: null,
      charmSpawns: [],
      marketOpeningDone: false,
      boundaryIndex: 0,
      seenEndingId: null,
      seenEndingIds: [],
      directLeavePenaltyApplied: false,
    };
    savePersisted(fresh);
    set({
      introDone: false,
      pendingDirectLeavePenalty: false,
      visitedStalls: [],
      completedStalls: [],
      playedStalls: [],
      pointCardSpawnStall: null,
      charmSpawns: [],
      marketOpeningDone: false,
      boundaryIndex: 0,
      seenEndingId: null,
      seenEndingIds: [],
      directLeavePenaltyApplied: false,
    });
    usePlayerStore.getState().scheduleCloudSnapshot();
  },
}));
