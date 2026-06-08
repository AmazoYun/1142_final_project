/**
 * =============================================================================
 * store/collectibleStore.ts — 收集物品「執行期狀態」層（Zustand）
 * =============================================================================
 *
 * 【職責】
 * 1. 記錄哪些物品已取得（持久化至 localStorage）
 * 2. 管理取得當下待播放的對話佇列（pendingAcquireDialogue）
 * 3. 提供 Debug 用覆寫文字、強制設定取得狀態
 * 4. 背包 UI 的選取狀態（selectedId）
 *
 * 【資料流：從外部取得物品】
 *   遊戲頁面呼叫 acquireCollectible(id)  （lib/collectibles/acquireItem.ts）
 *        ↓
 *   tryAcquire(id) 寫入 acquired + 設定 pendingAcquireDialogue
 *        ↓
 *   CollectibleDialogueHost（layout 掛載）訂閱 pending → 顯示 DialoguePanel
 *        ↓
 *   玩家按 Space / 點擊 → advanceAcquireDialogue → 佇列清空
 *
 * 【與 narrativeStore 的差異】
 * - narrativeStore：主線劇情、攤位 intro、localStorage 鍵 night-market-narrative-v1
 * - collectibleStore：物品收集、鍵 night-market-collectibles-v1（互不影響）
 */

"use client";

import { create } from "zustand";
import { collectiblesDefault, getCollectibleDef } from "@/data/collectibles-default";
import type {
  AcquireCollectibleResult,
  CollectibleId,
  CollectibleItemDef,
  CollectibleTextOverrides,
  PendingAcquireAnimation,
  PendingAcquireDialogue,
} from "@/lib/collectibles/types";
import { BACKPACK_ITEM_IMAGES } from "@/lib/collectibles/backpackLayout";

const STORAGE_KEY = "night-market-collectibles-v1";

type Persisted = {
  acquired: CollectibleId[];
  textOverrides: CollectibleTextOverrides;
};

function loadPersisted(): Persisted {
  if (typeof window === "undefined") {
    return { acquired: [], textOverrides: { descriptions: {}, dialogueLines: {} } };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { acquired: [], textOverrides: { descriptions: {}, dialogueLines: {} } };
    }
    const parsed = JSON.parse(raw) as Persisted;
    return {
      acquired: parsed.acquired ?? [],
      textOverrides: parsed.textOverrides ?? { descriptions: {}, dialogueLines: {} },
    };
  } catch {
    return { acquired: [], textOverrides: { descriptions: {}, dialogueLines: {} } };
  }
}

function savePersisted(data: Persisted) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

type CollectibleStore = {
  hydrated: boolean;
  /** 已取得物品的 id 清單 */
  acquired: CollectibleId[];
  /** 背包左欄目前選中的物品（僅 UI） */
  selectedId: CollectibleId | null;
  /** 取得物品後待播放的對話；由 CollectibleDialogueHost 消費 */
  pendingAcquireDialogue: PendingAcquireDialogue | null;
  /** 取得物品全螢幕動畫；由 CollectibleAcquireOverlay 消費 */
  pendingAcquireAnimation: PendingAcquireAnimation | null;
  redeemNotice: string | null;
  textOverrides: CollectibleTextOverrides;

  hydrate: () => void;
  /** 靜態清單（來自 data 檔） */
  getAllDefs: () => CollectibleItemDef[];
  hasAcquired: (id: CollectibleId) => boolean;
  getDescription: (def: CollectibleItemDef) => string;
  getDialogueText: (lineId: string, fallback: string) => string;
  setSelectedId: (id: CollectibleId | null) => void;

  /**
   * 嘗試取得物品。
   * skipDialogue：離開夜市撿氛圍物時不彈出取得對話，改由結局演出。
   */
  tryAcquire: (id: CollectibleId, options?: { skipDialogue?: boolean }) => AcquireCollectibleResult;

  advanceAcquireDialogue: () => void;
  dismissAcquireDialogue: () => void;
  dismissAcquireAnimation: () => void;
  /** Hub 點擊代幣：全螢幕檢視動畫 */
  showInspectAnimation: (payload: Omit<PendingAcquireAnimation, "mode">) => void;
  setRedeemNotice: (msg: string | null) => void;

  // --- Debug API（僅供背包 Debug 面板與測試） ---
  debugSetAcquired: (id: CollectibleId, acquired: boolean) => void;
  debugSetDescription: (id: CollectibleId, text: string) => void;
  debugSetDialogueLine: (lineId: string, text: string) => void;
  debugResetOverrides: () => void;
  debugClearAllAcquired: () => void;
};

