"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const W = 720;
const H = 640;
const RINGS_PER_ROUND = 5;
const CYCLE_MS = 420;
const FLY_MS = 650;

const VALUE_CYCLE = [1, 2, 3, 4, 5, 4, 3, 2, 1] as const;

const GRID = {
  topY: 72,
  bottomY: 300,
  leftBottom: 268,
  rightBottom: 452,
  leftTop: 148,
  rightTop: 572,
  ctrlX: W / 2,
  ctrlY: 468,
};

type CellTarget = { gx: number; gy: number; points: number; hit: boolean };

const TARGET_CELLS: CellTarget[] = [
  { gx: 2, gy: 3, points: 10, hit: false },
  { gx: 3, gy: 4, points: 20, hit: false },
  { gx: 4, gy: 4, points: 30, hit: false },
  { gx: 5, gy: 2, points: 25, hit: false },
];

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

function cycleValue(index: number): number {
  return VALUE_CYCLE[index % VALUE_CYCLE.length];
}

function initialAim(): AimState {
  return { phase: "x", cycleIndex: 0, lockedX: null, lockedY: null };
}

function resetTargets(): CellTarget[] {
  return TARGET_CELLS.map((t) => ({ ...t, hit: false }));
}

function gridToCanvas(gx: number, gy: number): { x: number; y: number } {
  const tX = (gx - 1) / 4;
  const tY = (gy - 1) / 4;
  const y = GRID.bottomY - tY * (GRID.bottomY - GRID.topY);
  const left = GRID.leftBottom + tY * (GRID.leftTop - GRID.leftBottom);
  const right = GRID.rightBottom + tY * (GRID.rightTop - GRID.rightBottom);
  return { x: left + tX * (right - left), y };
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

function drawCellLabel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  gx: number,
  gy: number,
) {
  const commaW = 8;
  ctx.font = "600 22px Georgia, 'Times New Roman', serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#dc2626";
  ctx.fillText(String(gx), x - commaW / 2, y);
  ctx.textAlign = "left";
  ctx.fillStyle = "#2563eb";
  ctx.fillText(String(gy), x + commaW / 2, y);
  ctx.textAlign = "center";
  ctx.fillStyle = "#1f2937";
  ctx.fillText(",", x, y);
}

function drawTrapezoidFrame(ctx: CanvasRenderingContext2D) {
  const { leftTop, rightTop, leftBottom, rightBottom, topY, bottomY } = GRID;

  ctx.strokeStyle = "#374151";
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();
  ctx.moveTo(leftTop, topY);
  ctx.lineTo(rightTop, topY);
  ctx.lineTo(rightBottom, bottomY);
  ctx.lineTo(leftBottom, bottomY);
  ctx.closePath();
  ctx.stroke();

  for (let gy = 5; gy >= 1; gy--) {
    const a = gridToCanvas(1, gy);
    const b = gridToCanvas(5, gy);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  for (let gx = 1; gx <= 5; gx++) {
    const a = gridToCanvas(gx, 1);
    const b = gridToCanvas(gx, 5);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  aim: AimState,
  targets: CellTarget[],
) {
  const cur = cycleValue(aim.cycleIndex);
  const hlX = aim.phase === "x" ? cur : aim.lockedX;
  const hlY = aim.phase === "y" ? cur : aim.lockedY;

  drawTrapezoidFrame(ctx);

  for (let gy = 5; gy >= 1; gy--) {
    for (let gx = 1; gx <= 5; gx++) {
      const { x, y } = gridToCanvas(gx, gy);
      const colHL = hlX === gx;
      const rowHL = hlY === gy;
      const cellHL =
        (aim.phase === "x" && colHL) ||
        (aim.phase === "y" && aim.lockedX === gx && rowHL) ||
        (aim.phase === "flying" && aim.lockedX === gx && aim.lockedY === gy);

      const target = targets.find((t) => t.gx === gx && t.gy === gy);

      if (cellHL) {
        ctx.fillStyle = "rgba(250, 204, 21, 0.35)";
        ctx.beginPath();
        ctx.arc(x, y, 28, 0, Math.PI * 2);
        ctx.fill();
      }

      if (target && !target.hit) {
        ctx.strokeStyle = "#16a34a";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);
        ctx.stroke();
      } else if (target?.hit) {
        ctx.fillStyle = "rgba(22, 163, 74, 0.25)";
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);
        ctx.fill();
      }

      drawCellLabel(ctx, x, y, gx, gy);
    }
  }
}

