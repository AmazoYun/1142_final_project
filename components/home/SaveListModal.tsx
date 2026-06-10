"use client";

import { useEffect, useMemo, useState } from "react";
import HomeModalShell from "@/components/home/HomeModalShell";
import { canEnterSave, formatEndingStatus, formatSaveProgress } from "@/lib/player/saveProgress";
import { endingLabel, type SaveRecord } from "@/store/playerStore";

const SAVES_PER_PAGE = 4;

type Props = {
  open: boolean;
  title: string;
  nickname: string;
  saves: SaveRecord[];
  mode: "play" | "view";
  onClose: () => void;
  onSelectSave?: (saveId: string) => void;
  onNewSave?: () => void;
};

function formatSaveDate(ts: number) {
  return new Date(ts).toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SaveCard({
  save,
  displayIndex,
  mode,
  onSelectSave,
}: {
  save: SaveRecord;
  displayIndex: number;
  mode: "play" | "view";
  onSelectSave?: (saveId: string) => void;
}) {
  const enterable = canEnterSave(save.endingId);
  const clickable = enterable && !!onSelectSave;

  return (
    <button
      type="button"
      disabled={!clickable}
      className={`save-list-modal__card w-full text-left p-4 space-y-2 transition-colors ${
        clickable ? "save-list-modal__card--active" : "save-list-modal__card--inactive"
      }`}
      onClick={clickable ? () => onSelectSave(save.saveId) : undefined}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="save-list-modal__card-title text-sm font-bold tracking-widest">
          存檔 {displayIndex}
        </span>
        <span className="save-list-modal__date text-xs tabular-nums">
          {formatSaveDate(save.updatedAt)}
        </span>
      </div>
      <dl className="save-list-modal__meta grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-1.5 text-sm leading-relaxed">
        <dt>遊戲進度</dt>
        <dd>{formatSaveProgress(save.playHistory, save.endingId, save.isActive)}</dd>
        <dt>總分數</dt>
        <dd className="tabular-nums">{save.totalScore}</dd>
        <dt>結局</dt>
        <dd>
          {formatEndingStatus(save.endingId)}
          {save.endingId ? `（${endingLabel(save.endingId)}）` : ""}
        </dd>
      </dl>
      {save.endingId ? (
        <p className="save-list-modal__hint text-xs">此存檔已結束，無法繼續遊玩</p>
      ) : enterable && onSelectSave ? (
        <p className="save-list-modal__hint text-xs">點擊繼續遊玩</p>
      ) : null}
    </button>
  );
}

export default function SaveListModal({
  open,
  title,
  nickname,
  saves,
  mode,
  onClose,
  onSelectSave,
  onNewSave,
}: Props) {
  const [page, setPage] = useState(1);

  const sortedByCreated = useMemo(
    () => [...saves].sort((a, b) => a.createdAt - b.createdAt),
    [saves],
  );

  const resumableSaves = useMemo(
    () => [...saves].filter((save) => canEnterSave(save.endingId)).sort((a, b) => b.updatedAt - a.updatedAt),
    [saves],
  );

  const totalPages = Math.max(1, Math.ceil(sortedByCreated.length / SAVES_PER_PAGE));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (!open) return;
    setPage(1);
  }, [open, mode, saves.length]);

  if (!open) return null;

  const visibleSaves =
    mode === "play"
      ? resumableSaves
      : sortedByCreated.slice((safePage - 1) * SAVES_PER_PAGE, safePage * SAVES_PER_PAGE);

  return (
    <HomeModalShell className="save-list-modal w-full max-w-lg max-h-[85vh] flex flex-col">
      <div className="home-modal__header save-list-modal__header space-y-1 text-center shrink-0">
        <h2 className="game-title text-lg">{title}</h2>
        <p className="home-modal__subtitle text-sm">玩家：{nickname}</p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
        {visibleSaves.length === 0 ? (
          <p className="save-list-modal__empty text-sm text-center py-6">尚無存檔紀錄</p>
        ) : (
          visibleSaves.map((save) => {
            const displayIndex = sortedByCreated.findIndex((item) => item.saveId === save.saveId) + 1;
            return (
              <SaveCard
                key={save.saveId}
                save={save}
                displayIndex={displayIndex}
                mode={mode}
                onSelectSave={onSelectSave}
              />
            );
          })
        )}
      </div>

      {mode === "view" && sortedByCreated.length > SAVES_PER_PAGE ? (
        <div className="save-list-modal__pagination flex items-center justify-between gap-3 py-2 shrink-0">
          <button
            type="button"
            className="game-btn-ghost text-sm"
            disabled={safePage <= 1}
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
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            下一頁
          </button>
        </div>
      ) : null}

      <div className="home-modal__actions save-list-modal__actions shrink-0">
        <button type="button" className="game-btn-ghost" onClick={onClose}>
          {mode === "view" ? "關閉" : "取消"}
        </button>
        {mode === "play" && onNewSave ? (
          <button type="button" className="game-btn-primary" onClick={onNewSave}>
            開新存檔
          </button>
        ) : null}
      </div>
    </HomeModalShell>
  );
}
