"use client";

import HomeModalShell from "@/components/home/HomeModalShell";
import { canEnterSave, formatEndingStatus, formatSaveProgress } from "@/lib/player/saveProgress";
import { endingLabel, type SaveRecord } from "@/store/playerStore";

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
  if (!open) return null;

  const sorted = [...saves].sort((a, b) => a.createdAt - b.createdAt);

  return (
    <HomeModalShell className="save-list-modal w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="home-modal__header save-list-modal__header space-y-1 text-center shrink-0">
          <h2 className="game-title text-lg">{title}</h2>
          <p className="home-modal__subtitle text-sm">玩家：{nickname}</p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
          {sorted.length === 0 ? (
            <p className="save-list-modal__empty text-sm text-center py-6">尚無存檔紀錄</p>
          ) : (
            sorted.map((save, index) => {
              const enterable = canEnterSave(save.endingId, save.isActive);
              const clickable = mode === "play" && enterable && onSelectSave;

              return (
                <button
                  key={save.saveId}
                  type="button"
                  disabled={!clickable}
                  className={`save-list-modal__card w-full text-left p-4 space-y-2 transition-colors ${
                    clickable ? "save-list-modal__card--active" : "save-list-modal__card--inactive"
                  }`}
                  onClick={clickable ? () => onSelectSave(save.saveId) : undefined}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="save-list-modal__card-title text-sm font-bold tracking-widest">
                      存檔 {index + 1}
                    </span>
                    <span className="save-list-modal__date text-xs tabular-nums">{formatSaveDate(save.updatedAt)}</span>
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
                  {mode === "play" && save.endingId ? (
                    <p className="save-list-modal__hint text-xs">此存檔已結束，無法繼續遊玩</p>
                  ) : null}
                </button>
              );
            })
          )}
        </div>

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
