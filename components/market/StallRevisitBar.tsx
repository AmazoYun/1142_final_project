"use client";

import { useRouter } from "next/navigation";
import { narrativeDefault } from "@/data/narrative-default";
import { navigateWithFade } from "@/lib/navigation/navigateWithFade";
import type { StallId } from "@/lib/narrative/types";

type Props = {
  stallId: StallId;
};

/** 已看過劇情的攤位：靠近時於右上角顯示快捷進入，不遮擋角色 */
export default function StallRevisitBar({ stallId }: Props) {
  const router = useRouter();
  const script = narrativeDefault.stalls[stallId];

  return (
    <div className="hub-revisit-bar pointer-events-none fixed top-14 right-3 z-40 sm:top-16 sm:right-4">
      <div className="pointer-events-auto game-panel flex max-w-[min(100vw-1.5rem,20rem)] flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:gap-3">
        <p className="text-xs sm:text-sm tracking-widest shrink-0">{script.title}</p>
        <button
          type="button"
          className="game-btn-primary w-full text-xs sm:w-auto sm:min-w-[120px] sm:text-sm"
          data-ui-sound="enter"
          onClick={() => void navigateWithFade(router, script.href)}
        >
          {script.enterLabel}
        </button>
      </div>
    </div>
  );
}
