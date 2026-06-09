"use client";

import ScoreBoardPanel from "@/components/ui/ScoreBoardPanel";
import ScoreBoardWoodButton from "@/components/ui/ScoreBoardWoodButton";

type Props = {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function GameExitConfirmModal({ open, onConfirm, onCancel }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <ScoreBoardPanel variant="modal" className="w-full max-w-md text-center">
        <div className="space-y-5">
          <p className="score-board-panel__body leading-relaxed tracking-wide">
            此操作無法退還代幣，也無法獲取分數，確定繼續？
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <ScoreBoardWoodButton muted onClick={onCancel}>
              取消
            </ScoreBoardWoodButton>
            <ScoreBoardWoodButton onClick={onConfirm}>確定繼續</ScoreBoardWoodButton>
          </div>
        </div>
      </ScoreBoardPanel>
    </div>
  );
}
