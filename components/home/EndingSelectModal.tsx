"use client";

import HomeModalShell from "@/components/home/HomeModalShell";
import { endingsDefault } from "@/data/endings-default";
import type { EndingId } from "@/lib/endings/types";

const ENDING_ORDER: EndingId[] = ["basic", "loop", "stuck", "true"];

type Props = {
  open: boolean;
  onClose: () => void;
  onSelectEnding: (id: EndingId) => void;
};

export default function EndingSelectModal({ open, onClose, onSelectEnding }: Props) {
  if (!open) return null;

  return (
    <HomeModalShell className="w-full max-w-md">
      <div className="home-modal__header space-y-2">
        <h2 className="game-title text-center text-lg">觀看結局</h2>
        <p className="home-modal__subtitle text-center">選擇要觀看的結局劇情</p>
      </div>

      <div className="space-y-2">
        {ENDING_ORDER.map((id) => {
          const ending = endingsDefault.endings[id];
          return (
            <button
              key={id}
              type="button"
              className="home-modal__option w-full text-left"
              onClick={() => onSelectEnding(id)}
            >
              <span className="home-modal__option-title">{ending.title}</span>
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
