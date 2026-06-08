export const BOARD_WIDTH = 720;
export const BOARD_HEIGHT = 640;

export const GRID_COLS = 7;
export const GRID_ROWS = 4;

/** Shelf surfaces aligned to background.webp (gy=1 top → gy=4 front) */
export const SHELF_ROWS = {
  1: { y: 259, left: 39, right: 681 },
  2: { y: 322, left: 41, right: 700 },
  3: { y: 389, left: 46, right: 696 },
  4: { y: 456, left: 49, right: 696 },
} as const;

export type ShelfRow = keyof typeof SHELF_ROWS;

/** Ring launch point on foreground counter */
export const LAUNCH_POINT = { x: 360, y: 520 } as const;

export type CellTarget = {
  gx: number;
  gy: ShelfRow;
  points: number;
  hit: boolean;
  /** 本局隨機抽中的紅光目標瓶 */
  bonus?: boolean;
};

/** Map design-space coords (720×640) to actual canvas pixels */
export function toViewport(
  x: number,
  y: number,
  cw: number,
  ch: number,
): { x: number; y: number } {
  return { x: x * (cw / BOARD_WIDTH), y: y * (ch / BOARD_HEIGHT) };
}

export function viewportScale(cw: number, ch: number) {
  return { sx: cw / BOARD_WIDTH, sy: ch / BOARD_HEIGHT };
}

export function designUniformScale(ch: number) {
  return ch / BOARD_HEIGHT;
}

export function gridToCanvas(gx: number, gy: number): { x: number; y: number } {
  const row = SHELF_ROWS[gy as ShelfRow];
  if (!row) {
    return { x: BOARD_WIDTH / 2, y: 320 };
  }
  const centerX = BOARD_WIDTH / 2;
  const halfSpan = (row.right - row.left) / 2;
  const tX = (gx - 1) / (GRID_COLS - 1);
  const x = centerX + (tX - 0.5) * halfSpan;
  return { x, y: row.y };
}
