import type { PendingAcquireAnimation, PendingAcquireDialogue } from "@/lib/collectibles/types";

export const ACQUIRE_OVERLAY_Z_INDEX = 120;
export const ACQUIRE_DIALOGUE_Z_INDEX = 200;

export function isAcquireSequenceBlocking(
  pendingAcquireDialogue: PendingAcquireDialogue | null,
  pendingAcquireAnimation: PendingAcquireAnimation | null,
): boolean {
  return (
    pendingAcquireDialogue !== null ||
    pendingAcquireAnimation?.mode === "acquire"
  );
}
