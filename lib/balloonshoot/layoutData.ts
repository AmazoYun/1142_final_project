export type BalloonZone = "left" | "center" | "right";

export type BalloonLayoutData = {
  version: 1;
  aZoneCenter: Record<BalloonZone, { x: number; y: number }>;
  aHookOffsets: Record<BalloonZone, { x: number; y: number }[]>;
  bHooks: Record<BalloonZone, { x: number; y: number }[][]>;
};

export const DEFAULT_BALLOON_LAYOUT: BalloonLayoutData = {
  version: 1,
  aZoneCenter: {
    left: { x: 182, y: 84 },
    center: { x: 419, y: 88 },
    right: { x: 793, y: 79 },
  },
  aHookOffsets: {
    left: [
      { x: -5, y: -27 },
      { x: 20, y: -22 },
      { x: 37, y: 14 },
      { x: -12, y: 28 },
      { x: -19, y: 23 },
      { x: -20, y: -15 },
    ],
    center: [
      { x: -2, y: -31 },
      { x: 43, y: -23 },
      { x: 31, y: 28 },
      { x: 7, y: 40 },
      { x: -37, y: 16 },
      { x: -41, y: -31 },
    ],
    right: [
      { x: 7, y: -29 },
      { x: 13, y: -21 },
      { x: 28, y: 12 },
      { x: -1, y: 47 },
      { x: -21, y: 11 },
      { x: -27, y: -21 },
    ],
  },
  bHooks: {
    left: [
      [
        { x: 146, y: 192 },
        { x: 172, y: 193 },
        { x: 190, y: 192 },
        { x: 212, y: 192 },
      ],
      [
        { x: 149, y: 208 },
        { x: 173, y: 213 },
        { x: 188, y: 214 },
        { x: 214, y: 218 },
      ],
    ],
    center: [
      [
        { x: 382, y: 199 },
        { x: 410, y: 203 },
        { x: 426, y: 197 },
        { x: 449, y: 197 },
      ],
      [
        { x: 382, y: 217 },
        { x: 402, y: 214 },
        { x: 422, y: 214 },
        { x: 448, y: 214 },
      ],
    ],
    right: [
      [
        { x: 787, y: 190 },
        { x: 800, y: 186 },
        { x: 828, y: 191 },
        { x: 838, y: 186 },
      ],
      [
        { x: 787, y: 209 },
        { x: 805, y: 217 },
        { x: 825, y: 212 },
        { x: 848, y: 212 },
      ],
    ],
  },
};

const ZONES: BalloonZone[] = ["left", "center", "right"];

function clonePoint(p: { x: number; y: number }) {
  return { x: p.x, y: p.y };
}

export function cloneBalloonLayout(layout: BalloonLayoutData): BalloonLayoutData {
  return {
    version: 1,
    aZoneCenter: {
      left: clonePoint(layout.aZoneCenter.left),
      center: clonePoint(layout.aZoneCenter.center),
      right: clonePoint(layout.aZoneCenter.right),
    },
    aHookOffsets: {
      left: layout.aHookOffsets.left.map(clonePoint),
      center: layout.aHookOffsets.center.map(clonePoint),
      right: layout.aHookOffsets.right.map(clonePoint),
    },
    bHooks: {
      left: layout.bHooks.left.map((row) => row.map(clonePoint)),
      center: layout.bHooks.center.map((row) => row.map(clonePoint)),
      right: layout.bHooks.right.map((row) => row.map(clonePoint)),
    },
  };
}

function isPoint(value: unknown): value is { x: number; y: number } {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { x?: unknown }).x === "number" &&
    typeof (value as { y?: unknown }).y === "number"
  );
}

export function migrateBalloonLayout(raw: unknown): BalloonLayoutData {
  const fallback = cloneBalloonLayout(DEFAULT_BALLOON_LAYOUT);
  if (typeof raw !== "object" || raw === null) return fallback;

  const data = raw as Partial<BalloonLayoutData>;
  const next = cloneBalloonLayout(DEFAULT_BALLOON_LAYOUT);

  for (const zone of ZONES) {
    if (isPoint(data.aZoneCenter?.[zone])) {
      next.aZoneCenter[zone] = clonePoint(data.aZoneCenter[zone]);
    }

    const offsets = data.aHookOffsets?.[zone];
    if (Array.isArray(offsets)) {
      for (let i = 0; i < Math.min(offsets.length, next.aHookOffsets[zone].length); i++) {
        if (isPoint(offsets[i])) next.aHookOffsets[zone][i] = clonePoint(offsets[i]!);
      }
    }

    const rows = data.bHooks?.[zone];
    if (Array.isArray(rows)) {
      for (let row = 0; row < Math.min(rows.length, next.bHooks[zone].length); row++) {
        const cols = rows[row];
        if (!Array.isArray(cols)) continue;
        for (let col = 0; col < Math.min(cols.length, next.bHooks[zone][row]!.length); col++) {
          if (isPoint(cols[col])) next.bHooks[zone][row]![col] = clonePoint(cols[col]!);
        }
      }
    }
  }

  return next;
}

function averageOffset(offsets: { x: number; y: number }[]) {
  const n = offsets.length;
  if (n === 0) return { x: 0, y: 0 };
  let x = 0;
  let y = 0;
  for (const offset of offsets) {
    x += offset.x;
    y += offset.y;
  }
  return { x: x / n, y: y / n };
}

/** Rotation pivot: centroid of the six A-zone balloons at rest. */
export function aZoneRotationCenterFromLayout(layout: BalloonLayoutData, zone: BalloonZone) {
  const ref = layout.aZoneCenter[zone];
  const mean = averageOffset(layout.aHookOffsets[zone]);
  return { x: ref.x + mean.x, y: ref.y + mean.y };
}

export function aHookPositionFromLayout(
  layout: BalloonLayoutData,
  zone: BalloonZone,
  ringIndex: number,
  angle: number,
) {
  const ref = layout.aZoneCenter[zone];
  const offsets = layout.aHookOffsets[zone];
  const mean = averageOffset(offsets);
  const offset = offsets[ringIndex]!;
  const relX = offset.x - mean.x;
  const relY = offset.y - mean.y;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const pivot = { x: ref.x + mean.x, y: ref.y + mean.y };
  return {
    x: pivot.x + relX * cos - relY * sin,
    y: pivot.y + relX * sin + relY * cos,
  };
}

export function bHookPositionFromLayout(
  layout: BalloonLayoutData,
  zone: BalloonZone,
  row: number,
  col: number,
) {
  return layout.bHooks[zone][row]![col]!;
}

export function setBalloonHookPosition(
  layout: BalloonLayoutData,
  zone: BalloonZone,
  area: "A" | "B",
  ringIndex: number | undefined,
  bRow: number | undefined,
  bCol: number | undefined,
  x: number,
  y: number,
) {
  if (area === "A" && ringIndex !== undefined) {
    const center = layout.aZoneCenter[zone];
    layout.aHookOffsets[zone][ringIndex] = { x: x - center.x, y: y - center.y };
    return;
  }
  if (area === "B" && bRow !== undefined && bCol !== undefined) {
    layout.bHooks[zone][bRow]![bCol] = { x, y };
  }
}
