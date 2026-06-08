"use client";

import ScoreBoardPanel from "@/components/ui/ScoreBoardPanel";
import { useNarrativeStore } from "@/store/narrativeStore";

type Props = {
  id: string;
  text: string;
  onDismiss?: () => void;
};

export default function SceneCaption({ id, text, onDismiss }: Props) {
  const getText = useNarrativeStore((s) => s.getText);
  const display = getText(id, text);

  return (
    <ScoreBoardPanel
      variant="caption"
      className="mx-auto max-w-xl text-center"
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
      <p className="game-dialog-text leading-relaxed">{display}</p>
      {onDismiss && (
        <p className="game-dialog-hint mt-2">點擊或按空白鍵繼續</p>
      )}
    </ScoreBoardPanel>
  );
}