export const useCollectibleStore = create<CollectibleStore>((set, get) => ({
  hydrated: false,
  acquired: [],
  selectedId: null,
  pendingAcquireDialogue: null,
  pendingAcquireAnimation: null,
  redeemNotice: null,
  textOverrides: { descriptions: {}, dialogueLines: {} },

  hydrate: () => {
    const p = loadPersisted();
    set({
      hydrated: true,
      acquired: p.acquired,
      textOverrides: p.textOverrides,
    });
  },

  getAllDefs: () => collectiblesDefault.items,

  hasAcquired: (id) => get().acquired.includes(id),

  getDescription: (def) =>
    get().textOverrides.descriptions[def.id] ?? def.description,

  getDialogueText: (lineId, fallback) =>
    get().textOverrides.dialogueLines[lineId] ?? fallback,

  setSelectedId: (id) => set({ selectedId: id }),

  tryAcquire: (id, options) => {
    const def = getCollectibleDef(id);
    if (!def) {
      return { success: false, reason: "unknown_id" };
    }
    if (get().acquired.includes(id)) {
      return { success: false, reason: "already_acquired" };
    }

    const acquired = [...get().acquired, id];
    const skipDialogue = options?.skipDialogue ?? false;
    const animation: PendingAcquireAnimation = {
      itemId: id,
      itemName: def.name,
      image: BACKPACK_ITEM_IMAGES[id] ?? def.image,
      extraMessage: id === "point-card" ? "已解鎖兌獎功能" : undefined,
      mode: "acquire",
    };
    const pendingAcquireDialogue: PendingAcquireDialogue | null =
      !skipDialogue && def.acquireDialogue.length > 0
        ? { itemId: id, lines: def.acquireDialogue, lineIndex: 0 }
        : null;

    set({
      acquired,
      pendingAcquireAnimation: skipDialogue ? null : animation,
      pendingAcquireDialogue,
    });

    const p = loadPersisted();
    savePersisted({ ...p, acquired });

    return { success: true, itemId: id };
  },

  advanceAcquireDialogue: () => {
    const pending = get().pendingAcquireDialogue;
    if (!pending) return;

    const nextIndex = pending.lineIndex + 1;
    if (nextIndex >= pending.lines.length) {
      set({ pendingAcquireDialogue: null });
      return;
    }

    set({
      pendingAcquireDialogue: { ...pending, lineIndex: nextIndex },
    });
  },

  dismissAcquireDialogue: () => set({ pendingAcquireDialogue: null }),

  dismissAcquireAnimation: () => set({ pendingAcquireAnimation: null }),

  showInspectAnimation: (payload) =>
    set({ pendingAcquireAnimation: { ...payload, mode: "inspect" } }),

  setRedeemNotice: (msg) => set({ redeemNotice: msg }),

  debugSetAcquired: (id, acquired) => {
    let next = get().acquired;
    if (acquired && !next.includes(id)) {
      next = [...next, id];
    } else if (!acquired) {
      next = next.filter((x) => x !== id);
      if (get().selectedId === id) {
        set({ selectedId: null });
      }
    }
    set({ acquired: next });
    const p = loadPersisted();
    savePersisted({ ...p, acquired: next });
  },

  debugSetDescription: (id, text) => {
    const textOverrides = {
      ...get().textOverrides,
      descriptions: { ...get().textOverrides.descriptions, [id]: text },
    };
    set({ textOverrides });
    const p = loadPersisted();
    savePersisted({ ...p, textOverrides });
  },

  debugSetDialogueLine: (lineId, text) => {
    const textOverrides = {
      ...get().textOverrides,
      dialogueLines: { ...get().textOverrides.dialogueLines, [lineId]: text },
    };
    set({ textOverrides });
    const p = loadPersisted();
    savePersisted({ ...p, textOverrides });
  },

  debugResetOverrides: () => {
    const empty: CollectibleTextOverrides = { descriptions: {}, dialogueLines: {} };
    set({ textOverrides: empty });
    const p = loadPersisted();
    savePersisted({ ...p, textOverrides: empty });
  },

  debugClearAllAcquired: () => {
    set({
      acquired: [],
      selectedId: null,
      pendingAcquireDialogue: null,
      pendingAcquireAnimation: null,
    });
    const p = loadPersisted();
    savePersisted({ ...p, acquired: [] });
  },
}));
