"use client";

import { Ma_Shan_Zheng } from "next/font/google";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const coupletFont = Ma_Shan_Zheng({ weight: "400", subsets: ["latin"] });
//畫面各種size//
const W = 720;
const H = 640;
const RINGS_PER_ROUND = 5;
const CYCLE_MS = 260;
const FLY_MS = 650;
const GRID_COLS = 7;
const GRID_ROWS = 5;

//cycle 部分//
const VALUE_CYCLE_X = [1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1] as const;
const VALUE_CYCLE_Y = [1, 2, 3, 4, 5, 4, 3, 2, 1] as const;

const GRID = {
  topY: 72,
  bottomY: 300,
  leftBottom: 248,
  rightBottom: 472,
  leftTop: 128,
  rightTop: 592,
  ctrlX: W / 2,
  ctrlY: 468,
};

type CellTarget = { gx: number; gy: number; points: number; hit: boolean };

/** All bottle positions (3-2-3 on 7 columns); every pillar can be rung for points */
const TARGET_CELLS: CellTarget[] = [
  { gx: 1, gy: 4, points: 15, hit: false },
  { gx: 4, gy: 4, points: 20, hit: false },
  { gx: 5, gy: 4, points: 30, hit: false },
  { gx: 7, gy: 4, points: 15, hit: false },
  { gx: 2, gy: 3, points: 10, hit: false },
  { gx: 6, gy: 3, points: 15, hit: false },
  { gx: 1, gy: 2, points: 15, hit: false },
  { gx: 4, gy: 2, points: 20, hit: false },
  { gx: 7, gy: 2, points: 25, hit: false },
];

const SHELF_ROWS = [4, 3, 2] as const;

type Ring = {
  x: number;
  y: number;
  r: number;
  flying: boolean;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  flyStart: number;
};

type AimPhase = "x" | "y" | "flying";

type AimState = {
  phase: AimPhase;
  cycleIndex: number;
  lockedX: number | null;
  lockedY: number | null;
};

function cycleValue(index: number, axis: "x" | "y"): number {
  const cycle = axis === "x" ? VALUE_CYCLE_X : VALUE_CYCLE_Y;
  return cycle[index % cycle.length];
}

function initialAim(): AimState {
  return { phase: "x", cycleIndex: 0, lockedX: null, lockedY: null };
}

function resetTargets(): CellTarget[] {
  return TARGET_CELLS.map((t) => ({ ...t, hit: false }));
}

const RING_LAND_Y_OFFSET = 12;

function gridToCanvas(gx: number, gy: number): { x: number; y: number } {
  const tX = (gx - 1) / (GRID_COLS - 1);
  const tY = (gy - 1) / (GRID_ROWS - 1);
  const y = GRID.bottomY - tY * (GRID.bottomY - GRID.topY);
  const left = GRID.leftBottom + tY * (GRID.leftTop - GRID.leftBottom);
  const right = GRID.rightBottom + tY * (GRID.rightTop - GRID.rightBottom);
  return { x: left + tX * (right - left), y };
}

function ringLandAt(gx: number, gy: number): { x: number; y: number } {
  const { x, y } = gridToCanvas(gx, gy);
  return { x, y: y - RING_LAND_Y_OFFSET };
}

function createRing(): Ring {
  const start = { x: GRID.ctrlX, y: GRID.ctrlY };
  return {
    ...start,
    r: 18,
    flying: false,
    fromX: start.x,
    fromY: start.y,
    toX: start.x,
    toY: start.y,
    flyStart: 0,
  };
}

function aimGridPosition(aim: AimState): { gx: number; gy: number } {
  if (aim.phase === "x") {
    return { gx: cycleValue(aim.cycleIndex, "x"), gy: 3 };
  }
  if (aim.phase === "y" && aim.lockedX != null) {
    return { gx: aim.lockedX, gy: cycleValue(aim.cycleIndex, "y") };
  }
  if (aim.lockedX != null && aim.lockedY != null) {
    return { gx: aim.lockedX, gy: aim.lockedY };
  }
  return { gx: 4, gy: 3 };
}

