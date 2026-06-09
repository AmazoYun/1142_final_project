import type { EndingId } from "@/lib/endings/types";
import type { GameSnapshot } from "@/lib/player/saveSnapshot";
import { normalizeSaveScores } from "@/lib/player/scoreTotals";
import type { PlayerCloudPayload, SaveRecord } from "@/lib/player/saveTypes";
import type { StallId } from "@/lib/narrative/types";

const ENDING_IDS = new Set<EndingId>(["true", "basic", "stuck", "loop"]);
const STALL_IDS = new Set<StallId>(["pinball", "balloonshoot", "ringtoss", "catchfish"]);
const MAX_NICKNAME_LEN = 20;
const MAX_SAVES = 32;
const MAX_BODY_BYTES = 512_000;

export function normalizeNickname(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_NICKNAME_LEN) return null;
  return trimmed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePlayHistory(raw: unknown): SaveRecord["playHistory"] {
  if (!Array.isArray(raw)) return [];
  const result: SaveRecord["playHistory"] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const stallId =
      typeof item.stallId === "string" && STALL_IDS.has(item.stallId as StallId)
        ? (item.stallId as StallId)
        : null;
    const score = typeof item.score === "number" && Number.isFinite(item.score) ? item.score : null;
    const playedAt = typeof item.playedAt === "number" ? item.playedAt : Date.now();
    if (!stallId || score === null) continue;
    result.push({ stallId, score, playedAt });
  }
  return result;
}

function parseGameScores(raw: unknown): SaveRecord["gameScores"] {
  if (!isRecord(raw)) return {};
  const scores: SaveRecord["gameScores"] = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!STALL_IDS.has(key as StallId)) continue;
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    scores[key as StallId] = value;
  }
  return scores;
}

function parseCharmSpawns(raw: unknown): GameSnapshot["charmSpawns"] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!isRecord(item)) return null;
      const id = typeof item.id === "string" ? item.id : "";
      const stallId =
        typeof item.stallId === "string" && STALL_IDS.has(item.stallId as StallId)
          ? (item.stallId as StallId)
          : null;
      const itemId = typeof item.itemId === "string" ? item.itemId : "";
      if (!id || !stallId || !itemId) return null;
      return { id, stallId, itemId: itemId as GameSnapshot["charmSpawns"][number]["itemId"] };
    })
    .filter((item): item is GameSnapshot["charmSpawns"][number] => item !== null);
}

function parseRoadSpawns(raw: unknown): GameSnapshot["roadSpawns"] {
  if (!Array.isArray(raw)) return [];
  const result: GameSnapshot["roadSpawns"] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const id = typeof item.id === "string" ? item.id : "";
    const stallId =
      typeof item.stallId === "string" && STALL_IDS.has(item.stallId as StallId)
        ? (item.stallId as StallId)
        : null;
    const ticketType =
      item.ticketType === "ticket10" || item.ticketType === "ticket50" ? item.ticketType : null;
    const quantity = typeof item.quantity === "number" ? item.quantity : 0;
    if (!id || !stallId || !ticketType || quantity <= 0) continue;
    result.push({
      id,
      stallId,
      worldOffsetX: typeof item.worldOffsetX === "number" ? item.worldOffsetX : 0,
      worldRatio: typeof item.worldRatio === "number" ? item.worldRatio : undefined,
      worldX: typeof item.worldX === "number" ? item.worldX : undefined,
      ticketType,
      quantity,
    });
  }
  return result;
}

