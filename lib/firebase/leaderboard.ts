"use client";

import type { EndingId } from "@/lib/endings/types";
import { endingLabel } from "@/store/playerStore";

export type LeaderboardEntry = {
  id: string;
  nickname: string;
  totalScore: number;
  endingId: EndingId | null;
  updatedAt: number;
};

export type EndingFilter = "all" | EndingId;

const PAGE_SIZE = 10;

function databaseUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL?.trim();
  if (!url) return null;
  return url.replace(/\/$/, "");
}

function entryKey(saveId: string) {
  return encodeURIComponent(saveId);
}

function parseEntries(raw: unknown): LeaderboardEntry[] {
  if (!raw || typeof raw !== "object") return [];
  const entries: LeaderboardEntry[] = [];
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    const row = value as Record<string, unknown>;
    const saveId = typeof row.saveId === "string" ? row.saveId : id;
    const nickname = typeof row.nickname === "string" ? row.nickname : "";
    const totalScore = typeof row.totalScore === "number" ? row.totalScore : 0;
    const endingId =
      typeof row.endingId === "string" ? (row.endingId as EndingId) : null;
    const updatedAt = typeof row.updatedAt === "number" ? row.updatedAt : 0;
    if (!nickname || !endingId) continue;
    entries.push({ id: saveId, nickname, totalScore, endingId, updatedAt });
  }
  return entries;
}

export function isLeaderboardConfigured() {
  return true;
}

async function fetchLeaderboardFromApi(): Promise<LeaderboardEntry[] | null> {
  try {
    const res = await fetch("/api/leaderboard", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { configured?: boolean; entries?: LeaderboardEntry[] };
    if (!data.configured || !Array.isArray(data.entries)) return null;
    return data.entries;
  } catch {
    return null;
  }
}

export async function fetchLeaderboardEntries(): Promise<LeaderboardEntry[]> {
  const apiEntries = await fetchLeaderboardFromApi();
  if (apiEntries && apiEntries.length > 0) return apiEntries;

  const base = databaseUrl();
  if (!base) return apiEntries ?? [];

  const res = await fetch(`${base}/leaderboard.json`, { cache: "no-store" });
  if (!res.ok) throw new Error("無法載入排行榜");
  const data = await res.json();
  return parseEntries(data).sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    return b.updatedAt - a.updatedAt;
  });
}

export async function upsertLeaderboardEntry(entry: {
  saveId: string;
  nickname: string;
  totalScore: number;
  endingId: EndingId;
  updatedAt: number;
}) {
  const base = databaseUrl();
  if (!base) return;

  const payload = {
    saveId: entry.saveId,
    nickname: entry.nickname.trim(),
    totalScore: entry.totalScore,
    endingId: entry.endingId,
    updatedAt: entry.updatedAt,
  };

  await fetch(`${base}/leaderboard/${entryKey(entry.saveId)}.json`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function filterLeaderboardEntries(
  entries: LeaderboardEntry[],
  filter: EndingFilter,
): LeaderboardEntry[] {
  if (filter === "all") return entries;
  return entries.filter((e) => e.endingId === filter);
}

export function paginateLeaderboardEntries(
  entries: LeaderboardEntry[],
  page: number,
): { page: number; totalPages: number; slice: LeaderboardEntry[] } {
  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  return {
    page: safePage,
    totalPages,
    slice: entries.slice(start, start + PAGE_SIZE),
  };
}

export const LEADERBOARD_PAGE_SIZE = PAGE_SIZE;

export const ENDING_FILTER_OPTIONS: { value: EndingFilter; label: string }[] = [
  { value: "all", label: "全部結局" },
  { value: "true", label: endingLabel("true") },
  { value: "basic", label: endingLabel("basic") },
  { value: "stuck", label: endingLabel("stuck") },
  { value: "loop", label: endingLabel("loop") },
];

export { endingLabel };
