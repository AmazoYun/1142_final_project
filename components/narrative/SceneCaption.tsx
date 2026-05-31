"use client";

import { useNarrativeStore } from "@/store/narrativeStore";

type Props = {
  id: string;
  text: string;
  onDismiss?: () => void;
};

export default function SceneCaption({ id, text, onDismiss }: Props) {
  const editMode = useNarrativeStore((s) => s.editMode);
  const getText = useNarrativeStore((s) => s.getText);
  const setOverride = useNarrativeStore((s) => s.setOverride);
  const display = getText(id, text);

  return (
    <div
      className="game-caption mx-auto max-w-xl text-center"
      onClick={onDismiss}
      role={onDismiss ? "button" : undefined}
      tabIndex={onDismiss ? 0 : undefined}
      onKeyDown={(e) => {
        if (!onDismiss) return;
        if (e.key === "Enter" || e.code === "Space") {
          e.preventDefault();
          onDismiss();
        }
      }}
    >
      <div className="flex items-center justify-center gap-2 mb-1">
        {editMode && (
          <button
            type="button"
            className="game-btn-ghost text-[10px] px-2 py-0.5"
            onClick={(e) => {
              e.stopPropagation();
              const next = window.prompt("編輯說明", display);
              if (next != null) setOverride(id, next);
            }}
          >
            編輯
          </button>
        )}
      </div>
      <p className="game-dialog-text leading-relaxed">{display}</p>
      {onDismiss && (
        <p className="game-dialog-hint mt-2">點擊或按空白鍵繼續</p>
      )}
    </div>
  );
}
