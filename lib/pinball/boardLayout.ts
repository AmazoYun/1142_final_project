import { PINBALL_COLOR_KEYS, PINBALL_SOLID } from "@/lib/pinball/spriteMeta";
import type { Segment } from "@/lib/pinball/types";

/** 背景滿版原圖尺寸 */
export const BOARD_WIDTH = 2750;
export const BOARD_HEIGHT = 1536;

/**
 * 背景圖中彈珠台可玩邊界（像素座標，由背景圖分析得出）
 * - 主場：標題列下方至六格得分區上緣
 * - 發射軌：主場右側木槽
 */
export const PLAYFIELD = {
  left: 970,
  top: 418,
  /** 主場右緣＝發射軌左側木隔板 */
  right: 1808,
  /** 六格得分區上緣（隔板頂端） */
  channelTop: 1045,
  /** 六格得分區底緣（黃圈／彈珠落點底線，由背景圖量測） */
  channelBottom: 1405,
  /** 彈珠中心可達的最高 Y（低於此才反彈） */
  ceiling: 268,
} as const;

/** 發射軌：主場右隔板與外框之間的窄道 */
export const LAUNCH = {
  left: 1824,
  right: 1875,
  /** 軌道頂端（弧形轉彎起點） */
  top: 332,
  /** 軌道底端（紅圈蓄力點） */
  bottom: 1395,
} as const;

export const WALL = PLAYFIELD.left;
export const PLAYFIELD_TOP = PLAYFIELD.top;
export const PLAYFIELD_RIGHT = PLAYFIELD.right;
export const PLAYFIELD_CEILING = PLAYFIELD.ceiling;
export const CHANNEL_TOP = PLAYFIELD.channelTop;
export const CHANNEL_BOTTOM = PLAYFIELD.channelBottom;
export const CHANNEL_HEIGHT = PLAYFIELD.channelBottom - PLAYFIELD.channelTop;
export const CHANNEL_LANE_COUNT = 6;

/** 通道木隔板碰撞區上緣（僅下半段，避免上方卡珠） */
export const CHANNEL_DIVIDER_COLLIDE_TOP = CHANNEL_TOP + CHANNEL_HEIGHT / 2;

/** 六格垂直隔板 X（背景圖 channel 區多列掃描量測） */
export const CHANNEL_DIVIDER_X = [1094, 1210, 1373, 1515, 1649, 1784] as const;

export const LAUNCH_RAIL_LEFT = LAUNCH.left;
export const LAUNCH_RAIL_RIGHT = LAUNCH.right;
export const LAUNCH_RAIL_TOP = LAUNCH.top;
export const LAUNCH_RAIL_BOTTOM = LAUNCH.bottom;
export const LAUNCH_DIVIDER_X = PLAYFIELD.right;

export const CENTER_X = (WALL + PLAYFIELD_RIGHT) / 2;

/** 頂部弧形軌道：垂直軌頂端 → 右上角 hood → 彈珠台中央最上方（控制點外推使轉彎更圓滑） */
export const LAUNCH_ARC_CONTROL = { x: 1948, y: 218 };
export const LAUNCH_EXIT = { x: CENTER_X, y: 296 };

/** 發射軌左側隔板頂端圓角半徑 */
export const LAUNCH_DIVIDER_FILLET_R = 56;

/** 力度條槽位（left/right 順序不拘，draw 時會正規化） */
export const CHARGE_METER = {
  left: 1975,
  top: 1155,
  right: 1942,
  bottom: 1410,
} as const;

export function chargeMeterBounds() {
  return {
    left: Math.min(CHARGE_METER.left, CHARGE_METER.right),
    top: Math.min(CHARGE_METER.top, CHARGE_METER.bottom),
    right: Math.max(CHARGE_METER.left, CHARGE_METER.right),
    bottom: Math.max(CHARGE_METER.top, CHARGE_METER.bottom),
  };
}

export function boardOverlayRect(rect: { left: number; top: number; right: number; bottom: number }) {
  const left = Math.min(rect.left, rect.right);
  const top = Math.min(rect.top, rect.bottom);
  const right = Math.max(rect.left, rect.right);
  const bottom = Math.max(rect.top, rect.bottom);
  return {
    left: `${(left / BOARD_WIDTH) * 100}%`,
    top: `${(top / BOARD_HEIGHT) * 100}%`,
    width: `${((right - left) / BOARD_WIDTH) * 100}%`,
    height: `${((bottom - top) / BOARD_HEIGHT) * 100}%`,
  };
}

export const CHANNEL_STACK_MAX = 3;

