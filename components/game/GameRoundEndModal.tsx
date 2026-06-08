"use client";

import ScoreBoardPanel from "@/components/ui/ScoreBoardPanel";
import ScoreBoardWoodButton from "@/components/ui/ScoreBoardWoodButton";
import { PLAY_COST } from "@/lib/economy/constants";

type Props = {
  open: boolean;
  score: number;
  lotteryYuan: number;
  tokens: number;
  onPlayAgain: () => void;
  onReturnToMarket: () => void;
};

export default function GameRoundEndModal({
  open,
  score,
  lotteryYuan,
  tokens,
  onPlayAgain,
  onReturnToMarket,
}: Props) {
  if (!open) return null;

  const canReplay = tokens >= PLAY_COST;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
      <ScoreBoardPanel variant="modal" className="w-full max-w-md text-center">
        <div className="space-y-5">
          <p className="score-board-panel__body tracking-wide">
            本次得分為 <span className="font-bold tabular-nums">{score}</span>，已將分數換算為彩票{" "}
            <span className="font-bold tabular-nums">{lotteryYuan}</span> 元
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <ScoreBoardWoodButton disabled={!canReplay} onClick={onPlayAgain}>
              再玩一次（{PLAY_COST}代幣）
            </ScoreBoardWoodButton>
            <ScoreBoardWoodButton muted onClick={onReturnToMarket}>
              返回夜市
            </ScoreBoardWoodButton>
          </div>
          {!canReplay ? (
            <p className="text-center text-xs opacity-70 text-[#f5eed8]">
              代幣不足（目前 {tokens} 代幣）
            </p>
          ) : null}
        </div>
      </ScoreBoardPanel>
    </div>
  );
}
