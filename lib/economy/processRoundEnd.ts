"use client";

import { scoreToLotteryYuan, scoreToTicket10Count } from "@/lib/economy/scoreToLottery";
import { useTokenStore } from "@/store/tokenStore";

export type RoundEndSummary = {
  score: number;
  lotteryYuan: number;
  ticket10Earned: number;
};

/** 回合結束：換算彩票並入帳 */
export function finalizeGameRound(score: number): RoundEndSummary {
  const state = useTokenStore.getState();
  if (!state.hydrated) state.hydrate();

  const lotteryYuan = scoreToLotteryYuan(score);
  const ticket10Earned = scoreToTicket10Count(score);
  if (ticket10Earned > 0) {
    state.addTickets("ticket10", ticket10Earned);
  }

  return { score, lotteryYuan, ticket10Earned };
}
