"use client";

import { upsertLeaderboardEntry } from "@/lib/firebase/leaderboard";
import type { SaveRecord } from "@/lib/player/saveTypes";

export function syncPlayerRecordToFirebase(record: SaveRecord) {
  void upsertLeaderboardEntry({
    nickname: record.nickname,
    totalScore: record.totalScore,
    endingId: record.endingId,
    updatedAt: record.updatedAt,
  }).catch(() => {
    /* 離線或未設定 Firebase 時靜默略過 */
  });
}
