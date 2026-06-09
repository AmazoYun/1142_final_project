import type { LeaderboardCloudEntry, PlayerCloudPayload, SaveRecord } from "@/lib/player/saveTypes";
import { isRedisConfigured, redis } from "@/lib/server/redis";
import {
  LEADERBOARD_INDEX_KEY,
  leaderboardKey,
  normalizeCloudPayload,
  playerSavesKey,
} from "@/lib/server/validatePlayerSave";

function collectLeaderboardEntries(saves: SaveRecord[]): LeaderboardCloudEntry[] {
  return saves
    .filter((save): save is SaveRecord & { endingId: NonNullable<SaveRecord["endingId"]> } =>
      save.endingId != null,
    )
    .map((save) => ({
      nickname: save.nickname,
      totalScore: save.totalScore,
      endingId: save.endingId,
      updatedAt: save.updatedAt,
      saveId: save.saveId,
    }))
    .sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return b.updatedAt - a.updatedAt;
    });
}

function normalizeLeaderboardRows(
  raw: LeaderboardCloudEntry | LeaderboardCloudEntry[] | null,
): LeaderboardCloudEntry[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

export async function readPlayerSaves(nickname: string): Promise<PlayerCloudPayload | null> {
  if (!isRedisConfigured()) return null;

  const data = await redis.get<unknown>(playerSavesKey(nickname));
  if (!data) return null;
  return normalizeCloudPayload(data, nickname);
}

export async function writePlayerProfile(
  nickname: string,
  incoming: Omit<PlayerCloudPayload, "nickname" | "syncedAt">,
): Promise<PlayerCloudPayload> {
  if (!isRedisConfigured()) {
    throw new Error("redis_not_configured");
  }

  const payload: PlayerCloudPayload = {
    nickname,
    introDone: incoming.introDone,
    activeSaveId: incoming.activeSaveId,
    saves: incoming.saves,
    syncedAt: Date.now(),
  };

  await redis.set(playerSavesKey(nickname), payload);

  const leaderboardEntries = collectLeaderboardEntries(payload.saves);
  if (leaderboardEntries.length > 0) {
    await redis.set(leaderboardKey(nickname), leaderboardEntries);
    await redis.sadd(LEADERBOARD_INDEX_KEY, nickname);
  } else {
    await redis.del(leaderboardKey(nickname));
    await redis.srem(LEADERBOARD_INDEX_KEY, nickname);
  }

  return payload;
}

export async function listLeaderboardEntries(): Promise<LeaderboardCloudEntry[]> {
  if (!isRedisConfigured()) return [];

  const nicknames = await redis.smembers<string>(LEADERBOARD_INDEX_KEY);
  if (!nicknames.length) return [];

  const rows = await Promise.all(
    nicknames.map(async (nickname) =>
      redis.get<LeaderboardCloudEntry | LeaderboardCloudEntry[]>(leaderboardKey(nickname)),
    ),
  );

  return rows
    .flatMap((row) => normalizeLeaderboardRows(row))
    .sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return b.updatedAt - a.updatedAt;
    });
}

export function mergeSaveRecords(local: SaveRecord[], remote: SaveRecord[]): SaveRecord[] {
  const map = new Map<string, SaveRecord>();
  for (const save of remote) map.set(save.saveId, save);
  for (const save of local) {
    const existing = map.get(save.saveId);
    if (!existing || save.updatedAt >= existing.updatedAt) {
      map.set(save.saveId, save);
    }
  }
  return [...map.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}
