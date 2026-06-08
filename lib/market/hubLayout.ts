import type { StallId } from "@/lib/narrative/types";

export const HUB_BACKGROUND = "/final_pic/background_long.webp";

/** 長背景原圖尺寸（11811 × 1417） */
export const BG_NATIVE_WIDTH = 11811;
export const BG_NATIVE_HEIGHT = 1417;
export const BG_ASPECT = BG_NATIVE_WIDTH / BG_NATIVE_HEIGHT;

/** 道路可擺攤範圍：避開圖片最左／最右暗角 */
export const ROAD_LEFT_RATIO = 0.11;
export const ROAD_RIGHT_RATIO = 0.11;

/** 攤位底部對齊路面；頂部對齊背景招牌下緣 */
export const STALL_FLOOR_RATIO = 0.88;
export const STALL_SIGN_TOP_RATIO = 0.495;
export const PLAYER_FLOOR_RATIO = 0.91;

export const STALL_ASPECT = 2816 / 1536;
export const NEAR_RADIUS_RATIO = 0.055;

/** 互動攤位固定順序（由左至右） */
const INTERACTIVE_ORDER: {
  id: StallId;
  label: string;
  image: string;
}[] = [
  { id: "pinball", label: "彈珠台", image: "/final_pic/main_stall/gumball.webp" },
  { id: "balloonshoot", label: "射飛鏢", image: "/final_pic/main_stall/balloon.webp" },
  { id: "ringtoss", label: "套圈圈", image: "/final_pic/main_stall/circle.webp" },
  { id: "catchfish", label: "撈金魚", image: "/final_pic/main_stall/goldfish.webp" },
];

/** 主列：首尾裝飾攤，遊戲攤固定順序，彼此間隔 2 個裝飾攤 */
const INTERACTIVE_GAP_COUNT = 2;

/** 左右邊緣各 3 個裝飾攤 */
const EDGE_STALLS_PER_SIDE = 3;

export type HubStall =
  | {
      kind: "interactive";
      id: StallId;
      label: string;
      image: string;
      centerRatio: number;
      scale: number;
      zIndex: number;
    }
  | {
      kind: "decorative";
      image: string;
      centerRatio: number;
      scale: number;
      zIndex: number;
    };

export type EdgeStall = {
  image: string;
  worldRatio: number;
  scale: number;
};

export type HubLayout = {
  /** 主攤位列：依 x 由左至右，首尾必為裝飾攤，遊戲攤不相鄰 */
  stalls: HubStall[];
  /** 畫面最左／最右的裝飾攤，圖層在遮罩下方 */
  edgeStalls: EdgeStall[];
};

const EDGE_STALL_Z = 8;
const DECORATIVE_Z_BASE = 85;
const INTERACTIVE_Z_BASE = 100;

export type HubMetrics = {
  worldWidth: number;
  worldHeight: number;
  playableLeft: number;
  playableWidth: number;
  baseStallHeight: number;
  nearRadius: number;
  playerMinX: number;
  playerMaxX: number;
  cameraMax: number;
};

export type StallDimensions = { width: number; height: number };

type SlotEntry =
  | { kind: "interactive"; id: StallId; label: string; image: string }
  | { kind: "decorative"; image: string };

const INTERACTIVE_SCALE = 0.99;
const DECORATIVE_SCALE = 0.92;

function evenCenterRatios(count: number): number[] {
  const innerLeft = 0.04;
  const innerRight = 0.96;
  const slot = (innerRight - innerLeft) / count;
  return Array.from({ length: count }, (_, i) => innerLeft + slot * (i + 0.5));
}

/** 固定主列：圖片、順序、間距皆不隨機 */
function buildFixedStallSequence(): SlotEntry[] {
  const slots: SlotEntry[] = [
    { kind: "decorative", image: "/final_pic/random/stinky_tofu.webp" },
    { kind: "decorative", image: "/final_pic/random/ice_cream.webp" },
    { kind: "decorative", image: "/final_pic/random/foods.webp" },
  ];

  for (let i = 0; i < INTERACTIVE_ORDER.length; i += 1) {
    const game = INTERACTIVE_ORDER[i];
    slots.push({
      kind: "interactive",
      id: game.id,
      label: game.label,
      image: game.image,
    });

    if (i < INTERACTIVE_ORDER.length - 1) {
      const gapImages = [
        [
          "/final_pic/random/sausage.webp",
          "/final_pic/random/big_sausage_and_riceroll.webp",
        ],
        [
          "/final_pic/random/sweet_potato_ball.webp",
          "/final_pic/random/ice_cream.webp",
        ],
        [
          "/final_pic/random/foods.webp",
          "/final_pic/random/sausage.webp",
        ],
      ][i];

      for (let g = 0; g < INTERACTIVE_GAP_COUNT; g += 1) {
        slots.push({ kind: "decorative", image: gapImages[g] });
      }
    }
  }

  slots.push({
    kind: "decorative",
    image: "/final_pic/random/stinky_tofu.webp",
  });

  return slots;
}