function drawShelves(ctx: CanvasRenderingContext2D) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const gy of SHELF_ROWS) {
    const left = gridToCanvas(1, gy);
    const right = gridToCanvas(GRID_COLS, gy);
    const depth = 10;

    ctx.fillStyle = "#d4d4d4";
    ctx.strokeStyle = "#a3a3a3";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(left.x, left.y);
    ctx.lineTo(right.x, right.y);
    ctx.lineTo(right.x, right.y + depth);
    ctx.lineTo(left.x, left.y + depth);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

function drawBottle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  hit: boolean,
) {
  const h = 38;
  const w = 13;
  const baseY = y - 6;

  ctx.save();
  ctx.translate(x, baseY - h);

  ctx.fillStyle = hit ? "#e5e5e5" : "#b8b8b8";
  ctx.strokeStyle = hit ? "#a3a3a3" : "#737373";
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.rect(-w * 0.22, 0, w * 0.44, h * 0.22);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-w * 0.3, h * 0.22);
  ctx.lineTo(-w * 0.52, h);
  ctx.lineTo(w * 0.52, h);
  ctx.lineTo(w * 0.3, h * 0.22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (hit) {
    ctx.strokeStyle = "#525252";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-w * 0.35, h * 0.35);
    ctx.lineTo(w * 0.35, h * 0.88);
    ctx.moveTo(w * 0.35, h * 0.35);
    ctx.lineTo(-w * 0.35, h * 0.88);
    ctx.stroke();
  }

  ctx.restore();
}

