"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import GameHudBar from "@/components/game/GameHudBar";
import { awardStallReward } from "@/lib/collectibles/awardStallReward";
import { loadRingTossAssets, type LoadedRingTossAssets } from "@/lib/ringtoss/assets";
import {
  cycleLengthForAim,
  cycleValueForAim,
  hasActiveBottle,
} from "@/lib/ringtoss/aimCycle";
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  LAUNCH_POINT,
  toViewport,
  type CellTarget,
  type ShelfRow,
} from "@/lib/ringtoss/boardLayout";
import { buildBottleTargets, readBackgroundImageData } from "@/lib/ringtoss/bottleLayout";
import {
  drawAimCrosshair,
  drawBottleSprite,
  drawHitLabel,
  drawLandedRingSprite,
  drawRingSprite,
  drawRingTossBackground,
  drawTargetHighlights,
  ringLandAt,
} from "@/lib/ringtoss/drawSprites";

const W = BOARD_WIDTH;
const H = BOARD_HEIGHT;
const RINGS_PER_ROUND = 5;
const CYCLE_MS = 260;
const FLY_MS = 650;
const RING_RADIUS = 20;

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

type LandedRing = { gx: number; gy: number; x: number; y: number };

type AimPhase = "x" | "y" | "flying";

type AimState = {
  phase: AimPhase;
  cycleIndex: number;
  lockedX: number | null;
  lockedY: number | null;
};

function initialAim(): AimState {
  return { phase: "x", cycleIndex: 0, lockedX: null, lockedY: null };
}

function resetTargets(cells: CellTarget[]): CellTarget[] {
  return cells.map((t) => ({ ...t, hit: false }));
}

function createRing(): Ring {
  return {
    x: LAUNCH_POINT.x,
    y: LAUNCH_POINT.y,
    r: RING_RADIUS,
    flying: false,
    fromX: LAUNCH_POINT.x,
    fromY: LAUNCH_POINT.y,
    toX: LAUNCH_POINT.x,
    toY: LAUNCH_POINT.y,
    flyStart: 0,
  };
}

function aimGridPosition(aim: AimState, targets: CellTarget[]): { gx: number; gy: number } {
  if (aim.phase === "x") {
    const gx = cycleValueForAim(targets, aim.cycleIndex, "x", null);
    const target = targets.find((t) => !t.hit && t.gx === gx);
    return { gx, gy: target?.gy ?? 1 };
  }
  if (aim.phase === "y" && aim.lockedX != null) {
    return {
      gx: aim.lockedX,
      gy: cycleValueForAim(targets, aim.cycleIndex, "y", aim.lockedX),
    };
  }
  if (aim.lockedX != null && aim.lockedY != null) {
    return { gx: aim.lockedX, gy: aim.lockedY };
  }
  return { gx: 4, gy: 1 };
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  assets: LoadedRingTossAssets | null,
  ring: Ring,
  aim: AimState,
  targets: CellTarget[],
  landedRings: LandedRing[],
  ringsLeft: number,
  gameOver: boolean,
  cw: number,
  ch: number,
) {
  drawRingTossBackground(ctx, assets, cw, ch);

  const hlX = aim.phase === "x" ? cycleValueForAim(targets, aim.cycleIndex, "x", null) : aim.lockedX;
  const hlY =
    aim.phase === "y"
      ? cycleValueForAim(targets, aim.cycleIndex, "y", aim.lockedX)
      : aim.lockedY;
  const { gx: aimGx, gy: aimGy } = aimGridPosition(aim, targets);

  drawTargetHighlights(
    ctx,
    assets,
    targets,
    hlX,
    hlY,
    aim.phase,
    aim.lockedX,
    aim.lockedY,
    cw,
    ch,
  );

  if (aim.phase !== "flying" && hasActiveBottle(targets, aimGx, aimGy)) {
    drawAimCrosshair(ctx, assets, aimGx, aimGy, cw, ch);
  }

  for (const landed of landedRings) {
    drawLandedRingSprite(ctx, assets, landed.gx, landed.gy as ShelfRow, RING_RADIUS, cw, ch);
  }

  for (const { gx, gy } of targets) {
    drawBottleSprite(ctx, assets, gx, gy, cw, ch);
  }

  if (ring.flying) {
    const t = Math.min(1, (performance.now() - ring.flyStart) / FLY_MS);
    const ease = 1 - (1 - t) ** 2.2;
    const rx = ring.fromX + (ring.toX - ring.fromX) * ease;
    const ry = ring.fromY + (ring.toY - ring.fromY) * ease - Math.sin(t * Math.PI) * 55;
    const ringScreen = toViewport(rx, ry, cw, ch);
    drawRingSprite(ctx, assets, ringScreen.x, ringScreen.y, ring.r, cw, ch);
  }

  for (const { gx, gy, hit } of targets) {
    if (hit) drawHitLabel(ctx, gx, gy as ShelfRow, cw, ch);
  }
}

