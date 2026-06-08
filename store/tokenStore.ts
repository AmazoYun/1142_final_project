"use client";

import { create } from "zustand";
import { generateRoadLotteryDrops } from "@/lib/economy/lotterySpawn";
import { INITIAL_TOKENS } from "@/lib/economy/constants";
import { prepareLotteryPlacements } from "@/lib/market/lotterySpawnPlacement";
import { HUB_SHADOW_PLACEMENTS, type HubShadowPlacement } from "@/lib/market/hubSceneLayers";
import type { StallId } from "@/lib/narrative/types";

const STORAGE_KEY = "night-market-tokens-v1";

export type LotteryTicketType = "ticket10" | "ticket50";

export type RoadLotterySpawn = {
  id: string;
  stallId: StallId;
  worldOffsetX: number;
  /** 在可行走道路上的比例位置（0–1） */
  worldRatio?: number;
  /** 絕對世界座標；開發預覽或覆寫水平位置時使用 */
  worldX?: number;
  ticketType: LotteryTicketType;
  quantity: number;
};

type Persisted = {
  tokens: number;
  ticket10: number;
  ticket50: number;
  roadSpawns: RoadLotterySpawn[];
};

function loadPersisted(): Persisted {
  if (typeof window === "undefined") {
    return { tokens: INITIAL_TOKENS, ticket10: 0, ticket50: 0, roadSpawns: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { tokens: INITIAL_TOKENS, ticket10: 0, ticket50: 0, roadSpawns: [] };
    }
    const parsed = JSON.parse(raw) as Persisted;
    return {
      tokens: parsed.tokens ?? INITIAL_TOKENS,
      ticket10: parsed.ticket10 ?? 0,
      ticket50: parsed.ticket50 ?? 0,
      roadSpawns: parsed.roadSpawns ?? [],
    };
  } catch {
    return { tokens: INITIAL_TOKENS, ticket10: 0, ticket50: 0, roadSpawns: [] };
  }
}

function savePersisted(data: Persisted) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function ticketValue(type: LotteryTicketType) {
  return type === "ticket10" ? 10 : 50;
}

type TokenStore = {
  hydrated: boolean;
  tokens: number;
  ticket10: number;
  ticket50: number;
  roadSpawns: RoadLotterySpawn[];
  hydrate: () => void;
  spendTokens: (amount: number) => boolean;
  addTokens: (amount: number) => void;
  addTickets: (type: LotteryTicketType, count: number) => void;
  redeemTickets: (type: LotteryTicketType, count: number) => boolean;
  spawnRoadLottery: (shadowPlacements?: HubShadowPlacement[]) => Promise<void>;
  devSpawnLotteryPreview: (worldX: number, stallId: StallId) => void;
  pickupRoadSpawn: (id: string) => void;
  resetEconomy: () => void;
};

export const useTokenStore = create<TokenStore>((set, get) => ({
  hydrated: false,
  tokens: INITIAL_TOKENS,
  ticket10: 0,
  ticket50: 0,
  roadSpawns: [],

  hydrate: () => {
    const p = loadPersisted();
    set({
      hydrated: true,
      tokens: p.tokens,
      ticket10: p.ticket10,
      ticket50: p.ticket50,
      roadSpawns: p.roadSpawns,
    });
  },

  spendTokens: (amount) => {
    if (get().tokens < amount) return false;
    const tokens = get().tokens - amount;
    set({ tokens });
    const p = loadPersisted();
    savePersisted({ ...p, tokens });
    return true;
  },

  addTokens: (amount) => {
    const tokens = get().tokens + amount;
    set({ tokens });
    const p = loadPersisted();
    savePersisted({ ...p, tokens });
  },

  addTickets: (type, count) => {
    if (count <= 0) return;
    if (type === "ticket10") {
      const ticket10 = get().ticket10 + count;
      set({ ticket10 });
      const p = loadPersisted();
      savePersisted({ ...p, ticket10 });
      return;
    }
    const ticket50 = get().ticket50 + count;
    set({ ticket50 });
    const p = loadPersisted();
    savePersisted({ ...p, ticket50 });
  },

  redeemTickets: (type, count) => {
    if (count <= 0) return false;
    const available = type === "ticket10" ? get().ticket10 : get().ticket50;
    if (available < count) return false;

    const tokenGain = ticketValue(type) * count;
    const tokens = get().tokens + tokenGain;
    if (type === "ticket10") {
      const ticket10 = get().ticket10 - count;
      set({ tokens, ticket10 });
      const p = loadPersisted();
      savePersisted({ ...p, tokens, ticket10 });
      return true;
    }
    const ticket50 = get().ticket50 - count;
    set({ tokens, ticket50 });
    const p = loadPersisted();
    savePersisted({ ...p, tokens, ticket50 });
    return true;
  },

  spawnRoadLottery: async (shadowPlacements = HUB_SHADOW_PLACEMENTS) => {
    const drops = generateRoadLotteryDrops(get().tokens);
    if (drops.length === 0) return;

    const placements = await prepareLotteryPlacements(drops.length, shadowPlacements);
    if (placements.length === 0) return;

    const roadSpawns: RoadLotterySpawn[] = placements.map((placement, index) => {
      const drop = drops[index]!;
      return {
        id: `lottery-${Date.now()}-${index}`,
        stallId: placement.stallId,
        worldOffsetX: 0,
        worldRatio: placement.worldRatio,
        ticketType: drop.ticketType,
        quantity: drop.quantity,
      };
    });

    set({ roadSpawns });
    const p = loadPersisted();
    savePersisted({ ...p, roadSpawns });
  },

  devSpawnLotteryPreview: (worldX, stallId) => {
    const ts = Date.now();
    const roadSpawns: RoadLotterySpawn[] = [
      {
        id: `dev-lottery-${ts}-10`,
        stallId,
        worldOffsetX: 0,
        worldX: worldX - 44,
        ticketType: "ticket10",
        quantity: 1,
      },
      {
        id: `dev-lottery-${ts}-50`,
        stallId,
        worldOffsetX: 0,
        worldX: worldX + 44,
        ticketType: "ticket50",
        quantity: 1,
      },
    ];
    set({ roadSpawns });
    const p = loadPersisted();
    savePersisted({ ...p, roadSpawns });
  },

  pickupRoadSpawn: (id) => {
    const spawn = get().roadSpawns.find((s) => s.id === id);
    if (!spawn) return;

    get().addTickets(spawn.ticketType, spawn.quantity);
    const roadSpawns = get().roadSpawns.filter((s) => s.id !== id);
    set({ roadSpawns });
    const p = loadPersisted();
    savePersisted({ ...p, roadSpawns });
  },

  resetEconomy: () => {
    const fresh: Persisted = {
      tokens: INITIAL_TOKENS,
      ticket10: 0,
      ticket50: 0,
      roadSpawns: [],
    };
    savePersisted(fresh);
    set(fresh);
  },
}));
