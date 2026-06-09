"use client";

import Image from "next/image";
import { useEffect } from "react";
import { TOKEN_IMAGE } from "@/lib/collectibles/backpackLayout";
import { useCollectibleStore } from "@/store/collectibleStore";
import { useTokenStore } from "@/store/tokenStore";

const TOKEN_NAME = "遊戲代幣";
const TOKEN_DESCRIPTION =
  "夜市攤位的通用代幣，可用來遊玩射氣球、套圈圈、彈珠台與撈金魚等小遊戲。";

type TokenDisplayProps = {
  /** 攤位遊戲內僅顯示數量，不可點擊查看說明 */
  inspectable?: boolean;
};

export default function TokenDisplay({ inspectable = true }: TokenDisplayProps) {
  const hydrate = useTokenStore((s) => s.hydrate);
  const hydrated = useTokenStore((s) => s.hydrated);
  const tokens = useTokenStore((s) => s.tokens);
  const showInspectAnimation = useCollectibleStore((s) => s.showInspectAnimation);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  if (!hydrated) return null;

  const content = (
    <>
      <Image
        src={TOKEN_IMAGE}
        alt=""
        width={22}
        height={22}
        className="token-display__icon"
        unoptimized
      />
      {tokens}
    </>
  );

  if (!inspectable) {
    return (
      <span
        className="token-display text-xs tabular-nums"
        data-token-display-target
        aria-label={`${TOKEN_NAME} ${tokens}`}
      >
        {content}
      </span>
    );
  }

  return (
    <button
      type="button"
      className="token-display game-btn-ghost hub-header-action text-xs tabular-nums"
      data-token-display-target
      aria-label={`${TOKEN_NAME} ${tokens}`}
      onClick={() =>
        showInspectAnimation({
          itemName: TOKEN_NAME,
          image: TOKEN_IMAGE,
          description: TOKEN_DESCRIPTION,
        })
      }
    >
      {content}
    </button>
  );
}
