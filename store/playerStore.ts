"use client";

import { create } from "zustand";
import type { EndingId } from "@/lib/endings/types";
import type { StallId } from "@/lib/narrative/types";
import { getEndingScript } from "@/data/endings-default";
import { flushCloudSync, mergeSaveRecords, scheduleCloudSync, buildProfileForNickname, fetchCloudProfile, type CloudProfileResponse } from "@/lib/api/playerCloudSync";
import { upsertLeaderboardEntry } from "@/lib/firebase/leaderboard";
import {
  captureGameSnapshot,
  isInitialGameSnapshot,
  restoreGameSnapshot,
} from "@/lib/player/saveSnapshot";
import type { GameScores, SaveRecord } from "@/lib/player/saveTypes";
import { computeTotalScore, normalizeSaveScores } from "@/lib/player/scoreTotals";
import { canEnterSave } from "@/lib/player/saveProgress";

function readIntroDone(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const mod = require("@/store/narrativeStore") as typeof import("@/store/narrativeStore");
    return mod.useNarrativeStore.getState().introDone;
  } catch {
    return false;
  }
}

function writeIntroDone(introDone: boolean) {
  if (typeof window === "undefined") return;
  try {
    const mod = require("@/store/narrativeStore") as typeof import("@/store/narrativeStore");
    if (introDone) {
      mod.useNarrativeStore.getState().completeIntro();
    }
  } catch {
    /* ignore */
  }
}

export type { GameScores, SaveRecord } from "@/lib/player/saveTypes";

/** @deprecated 請改用 SaveRecord */
export type PlayerRecord = SaveRecord;

const STORAGE_KEY = "night-market-players-v1";

type PersistedV2 = {
  loggedInNickname: string | null;
  activeSaveId: string | null;
  saves: SaveRecord[];
};

type PersistedLegacy = {
  activeNickname?: string | null;
  records?: {
    nickname: string;
    totalScore: number;
    gameScores: GameScores;
    endingId: EndingId | null;
    isActive: boolean;
    updatedAt: number;
  }[];
};

