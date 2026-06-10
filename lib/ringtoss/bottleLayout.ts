import {
  GRID_COLS,
  type CellTarget,
  type ShelfRow,
} from "@/lib/ringtoss/boardLayout";
import { getSlotEmptinessScore, isShelfSlotOccupied } from "@/lib/ringtoss/shelfOccupancy";

export const SHELF_ROW_COUNT = 4;
export const MAX_BOTTLES = 18;
/** 每局隨機抽出的紅光目標瓶數量 */
export const BONUS_BOTTLE_COUNT = 5;
/** 列 = 層架橫列 (gy)；行 = 直欄 (gx) */
export const MIN_PER_ROW = 2;
export const MIN_PER_COL = 2;

/** gy=1 is the top shelf; gy=4 is the front shelf */
const FORBIDDEN = new Set<string>([
  "1,1",
  "7,1",
  "1,2",
  "7,2",
  "1,3",
  "2,3",
  "6,3",
  "7,3",
]);

function cellKey(gx: number, gy: number) {
  return `${gx},${gy}`;
}

function isForbidden(gx: number, gy: number) {
  return FORBIDDEN.has(cellKey(gx, gy));
}

function pointsForCell(gx: number, gy: number): number {
  const rowBase = { 1: 25, 2: 20, 3: 15, 4: 10 }[gy] ?? 10;
  const centerBonus = gx === 4 ? 5 : gx === 3 || gx === 5 ? 2 : 0;
  return rowBase + centerBonus;
}

type Candidate = { gx: number; gy: ShelfRow; score: number; key: string };

