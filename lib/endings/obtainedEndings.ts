import type { EndingId } from "@/lib/endings/types";
import type { SaveRecord } from "@/lib/player/saveTypes";

const ENDING_IDS: EndingId[] = ["basic", "loop", "stuck", "true"];

function isEndingId(id: string): id is EndingId {
  return ENDING_IDS.includes(id as EndingId);
}

/** 合併帳號層級與各存檔紀錄，取得玩家已獲得的結局 */
export function collectObtainedEndingIds(
  seenEndingIds: readonly string[],
  saves: readonly SaveRecord[],
): Set<EndingId> {
  const ids = new Set<EndingId>();
  for (const id of seenEndingIds) {
    if (isEndingId(id)) ids.add(id);
  }
  for (const save of saves) {
    if (save.endingId) ids.add(save.endingId);
  }
  return ids;
}