function createSaveId() {
  return `save-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function migratePersisted(raw: PersistedLegacy & Partial<PersistedV2>): PersistedV2 {
  if (Array.isArray(raw.saves)) {
    return {
      loggedInNickname: raw.loggedInNickname ?? null,
      activeSaveId: raw.activeSaveId ?? null,
      saves: raw.saves.map((save) => normalizeSaveScores(save as SaveRecord)),
    };
  }

  const legacyRecords = raw.records ?? [];
  const saves: SaveRecord[] = legacyRecords.map((r) =>
    normalizeSaveScores({
      saveId: `legacy-${r.nickname}`,
      nickname: r.nickname,
      playHistory: [],
      gameScores: r.gameScores,
      totalScore: r.totalScore,
      endingId: r.endingId,
      isActive: r.isActive,
      updatedAt: r.updatedAt,
      createdAt: r.updatedAt,
    }),
  );

  const activeNickname = raw.activeNickname ?? null;
  const activeSaveId =
    activeNickname != null
      ? saves.find((s) => s.nickname === activeNickname && s.isActive && !s.endingId)?.saveId ?? null
      : null;

  return {
    loggedInNickname: activeNickname,
    activeSaveId,
    saves,
  };
}

function loadPersisted(): PersistedV2 {
  if (typeof window === "undefined") {
    return { loggedInNickname: null, activeSaveId: null, saves: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { loggedInNickname: null, activeSaveId: null, saves: [] };
    return migratePersisted(JSON.parse(raw) as PersistedLegacy & Partial<PersistedV2>);
  } catch {
    return { loggedInNickname: null, activeSaveId: null, saves: [] };
  }
}

function savePersisted(data: PersistedV2) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function syncToFirebase(record: SaveRecord) {
  if (!record.endingId) return;
  void upsertLeaderboardEntry({
    saveId: record.saveId,
    nickname: record.nickname,
    totalScore: record.totalScore,
    endingId: record.endingId,
    updatedAt: record.updatedAt,
  }).catch(() => {});
}

function upsertSave(saves: SaveRecord[], next: SaveRecord): SaveRecord[] {
  const idx = saves.findIndex((s) => s.saveId === next.saveId);
  if (idx < 0) return [...saves, next];
  const copy = [...saves];
  copy[idx] = next;
  return copy;
}

function saveHasGameplayProgress(record: SaveRecord): boolean {
  return record.playHistory.length > 0 || record.totalScore > 0;
}

function shouldBackfillSnapshot(record: SaveRecord): boolean {
  if (!record.snapshot) return true;
  if (!saveHasGameplayProgress(record)) return false;
  return isInitialGameSnapshot(record.snapshot);
}

function cloudProfileFromState(state: {
  loggedInNickname: string | null;
  activeSaveId: string | null;
  saves: SaveRecord[];
}) {
  const nickname = state.loggedInNickname?.trim();
  if (!nickname) return null;
  const introDone = readIntroDone();
  return buildProfileForNickname(nickname, state.saves, introDone, state.activeSaveId);
}

function applyIntroDoneFromCloud(introDone: boolean) {
  writeIntroDone(introDone);
}

function applyScorePenaltyToRecord(record: SaveRecord, amount: number): SaveRecord {
  const scorePenalty = (record.scorePenalty ?? 0) + amount;
  const totalScore = computeTotalScore(record.playHistory, record.endingId, scorePenalty);
  return {
    ...record,
    scorePenalty,
    totalScore,
    updatedAt: Date.now(),
  };
}

function persistSaves(state: { loggedInNickname: string | null; activeSaveId: string | null; saves: SaveRecord[] }) {
  savePersisted(state);
  const profile = cloudProfileFromState(state);
  if (!profile || !state.loggedInNickname) return;
  scheduleCloudSync(state.loggedInNickname.trim(), profile);
}

async function persistSavesImmediate(state: {
  loggedInNickname: string | null;
  activeSaveId: string | null;
  saves: SaveRecord[];
}) {
  savePersisted(state);
  const profile = cloudProfileFromState(state);
  if (!profile || !state.loggedInNickname) return false;
  return flushCloudSync(state.loggedInNickname.trim(), profile);
}

let cloudSnapshotTimer: ReturnType<typeof setTimeout> | null = null;

export function endingLabel(id: EndingId | null): string {
  if (!id) return "—";
  return getEndingScript(id)?.title ?? id;
}

type PlayerStore = {
  hydrated: boolean;
  loggedInNickname: string | null;
  activeSaveId: string | null;
  saves: SaveRecord[];
  hydrate: () => void;
  login: (nickname: string) => void;
  logout: () => void;
  mergeCloudSaves: (nickname: string, cloudSaves: SaveRecord[]) => void;
  applyCloudProfile: (nickname: string, cloud: CloudProfileResponse) => void;
  syncProfileFromCloud: (
    nickname: string,
  ) => Promise<{ ok: true } | { ok: false; reason: "invalid_nickname" | "not_configured" }>;
  getPlayerSaves: (nickname: string) => SaveRecord[];
  getActiveSave: () => SaveRecord | undefined;
  findRecord: (nickname: string) => SaveRecord | undefined;
  getLeaderboard: () => SaveRecord[];
  snapshotActiveSave: () => void;
  scheduleCloudSnapshot: () => void;
  flushActiveSaveToCloud: () => Promise<boolean>;
  createNewSave: (nickname: string) => string;
  loadSave: (saveId: string) => void;
  beginNewRun: (nickname: string) => void;
  resumeRun: (nickname: string) => void;
  recordStallScore: (stallId: StallId, score: number) => void;
  applyDirectLeavePenaltyToAllSaves: (amount: number) => void;
  finishRun: (endingId: EndingId) => void;
};

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  hydrated: false,
  loggedInNickname: null,
  activeSaveId: null,
  saves: [],

  hydrate: () => {
    const p = loadPersisted();
    set({
      hydrated: true,
      loggedInNickname: p.loggedInNickname,
      activeSaveId: p.activeSaveId,
      saves: p.saves.map(normalizeSaveScores),
    });
  },

  login: (nickname) => {
    const trimmed = nickname.trim();
    if (!trimmed) return;
    set({ loggedInNickname: trimmed });
    const p = loadPersisted();
    savePersisted({ ...p, loggedInNickname: trimmed });
  },

  logout: () => {
    set({ loggedInNickname: null });
    const p = loadPersisted();
    savePersisted({ ...p, loggedInNickname: null });
  },

  mergeCloudSaves: (nickname, cloudSaves) => {
    get().applyCloudProfile(nickname, {
      configured: true,
      saves: cloudSaves,
      introDone: readIntroDone(),
      activeSaveId: get().activeSaveId,
      syncedAt: Date.now(),
    });
  },

  applyCloudProfile: (nickname, cloud) => {
    const trimmed = nickname.trim();
    if (!trimmed || !cloud.configured) return;

    const local = get().saves.filter((save) => save.nickname === trimmed);
    const mergedForPlayer = mergeSaveRecords(local, cloud.saves);
    const otherSaves = get().saves.filter((save) => save.nickname !== trimmed);
    const saves = [...otherSaves, ...mergedForPlayer];

    applyIntroDoneFromCloud(cloud.introDone);

    const activeSaveId =
      cloud.activeSaveId && mergedForPlayer.some((s) => s.saveId === cloud.activeSaveId)
        ? cloud.activeSaveId
        : get().activeSaveId;

    const state = {
      loggedInNickname: trimmed,
      activeSaveId,
      saves,
    };
    set(state);
    savePersisted(state);
  },

  syncProfileFromCloud: async (nickname) => {
    const trimmed = nickname.trim();
    if (!trimmed) return { ok: false as const, reason: "invalid_nickname" as const };

    const cloud = await fetchCloudProfile(trimmed);
    if (!cloud.configured) return { ok: false as const, reason: "not_configured" as const };

    const hasCloudData = cloud.saves.length > 0 || cloud.introDone;
    if (hasCloudData) {
      get().applyCloudProfile(trimmed, cloud);
      return { ok: true as const };
    }

    set({ loggedInNickname: trimmed });
    savePersisted({
      loggedInNickname: trimmed,
      activeSaveId: get().activeSaveId,
      saves: get().saves,
    });
    await persistSavesImmediate({
      loggedInNickname: trimmed,
      activeSaveId: get().activeSaveId,
      saves: get().saves,
    });
    return { ok: true as const };
  },

  flushActiveSaveToCloud: async () => {
    get().snapshotActiveSave();
    const state = {
      loggedInNickname: get().loggedInNickname,
      activeSaveId: get().activeSaveId,
      saves: get().saves,
    };
    return persistSavesImmediate(state);
  },

  getPlayerSaves: (nickname) => {
    const trimmed = nickname.trim();
    return [...get().saves]
      .filter((s) => s.nickname === trimmed)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },

  getActiveSave: () => {
    const id = get().activeSaveId;
    if (!id) return undefined;
    return get().saves.find((s) => s.saveId === id);
  },

  findRecord: (nickname) => {
    const trimmed = nickname.trim();
    const playerSaves = get().getPlayerSaves(trimmed);
    return playerSaves.find((s) => s.isActive && !s.endingId) ?? playerSaves[0];
  },

  getLeaderboard: () =>
    [...get().saves].sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return b.updatedAt - a.updatedAt;
    }),

  scheduleCloudSnapshot: () => {
    if (cloudSnapshotTimer) clearTimeout(cloudSnapshotTimer);
    cloudSnapshotTimer = setTimeout(() => {
      cloudSnapshotTimer = null;
      get().snapshotActiveSave();
      void get().flushActiveSaveToCloud();
    }, 600);
  },

  snapshotActiveSave: () => {
    const saveId = get().activeSaveId;
    if (!saveId) return;
    const existing = get().saves.find((s) => s.saveId === saveId);
    if (!existing) return;

    const snapshot = captureGameSnapshot();
    const record: SaveRecord = {
      ...existing,
      snapshot,
      updatedAt: Date.now(),
    };
    const saves = upsertSave(get().saves, record);
    const state = {
      loggedInNickname: get().loggedInNickname,
      activeSaveId: get().activeSaveId,
      saves,
    };
    set({ saves });
    persistSaves(state);
  },

  createNewSave: (nickname) => {
    get().snapshotActiveSave();

    const trimmed = nickname.trim();
    const now = Date.now();
    const saveId = createSaveId();
    const record: SaveRecord = {
      saveId,
      nickname: trimmed,
      playHistory: [],
      scorePenalty: 0,
      totalScore: computeTotalScore([], null, 0),
      endingId: null,
      isActive: true,
      updatedAt: now,
      createdAt: now,
      snapshot: captureGameSnapshot(),
    };
    const saves = upsertSave(get().saves, record);
    const state = {
      loggedInNickname: trimmed,
      activeSaveId: saveId,
      saves,
    };
    set({
      loggedInNickname: trimmed,
      activeSaveId: saveId,
      saves,
    });
    persistSaves(state);
    syncToFirebase(record);
    return saveId;
  },

  loadSave: (saveId) => {
    get().snapshotActiveSave();

    const target = get().saves.find((s) => s.saveId === saveId);
    if (!target || !canEnterSave(target.endingId, target.isActive)) return;

    const now = Date.now();
    let record: SaveRecord = { ...target, isActive: true, updatedAt: now };

    if (shouldBackfillSnapshot(record)) {
      record = { ...record, snapshot: captureGameSnapshot() };
    } else if (record.snapshot) {
      restoreGameSnapshot(record.snapshot);
    }

    const saves = upsertSave(get().saves, record);
    const nextState = {
      loggedInNickname: target.nickname,
      activeSaveId: saveId,
      saves,
    };
    set(nextState);
    persistSaves(nextState);
  },

  beginNewRun: (nickname) => {
    get().createNewSave(nickname);
  },

  resumeRun: (nickname) => {
    const trimmed = nickname.trim();
    const active = get()
      .getPlayerSaves(trimmed)
      .find((s) => s.isActive && !s.endingId);
    if (active) {
      get().loadSave(active.saveId);
      return;
    }
    get().createNewSave(trimmed);
  },

  recordStallScore: (stallId, score) => {
    const saveId = get().activeSaveId;
    if (!saveId) return;
    const existing = get().saves.find((s) => s.saveId === saveId);
    if (!existing) return;

    const playHistory = [
      ...existing.playHistory,
      { stallId, score, playedAt: Date.now() },
    ];
    const totalScore = computeTotalScore(
      playHistory,
      existing.endingId,
      existing.scorePenalty ?? 0,
    );
    const record: SaveRecord = {
      ...existing,
      playHistory,
      totalScore,
      isActive: true,
      updatedAt: Date.now(),
      snapshot: captureGameSnapshot(),
    };
    const saves = upsertSave(get().saves, record);
    const state = {
      loggedInNickname: get().loggedInNickname,
      activeSaveId: get().activeSaveId,
      saves,
    };
    set({ saves });
    persistSaves(state);
    syncToFirebase(record);
  },

  applyDirectLeavePenaltyToAllSaves: (amount) => {
    if (amount <= 0) return;
    const nickname = get().loggedInNickname?.trim();
    let changed = false;
    const saves = get().saves.map((save) => {
      if (nickname && save.nickname !== nickname) return save;
      changed = true;
      return applyScorePenaltyToRecord(save, amount);
    });
    if (!changed) return;

    const state = {
      loggedInNickname: get().loggedInNickname,
      activeSaveId: get().activeSaveId,
      saves,
    };
    set({ saves });
    persistSaves(state);
  },

  finishRun: (endingId) => {
    const saveId = get().activeSaveId;
    if (!saveId) return;
    const existing = get().saves.find((s) => s.saveId === saveId);
    if (!existing) return;

    const snapshot = captureGameSnapshot();
    const totalScore = computeTotalScore(
      existing.playHistory,
      endingId,
      existing.scorePenalty ?? 0,
    );
    const record: SaveRecord = {
      ...existing,
      endingId,
      totalScore,
      isActive: false,
      updatedAt: Date.now(),
      snapshot,
    };
    const saves = upsertSave(get().saves, record);
    const state = {
      loggedInNickname: get().loggedInNickname,
      activeSaveId: null as string | null,
      saves,
    };
    set({ saves, activeSaveId: null });
    void persistSavesImmediate(state);
    syncToFirebase(record);
  },
}));
