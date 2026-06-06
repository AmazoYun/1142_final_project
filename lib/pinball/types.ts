export type Vec = { x: number; y: number };
export type Segment = { a: Vec; b: Vec };
export type Triangle = { a: Vec; b: Vec; c: Vec };

export type ObstacleKind = "round" | "line" | "triangle" | "rect";

/** 統一座標系：2750×1536 畫布，以圖片中心為 (x,y) */
export type ImageObstacle = {
  kind: ObstacleKind;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  score?: number;
};

export type LayoutData = {
  version: 2;
  obstacles: ImageObstacle[];
};

/** 舊版 layout（僅供遷移） */
export type Bumper = { x: number; y: number; r: number; score: number };
export type RandomCircle = { kind: "circle"; x: number; y: number; r: number };
export type RandomRect = { kind: "rect"; x: number; y: number; w: number; h: number; rotation?: number };
export type RandomBar = { kind: "bar"; segment: Segment };
export type RandomObstacle = RandomCircle | RandomRect | RandomBar;

export type LegacyLayoutData = {
  bumpers?: Bumper[];
  rails?: Segment[];
  cornerTriangles?: Triangle[];
  randomObstacles?: RandomObstacle[];
};
