"use client";

import { INITIAL_TOKENS } from "@/lib/economy/constants";
import type { CollectibleId } from "@/lib/collectibles/types";
import type { StallId } from "@/lib/narrative/types";
import { useCollectibleStore } from "@/store/collectibleStore";
import { useNarrativeStore } from "@/store/narrativeStore";
import type { RoadLotterySpawn } from "@/store/tokenStore";
import { useTokenStore } from "@/store/tokenStore";

const NARRATIVE_KEY = "night-market-narrative-v1";
const COLLECTIBLE_KEY = "night-market-collectibles-v1";
const TOKEN_KEY = "night-market-tokens-v1";
const HUB_POSITION_KEY = "night-market-hub-player-x-ratio";

export type GameSnapshot = {
  visitedStalls: StallId[];
  completedStalls: StallId[];
  playedStalls: StallId[];
  pointCardSpawnStall: StallId | null;
  charmSpawns: { id: string; stallId: StallId; itemId: CollectibleId }[];
  marketOpeningDone: boolean;
  boundaryIndex: number;
  seenEndingId: string | null;
  seenEndingIds: string[];
  acquired: CollectibleId[];
  tokens: number;
  ticket10: number;
  ticket50: number;
  roadSpawns: RoadLotterySpawn[];
  hubPosition: string | null;
};

function readHubPositionRaw(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(HUB_POSITION_KEY);
}

/** 擷取目前遊戲進度，供存檔還原使用（保留全域 introDone 不寫入快照） */
export function captureGameSnapshot(): GameSnapshot {
  const narrative = useNarrativeStore.getState();
  const collectibles = useCollectibleStore.getState();
  const economy = useTokenStore.getState();

  return {
    visitedStalls: [...narrative.visitedStalls],
    completedStalls: [...narrative.completedStalls],
    playedStalls: [...narrative.playedStalls],
    pointCardSpawnStall: narrative.pointCardSpawnStall,
    charmSpawns: narrative.charmSpawns.map((s) => ({ ...s })),
    marketOpeningDone: narrative.marketOpeningDone,
    boundaryIndex: narrative.boundaryIndex,
    seenEndingId: narrative.seenEndingId,
    seenEndingIds: [...narrative.seenEndingIds],
    acquired: [...collectibles.acquired],
    tokens: economy.tokens,
    ticket10: economy.ticket10,
    ticket50: economy.ticket50,
    roadSpawns: economy.roadSpawns.map((s) => ({ ...s })),
    hubPosition: readHubPositionRaw(),
  };
}

/** 是否為開新局時擷取的空白快照（尚未反映實際遊玩進度） */
export function isInitialGameSnapshot(snapshot: GameSnapshot): boolean {
  return (
    snapshot.acquired.length === 0 &&
    snapshot.visitedStalls.length === 0 &&
    snapshot.completedStalls.length === 0 &&
    snapshot.playedStalls.length === 0 &&
    snapshot.tokens === INITIAL_TOKENS &&
    snapshot.ticket10 === 0 &&
    snapshot.ticket50 === 0 &&
    snapshot.roadSpawns.length === 0 &&
    !snapshot.marketOpeningDone &&
    snapshot.charmSpawns.length === 0 &&
    snapshot.pointCardSpawnStall === null
  );
}

/** 將快照寫回各 store（保留已看過的開場動畫） */
export function restoreGameSnapshot(snapshot: GameSnapshot) {
  if (typeof window === "undefined") return;

  const keepIntroDone = useNarrativeStore.getState().introDone;
  const narrativeRaw = localStorage.getItem(NARRATIVE_KEY);
  let overrides = {};
  let editMode = false;
  try {
    if (narrativeRaw) {
      const parsed = JSON.parse(narrativeRaw) as { overrides?: Record<string, string>; editMode?: boolean };
      overrides = parsed.overrides ?? {};
      editMode = parsed.editMode ?? false;
    }
  } catch {
    /* ignore */
  }

  localStorage.setItem(
    NARRATIVE_KEY,
    JSON.stringify({
      introDone: keepIntroDone,
      editMode,
      overrides,
      visitedStalls: snapshot.visitedStalls,
      completedStalls: snapshot.completedStalls,
      playedStalls: snapshot.playedStalls,
      pointCardSpawnStall: snapshot.pointCardSpawnStall,
      charmSpawns: snapshot.charmSpawns,
      marketOpeningDone: snapshot.marketOpeningDone,
      boundaryIndex: snapshot.boundaryIndex,
      seenEndingId: snapshot.seenEndingId,
      seenEndingIds:
        snapshot.seenEndingIds ??
        (snapshot.seenEndingId ? [snapshot.seenEndingId] : []),
    }),
  );

  const collectibleRaw = localStorage.getItem(COLLECTIBLE_KEY);
  let textOverrides = { descriptions: {}, dialogueLines: {} };
  try {
    if (collectibleRaw) {
      const parsed = JSON.parse(collectibleRaw) as {
        textOverrides?: { descriptions: Record<string, string>; dialogueLines: Record<string, string> };
      };
      textOverrides = parsed.textOverrides ?? textOverrides;
    }
  } catch {
    /* ignore */
  }

  localStorage.setItem(
    COLLECTIBLE_KEY,
    JSON.stringify({ acquired: snapshot.acquired, textOverrides }),
  );

  localStorage.setItem(
    TOKEN_KEY,
    JSON.stringify({
      tokens: snapshot.tokens,
      ticket10: snapshot.ticket10,
      ticket50: snapshot.ticket50,
      roadSpawns: snapshot.roadSpawns,
    }),
  );

  if (snapshot.hubPosition) {
    localStorage.setItem(HUB_POSITION_KEY, snapshot.hubPosition);
  } else {
    localStorage.removeItem(HUB_POSITION_KEY);
  }

  useNarrativeStore.getState().hydrate();
  useCollectibleStore.getState().hydrate();
  useTokenStore.getState().hydrate();
  if (keepIntroDone) {
    useNarrativeStore.getState().completeIntro();
  }
}
