"use client";

import { useState } from "react";
import { playCashSound } from "@/lib/market/hubSounds";
import type { LotteryTicketType } from "@/store/tokenStore";
import { useTokenStore } from "@/store/tokenStore";

type Props = {
  type: LotteryTicketType;
  count: number;
};

export default function BackpackLotteryExchange({ type, count }: Props) {
  const redeemTickets = useTokenStore((s) => s.redeemTickets);
  const [amount, setAmount] = useState(1);
  const faceValue = type === "ticket10" ? 10 : 50;

  const clamped = Math.min(Math.max(1, amount), count);

  return (
    <div className="backpack-lottery-exchange pointer-events-auto">
      <div className="backpack-lottery-exchange__stepper">
        <button
          type="button"
          className="backpack-lottery-exchange__btn backpack-lottery-exchange__btn--bound"
          onClick={() => setAmount(1)}
          disabled={count <= 0 || clamped <= 1}
          aria-label="選取最小數量"
        >
          MIN
        </button>
        <button
          type="button"
          className="backpack-lottery-exchange__btn"
          onClick={() => setAmount((v) => Math.max(1, v - 1))}
          disabled={clamped <= 1}
          aria-label="減少數量"
        >
          －
        </button>
        <span className="backpack-lottery-exchange__count tabular-nums">{clamped}</span>
        <button
          type="button"
          className="backpack-lottery-exchange__btn"
          onClick={() => setAmount((v) => Math.min(count, v + 1))}
          disabled={clamped >= count}
          aria-label="增加數量"
        >
          ＋
        </button>
        <button
          type="button"
          className="backpack-lottery-exchange__btn backpack-lottery-exchange__btn--bound"
          onClick={() => setAmount(count)}
          disabled={count <= 0 || clamped >= count}
          aria-label="選取最大數量"
        >
          MAX
        </button>
      </div>
      <button
        type="button"
        className="backpack-lottery-exchange__redeem"
        onClick={() => {
          if (redeemTickets(type, clamped)) {
            playCashSound();
            setAmount(1);
          }
        }}
      >
        兌換代幣（{clamped * faceValue}）
      </button>
    </div>
  );
}
