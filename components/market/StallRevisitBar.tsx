"use client";

import { useRouter } from "next/navigation";
import { narrativeDefault } from "@/data/narrative-default";
import type { StallId } from "@/lib/narrative/types";

type Props = {
  stallId: StallId;
};

/** 已看過劇情的攤位：靠近時顯示快捷進入 */
export default function StallRevisitBar({ stallId }: Props) {
  const router = useRouter();
  const script = narrativeDefault.stalls[stallId];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none px-4 pb-5 pt-10 bg-gradient-to-t from-black/95 via-black/80 to-transparent">
      <div className="pointer-events-auto mx-auto flex max-w-lg flex-col items-center gap-3">
        <p className="text-sm font-medium text-amber-100/90">{script.title}</p>
        <button
          type="button"
          className="game-btn-primary min-w-[160px]"
          onClick={() => router.push(script.href)}
        >
          {script.enterLabel}
        </button>
      </div>
    </div>
  );
}
