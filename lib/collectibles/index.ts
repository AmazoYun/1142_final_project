/**
 * 收集系統公開 API — 外部頁面建議從此匯入。
 */
export { acquireCollectible, hasCollectible } from "./acquireItem";
export { awardStallReward } from "./awardStallReward";
export {
  AMBIENT_COLLECTIBLE_IDS,
  GAME_COLLECTIBLE_IDS,
  STALL_REWARD,
} from "./stallRewards";
export type {
  AcquireCollectibleResult,
  CollectibleId,
  CollectibleItemDef,
} from "./types";
