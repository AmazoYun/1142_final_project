import { PLAYER_FLOOR_RATIO, STALL_ASPECT, type HubMetrics } from "@/lib/market/hubLayout";

/** 角色上一層：全幅前景遮罩 */
export const HUB_BACKGROUND_FRONT =
  "/final_pic/front_and_shadow/background_front.webp";

export const HUB_SHADOW_IMAGES = [
  "/final_pic/front_and_shadow/shadow_1.webp",
  "/final_pic/front_and_shadow/shadow_2.webp",
  "/final_pic/front_and_shadow/shadow_3.webp",
] as const;

/** 高於玩家 (150)、低於陰影 */
export const HUB_FRONT_LAYER_Z_INDEX = 152;
/** 世界座標內最上層（不攔截點擊） */
export const HUB_SHADOW_LAYER_Z_INDEX = 160;
/** 編輯模式：高於按鈕層，確保可點選拖曳 */
export const HUB_SHADOW_EDITOR_Z_INDEX = 175;

const REF_SCENE_HEIGHT = 540;
/** 陰影底部略低於角色腳底（540p 基準 px） */
const SHADOW_BASE_OFFSET_Y = 36;
/** 全體下移（540p 基準 px） */
const SHADOW_EXTRA_DROP_Y = 200;
/** 尺寸放大倍率 */
const SHADOW_SCALE_MULTIPLIER = 1.5;

export type HubShadowPlacement = {
  id: string;
  image: (typeof HUB_SHADOW_IMAGES)[number];
  /** 群組中心（世界寬度比例） */
  worldRatio: number;
  /** 群組內水平偏移（世界寬度比例） */
  worldJitter: number;
  /** 相對腳底的額外下移比例；越大越低 */
  floorOffset: number;
  scale: number;
};

/**
 * 多處聚集的陰影群：每群 2–3 個，水平略為錯開、高低不一。
 */
export const HUB_SHADOW_PLACEMENTS: HubShadowPlacement[] = [
  // 左側群
  {
    id: "shadow-L0",
    image: HUB_SHADOW_IMAGES[0],
    worldRatio: 0.17,
    worldJitter: -0.006,
    floorOffset: 0,
    scale: 0.84,
  },
  {
    id: "shadow-L1",
    image: HUB_SHADOW_IMAGES[1],
    worldRatio: 0.17,
    worldJitter: 0.005,
    floorOffset: 0.038,
    scale: 0.9,
  },
  {
    id: "shadow-L2",
    image: HUB_SHADOW_IMAGES[2],
    worldRatio: 0.17,
    worldJitter: 0.001,
    floorOffset: 0.072,
    scale: 0.8,
  },
  // 左中群
  {
    id: "shadow-M0",
    image: HUB_SHADOW_IMAGES[2],
    worldRatio: 0.34,
    worldJitter: -0.005,
    floorOffset: 0.012,
    scale: 0.86,
  },
  {
    id: "shadow-M1",
    image: HUB_SHADOW_IMAGES[0],
    worldRatio: 0.34,
    worldJitter: 0.004,
    floorOffset: 0.048,
    scale: 0.92,
  },
  {
    id: "shadow-M2",
    image: HUB_SHADOW_IMAGES[1],
    worldRatio: 0.34,
    worldJitter: 0.009,
    floorOffset: 0.085,
    scale: 0.78,
  },
  // 中央群
  {
    id: "shadow-C0",
    image: HUB_SHADOW_IMAGES[1],
    worldRatio: 0.52,
    worldJitter: -0.007,
    floorOffset: 0.005,
    scale: 0.88,
  },
  {
    id: "shadow-C1",
    image: HUB_SHADOW_IMAGES[0],
    worldRatio: 0.52,
    worldJitter: 0.002,
    floorOffset: 0.042,
    scale: 0.94,
  },
  {
    id: "shadow-C2",
    image: HUB_SHADOW_IMAGES[2],
    worldRatio: 0.52,
    worldJitter: 0.008,
    floorOffset: 0.078,
    scale: 0.82,
  },
  // 右中群
  {
    id: "shadow-R0",
    image: HUB_SHADOW_IMAGES[0],
    worldRatio: 0.7,
    worldJitter: -0.004,
    floorOffset: 0.018,
    scale: 0.87,
  },
  {
    id: "shadow-R1",
    image: HUB_SHADOW_IMAGES[2],
    worldRatio: 0.7,
    worldJitter: 0.006,
    floorOffset: 0.055,
    scale: 0.91,
  },
  // 右側群
  {
    id: "shadow-R2",
    image: HUB_SHADOW_IMAGES[1],
    worldRatio: 0.87,
    worldJitter: -0.005,
    floorOffset: 0.01,
    scale: 0.85,
  },
  {
    id: "shadow-R3",
    image: HUB_SHADOW_IMAGES[0],
    worldRatio: 0.87,
    worldJitter: 0.003,
    floorOffset: 0.046,
    scale: 0.89,
  },
  {
    id: "shadow-R4",
    image: HUB_SHADOW_IMAGES[2],
    worldRatio: 0.87,
    worldJitter: 0.01,
    floorOffset: 0.09,
    scale: 0.76,
  },
];

export type LayerDimensions = { width: number; height: number };

export function shadowWorldX(placement: HubShadowPlacement, metrics: HubMetrics) {
  return (placement.worldRatio + placement.worldJitter) * metrics.worldWidth;
}

export function shadowTop(placement: HubShadowPlacement, metrics: HubMetrics) {
  const refScale = metrics.worldHeight / REF_SCENE_HEIGHT;
  const offsetY = SHADOW_BASE_OFFSET_Y * refScale;
  const extraDrop = SHADOW_EXTRA_DROP_Y * refScale;
  const extraLow = placement.floorOffset * metrics.worldHeight;
  return (
    metrics.worldHeight * PLAYER_FLOOR_RATIO +
    offsetY +
    extraDrop +
    extraLow
  );
}

export function shadowDimensions(
  placement: HubShadowPlacement,
  metrics: HubMetrics,
): LayerDimensions {
  const height = Math.round(
    metrics.baseStallHeight * placement.scale * SHADOW_SCALE_MULTIPLIER,
  );
  const width = Math.round(height * STALL_ASPECT);
  return { width, height };
}

export { PLAYER_FLOOR_RATIO };
