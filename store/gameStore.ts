/**
 * =============================================================================
 * store/gameStore.ts — 撈金魚遊戲的「全域狀態」層（Zustand）
 * =============================================================================
 *
 * 【這個檔案負責什麼？】
 * 管理「需要顯示在畫面上、且會因玩家行為改變」的資料，例如：
 *   - 總分、最佳紀錄
 *   - 撈網耐久（%）
 *   - 剩餘撈網張數
 *   - 遊戲進行狀態（未開始 / 進行中 / 結束）
 *
 * 【這個檔案「不」負責什麼？】
 *   - 魚的即時座標、速度、Canvas 繪圖 → 在 app/page.tsx 的 ref + RAF 迴圈
 *   - 撈網慣性物理、圓形碰撞 → 同上
 *
 * 【資料流（從撈到魚到 UI 更新）】
 *   page.tsx update() 偵測碰撞
 *        ↓
 *   useGameStore.getState().onFishCaught(points, cost)   ← 在 RAF 內直接呼叫，不經 React
 *        ↓
 *   Zustand set() 更新 score / durability / netsRemaining / status
 *        ↓
 *   page.tsx 的 useGameSelector 訂閱到變更 → React 重新渲染右側方塊、耐久標籤等
 *
 * 【為何用 Zustand？】
 * Canvas 每幀更新若寫進 React useState，會造成大量 re-render。
 * 因此「高頻」資料放 ref；「低頻、要顯示在 DOM」的資料放本 store。
 */

import { create } from "zustand";

// -----------------------------------------------------------------------------
// 型別定義
// -----------------------------------------------------------------------------

/**
 * 遊戲進行狀態（控制 UI 與 Canvas 是否推進物理）
 *
 * | 狀態      | 畫面表現                          | Canvas update() |
 * |-----------|-----------------------------------|-----------------|
 * | idle      | 顯示「開始遊戲」遮罩              | 不執行          |
 * | playing   | 可操控撈網、計分與扣耐久          | 每幀執行        |
 * | gameover  | 顯示「遊戲結束」、撈網用盡        | 不執行          |
 */
export type GameStatus = "idle" | "playing" | "gameover";

/**
 * 魚的體型等級
 * - 影響：繪製大小（radius）、隨機分數區間、耐久扣除基準
 * - 在 page.tsx 的 spawnFish() 透過 pickFishSize() 決定
 */
export type FishSize = "small" | "medium" | "large";

// -----------------------------------------------------------------------------
// 魚體型常數表（單一真相來源，page.tsx 生成魚時會讀取）
// -----------------------------------------------------------------------------

/**
 * FISH_SIZE_CONFIG — 各體型的「基準數值」
 *
 * | 欄位            | 用途 |
 * |-----------------|------|
 * | points          | 該體型的「參考分數」，實際分數會在區間內隨機（見 randomPointsForSize） |
 * | radius          | 碰撞與繪製半徑（px），大魚較難完全罩住但分數高 |
 * | durabilityCost  | 撈到「參考分數」時的耐久扣除（%）；實際會依隨機分數等比調整 |
 * | label           | 中文標籤，供未來 UI 擴充使用 |
 *
 * 分數區間（需求）：小 1~3、中 4~7、大 8~10
 * 耐久設計：體型越大，基準扣除越高，鼓勵玩家權衡風險與報酬
 */
export const FISH_SIZE_CONFIG: Record<
  FishSize,
  { points: number; radius: number; durabilityCost: number; label: string }
> = {
  small: { points: 2, radius: 9, durabilityCost: 8, label: "小" },
  medium: { points: 5, radius: 14, durabilityCost: 18, label: "中" },
  large: { points: 9, radius: 20, durabilityCost: 32, label: "大" },
};

// -----------------------------------------------------------------------------
// 純函式：依體型計算「這條魚」的分數與耐久消耗（生成時各算一次，之後不變）
// -----------------------------------------------------------------------------

/**
 * randomPointsForSize — 在體型對應區間內隨機生成分數
 *
 * 呼叫時機：page.tsx 的 spawnFish()，每條新魚建立時執行一次。
 * 結果會寫入 Fish.points，撈到時原樣傳入 onFishCaught。
 */
export function randomPointsForSize(size: FishSize): number {
  if (size === "small") return 1 + Math.floor(Math.random() * 3); // 1, 2, 3
  if (size === "medium") return 4 + Math.floor(Math.random() * 4); // 4, 5, 6, 7
  return 8 + Math.floor(Math.random() * 3); // 8, 9, 10
}

/**
 * durabilityCostForPoints — 依「實際隨機分數」等比計算耐久扣除
 *
 * 公式：基準耐久 × (實際分數 / 基準分數)，四捨五入
 * 例：中魚基準 5 分扣 18%，若隨機到 7 分 → 18 × (7/5) ≈ 25%
 *
 * 這樣同一體型內，分到較高分時也會多扣一點耐久，與獎勵成正比。
 */
export function durabilityCostForPoints(points: number, size: FishSize): number {
  const base = FISH_SIZE_CONFIG[size].durabilityCost;
  const basePoints = FISH_SIZE_CONFIG[size].points;
  return Math.round(base * (points / basePoints));
}

// -----------------------------------------------------------------------------
// Store 型別與初始常數
// -----------------------------------------------------------------------------

/** 初始可使用的撈網總數（含手上這一張） */
const INITIAL_NETS = 3;

