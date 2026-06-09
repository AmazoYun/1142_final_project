"use client";

import { upsertLeaderboardEntry } from "@/lib/firebase/leaderboard";
import type { SaveRecord } from "@/lib/player/saveTypes";

export function syncPlayerRecordToFirebase(record: SaveRecord) {
  if (!record.endingId) return;
  void upsertLeaderboardEntry({
    saveId: record.saveId,
    nickname: record.nickname,
    totalScore: record.totalScore,
    endingId: record.endingId,
    updatedAt: record.updatedAt,
  }).catch(() => {
    /* 離線或未設定 Firebase 時靜默略過 */
  });
}
