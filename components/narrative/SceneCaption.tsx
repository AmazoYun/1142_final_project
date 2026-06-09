"use client";

import ScoreBoardPanel from "@/components/ui/ScoreBoardPanel";
import { useNarrativeStore } from "@/store/narrativeStore";

type Props = {
  id: string;
  text: string;
  showHint?: boolean;
};

export default function SceneCaption({ id, text, showHint = true }: Props) {
  const getText = useNarrativeStore((s) => s.getText);
  const display = getText(id, text);

  return (
    <ScoreBoardPanel variant="caption" className="mx-auto max-w-xl text-center">
      <p className="game-dialog-text leading-relaxed">{display}</p>
      {showHint && (
        <p className="game-dialog-hint mt-2">點擊任意處或按空白鍵繼續</p>
      )}
    </ScoreBoardPanel>
  );
}
