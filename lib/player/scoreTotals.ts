import type { EndingId } from "@/lib/endings/types";
import type { StallId } from "@/lib/narrative/types";
import type { GameScores, SaveRecord, StallPlayScore } from "@/lib/player/saveTypes";

/** 前導「直接離開」廁所時扣除的最終分數 */
export const DIRECT_LEAVE_PENALTY = 1000;

/** 達成結局時額外計入總分的獎勵分數 */
export const ENDING_SCORE_BONUS: Record<EndingId, number> = {
  basic: 1000,
  loop: 500,
  stuck: 800,
  true: 1500,
};

export function endingScoreBonus(endingId: EndingId | null): number {
  if (!endingId) return 0;
  return ENDING_SCORE_BONUS[endingId];
}

export function sumPlayHistory(playHistory: StallPlayScore[]): number {
  return playHistory.reduce((sum, entry) => sum + entry.score, 0);
}

export function computeTotalScore(
  playHistory: StallPlayScore[],
  endingId: EndingId | null,
  scorePenalty = 0,
): number {
  return sumPlayHistory(playHistory) + endingScoreBonus(endingId) - scorePenalty;
}

export function migrateGameScoresToHistory(
  gameScores: GameScores,
  fallbackTime = Date.now(),
): StallPlayScore[] {
  return (Object.entries(gameScores) as [StallId, number][])
    .filter(([, score]) => typeof score === "number" && Number.isFinite(score))
    .map(([stallId, score]) => ({ stallId, score, playedAt: fallbackTime }));
}

/** 正規化存檔分數：遷移舊版 gameScores，並重算 totalScore */
export function normalizeSaveScores(record: SaveRecord): SaveRecord {
  let playHistory = record.playHistory ?? [];
  if (playHistory.length === 0 && record.gameScores && Object.keys(record.gameScores).length > 0) {
    playHistory = migrateGameScoresToHistory(record.gameScores, record.updatedAt);
  }
  const scorePenalty = record.scorePenalty ?? 0;
  const totalScore = computeTotalScore(playHistory, record.endingId, scorePenalty);
  return { ...record, playHistory, scorePenalty, totalScore };
}