/** ??????????X?+ ?????Y?????? */
function drawControls(ctx: CanvasRenderingContext2D, aim: AimState) {
  const { ctrlX, ctrlY } = GRID;
  const cur = cycleValue(aim.cycleIndex);
  const xActive = aim.phase === "x";
  const yActive = aim.phase === "y";

  const arcR = 58;
  const arcCY = ctrlY + 6;

  ctx.strokeStyle = xActive ? "#dc2626" : "rgba(220, 38, 38, 0.35)";
  ctx.lineWidth = xActive ? 3.5 : 2;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.arc(ctrlX, arcCY, arcR, Math.PI * 0.12, Math.PI * 0.88, true);
  ctx.stroke();

  const tX = (cur - 1) / 4;
  const arrowAngle = Math.PI * 0.12 + tX * (Math.PI * 0.76);
  const ax = ctrlX + Math.cos(arrowAngle) * arcR;
  const ay = arcCY + Math.sin(arrowAngle) * arcR;

  if (xActive) {
    ctx.fillStyle = "#dc2626";
    ctx.beginPath();
    ctx.arc(ax, ay, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = xActive ? "#dc2626" : "rgba(220, 38, 38, 0.35)";
  ctx.lineWidth = 2.5;
  const head = 10;
  ctx.beginPath();
  ctx.moveTo(ctrlX - arcR - 4, arcCY + 18);
  ctx.lineTo(ctrlX - arcR - 4 - head, arcCY + 18);
  ctx.moveTo(ctrlX - arcR - 4, arcCY + 18);
  ctx.lineTo(ctrlX - arcR - 4, arcCY + 18 - head * 0.6);
  ctx.moveTo(ctrlX - arcR - 4, arcCY + 18);
  ctx.lineTo(ctrlX - arcR - 4, arcCY + 18 + head * 0.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(ctrlX + arcR + 4, arcCY + 18);
  ctx.lineTo(ctrlX + arcR + 4 + head, arcCY + 18);
  ctx.moveTo(ctrlX + arcR + 4, arcCY + 18);
  ctx.lineTo(ctrlX + arcR + 4, arcCY + 18 - head * 0.6);
  ctx.moveTo(ctrlX + arcR + 4, arcCY + 18);
  ctx.lineTo(ctrlX + arcR + 4, arcCY + 18 + head * 0.6);
  ctx.stroke();

  const yLen = 36 + (yActive ? (cur - 1) * 14 : aim.lockedY != null ? (aim.lockedY - 1) * 14 : 28);
  ctx.strokeStyle = yActive ? "#2563eb" : "rgba(37, 99, 235, 0.35)";
  ctx.lineWidth = yActive ? 3.5 : 2;
  ctx.beginPath();
  ctx.moveTo(ctrlX, arcCY + 4);
  ctx.lineTo(ctrlX, arcCY + 4 - yLen);
  ctx.stroke();

  const tipY = arcCY + 4 - yLen;
  ctx.beginPath();
  ctx.moveTo(ctrlX - 9, tipY + 12);
  ctx.lineTo(ctrlX, tipY);
  ctx.lineTo(ctrlX + 9, tipY + 12);
  ctx.stroke();

  if (yActive) {
    ctx.fillStyle = "#2563eb";
    ctx.beginPath();
    ctx.arc(ctrlX, tipY, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.font = "600 15px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = xActive ? "#dc2626" : "#9ca3af";
  ctx.fillText(xActive ? `X = ${cur}` : aim.lockedX != null ? `X = ${aim.lockedX}` : "X", ctrlX, arcCY + 42);
  ctx.fillStyle = yActive ? "#2563eb" : "#9ca3af";
  ctx.fillText(yActive ? `Y = ${cur}` : aim.lockedY != null ? `Y = ${aim.lockedY}` : "Y", ctrlX + 52, tipY + 4);
}

export default function RingTossGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ringRef = useRef<Ring>(createRing());
  const targetsRef = useRef<CellTarget[]>(resetTargets());
  const aimRef = useRef<AimState>(initialAim());
  const animRef = useRef<number>(0);
  const lastCycleTickRef = useRef<number>(0);
  const flyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [score, setScore] = useState(0);
  const [ringsLeft, setRingsLeft] = useState(RINGS_PER_ROUND);
  const [message, setMessage] = useState(
    "\u7b2c\u4e00\u6b65\uff1a\u7b49 X \u5faa\u74b0 1\u21925\u21924\u21923\u21922\u21921\uff0c\u6309\u7a7a\u767d\u9375\u9396\u5b9a\u5de6\u53f3",
  );
  const [gameOver, setGameOver] = useState(false);
  const [aimUi, setAimUi] = useState<AimState>(initialAim);

  const syncAimUi = useCallback(() => {
    setAimUi({ ...aimRef.current });
  }, []);

  const drawScene = useCallback(
    (ctx: CanvasRenderingContext2D, ring: Ring, aim: AimState, targets: CellTarget[]) => {
      ctx.fillStyle = "#f8f6f1";
      ctx.fillRect(0, 0, W, H);

      drawGrid(ctx, aim, targets);
      drawControls(ctx, aim);

      let rx = ring.x;
      let ry = ring.y;
      if (ring.flying) {
        const t = Math.min(1, (performance.now() - ring.flyStart) / FLY_MS);
        const ease = 1 - (1 - t) ** 2.2;
        rx = ring.fromX + (ring.toX - ring.fromX) * ease;
        ry = ring.fromY + (ring.toY - ring.fromY) * ease - Math.sin(t * Math.PI) * 55;
      }

      ctx.strokeStyle = "#ca8a04";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(rx, ry, ring.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "#a16207";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = "600 14px system-ui, sans-serif";
      ctx.fillStyle = "#374151";
      ctx.textAlign = "left";
      ctx.fillText(`\u5206\u6578\uff1a${score}  \u5269\u9918\uff1a${ringsLeft}`, 16, 28);
    },
    [score, ringsLeft],
  );

  const resetAimForNextThrow = useCallback(() => {
    aimRef.current = initialAim();
    lastCycleTickRef.current = performance.now();
    syncAimUi();
  }, [syncAimUi]);

  const finishThrow = useCallback(
    (gx: number, gy: number) => {
      const targets = targetsRef.current;
      const hit = targets.find((t) => t.gx === gx && t.gy === gy && !t.hit);
      if (hit) {
        hit.hit = true;
        setScore((s) => s + hit.points);
        setMessage(`\u547d\u4e2d ${gx}, ${gy}\uff01+${hit.points} \u5206`);
      } else {
        setMessage(`\u843d\u9ede ${gx}, ${gy}\uff0c\u672a\u5957\u4e2d\u67f1\u5b50`);
      }

      setRingsLeft((left) => {
        const next = left - 1;
        if (next <= 0) {
          setGameOver(true);
          setMessage("\u56de\u5408\u7d50\u675f\uff01");
        } else {
          ringRef.current = createRing();
          resetAimForNextThrow();
          setMessage("\u9396\u5b9a X\uff081\u21925\u21924\u21923\u21922\u21921\u5faa\u74b0\uff09");
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
      const target = gridToCanvas(gx, gy);
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

      if (flyTimerRef.current) clearTimeout(flyTimerRef.current);
      flyTimerRef.current = setTimeout(() => {
        ring.flying = false;
        ring.x = target.x;
        ring.y = target.y;
        finishThrow(gx, gy);
      }, FLY_MS);
    },
    [finishThrow, syncAimUi],
  );

  const confirmAim = useCallback(() => {
    if (gameOver || ringsLeft <= 0 || ringRef.current.flying) return;

    const aim = aimRef.current;
    const value = cycleValue(aim.cycleIndex);

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
          aim.cycleIndex = (aim.cycleIndex + 1) % VALUE_CYCLE.length;
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
    setMessage("\u9396\u5b9a X\uff081\u21925\u21924\u21923\u21922\u21921\u5faa\u74b0\uff09");
    resetAimForNextThrow();
  };

  const cur = cycleValue(aimUi.cycleIndex);
  const phaseHint =
    aimUi.phase === "x"
      ? `X \u5faa\u74b0\u4e2d\uff1a${cur}\uff08\u7d05\u8272 \u2194\uff09`
      : aimUi.phase === "y"
        ? `X=${aimUi.lockedX}\uff0cY \u5faa\u74b0\uff1a${cur}\uff08\u85cd\u8272 \u2191\uff09`
        : "";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-neutral-200 px-4 py-6">
      <p className="max-w-lg text-center text-sm text-neutral-600">{message}</p>
      {phaseHint ? (
        <p className="text-center text-xs text-neutral-500">{phaseHint}</p>
      ) : null}

      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="max-w-full cursor-pointer rounded-lg border border-neutral-300 bg-[#f8f6f1] shadow-md"
        style={{ touchAction: "none" }}
        onPointerDown={() => confirmAim()}
      />

      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={confirmAim}
          disabled={gameOver || ringsLeft <= 0 || aimUi.phase === "flying"}
          className="rounded-md bg-neutral-800 px-4 py-2 text-sm text-white disabled:opacity-40"
        >
          {aimUi.phase === "x"
            ? "\u9396\u5b9a X"
            : aimUi.phase === "y"
              ? "\u9396\u5b9a Y \u4e26\u6295\u51fa"
              : "..."}
        </button>
        <button
          type="button"
          onClick={restart}
          className="rounded-md border border-neutral-400 px-4 py-2 text-sm text-neutral-700"
        >
          {"\u518d\u73a9\u4e00\u6b21"}
        </button>
        <a
          href="/"
          className="rounded-md border border-neutral-400 px-4 py-2 text-sm text-neutral-700"
        >
          {"\u8fd4\u56de\u9996\u9801"}
        </a>
      </div>
    </div>
  );
}
