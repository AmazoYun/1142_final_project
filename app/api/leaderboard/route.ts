import { NextResponse } from "next/server";
import { listLeaderboardEntries } from "@/lib/server/playerSaveStore";
import { isRedisConfigured } from "@/lib/server/redis";

export const runtime = "nodejs";

export async function GET() {
  if (!isRedisConfigured()) {
    return NextResponse.json({ configured: false, entries: [] });
  }

  const entries = await listLeaderboardEntries();
  return NextResponse.json({
    configured: true,
    entries: entries.map((row) => ({
      id: row.saveId,
      nickname: row.nickname,
      totalScore: row.totalScore,
      endingId: row.endingId,
      updatedAt: row.updatedAt,
    })),
  });
}
