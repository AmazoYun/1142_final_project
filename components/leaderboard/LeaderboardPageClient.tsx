"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ENDING_FILTER_OPTIONS,
  endingLabel,
  fetchLeaderboardEntries,
  filterLeaderboardEntries,
  isLeaderboardConfigured,
  paginateLeaderboardEntries,
  type EndingFilter,
  type LeaderboardEntry,
} from "@/lib/firebase/leaderboard";
import { usePageFadeIn } from "@/lib/navigation/usePageFadeIn";

export default function LeaderboardPageClient() {
  usePageFadeIn();

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [filter, setFilter] = useState<EndingFilter>("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchLeaderboardEntries();
      setEntries(rows);
    } catch {
      setError("排行榜載入失敗，請稍後再試。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  const filtered = useMemo(
    () => filterLeaderboardEntries(entries, filter),
    [entries, filter],
  );

  const { page: safePage, totalPages, slice } = useMemo(
    () => paginateLeaderboardEntries(filtered, page),
    [filtered, page],
  );

  return (
    <div className="leaderboard-page min-h-screen flex flex-col">
      <header className="game-header shrink-0 flex items-center justify-between px-4 py-3">
        <Link href="/" className="game-btn-ghost text-xs">
          ← 返回主畫面
        </Link>
        <h1 className="game-title text-sm sm:text-base">排行榜</h1>
        <div className="w-[72px]" />
      </header>

      <main className="flex-1 px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-2xl space-y-5">
          {!isLeaderboardConfigured() ? (
            <p className="text-center text-sm opacity-70 py-8">
              尚未設定 Firebase Database URL（NEXT_PUBLIC_FIREBASE_DATABASE_URL）
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="ending-filter" className="text-sm opacity-70">
              結局篩選
            </label>
            <select
              id="ending-filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value as EndingFilter)}
              className="px-3 py-2 bg-paper border-2 border-ink text-ink text-sm"
            >
              {ENDING_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <p className="text-center text-sm opacity-60 py-10">載入中…</p>
          ) : error ? (
            <p className="text-center text-sm text-red-300 py-10">{error}</p>
          ) : slice.length === 0 ? (
            <p className="text-center text-sm opacity-60 py-10">尚無紀錄</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-ink/20 text-left">
                    <th className="py-2 pr-3 font-normal opacity-70">#</th>
                    <th className="py-2 pr-3 font-normal opacity-70">玩家</th>
                    <th className="py-2 pr-3 font-normal opacity-70">分數</th>
                    <th className="py-2 font-normal opacity-70">結局</th>
                  </tr>
                </thead>
                <tbody>
                  {slice.map((row, index) => (
                    <tr key={row.id} className="border-b border-ink/10 last:border-0">
                      <td className="py-2 pr-3 tabular-nums opacity-70">
                        {(safePage - 1) * 10 + index + 1}
                      </td>
                      <td className="py-2 pr-3">{row.nickname}</td>
                      <td className="py-2 pr-3 tabular-nums">{row.totalScore}</td>
                      <td className="py-2">{endingLabel(row.endingId)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              className="game-btn-ghost text-sm"
              disabled={safePage <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              上一頁
            </button>
            <span className="text-xs opacity-70 tabular-nums">
              第 {safePage} / {totalPages} 頁
            </span>
            <button
              type="button"
              className="game-btn-ghost text-sm"
              disabled={safePage >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              下一頁
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