/**
 * GameStore — Zustand store 的完整形狀
 *
 * 分為兩類成員：
 * 1. 狀態欄位（數字、布林、status）→ 驅動 UI
 * 2. 動作方法（startGame、onFishCaught…）→ 集中修改狀態的入口，避免散落 setState
 */
export type GameStore = {
  // ---- 狀態欄位（對應 UI 區塊見下方註解）----

  /** 累計得分 → 右側資訊面板「上方方塊」 */
  score: number;
  /** 本局／歷史最高得分 → 頁尾輔助說明（可擴充為紀錄榜） */
  bestScore: number;
  /** 撈網耐久 0~100（%）→ 圓池右下「🔍 100%」區域 */
  durability: number;
  /**
   * 剩餘撈網張數（含正在使用的那張）
   * → 右側資訊面板「下方方塊」
   * 初始 3：代表總共 3 次「網壞掉後還能換新網」的機會（見 onFishCaught 流程圖）
   */
  netsRemaining: number;
  /** 最近一次撈魚獲得的分數 → 右側中間「本次」高亮方塊 */
  lastCatchPoints: number;
  /** 遊戲狀態 → 控制開始遮罩、Canvas 是否 update */
  status: GameStatus;
  /**
   * 是否顯示「已換新網」提示
   * → page.tsx 圓池中央的琥珀色 toast，約 2.5 秒後由 clearNetReplacedMessage 關閉
   */
  netReplacedMessage: boolean;

  // ---- 動作方法 ----

  /** 按下「開始遊戲／再玩一次」：重置本局數值並進入 playing */
  startGame: () => void;
  /**
   * 撈到一條魚時呼叫（每條魚各呼叫一次）
   * @param points 該魚的得分（生成時已決定）
   * @param durabilityCost 該魚的耐久扣除（生成時已決定）
   */
  onFishCaught: (points: number, durabilityCost: number) => void;
  /** 關閉換網提示（由 page.tsx 的 setTimeout 觸發） */
  clearNetReplacedMessage: () => void;
  /** 按下「返回」：回到 idle，不保留本局進度 */
  resetToIdle: () => void;
};

// -----------------------------------------------------------------------------
// Zustand store 實例（create 只執行一次，全應用共用）
// -----------------------------------------------------------------------------

export const useGameStore = create<GameStore>((set, get) => ({
  // ===================== 初始狀態（首次載入頁面） =====================
  score: 0,
  bestScore: 0,
  durability: 100,
  netsRemaining: INITIAL_NETS,
  lastCatchPoints: 0,
  status: "idle",
  netReplacedMessage: false,

  // ===================== startGame：開始新一局 =====================
  /**
   * 時機：玩家按「開始遊戲」或「再玩一次」
   * 注意：不會清空 bestScore（最佳紀錄跨局保留）
   * 搭配：page.tsx handleStart() 還會呼叫 resetGameRef 重置 Canvas 上的魚與撈網
   */
  startGame: () =>
    set({
      score: 0,
      durability: 100,
      netsRemaining: INITIAL_NETS,
      lastCatchPoints: 0,
      status: "playing",
      netReplacedMessage: false,
    }),

  // ===================== onFishCaught：核心遊戲邏輯 =====================
  /**
   * 撈到魚時的狀態機（由 Canvas 碰撞迴圈觸發）：
   *
   *   ① 若 status !== playing → 直接 return（已結束則不再計分）
   *   ② score += points，更新 bestScore
   *   ③ durability -= durabilityCost
   *   ④ 若 durability > 0 → 僅更新分數與耐久，結束
   *   ⑤ 若 durability <= 0 → 目前這張網視為損壞：
   *        netsRemaining -= 1
   *        ├─ 若 netsRemaining > 0 → 換新網：durability = 100，顯示 netReplacedMessage
   *        └─ 若 netsRemaining === 0 → gameover，durability 固定為 0
   *
   * 範例（初始 3 張網）：
   *   第 1 次網壞 → 剩 2 張，耐久回 100%
   *   第 2 次網壞 → 剩 1 張，耐久回 100%
   *   第 3 次網壞 → 剩 0 張 → 遊戲結束
   */
  onFishCaught: (points, durabilityCost) => {
    const state = get();
    if (state.status !== "playing") return;

    let durability = state.durability - durabilityCost;
    let netsRemaining = state.netsRemaining;
    let status: GameStatus = state.status;
    let netReplacedMessage = false;

    const newScore = state.score + points;
    const bestScore = Math.max(state.bestScore, newScore);

    if (durability <= 0) {
      netsRemaining -= 1;
      if (netsRemaining > 0) {
        durability = 100;
        netReplacedMessage = true;
      } else {
        durability = 0;
        status = "gameover";
      }
    }

    set({
      score: newScore,
      bestScore,
      durability,
      netsRemaining,
      lastCatchPoints: points,
      status,
      netReplacedMessage,
    });
  },

  clearNetReplacedMessage: () => set({ netReplacedMessage: false }),

  // ===================== resetToIdle：返回標題／待機 =====================
  /**
   * 時機：玩家按左上角「返回」
   * 效果：回到 idle，分數與耐久重置；bestScore 仍保留
   */
  resetToIdle: () =>
    set({
      score: 0,
      durability: 100,
      netsRemaining: INITIAL_NETS,
      lastCatchPoints: 0,
      status: "idle",
      netReplacedMessage: false,
    }),
}));
