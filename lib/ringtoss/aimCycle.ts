import type { CellTarget } from "@/lib/ringtoss/boardLayout";

export function activeTargets(targets: CellTarget[]): CellTarget[] {
  return targets.filter((t) => !t.hit && !t.broken);
}

export function activeColumns(targets: CellTarget[]): number[] {
  const cols = new Set<number>();
  for (const t of activeTargets(targets)) cols.add(t.gx);
  return [...cols].sort((a, b) => a - b);
}

export function activeRowsForColumn(targets: CellTarget[], gx: number): number[] {
  const rows = new Set<number>();
  for (const t of activeTargets(targets)) {
    if (t.gx === gx) rows.add(t.gy);
  }
  return [...rows].sort((a, b) => a - b);
}

/** 1→n→…→1 ping-pong through available values */
export function pingPongCycle(values: number[]): number[] {
  if (values.length === 0) return [1];
  if (values.length === 1) return values;
  return [...values, ...values.slice(1, -1).reverse()];
}

export function hasActiveBottle(targets: CellTarget[], gx: number, gy: number): boolean {
  return activeTargets(targets).some((t) => t.gx === gx && t.gy === gy);
}

export function cycleValueForAim(
  targets: CellTarget[],
  cycleIndex: number,
  axis: "x" | "y",
  lockedX: number | null,
): number {
  if (axis === "x") {
    const cycle = pingPongCycle(activeColumns(targets));
    return cycle[cycleIndex % cycle.length] ?? 1;
  }
  if (lockedX == null) return 1;
  const cycle = pingPongCycle(activeRowsForColumn(targets, lockedX));
  return cycle[cycleIndex % cycle.length] ?? 1;
}

export function cycleLengthForAim(
  targets: CellTarget[],
  axis: "x" | "y",
  lockedX: number | null,
): number {
  if (axis === "x") return pingPongCycle(activeColumns(targets)).length;
  if (lockedX == null) return 1;
  return pingPongCycle(activeRowsForColumn(targets, lockedX)).length;
}
