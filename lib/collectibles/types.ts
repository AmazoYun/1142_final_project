/**
 * =============================================================================
 * lib/collectibles/types.ts — 收集物品系統型別定義
 * =============================================================================
 *
 * 所有可收集物品的「靜態資料形狀」與「執行期狀態」集中定義於此，
 * 方便 data/collectibles-default.ts 與 store 共用同一套型別。
 */

import type { Speaker } from "@/lib/narrative/types";

/** 單一可收集物品的唯一識別碼（需與 data 檔內 id 一致） */
export type CollectibleId = string;

/**
 * 取得物品當下要播放的單句對話。
 * id 用於 debug 覆寫與未來與 narrative 編輯模式整合。
 */
export type CollectibleDialogueLine = {
  id: string;
  speaker: Speaker;
  text: string;
};

/**
 * 可收集物品的「靜態定義」（寫在 data/collectibles-default.ts）。
 *
 * | 欄位            | 用途 |
 * |-----------------|------|
 * | id              | 程式與存檔用的主鍵 |
 * | name            | 顯示名稱（背包、debug） |
 * | icon            | 右側網格小圖（public 路徑） |
 * | image           | 左側詳情大圖（public 路徑） |
 * | description     | 左側下半部說明文字 |
 * | acquireDialogue | 首次取得時依序播放的對話 |
 */
export type CollectibleItemDef = {
  id: CollectibleId;
  name: string;
  icon: string;
  image: string;
  description: string;
  acquireDialogue: CollectibleDialogueLine[];
};

/** data 檔匯出的完整清單結構 */
export type CollectibleCatalog = {
  items: CollectibleItemDef[];
};

/**
 * tryAcquire / acquireCollectible 的回傳結果。
 * 外部頁面可依 success 決定是否顯示額外 UI（對話由全域 Host 負責）。
 */
export type AcquireCollectibleResult =
  | { success: true; itemId: CollectibleId }
  | { success: false; reason: "unknown_id" | "already_acquired" };

/** 待播放的取得對話佇列（存在 store，由 CollectibleDialogueHost 消費） */
export type PendingAcquireDialogue = {
  itemId: CollectibleId;
  lines: CollectibleDialogueLine[];
  lineIndex: number;
};

/** 取得道具全螢幕動畫（CollectibleAcquireOverlay 消費） */
export type PendingAcquireAnimation = {
  itemId?: CollectibleId;
  itemName: string;
  image: string;
  /** 集點卡拾取後附加提示 */
  extraMessage?: string;
  /** Hub 點擊代幣時顯示的說明文字 */
  description?: string;
  /** acquire：取得道具；inspect：Hub 點擊代幣檢視 */
  mode?: "acquire" | "inspect";
  /** 飛行動畫目標元素 selector */
  flyTargetSelector?: string;
};

/** Debug 時可覆寫的文字（僅影響顯示，不寫回 data 檔） */
export type CollectibleTextOverrides = {
  descriptions: Record<CollectibleId, string>;
  dialogueLines: Record<string, string>;
};
