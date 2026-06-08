"use client";

import { useRouter } from "next/navigation";
import ScoreBoardPanel from "@/components/ui/ScoreBoardPanel";
import ScoreBoardWoodButton from "@/components/ui/ScoreBoardWoodButton";
import { navigateWithFade } from "@/lib/navigation/navigateWithFade";

type Props = {
  onCancel: () => void;
  onLeave: () => void;
};

export default function LeaveMarketModal({ onCancel, onLeave }: Props) {
  const router = useRouter();

  const handleLeave = () => {
    onLeave();
    void navigateWithFade(router, "/ending");
  };

  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center pb-28 px-4 bg-black/40">
      <ScoreBoardPanel variant="modal" className="w-full max-w-lg">
        <div className="space-y-4">
          <p className="score-board-panel__body">
            前面好像就是夜市的出口了。四個遊戲都至少玩過一輪了，要現在離開嗎？
          </p>
          <div className="flex justify-end gap-3">
            <ScoreBoardWoodButton muted onClick={onCancel}>
              再逛逛
            </ScoreBoardWoodButton>
            <ScoreBoardWoodButton onClick={handleLeave}>
              離開夜市
            </ScoreBoardWoodButton>
          </div>
        </div>
      </ScoreBoardPanel>
    </div>
  );
}