function shuffle<T>(items: T[], random: () => number): T[] {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function buildAllCandidates(
  imageData: Uint8ClampedArray,
  width: number,
  height: number,
): Candidate[] {
  const list: Candidate[] = [];
  for (let gy = 1; gy <= SHELF_ROW_COUNT; gy += 1) {
    for (let gx = 1; gx <= GRID_COLS; gx += 1) {
      if (isForbidden(gx, gy)) continue;
      list.push({
        gx,
        gy: gy as ShelfRow,
        score: getSlotEmptinessScore(imageData, width, height, gx, gy as ShelfRow),
        key: cellKey(gx, gy),
      });
    }
  }
  return list;
}

/** Prefer empty shelf slots, but allow occupied cells when needed for density rules */
function orderCandidates(
  all: Candidate[],
  imageData: Uint8ClampedArray,
  width: number,
  height: number,
  random: () => number,
): Candidate[] {
  const empty: Candidate[] = [];
  const occupied: Candidate[] = [];
  for (const c of all) {
    if (isShelfSlotOccupied(imageData, width, height, c.gx, c.gy)) {
      occupied.push(c);
    } else {
      empty.push(c);
    }
  }
  return [...shuffle(empty, random), ...shuffle(occupied, random)];
}

function toTarget(candidate: Candidate): CellTarget {
  return {
    gx: candidate.gx,
    gy: candidate.gy,
    points: pointsForCell(candidate.gx, candidate.gy),
    hit: false,
  };
}

function rowCount(selected: Map<string, Candidate>, gy: number) {
  let count = 0;
  for (const c of selected.values()) {
    if (c.gy === gy) count += 1;
  }
  return count;
}

function colCount(selected: Map<string, Candidate>, gx: number) {
  let count = 0;
  for (const c of selected.values()) {
    if (c.gx === gx) count += 1;
  }
  return count;
}

function availableInRow(candidates: Candidate[], gy: number) {
  return candidates.filter((c) => c.gy === gy).length;
}

function availableInCol(candidates: Candidate[], gx: number) {
  return candidates.filter((c) => c.gx === gx).length;
}

function rowEdgeGx(gy: number): { left: number; right: number } | null {
  let left = GRID_COLS + 1;
  let right = 0;
  for (let gx = 1; gx <= GRID_COLS; gx += 1) {
    if (isForbidden(gx, gy)) continue;
    left = Math.min(left, gx);
    right = Math.max(right, gx);
  }
  return left <= right ? { left, right } : null;
}

function pickAtGx(
  selected: Map<string, Candidate>,
  candidates: Candidate[],
  gy: number,
  gx: number,
) {
  for (const c of candidates) {
    if (selected.size >= MAX_BOTTLES) return;
    if (c.gy !== gy || c.gx !== gx || selected.has(c.key)) continue;
    selected.set(c.key, c);
    return;
  }
}

function pickRowEdges(
  selected: Map<string, Candidate>,
  candidates: Candidate[],
) {
  for (let gy = 1; gy <= SHELF_ROW_COUNT; gy += 1) {
    const edges = rowEdgeGx(gy);
    if (!edges) continue;
    pickAtGx(selected, candidates, gy, edges.left);
    if (edges.right !== edges.left) {
      pickAtGx(selected, candidates, gy, edges.right);
    }
  }
}

function isRowEdge(gx: number, gy: number) {
  const edges = rowEdgeGx(gy);
  if (!edges) return false;
  return gx === edges.left || gx === edges.right;
}

function pickForRow(
  selected: Map<string, Candidate>,
  candidates: Candidate[],
  gy: number,
  need: number,
) {
  for (const c of candidates) {
    if (selected.size >= MAX_BOTTLES) return;
    if (c.gy !== gy || selected.has(c.key)) continue;
    selected.set(c.key, c);
    if (rowCount(selected, gy) >= need) return;
  }
}

function pickForCol(
  selected: Map<string, Candidate>,
  candidates: Candidate[],
  gx: number,
  need: number,
) {
  for (const c of candidates) {
    if (selected.size >= MAX_BOTTLES) return;
    if (c.gx !== gx || selected.has(c.key)) continue;
    selected.set(c.key, c);
    if (colCount(selected, gx) >= need) return;
  }
}

export function buildBottleTargets(
  imageData: Uint8ClampedArray,
  width: number,
  height: number,
  random: () => number = Math.random,
): CellTarget[] {
  const all = buildAllCandidates(imageData, width, height);
  if (all.length === 0) return [];

  const ordered = orderCandidates(all, imageData, width, height, random);
  const selected = new Map<string, Candidate>();

  pickRowEdges(selected, ordered);

  for (let gy = 1; gy <= SHELF_ROW_COUNT; gy += 1) {
    const need = Math.min(MIN_PER_ROW, availableInRow(ordered, gy));
    if (need > 0) pickForRow(selected, ordered, gy, need);
  }

  for (let gx = 1; gx <= GRID_COLS; gx += 1) {
    const need = Math.min(MIN_PER_COL, availableInCol(ordered, gx));
    if (need > 0) pickForCol(selected, ordered, gx, need);
  }

  for (let gy = 1; gy <= SHELF_ROW_COUNT; gy += 1) {
    while (
      rowCount(selected, gy) < Math.min(MIN_PER_ROW, availableInRow(ordered, gy)) &&
      selected.size < MAX_BOTTLES
    ) {
      const before = rowCount(selected, gy);
      pickForRow(
        selected,
        ordered,
        gy,
        Math.min(MIN_PER_ROW, availableInRow(ordered, gy)),
      );
      if (rowCount(selected, gy) === before) break;
    }
  }

  for (let gx = 1; gx <= GRID_COLS; gx += 1) {
    while (
      colCount(selected, gx) < Math.min(MIN_PER_COL, availableInCol(ordered, gx)) &&
      selected.size < MAX_BOTTLES
    ) {
      const before = colCount(selected, gx);
      pickForCol(
        selected,
        ordered,
        gx,
        Math.min(MIN_PER_COL, availableInCol(ordered, gx)),
      );
      if (colCount(selected, gx) === before) break;
    }
  }

  const remaining = ordered.filter((c) => !selected.has(c.key));
  const edgeFill = remaining.filter((c) => isRowEdge(c.gx, c.gy));
  const interiorFill = remaining.filter((c) => !isRowEdge(c.gx, c.gy));
  for (const c of [...shuffle(edgeFill, random), ...shuffle(interiorFill, random)]) {
    if (selected.size >= MAX_BOTTLES) break;
    selected.set(c.key, c);
  }

  return Array.from(selected.values()).map(toTarget);
}

/** 每局從現有酒瓶中隨機抽出 N 個作為紅光目標，並重置命中狀態（已打破的瓶不會入選） */
export function assignBonusBottles(
  targets: CellTarget[],
  count = BONUS_BOTTLE_COUNT,
  random: () => number = Math.random,
): CellTarget[] {
  if (targets.length === 0) return [];

  const eligible = targets.filter((t) => !t.broken);
  const pickCount = Math.min(count, eligible.length);
  const pickedKeys = new Set(
    shuffle(eligible, random)
      .slice(0, pickCount)
      .map((t) => cellKey(t.gx, t.gy)),
  );

  return targets.map((t) => ({
    ...t,
    hit: false,
    bonus: !t.broken && pickedKeys.has(cellKey(t.gx, t.gy)),
  }));
}

export function readBackgroundImageData(
  background: HTMLImageElement,
  width: number,
  height: number,
): Uint8ClampedArray | null {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(background, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height).data;
}
