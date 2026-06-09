import type { EndingId } from "@/lib/endings/types";
import type { GameSnapshot } from "@/lib/player/saveSnapshot";
import type { StallId } from "@/lib/narrative/types";

export type GameScores = Partial<Record<StallId, number>>;

/** 單次攤位遊玩得分紀錄 */
export type StallPlayScore = {
  stallId: StallId;
  score: number;
  playedAt: number;
};

export type SaveRecord = {
  saveId: string;
  nickname: string;
  /** 每次遊玩得分紀錄（可重複同一攤位） */
  playHistory: StallPlayScore[];
  /** 累計扣分（如前導「直接離開」） */
  scorePenalty?: number;
  totalScore: number;
  /** @deprecated 舊版每攤位單一分數，載入時會遷移至 playHistory */
  gameScores?: GameScores;
  endingId: EndingId | null;
  isActive: boolean;
  updatedAt: number;
  createdAt: number;
  snapshot?: GameSnapshot;
};

export type PlayerCloudPayload = {
  nickname: string;
  /** 是否已看過前導劇情（帳號層級，跨裝置同步） */
  introDone: boolean;
  /** 目前進行中的存檔 id */
  activeSaveId: string | null;
  saves: SaveRecord[];
  syncedAt: number;
};

export type LeaderboardCloudEntry = {
  nickname: string;
  totalScore: number;
  endingId: EndingId | null;
  updatedAt: number;
  saveId: string;
};
