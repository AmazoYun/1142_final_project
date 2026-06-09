/**
 * =============================================================================
 * CollectibleDialogueHost — 全域「取得物品」對話顯示
 * =============================================================================
 *
 * 掛載於 app/layout.tsx，確保從 market / 小遊戲 / 背包任一頁面
 * 呼叫 acquireCollectible() 後，對話都能疊在最上層顯示。
 *
 * 訂閱 collectibleStore.pendingAcquireDialogue，逐句播放至結束。
 */

"use client";

import { useEffect } from "react";
import DialoguePanel from "@/components/narrative/DialoguePanel";
import { useStoryAdvance } from "@/lib/useStoryAdvance";
import { useCollectibleStore } from "@/store/collectibleStore";

export default function CollectibleDialogueHost() {
  const pending = useCollectibleStore((s) => s.pendingAcquireDialogue);
  const advance = useCollectibleStore((s) => s.advanceAcquireDialogue);
  const getDialogueText = useCollectibleStore((s) => s.getDialogueText);
  const hydrate = useCollectibleStore((s) => s.hydrate);
  const hydrated = useCollectibleStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  const line = pending ? pending.lines[pending.lineIndex] : null;

  useStoryAdvance(line ? advance : undefined, Boolean(line));

  if (!line) return null;

  return (
    <div className="collectible-dialogue-host fixed inset-0 flex items-end justify-center p-4 pb-8 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-2xl">
        <DialoguePanel
          id={line.id}
          speaker={line.speaker}
          text={getDialogueText(line.id, line.text)}
        />
      </div>
    </div>
  );
}
