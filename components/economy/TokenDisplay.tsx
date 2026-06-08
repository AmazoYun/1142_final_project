"use client";

import Image from "next/image";
import { useEffect } from "react";
import { TOKEN_IMAGE } from "@/lib/collectibles/backpackLayout";
import { useCollectibleStore } from "@/store/collectibleStore";
import { useTokenStore } from "@/store/tokenStore";

const TOKEN_NAME = "遊戲代幣";
const TOKEN_DESCRIPTION =
  "夜市攤位的通用代幣，可用來遊玩射氣球、套圈圈、彈珠台與撈金魚等小遊戲。";

export default function TokenDisplay() {
  const hydrate = useTokenStore((s) => s.hydrate);
  const hydrated = useTokenStore((s) => s.hydrated);
  const tokens = useTokenStore((s) => s.tokens);
  const showInspectAnimation = useCollectibleStore((s) => s.showInspectAnimation);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  if (!hydrated) return null;

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
      <Image
        src={TOKEN_IMAGE}
        alt=""
        width={22}
        height={22}
        className="token-display__icon"
        unoptimized
      />
      {tokens}
    </button>
  );
}
