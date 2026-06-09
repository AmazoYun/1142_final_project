"use client";

import HomeModalShell from "@/components/home/HomeModalShell";
import { endingsDefault } from "@/data/endings-default";
import type { EndingId } from "@/lib/endings/types";
import { collectObtainedEndingIds } from "@/lib/endings/obtainedEndings";
import type { SaveRecord } from "@/lib/player/saveTypes";

const ENDING_ORDER: EndingId[] = ["basic", "loop", "stuck", "true"];

type Props = {
  open: boolean;
  onClose: () => void;
  onSelectEnding: (id: EndingId) => void;
  seenEndingIds: readonly string[];
  saves: readonly SaveRecord[];
};

export default function EndingSelectModal({
  open,
  onClose,
  onSelectEnding,
  seenEndingIds,
  saves,
}: Props) {
  if (!open) return null;

  const obtainedEndingIds = collectObtainedEndingIds(seenEndingIds, saves);

  return (
    <HomeModalShell className="w-full max-w-md">
      <div className="home-modal__header space-y-2">
        <h2 className="game-title text-center text-lg">觀看結局</h2>
        <p className="home-modal__subtitle text-center">選擇要觀看的結局劇情</p>
      </div>

      <div className="space-y-2">
        {ENDING_ORDER.map((id) => {
          const ending = endingsDefault.endings[id];
          const obtained = obtainedEndingIds.has(id);
          return (
            <button
              key={id}
              type="button"
              className="home-modal__option home-modal__option--row w-full text-left"
              onClick={() => onSelectEnding(id)}
            >
              <span className="home-modal__option-title">{ending.title}</span>
              {obtained ? (
                <span className="home-modal__option-badge">已取得</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="home-modal__actions">
        <button type="button" className="game-btn-ghost" onClick={onClose}>
          取消
        </button>
      </div>
    </HomeModalShell>
  );
}