export const PHYSICS_SCALE = BOARD_WIDTH / 420;

export function launchRailCenterX() {
  return (LAUNCH_RAIL_LEFT + LAUNCH_RAIL_RIGHT) / 2;
}

/** 垂直軌頂端 Y（弧形起點） */
export function launchRailTopY(ballRadius: number) {
  return LAUNCH_RAIL_TOP + ballRadius + 4;
}

/** 發射軌垂直段：t=0 底部（紅圈），t=1 頂端 */
export function launchRailTravelY(ballRadius: number, t: number) {
  const bottom = LAUNCH_RAIL_BOTTOM - ballRadius;
  const top = launchRailTopY(ballRadius);
  return bottom - (bottom - top) * t;
}

/** 弧形軌起點＝垂直軌頂端 */
export function launchArcStart(ballRadius: number) {
  return { x: launchRailCenterX(), y: launchRailTopY(ballRadius) };
}

/** 弧形軌終點切線（單位向量），用於脫軌初速 */
export function launchArcExitTangent() {
  const dx = 2 * (LAUNCH_EXIT.x - LAUNCH_ARC_CONTROL.x);
  const dy = 2 * (LAUNCH_EXIT.y - LAUNCH_ARC_CONTROL.y);
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

export function channelLaneCenterX(lane: number) {
  const left = lane === 0 ? WALL : CHANNEL_DIVIDER_X[lane - 1];
  const right =
    lane === CHANNEL_LANE_COUNT - 1 ? PLAYFIELD.right : CHANNEL_DIVIDER_X[lane];
  return (left + right) / 2;
}

export function channelLaneFromX(x: number) {
  for (let lane = 0; lane < CHANNEL_LANE_COUNT; lane += 1) {
    const left = lane === 0 ? WALL : CHANNEL_DIVIDER_X[lane - 1];
    const right =
      lane === CHANNEL_LANE_COUNT - 1 ? PLAYFIELD.right : CHANNEL_DIVIDER_X[lane];
    if (x >= left && x < right) return lane;
  }
  return CHANNEL_LANE_COUNT - 1;
}

/** 底部黃圈落點：stackIndex 0 最底，最多 CHANNEL_STACK_MAX 顆 */
export function channelBallY(stackIndex: number, ballRadius: number) {
  const idx = Math.min(stackIndex, CHANNEL_STACK_MAX - 1);
  const baseY = PLAYFIELD.channelBottom - ballRadius;
  const step = ballRadius * 1.72 + 5;
  return baseY - idx * step;
}

export function initialBallPos(ballRadius = 39) {
  return {
    x: launchRailCenterX(),
    y: LAUNCH_RAIL_BOTTOM - ballRadius,
  };
}

/** 彈珠物理碰撞半徑相對 sprite 不透明區的縮放 */
export const BALL_COLLISION_RADIUS_SCALE = 0.7;

export function ballRadiusForColor(colorIndex: number) {
  const key = PINBALL_COLOR_KEYS[colorIndex] ?? "blue";
  return PINBALL_SOLID[key].collisionRadius * BALL_COLLISION_RADIUS_SCALE;
}

/** 發射軌隔板垂直段起點 Y（頂端留圓角區） */
export function launchDividerVerticalTop() {
  return LAUNCH_RAIL_TOP + 64;
}

/** 發射軌隔板頂端圓角圓心（凸向主場一側） */
export function launchDividerFilletCenter() {
  return {
    x: LAUNCH_DIVIDER_X - LAUNCH_DIVIDER_FILLET_R,
    y: launchDividerVerticalTop() + LAUNCH_DIVIDER_FILLET_R,
  };
}

/** 發射軌左側隔板垂直碰撞段（不含頂端圓角） */
export function launchDividerVerticalSegment(): Segment {
  const yTop = launchDividerVerticalTop() + LAUNCH_DIVIDER_FILLET_R;
  return {
    a: { x: LAUNCH_DIVIDER_X, y: yTop },
    b: { x: LAUNCH_DIVIDER_X, y: LAUNCH_RAIL_BOTTOM },
  };
}

export function channelDividerSegment(x: number): Segment {
  return {
    a: { x, y: CHANNEL_DIVIDER_COLLIDE_TOP },
    b: { x, y: CHANNEL_BOTTOM },
  };
}

/** @deprecated 使用 launchDividerVerticalSegment + 圓角碰撞 */
export const launchDivider = {
  a: { x: LAUNCH_DIVIDER_X, y: PLAYFIELD.top + 36 },
  b: { x: LAUNCH_DIVIDER_X, y: LAUNCH_RAIL_BOTTOM },
};