export default function RingTossGame() {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasSizeRef = useRef({ width: W, height: H });
  const assetsRef = useRef<LoadedRingTossAssets | null>(null);
  const ringRef = useRef<Ring>(createRing());
  const landedRingsRef = useRef<LandedRing[]>([]);
  const playableCellsRef = useRef<CellTarget[]>([]);
  const targetsRef = useRef<CellTarget[]>([]);
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
  const stallRewardGrantedRef = useRef(false);
  const [aimUi, setAimUi] = useState<AimState>(initialAim);

  const syncAimUi = useCallback(() => {
    setAimUi({ ...aimRef.current });
  }, []);

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
        const land = ringLandAt(gx, gy);
        landedRingsRef.current.push({ gx, gy, x: land.x, y: land.y });
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
          if (!stallRewardGrantedRef.current) {
            stallRewardGrantedRef.current = true;
            awardStallReward("ringtoss");
          }
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
    const targets = targetsRef.current;
    const axis = aim.phase === "x" ? "x" : "y";
    const value = cycleValueForAim(
      targets,
      aim.cycleIndex,
      axis,
      aim.lockedX,
    );

    if (aim.phase === "x") {
      aim.lockedX = value;
      aim.phase = "y";
      aim.cycleIndex = 0;
      lastCycleTickRef.current = performance.now();
      setMessage(`X=${value}\u3002\u7b2c\u4e8c\u6b65\uff1a\u9396\u5b9a Y\uff08\u50c5\u5269\u9918\u74f6\u5b50\uff09`);
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
      const targets = targetsRef.current;

      if (
        !gameOver &&
        ringsLeft > 0 &&
        !ring.flying &&
        (aim.phase === "x" || aim.phase === "y")
      ) {
        if (now - lastCycleTickRef.current >= CYCLE_MS) {
          const cycleLen = cycleLengthForAim(
            targets,
            aim.phase === "x" ? "x" : "y",
            aim.lockedX,
          );
          if (cycleLen > 0) {
            aim.cycleIndex = (aim.cycleIndex + 1) % cycleLen;
            lastCycleTickRef.current = now;
            syncAimUi();
          }
        }
      }

      const { width: cw, height: ch } = canvasSizeRef.current;
      drawScene(
        ctx,
        assetsRef.current,
        ring,
        aim,
        targets,
        landedRingsRef.current,
        ringsLeft,
        gameOver,
        cw,
        ch,
      );
      animRef.current = requestAnimationFrame(tick);
    },
    [gameOver, ringsLeft, syncAimUi],
  );

  useEffect(() => {
    document.title = "套圈圈｜無人夜市";
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;

    const syncSize = () => {
      const cw = stage.clientWidth;
      const ch = stage.clientHeight;
      if (cw <= 0 || ch <= 0) return;
      canvas.width = cw;
      canvas.height = ch;
      canvasSizeRef.current = { width: cw, height: ch };
    };

    syncSize();
    const observer = new ResizeObserver(syncSize);
    observer.observe(stage);
    window.addEventListener("resize", syncSize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncSize);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadRingTossAssets()
      .then((assets) => {
        if (cancelled) return;
        assetsRef.current = assets;
        const imageData = readBackgroundImageData(
          assets.background,
          BOARD_WIDTH,
          BOARD_HEIGHT,
        );
        const playable = imageData
          ? buildBottleTargets(imageData, BOARD_WIDTH, BOARD_HEIGHT)
          : [];
        playableCellsRef.current = playable;
        targetsRef.current = resetTargets(playable);
        landedRingsRef.current = [];
      })
      .catch(() => {
        assetsRef.current = null;
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  const targets = targetsRef.current;
  const cur = cycleValueForAim(
    targets,
    aimUi.cycleIndex,
    aimUi.phase === "y" ? "y" : "x",
    aimUi.lockedX,
  );
  const phaseHint =
    aimUi.phase === "x"
      ? `X \u5faa\u74b0\u4e2d\uff1a${cur}`
      : aimUi.phase === "y"
        ? `X=${aimUi.lockedX}\uff0cY \u5faa\u74b0\uff1a${cur}`
        : "";

  const actionLabel =
    aimUi.phase === "x"
      ? "鎖定 X"
      : aimUi.phase === "y"
        ? "鎖定 Y 並投出"
        : "...";

  return (
    <div ref={stageRef} className="ringtoss-stage">
      <canvas
        ref={canvasRef}
        className="ringtoss-stage__canvas"
        onPointerDown={() => confirmAim()}
      />

      <Link href="/market" className="ringtoss-back-link">
        ← 返回夜市
      </Link>

      <GameHudBar score={score} resource={ringsLeft} resourceLabel="套圈" />

      <div className="ringtoss-message">
        <p>{message}</p>
        {phaseHint ? <p className="mt-0.5 text-xs opacity-90">{phaseHint}</p> : null}
      </div>

      <button
        type="button"
        onClick={confirmAim}
        disabled={gameOver || ringsLeft <= 0 || aimUi.phase === "flying"}
        className="ringtoss-action-btn"
      >
        {actionLabel}
      </button>
    </div>
  );
}