function parseSnapshot(raw: unknown): SaveRecord["snapshot"] | undefined {
  if (!isRecord(raw)) return undefined;
  const acquired = Array.isArray(raw.acquired)
    ? raw.acquired.filter((id): id is string => typeof id === "string")
    : [];
  const visitedStalls = Array.isArray(raw.visitedStalls)
    ? raw.visitedStalls.filter((id): id is StallId => STALL_IDS.has(id as StallId))
    : [];
  const completedStalls = Array.isArray(raw.completedStalls)
    ? raw.completedStalls.filter((id): id is StallId => STALL_IDS.has(id as StallId))
    : [];
  const playedStalls = Array.isArray(raw.playedStalls)
    ? raw.playedStalls.filter((id): id is StallId => STALL_IDS.has(id as StallId))
    : [];

  return {
    visitedStalls,
    completedStalls,
    playedStalls,
    pointCardSpawnStall:
      typeof raw.pointCardSpawnStall === "string" && STALL_IDS.has(raw.pointCardSpawnStall as StallId)
        ? (raw.pointCardSpawnStall as StallId)
        : null,
    charmSpawns: parseCharmSpawns(raw.charmSpawns),
    marketOpeningDone: raw.marketOpeningDone === true,
    boundaryIndex: typeof raw.boundaryIndex === "number" ? raw.boundaryIndex : 0,
    seenEndingId: typeof raw.seenEndingId === "string" ? raw.seenEndingId : null,
    acquired,
    tokens: typeof raw.tokens === "number" ? raw.tokens : 0,
    ticket10: typeof raw.ticket10 === "number" ? raw.ticket10 : 0,
    ticket50: typeof raw.ticket50 === "number" ? raw.ticket50 : 0,
    roadSpawns: parseRoadSpawns(raw.roadSpawns),
    hubPosition: typeof raw.hubPosition === "string" ? raw.hubPosition : null,
  };
}

function parseSaveRecord(raw: unknown, nickname: string): SaveRecord | null {
  if (!isRecord(raw)) return null;
  const saveId = typeof raw.saveId === "string" ? raw.saveId.trim() : "";
  const saveNickname = typeof raw.nickname === "string" ? raw.nickname.trim() : nickname;
  if (!saveId || saveNickname !== nickname) return null;

  const endingId =
    typeof raw.endingId === "string" && ENDING_IDS.has(raw.endingId as EndingId)
      ? (raw.endingId as EndingId)
      : null;

  const updatedAt = typeof raw.updatedAt === "number" ? raw.updatedAt : Date.now();
  const createdAt = typeof raw.createdAt === "number" ? raw.createdAt : updatedAt;
  const playHistory = parsePlayHistory(raw.playHistory);
  const gameScores = parseGameScores(raw.gameScores);

  return normalizeSaveScores({
    saveId,
    nickname: saveNickname,
    playHistory,
    gameScores: gameScores && Object.keys(gameScores).length > 0 ? gameScores : undefined,
    scorePenalty: typeof raw.scorePenalty === "number" ? Math.max(0, raw.scorePenalty) : 0,
    totalScore: typeof raw.totalScore === "number" ? raw.totalScore : 0,
    endingId,
    isActive: raw.isActive === true,
    updatedAt,
    createdAt,
    snapshot: parseSnapshot(raw.snapshot),
  });
}

export type ParsedCloudPutBody = {
  introDone: boolean;
  activeSaveId: string | null;
  saves: SaveRecord[];
};

export function parsePlayerSavePayload(body: unknown, nickname: string): ParsedCloudPutBody | null {
  if (!isRecord(body)) return null;
  if (!Array.isArray(body.saves) || body.saves.length > MAX_SAVES) return null;

  const saves = body.saves
    .map((item) => parseSaveRecord(item, nickname))
    .filter((item): item is SaveRecord => item !== null);

  const introDone = body.introDone === true;
  const activeSaveId =
    typeof body.activeSaveId === "string" && body.activeSaveId.trim()
      ? body.activeSaveId.trim()
      : null;

  return { introDone, activeSaveId, saves };
}

export function normalizeCloudPayload(raw: unknown, nickname: string): PlayerCloudPayload | null {
  if (!isRecord(raw)) return null;

  const saves = Array.isArray(raw.saves)
    ? raw.saves
        .map((item) => parseSaveRecord(item, nickname))
        .filter((item): item is SaveRecord => item !== null)
    : [];

  return {
    nickname,
    introDone: raw.introDone === true,
    activeSaveId:
      typeof raw.activeSaveId === "string" && raw.activeSaveId.trim() ? raw.activeSaveId.trim() : null,
    saves,
    syncedAt: typeof raw.syncedAt === "number" ? raw.syncedAt : Date.now(),
  };
}

export function assertBodySize(req: Request) {
  const length = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) {
    throw new Error("payload_too_large");
  }
}

export function playerSavesKey(nickname: string) {
  return `nm:player:${encodeURIComponent(nickname)}`;
}

export function leaderboardKey(nickname: string) {
  return `nm:leaderboard:${encodeURIComponent(nickname)}`;
}

export const LEADERBOARD_INDEX_KEY = "nm:leaderboard:index";