function buildFixedEdgeStalls(): EdgeStall[] {
  const count = EDGE_STALLS_PER_SIDE;
  const leftSpan = 0.08;
  const rightStart = 0.92;
  const leftImages = [
    "/final_pic/random/ice_cream.webp",
    "/final_pic/random/sweet_potato_ball.webp",
    "/final_pic/random/foods.webp",
  ];
  const rightImages = [
    "/final_pic/random/sausage.webp",
    "/final_pic/random/stinky_tofu.webp",
    "/final_pic/random/big_sausage_and_riceroll.webp",
  ];
  const edgeScales = [0.88, 0.9, 0.92];
  const stalls: EdgeStall[] = [];

  for (let i = 0; i < count; i += 1) {
    const t = (i + 0.5) / count;
    stalls.push({
      image: leftImages[i],
      worldRatio: leftSpan * t * 0.85,
      scale: edgeScales[i],
    });
  }

  for (let i = 0; i < count; i += 1) {
    const t = (i + 0.5) / count;
    stalls.push({
      image: rightImages[i],
      worldRatio: rightStart + (1 - rightStart) * t * 0.85,
      scale: edgeScales[i],
    });
  }

  return stalls;
}

function buildFixedHubLayout(): HubLayout {
  const sequence = buildFixedStallSequence();
  const centerRatios = evenCenterRatios(sequence.length);
  let decorativeOrder = 0;

  const stalls: HubStall[] = sequence.map((entry, index) => {
    const scale =
      entry.kind === "interactive" ? INTERACTIVE_SCALE : DECORATIVE_SCALE;
    const zIndex =
      entry.kind === "interactive"
        ? INTERACTIVE_Z_BASE + (index + 1)
        : DECORATIVE_Z_BASE + decorativeOrder++;

    if (entry.kind === "interactive") {
      return {
        kind: "interactive",
        id: entry.id,
        label: entry.label,
        image: entry.image,
        centerRatio: centerRatios[index],
        scale,
        zIndex,
      };
    }

    return {
      kind: "decorative",
      image: entry.image,
      centerRatio: centerRatios[index],
      scale,
      zIndex,
    };
  });

  return { stalls, edgeStalls: buildFixedEdgeStalls() };
}

/** 固定夜市攤位配置（每次進入皆相同） */
export const HUB_LAYOUT: HubLayout = buildFixedHubLayout();

export function generateHubLayout(): HubLayout {
  return HUB_LAYOUT;
}

export function resolveHubMetrics(
  sceneWidth: number,
  sceneHeight: number,
  _layout: HubLayout,
): HubMetrics {
  const worldHeight = sceneHeight;
  const worldWidth = worldHeight * BG_ASPECT;
  const playableLeft = worldWidth * ROAD_LEFT_RATIO;
  const playableRight = worldWidth * (1 - ROAD_RIGHT_RATIO);
  const playableWidth = playableRight - playableLeft;
  const baseStallHeight = Math.round(
    worldHeight * (STALL_FLOOR_RATIO - STALL_SIGN_TOP_RATIO),
  );
  const nearRadius = worldWidth * NEAR_RADIUS_RATIO;

  const playerMinX = 32;
  const playerMaxX = worldWidth - 32;
  const cameraMax = Math.max(0, worldWidth - sceneWidth);

  return {
    worldWidth,
    worldHeight,
    playableLeft,
    playableWidth,
    baseStallHeight,
    nearRadius,
    playerMinX,
    playerMaxX,
    cameraMax,
  };
}

export function stallDimensions(
  stall: HubStall,
  metrics: HubMetrics,
): StallDimensions {
  const height = Math.round(metrics.baseStallHeight * stall.scale);
  const width = Math.round(height * STALL_ASPECT);
  return { width, height };
}

export function stallCenterX(stall: HubStall, metrics: HubMetrics) {
  return metrics.playableLeft + stall.centerRatio * metrics.playableWidth;
}

export function edgeStallCenterX(stall: EdgeStall, metrics: HubMetrics) {
  return metrics.worldWidth * stall.worldRatio;
}

export function edgeStallDimensions(
  stall: EdgeStall,
  metrics: HubMetrics,
): StallDimensions {
  const height = Math.round(metrics.baseStallHeight * stall.scale);
  const width = Math.round(height * STALL_ASPECT);
  return { width, height };
}

export const EDGE_STALL_Z_INDEX = EDGE_STALL_Z;
/** 高於互動攤位、低於玩家，確保按鈕在攤位圖前方 */
/** 高於前景陰影層 (160)，確保可點擊 */
export const ENTER_BAR_Z_INDEX = 170;
export const PLAYER_Z_INDEX = 150;
/** 地上彩券貼圖（低於玩家，貼近路面） */
export const LOTTERY_GROUND_Z_INDEX = 130;
/** 地上拾取道具 UI 與貼圖的垂直間距 */
export const PICKUP_ABOVE_GROUND_PX = 30;
/** 地上拾取貼圖距離腳底線的偏移 */
export const LOTTERY_GROUND_Y_OFFSET_PX = 14;
/** 玩家與地上拾取物水平距離在此範圍內時顯示拾取 UI 並發光 */
export const LOTTERY_PICKUP_RANGE_PX = 50;

