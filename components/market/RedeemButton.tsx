"use client";

import { tryRedeemPrize } from "@/lib/collectibles/redeemPrize";
import { useCollectibleStore } from "@/store/collectibleStore";

export default function RedeemButton() {
  const hasCard = useCollectibleStore((s) => s.hasAcquired("point-card"));
  const notice = useCollectibleStore((s) => s.redeemNotice);
  const setNotice = useCollectibleStore((s) => s.setRedeemNotice);

  if (!hasCard) return null;

  const handleClick = () => {
    const result = tryRedeemPrize();
    if (!result.ok) {
      if (result.reason === "not_qualified") {
        setNotice("您還未達成兌獎資格");
        window.setTimeout(() => setNotice(null), 2200);
      }
      return;
    }
    if (!result.result.success) {
      return;
    }
  };

  return (
    <div className="relative">
      <button type="button" className="game-btn-ghost text-xs" onClick={handleClick}>
        兌獎
      </button>
      {notice ? (
        <div className="redeem-notice absolute top-full right-0 mt-2 whitespace-nowrap z-50" role="status">
          {notice}
        </div>
      ) : null}
    </div>
  );
}
