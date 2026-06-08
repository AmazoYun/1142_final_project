import { LOTTERY_YUAN_PER_BLOCK, SCORE_PER_LOTTERY_BLOCK } from "./constants";

/** 每 100 分可兌換 10 元彩票（以 10 元券 1 張表示） */
export function scoreToLotteryYuan(score: number): number {
  return Math.floor(score / SCORE_PER_LOTTERY_BLOCK) * LOTTERY_YUAN_PER_BLOCK;
}

export function scoreToTicket10Count(score: number): number {
  return Math.floor(score / SCORE_PER_LOTTERY_BLOCK);
}
