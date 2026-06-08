"use client";

import { create } from "zustand";
import type { EndingId } from "@/lib/endings/types";
import type { StallId } from "@/lib/narrative/types";
import { getEndingScript } from "@/data/endings-default";
import { upsertLeaderboardEntry } from "@/lib/firebase/leaderboard";

const STORAGE_KEY = "night-market-players-v1";

export type GameScores = Partial<Record<StallId, number>>;

export type PlayerRecord = {
  nickname: string;
  totalScore: number;
  gameScores: GameScores;
  endingId: EndingId | null;
  isActive: boolean;
  updatedAt: number;
};

type Persisted = {
  activeNickname: string | null;
  records: PlayerRecord[];
};

function loadPersisted(): Persisted {
  if (typeof window === "undefined") {
    return { activeNickname: null, records: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { activeNickname: null, records: [] };
    const parsed = JSON.parse(raw) as Persisted;
    return {
      activeNickname: parsed.activeNickname ?? null,
      records: parsed.records ?? [],
    };
  } catch {
    return { activeNickname: null, records: [] };
  }
}

function savePersisted(data: Persisted) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function syncToFirebase(record: PlayerRecord) {
  void upsertLeaderboardEntry({
    nickname: record.nickname,
    totalScore: record.totalScore,
    endingId: record.endingId,
    updatedAt: record.updatedAt,
  }).catch(() => {});
}

function upsertRecord(records: PlayerRecord[], next: PlayerRecord): PlayerRecord[] {
  const idx = records.findIndex((r) => r.nickname === next.nickname);
  if (idx < 0) return [...records, next];
  const copy = [...records];
  copy[idx] = next;
  return copy;
}

export function endingLabel(id: EndingId | null): string {
  if (!id) return "—";
  return getEndingScript(id)?.title ?? id;
}

type PlayerStore = {
  hydrated: boolean;
  activeNickname: string | null;
  records: PlayerRecord[];
  hydrate: () => void;
  findRecord: (nickname: string) => PlayerRecord | undefined;
  getLeaderboard: () => PlayerRecord[];
  beginNewRun: (nickname: string) => void;
  resumeRun: (nickname: string) => void;
  recordStallScore: (stallId: StallId, score: number) => void;
  finishRun: (endingId: EndingId) => void;
};

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  hydrated: false,
  activeNickname: null,
  records: [],

  hydrate: () => {
    const p = loadPersisted();
    set({
      hydrated: true,
      activeNickname: p.activeNickname,
      records: p.records,
    });
  },

  findRecord: (nickname) =>
    get().records.find((r) => r.nickname === nickname.trim()),

  getLeaderboard: () =>
    [...get().records].sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return b.updatedAt - a.updatedAt;
    }),

  beginNewRun: (nickname) => {
    const trimmed = nickname.trim();
    const now = Date.now();
    const record: PlayerRecord = {
      nickname: trimmed,
      totalScore: 0,
      gameScores: {},
      endingId: null,
      isActive: true,
      updatedAt: now,
    };
    const records = upsertRecord(get().records, record);
    set({ activeNickname: trimmed, records });
    savePersisted({ activeNickname: trimmed, records });
    syncToFirebase(record);
  },

  resumeRun: (nickname) => {
    const trimmed = nickname.trim();
    const existing = get().findRecord(trimmed);
    const now = Date.now();
    const record: PlayerRecord = existing
      ? { ...existing, isActive: true, updatedAt: now }
      : {
          nickname: trimmed,
          totalScore: 0,
          gameScores: {},
          endingId: null,
          isActive: true,
          updatedAt: now,
        };
    const records = upsertRecord(get().records, record);
    set({ activeNickname: trimmed, records });
    savePersisted({ activeNickname: trimmed, records });
  },

  recordStallScore: (stallId, score) => {
    const nickname = get().activeNickname;
    if (!nickname) return;
    const existing = get().findRecord(nickname);
    if (!existing) return;

    const gameScores = { ...existing.gameScores, [stallId]: score };
    const totalScore = Object.values(gameScores).reduce((sum, v) => sum + (v ?? 0), 0);
    const record: PlayerRecord = {
      ...existing,
      gameScores,
      totalScore,
      isActive: true,
      updatedAt: Date.now(),
    };
    const records = upsertRecord(get().records, record);
    set({ records });
    savePersisted({ activeNickname: get().activeNickname, records });
    syncToFirebase(record);
  },

  finishRun: (endingId) => {
    const nickname = get().activeNickname;
    if (!nickname) return;
    const existing = get().findRecord(nickname);
    if (!existing) return;

    const record: PlayerRecord = {
      ...existing,
      endingId,
      isActive: false,
      updatedAt: Date.now(),
    };
    const records = upsertRecord(get().records, record);
    set({ records, activeNickname: null });
    savePersisted({ activeNickname: null, records });
    syncToFirebase(record);
  },
}));