export function lotteryGroundY(metrics: HubMetrics) {
  return metrics.worldHeight * PLAYER_FLOOR_RATIO - LOTTERY_GROUND_Y_OFFSET_PX;
}

export function isPlayerNearLotterySpawn(
  playerX: number,
  spawnWorldX: number,
  rangePx = LOTTERY_PICKUP_RANGE_PX,
): boolean {
  return Math.abs(playerX - spawnWorldX) <= rangePx;
}

export function playerSpawnX(metrics: HubMetrics) {
  return metrics.playerMinX;
}

export function clampCameraOffset(
  playerX: number,
  viewportWidth: number,
  metrics: HubMetrics,
) {
  if (metrics.worldWidth <= viewportWidth) {
    return -(viewportWidth - metrics.worldWidth) / 2;
  }
  const target = playerX - viewportWidth / 2;
  return Math.max(0, Math.min(metrics.cameraMax, target));
}

export const STALL_CENTER_TRIGGER_RATIO = 0.09;
export const STALL_CENTER_TRIGGER_MAX_PX = 34;
export const STALL_GLOW_RANGE_PX = 20;

/** 攤位 BGM：400px 外緣開始淡入，200px 內為全音量區 */
export const STALL_BGM_OUTER_RANGE_PX = 400;
export const STALL_BGM_INNER_RANGE_PX = 200;
/** @deprecated 使用 STALL_BGM_OUTER_RANGE_PX */
export const STALL_BGM_RANGE_PX = STALL_BGM_OUTER_RANGE_PX;
export const STALL_BGM_MIN_VOLUME = 0.02;
export const STALL_BGM_MAX_VOLUME = 0.09;

export function stallBgmVolumeForDistance(dist: number): number {
  if (dist >= STALL_BGM_OUTER_RANGE_PX) return 0;
  if (dist <= STALL_BGM_INNER_RANGE_PX) return STALL_BGM_MAX_VOLUME;
  const t =
    1 -
    (dist - STALL_BGM_INNER_RANGE_PX) /
      (STALL_BGM_OUTER_RANGE_PX - STALL_BGM_INNER_RANGE_PX);
  return STALL_BGM_MIN_VOLUME + t * (STALL_BGM_MAX_VOLUME - STALL_BGM_MIN_VOLUME);
}

export function findNearestInteractiveStall(
  playerX: number,
  layout: HubLayout,
  metrics: HubMetrics,
): StallId {
  let nearest: { id: StallId; dist: number } | null = null;
  for (const stall of layout.stalls) {
    if (stall.kind !== "interactive") continue;
    const dist = Math.abs(playerX - stallCenterX(stall, metrics));
    if (!nearest || dist < nearest.dist) {
      nearest = { id: stall.id, dist };
    }
  }
  return nearest?.id ?? "pinball";
}

export function findNearInteractiveStall(
  playerX: number,
  layout: HubLayout,
  metrics: HubMetrics,
): StallId | null {
  for (const stall of layout.stalls) {
    if (stall.kind !== "interactive") continue;
    const sx = stallCenterX(stall, metrics);
    const { width } = stallDimensions(stall, metrics);
    if (isPlayerNearStallGlow(playerX, sx, width)) return stall.id;
  }
  return null;
}

export function isPlayerAtStallCenter(
  playerX: number,
  stallCenterXPos: number,
  stallWidth: number,
): boolean {
  const centerRadius = Math.min(
    STALL_CENTER_TRIGGER_MAX_PX,
    stallWidth * STALL_CENTER_TRIGGER_RATIO,
  );
  return Math.abs(playerX - stallCenterXPos) <= centerRadius;
}

/** 距攤位外緣 20px 內觸發發光（固定亮度，不隨距離漸變） */
export function isPlayerNearStallGlow(
  playerX: number,
  stallCenterXPos: number,
  stallWidth: number,
): boolean {
  const half = stallWidth / 2;
  const left = stallCenterXPos - half - STALL_GLOW_RANGE_PX;
  const right = stallCenterXPos + half + STALL_GLOW_RANGE_PX;
  return playerX >= left && playerX <= right;
}

export function stallGlowClass(near: boolean): string {
  return near ? "hub-stall-inner--glow" : "";
}

export function computeNearestStallBgm(
  playerX: number,
  layout: HubLayout,
  metrics: HubMetrics,
): { stallId: StallId; volume: number } | null {
  let best: { stallId: StallId; volume: number; dist: number } | null = null;

  for (const stall of layout.stalls) {
    if (stall.kind !== "interactive") continue;
    const sx = stallCenterX(stall, metrics);
    const dist = Math.abs(playerX - sx);
    if (dist > STALL_BGM_OUTER_RANGE_PX) continue;

    const volume = stallBgmVolumeForDistance(dist);

    if (!best || dist < best.dist) {
      best = { stallId: stall.id, volume, dist };
    }
  }

  return best ? { stallId: best.stallId, volume: best.volume } : null;
}
