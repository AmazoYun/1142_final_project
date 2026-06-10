"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import GameBackpackButton from "@/components/collectibles/GameBackpackButton";
import TokenDisplay from "@/components/economy/TokenDisplay";
import GameExitConfirmModal from "@/components/game/GameExitConfirmModal";
import { useGameRoundActiveOptional } from "@/components/game/GameRoundActiveContext";
import { navigateToMarketFromGame } from "@/lib/economy/returnToMarket";
import { useGameExitGuard } from "@/lib/navigation/useGameExitGuard";
import { useMobilePlay } from "@/lib/navigation/mobilePlay";

type Props = {
  title: string;
  backpack?: ReactNode;
  onBack?: () => void;
};

/** 攤位遊戲頂欄：返回、標題、代幣與道具（與主 hub 右上角對齊） */
export default function GamePageHeader({ title, backpack, onBack }: Props) {
  const router = useRouter();
  const roundCtx = useGameRoundActiveOptional();
  const roundActive = roundCtx?.roundActive ?? false;
  const { confirmOpen, requestExit, confirmExit, cancelExit } = useGameExitGuard(roundActive);
  const { showMobileControls } = useMobilePlay();

  const leaveGame = onBack ?? (() => void navigateToMarketFromGame(router));

  return (
    <>
      <header
        className={`game-header shrink-0 flex items-center justify-between${showMobileControls ? " game-header--compact" : ""}`}
      >
        <button
          type="button"
          className="game-header__back text-xs tracking-widest text-foreground/70 uppercase hover:text-foreground transition-colors"
          onClick={() => requestExit(leaveGame)}
        >
          ← 返回夜市
        </button>
        <h1 className="game-header__title game-title text-sm sm:text-base">
          {title}
        </h1>
        <div className="game-header__tools relative flex gap-2 items-center shrink-0">
          <TokenDisplay inspectable={false} />
          {backpack ?? <GameBackpackButton />}
        </div>
      </header>

      <GameExitConfirmModal
        open={confirmOpen}
        onConfirm={confirmExit}
        onCancel={cancelExit}
      />
    </>
  );
}