function drawCrosshair(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const r = 22;
  ctx.strokeStyle = "#404040";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x - r - 6, y);
  ctx.lineTo(x + r + 6, y);
  ctx.moveTo(x, y - r - 6);
  ctx.lineTo(x, y + r + 6);
  ctx.stroke();
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  aim: AimState,
  targets: CellTarget[],
) {
  const hlX = aim.phase === "x" ? cycleValue(aim.cycleIndex, "x") : aim.lockedX;
  const hlY = aim.phase === "y" ? cycleValue(aim.cycleIndex, "y") : aim.lockedY;

  drawShelves(ctx);

  for (const { gx, gy, hit } of targets) {
    const { x, y } = gridToCanvas(gx, gy);
    drawBottle(ctx, x, y, hit);
  }

  for (let gy = GRID_ROWS; gy >= 1; gy--) {
    for (let gx = 1; gx <= GRID_COLS; gx++) {
      const colHL = hlX === gx;
      const rowHL = hlY === gy;
      const isBottle = targets.some((t) => t.gx === gx && t.gy === gy);
      const cellHL =
        isBottle &&
        ((aim.phase === "x" && colHL) ||
          (aim.phase === "y" && aim.lockedX === gx && rowHL) ||
          (aim.phase === "flying" && aim.lockedX === gx && aim.lockedY === gy));

      if (!cellHL) continue;

      const { x, y } = ringLandAt(gx, gy);
      ctx.fillStyle = "rgba(163, 163, 163, 0.22)";
      ctx.beginPath();
      ctx.arc(x, y - 12, 30, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const { gx: aimGx, gy: aimGy } = aimGridPosition(aim);
  const aimPos = ringLandAt(aimGx, aimGy);
  if (aim.phase !== "flying") {
    drawCrosshair(ctx, aimPos.x, aimPos.y);
  }
}

export default function RingTossGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ringRef = useRef<Ring>(createRing());
  const targetsRef = useRef<CellTarget[]>(resetTargets());
  const aimRef = useRef<AimState>(initialAim());
  const animRef = useRef<number>(0);
  const lastCycleTickRef = useRef<number>(0);
  const flyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const throwIdRef = useRef(0);

  const [score, setScore] = useState(0);
  const [ringsLeft, setRingsLeft] = useState(RINGS_PER_ROUND);
  const [message, setMessage] = useState(
    "\u7b2c\u4e00\u6b65\uff1a\u7b49 X \u5faa\u74b0 1\u21927\u2192\u2026\u21921\uff0c\u6309\u7a7a\u767d\u9375\u9396\u5b9a",
  );
  const [gameOver, setGameOver] = useState(false);
  const [aimUi, setAimUi] = useState<AimState>(initialAim);

  const syncAimUi = useCallback(() => {
    setAimUi({ ...aimRef.current });
  }, []);

  const drawScene = useCallback(
    (ctx: CanvasRenderingContext2D, ring: Ring, aim: AimState, targets: CellTarget[]) => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, W, H);

      drawGrid(ctx, aim, targets);

      let rx = ring.x;
      let ry = ring.y;
      if (ring.flying) {
        const t = Math.min(1, (performance.now() - ring.flyStart) / FLY_MS);
        const ease = 1 - (1 - t) ** 2.2;
        rx = ring.fromX + (ring.toX - ring.fromX) * ease;
        ry = ring.fromY + (ring.toY - ring.fromY) * ease - Math.sin(t * Math.PI) * 55;
      }

      ctx.strokeStyle = "#525252";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(rx, ry, ring.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "#737373";
      ctx.lineWidth = 2;
      ctx.stroke();
    },
    [],
  );

  const resetAimForNextThrow = useCallback(() => {
    aimRef.current = initialAim();
    lastCycleTickRef.current = performance.now();
    syncAimUi();
  }, [syncAimUi]);

  const finishThrow = useCallback(
    (gx: number, gy: number, throwId: number) => {
      if (throwId !== throwIdRef.current) return;

      const targets = targetsRef.current;
      const target = targets.find((t) => t.gx === gx && t.gy === gy && !t.hit);

      let resultMessage: string;
      if (target) {
        target.hit = true;
        setScore((s) => s + target.points);
        resultMessage = `\u547d\u4e2d ${gx}, ${gy}\uff01+${target.points} \u5206`;
      } else if (targets.some((t) => t.gx === gx && t.gy === gy && t.hit)) {
        resultMessage = `\u843d\u9ede ${gx}, ${gy}\uff0c\u8a72\u67f1\u5df2\u547d\u4e2d\u904e`;
      } else {
        resultMessage = `\u843d\u9ede ${gx}, ${gy}\uff0c\u672a\u5957\u4e2d\u67f1\u5b50`;
      }

      setRingsLeft((left) => {
        const next = left - 1;
        if (next <= 0) {
          setGameOver(true);
          setMessage(`${resultMessage}\u3000\u56de\u5408\u7d50\u675f\uff01`);
        } else {
          ringRef.current = createRing();
          resetAimForNextThrow();
          setMessage(resultMessage);
        }
        syncAimUi();
        return next;
      });
    },
    [resetAimForNextThrow, syncAimUi],
  );

  const launchToCell = useCallback(
    (gx: number, gy: number) => {
      const ring = ringRef.current;
      const target = ringLandAt(gx, gy);
      ring.fromX = ring.x;
      ring.fromY = ring.y;
      ring.toX = target.x;
      ring.toY = target.y;
      ring.flyStart = performance.now();
      ring.flying = true;
      aimRef.current.phase = "flying";
      aimRef.current.lockedX = gx;
      aimRef.current.lockedY = gy;
      syncAimUi();

      const throwId = ++throwIdRef.current;
      if (flyTimerRef.current) clearTimeout(flyTimerRef.current);
      flyTimerRef.current = setTimeout(() => {
        if (throwId !== throwIdRef.current) return;
        ring.flying = false;
        ring.x = target.x;
        ring.y = target.y;
        finishThrow(gx, gy, throwId);
      }, FLY_MS);
    },
    [finishThrow, syncAimUi],
  );

  const confirmAim = useCallback(() => {
    if (gameOver || ringsLeft <= 0 || ringRef.current.flying) return;

    const aim = aimRef.current;
    const axis = aim.phase === "x" ? "x" : "y";
    const value = cycleValue(aim.cycleIndex, axis);

    if (aim.phase === "x") {
      aim.lockedX = value;
      aim.phase = "y";
      aim.cycleIndex = 0;
      lastCycleTickRef.current = performance.now();
      setMessage(`X=${value}\u3002\u7b2c\u4e8c\u6b65\uff1a\u9396\u5b9a Y\uff081\u21925\u21924\u21923\u21922\u21921\uff09`);
      syncAimUi();
      return;
    }

    if (aim.phase === "y" && aim.lockedX != null) {
      aim.lockedY = value;
      launchToCell(aim.lockedX, value);
    }
  }, [gameOver, ringsLeft, launchToCell, syncAimUi]);

  const tick = useCallback(
    (now: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const aim = aimRef.current;
      const ring = ringRef.current;

      if (
        !gameOver &&
        ringsLeft > 0 &&
        !ring.flying &&
        (aim.phase === "x" || aim.phase === "y")
      ) {
        if (now - lastCycleTickRef.current >= CYCLE_MS) {
          const cycleLen =
            aim.phase === "x" ? VALUE_CYCLE_X.length : VALUE_CYCLE_Y.length;
          aim.cycleIndex = (aim.cycleIndex + 1) % cycleLen;
          lastCycleTickRef.current = now;
          syncAimUi();
        }
      }

      drawScene(ctx, ring, aim, targetsRef.current);
      animRef.current = requestAnimationFrame(tick);
    },
    [drawScene, gameOver, ringsLeft, syncAimUi],
  );

  useEffect(() => {
    lastCycleTickRef.current = performance.now();
    animRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animRef.current);
      if (flyTimerRef.current) clearTimeout(flyTimerRef.current);
    };
  }, [tick]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        confirmAim();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmAim]);

  const restart = () => {
    targetsRef.current = resetTargets();
    ringRef.current = createRing();
    setScore(0);
    setRingsLeft(RINGS_PER_ROUND);
    setGameOver(false);
    setMessage("\u9396\u5b9a X\uff081\u21927\u2192\u2026\u21921\u5faa\u74b0\uff09");
    throwIdRef.current += 1;
    if (flyTimerRef.current) clearTimeout(flyTimerRef.current);
    resetAimForNextThrow();
  };

  const cur = cycleValue(
    aimUi.cycleIndex,
    aimUi.phase === "y" ? "y" : "x",
  );
  const phaseHint =
    aimUi.phase === "x"
      ? `X \u5faa\u74b0\u4e2d\uff1a${cur}`
      : aimUi.phase === "y"
        ? `X=${aimUi.lockedX}\uff0cY \u5faa\u74b0\uff1a${cur}`
        : "";

  return (
    <div className="flex min-h-screen w-full bg-white">
      <aside className="flex w-14 shrink-0 items-center justify-center bg-[#e8e8e8] sm:w-16 md:w-20 lg:w-24">
        <p
          className={`${coupletFont.className} text-lg tracking-widest text-neutral-600 sm:text-xl`}
          style={{ writingMode: "vertical-rl" }}
        >
          這是春聯
        </p>
      </aside>

      <main className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between px-3 py-3 sm:px-5">
          <Link
            href="/"
            className={`${coupletFont.className} flex items-center gap-1 text-lg text-neutral-800 transition-opacity hover:opacity-70 sm:text-xl`}
          >
            <span aria-hidden className="text-base leading-none">
              ◀
            </span>
            返回
          </Link>
          <div className="flex items-center gap-2 text-neutral-800">
            <span
              aria-hidden
              className="inline-block h-5 w-5 rounded-full border-2 border-neutral-700"
            />
            <span className="text-lg font-medium tabular-nums">{ringsLeft}</span>
          </div>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-2 pb-4">
          <p className="max-w-md text-center text-xs text-neutral-500 sm:text-sm">
            {message}
            {` · 分數：${score}`}
          </p>
          {phaseHint ? (
            <p className="text-center text-xs text-neutral-400">{phaseHint}</p>
          ) : null}

          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="max-h-[min(72vh,640px)] max-w-full cursor-pointer"
            style={{ touchAction: "none" }}
            onPointerDown={() => confirmAim()}
          />

          <div className="flex flex-wrap justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={confirmAim}
              disabled={gameOver || ringsLeft <= 0 || aimUi.phase === "flying"}
              className="rounded border border-neutral-400 bg-neutral-100 px-4 py-1.5 text-sm text-neutral-800 disabled:opacity-40"
            >
              {aimUi.phase === "x"
                ? "鎖定 X"
                : aimUi.phase === "y"
                  ? "鎖定 Y 並投出"
                  : "..."}
            </button>
            <button
              type="button"
              onClick={restart}
              className="rounded border border-neutral-300 px-4 py-1.5 text-sm text-neutral-600"
            >
              再玩一次
            </button>
          </div>
        </div>
      </main>

      <aside className="flex w-14 shrink-0 items-center justify-center bg-[#e8e8e8] sm:w-16 md:w-20 lg:w-24">
        <p
          className={`${coupletFont.className} text-lg tracking-widest text-neutral-600 sm:text-xl`}
          style={{ writingMode: "vertical-rl" }}
        >
          這是春聯
        </p>
      </aside>
    </div>
  );
}
