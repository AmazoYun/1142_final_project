import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  gridToCanvas,
  type ShelfRow,
} from "@/lib/ringtoss/boardLayout";

const OCCUPANCY_THRESHOLD: Record<number, number> = {
  1: 350,
  2: 300,
  3: 400,
  4: 650,
};

export function getSlotEmptinessScore(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  gx: number,
  gy: ShelfRow,
): number {
  const { x, y } = gridToCanvas(gx, gy);
  const samples: number[] = [];
  const radius = 22;

  for (let dy = -50; dy <= -5; dy += 3) {
    for (let dx = -radius; dx <= radius; dx += 4) {
      const px = Math.round(x + dx);
      const py = Math.round(y + dy);
      if (px < 0 || py < 0 || px >= width || py >= height) continue;
      const i = (py * width + px) * 4;
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      samples.push(brightness);
    }
  }

  if (samples.length === 0) return 999;

  const avg = samples.reduce((sum, v) => sum + v, 0) / samples.length;
  const variance =
    samples.reduce((sum, v) => sum + (v - avg) ** 2, 0) / samples.length;

  let edges = 0;
  for (let i = 1; i < samples.length; i += 1) {
    if (Math.abs(samples[i] - samples[i - 1]) > 18) edges += 1;
  }
  const edgeRatio = edges / samples.length;

  return variance * 0.5 + edgeRatio * 2000 + Math.abs(avg - 42) * 2;
}

/** Returns true when the shelf slot looks occupied by background props */
export function isShelfSlotOccupied(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  gx: number,
  gy: ShelfRow,
): boolean {
  const score = getSlotEmptinessScore(data, width, height, gx, gy);
  return score >= (OCCUPANCY_THRESHOLD[gy] ?? 400);
}

export function analyzeBackgroundOccupancy(background: HTMLImageElement): Set<string> {
  const canvas = document.createElement("canvas");
  canvas.width = BOARD_WIDTH;
  canvas.height = BOARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new Set();

  ctx.drawImage(background, 0, 0, BOARD_WIDTH, BOARD_HEIGHT);
  const { data } = ctx.getImageData(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
  const occupied = new Set<string>();

  for (let gy = 1; gy <= 4; gy += 1) {
    for (let gx = 1; gx <= 7; gx += 1) {
      if (isShelfSlotOccupied(data, BOARD_WIDTH, BOARD_HEIGHT, gx, gy as ShelfRow)) {
        occupied.add(`${gx},${gy}`);
      }
    }
  }

  return occupied;
}
