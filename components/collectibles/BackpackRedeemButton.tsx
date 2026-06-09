"use client";

import { tryRedeemPrize } from "@/lib/collectibles/redeemPrize";
import {
  BACKPACK_REDEEM_BUTTON,
  type CoverRect,
  slotStyleInCover,
} from "@/lib/collectibles/backpackLayout";
import { useCollectibleStore } from "@/store/collectibleStore";

type Props = {
  cover: CoverRect;
};

function toAbsoluteStyle(box: { left: number; top: number; width: number; height: number }) {
  return {
    left: `${box.left}px`,
    top: `${box.top}px`,
    width: `${box.width}px`,
    height: `${box.height}px`,
  };
}

export default function BackpackRedeemButton({ cover }: Props) {
  const hasCard = useCollectibleStore((s) => s.acquired.includes("point-card"));
  const hasRedeemed = useCollectibleStore((s) => s.acquired.includes("plastic-mask"));
  const selectedId = useCollectibleStore((s) => s.selectedId);
  const notice = useCollectibleStore((s) => s.redeemNotice);
  const setNotice = useCollectibleStore((s) => s.setRedeemNotice);

  if (!hasCard || hasRedeemed || selectedId !== "point-card") return null;

  const handleClick = () => {
    const result = tryRedeemPrize();
    if (!result.ok) {
      if (result.reason === "not_qualified") {
        setNotice("您還未達成兌獎資格");
        window.setTimeout(() => setNotice(null), 2200);
      }
      return;
    }
    if (!result.result.success) return;
  };

  const box = slotStyleInCover(BACKPACK_REDEEM_BUTTON, cover);

  return (
    <>
      <button
        type="button"
        className="backpack-redeem-btn absolute"
        style={toAbsoluteStyle(box)}
        onClick={handleClick}
      >
        兌獎
      </button>
      {notice ? (
        <div
          className="backpack-redeem-notice absolute z-20"
          style={{
            left: `${box.left}px`,
            top: `${box.top + box.height + 6}px`,
            width: `${Math.max(box.width, 160)}px`,
          }}
          role="status"
        >
          {notice}
        </div>
      ) : null}
    </>
  );
}
