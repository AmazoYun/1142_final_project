"use client";

import Link from "next/link";

type Props = {
  onCancel: () => void;
  onLeave: () => void;
};

export default function LeaveMarketModal({ onCancel, onLeave }: Props) {
  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center pb-28 px-4 bg-black/40">
      <div className="w-full max-w-lg game-overlay-panel p-5 space-y-4">
        <p className="text-sm leading-relaxed">
          前面好像就是夜市的出口了。背包裡的戰利品還在，要現在離開嗎？
        </p>
        <div className="flex justify-end gap-3">
          <button type="button" className="game-btn-ghost text-sm" onClick={onCancel}>
            再逛逛
          </button>
          <Link href="/ending" className="game-btn-primary text-sm" onClick={onLeave}>
            離開夜市
          </Link>
        </div>
      </div>
    </div>
  );
}
