"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PLAY_COST } from "@/lib/economy/constants";
import { canAffordPlayCost, trySpendPlayCost } from "@/lib/economy/playGame";
import { navigateWithFade } from "@/lib/navigation/navigateWithFade";
import { saveHubPlayerPosition } from "@/lib/market/hubPlayerPosition";
import type { StallIntroScript } from "@/lib/narrative/types";
import ScoreBoardPanel from "@/components/ui/ScoreBoardPanel";
import ScoreBoardWoodButton from "@/components/ui/ScoreBoardWoodButton";
import { useTokenStore } from "@/store/tokenStore";

type Props = {
  script: StallIntroScript;
  playerX: number;
  worldWidth: number;
  onClose: () => void;
};

/** 點擊「進入遊戲」後顯示玩法，再 fade 進入遊戲 */
export default function StallHowToModal({ script, playerX, worldWidth, onClose }: Props) {
  const router = useRouter();
  const hydrate = useTokenStore((s) => s.hydrate);
  const tokens = useTokenStore((s) => s.tokens);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const canStart = canAffordPlayCost();

  const startGame = () => {
    if (!trySpendPlayCost()) return;
    saveHubPlayerPosition(playerX, worldWidth);
    void navigateWithFade(router, script.href);
  };

  return (
    <div className="fixed inset-0 z-[60] hub-shell flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 hub-world-sky opacity-95" />
      <ScoreBoardPanel variant="modal" className="relative max-w-lg w-full">
        <div className="space-y-4">
          <h2 className="score-board-panel__title">{script.title}</h2>
          <div className="score-board-panel__body stall-how-to space-y-3">
            {script.howToPlay.map((section) => (
              <section key={section.title}>
                <h3 className="stall-how-to__heading">{section.title}</h3>
                <ul className="stall-how-to__list">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <div className="flex gap-3 justify-center">
            <ScoreBoardWoodButton muted onClick={onClose}>
              返回夜市
            </ScoreBoardWoodButton>
            <ScoreBoardWoodButton onClick={startGame} disabled={!canStart}>
              開始遊戲（{PLAY_COST}代幣）
            </ScoreBoardWoodButton>
          </div>
          {!canStart ? (
            <p className="text-center text-xs opacity-70 text-[#f5eed8]">代幣不足（目前 {tokens} 代幣）</p>
          ) : null}
        </div>
      </ScoreBoardPanel>
    </div>
  );
}
