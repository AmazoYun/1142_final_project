"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import GameHudBar from "@/components/game/GameHudBar";
import GameRoundEndModal from "@/components/game/GameRoundEndModal";
import { hasCollectible } from "@/lib/collectibles/acquireItem";
import { awardStallReward } from "@/lib/collectibles/awardStallReward";
import { ringTossRewardEligible } from "@/lib/collectibles/rewardConditions";
import { STALL_REWARD } from "@/lib/collectibles/stallRewards";
import { returnToMarketAfterRound } from "@/lib/economy/returnToMarket";
import { finalizeGameRound } from "@/lib/economy/processRoundEnd";
import { trySpendPlayCost } from "@/lib/economy/playGame";
import { reportStallScore } from "@/lib/player/reportStallScore";
import { navigateWithFade } from "@/lib/navigation/navigateWithFade";
import { usePageFadeIn } from "@/lib/navigation/usePageFadeIn";
import { useTokenStore } from "@/store/tokenStore";
import { loadRingTossAssets, type LoadedRingTossAssets } from "@/lib/ringtoss/assets";
import { createRingTossSoundFx, type RingTossSoundFx } from "@/lib/ringtoss/sounds";
import {
  activeTargets,
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
import {
  assignBonusBottles,
  buildBottleTargets,
  readBackgroundImageData,
} from "@/lib/ringtoss/bottleLayout";
import {
  drawAimCrosshair,
  drawBonusBottleGlows,
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
/** 5 個紅光目標 + 容許誤套一般酒瓶的額外套環 */
const RINGS_PER_ROUND = 8;
const HIT_SCORE = 20;
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

function comboMultiplier(consecutiveHits: number): number {
  if (consecutiveHits >= 5) return 1.5;
  if (consecutiveHits >= 4) return 1.4;
  if (consecutiveHits >= 3) return 1.3;
  return 1;
}

function resetTargets(cells: CellTarget[]): CellTarget[] {
  return assignBonusBottles(cells);
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
  const active = activeTargets(targets);
  if (aim.phase === "x") {
    const gx = cycleValueForAim(active, aim.cycleIndex, "x", null);
    const target = active.find((t) => t.gx === gx);
    return { gx, gy: target?.gy ?? 1 };
  }
  if (aim.phase === "y" && aim.lockedX != null) {
    return {
      gx: aim.lockedX,
      gy: cycleValueForAim(active, aim.cycleIndex, "y", aim.lockedX),
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
  drawBonusBottleGlows(ctx, assets, targets, cw, ch);

  const active = activeTargets(targets);
  const hlX =
    aim.phase === "x" ? cycleValueForAim(active, aim.cycleIndex, "x", null) : aim.lockedX;
  const hlY =
    aim.phase === "y"
      ? cycleValueForAim(active, aim.cycleIndex, "y", aim.lockedX)
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
  const sfxRef = useRef<RingTossSoundFx | null>(null);

  const [score, setScore] = useState(0);
  const [ringsLeft, setRingsLeft] = useState(RINGS_PER_ROUND);
  const [gameOver, setGameOver] = useState(false);
  const [roundEnd, setRoundEnd] = useState<{ score: number; lotteryYuan: number } | null>(null);
  const stallRewardGrantedRef = useRef(false);
  const roundEndHandledRef = useRef(false);
  const scoreRef = useRef(0);
  const consecutiveHitsRef = useRef(0);
  const [aimUi, setAimUi] = useState<AimState>(initialAim);
  const [targetsReady, setTargetsReady] = useState(false);

  const tryGrantRingTossReward = useCallback(() => {
    if (stallRewardGrantedRef.current) return;
    if (!ringTossRewardEligible(targetsRef.current)) return;

    stallRewardGrantedRef.current = true;
    const rewardId = STALL_REWARD.ringtoss;
    if (hasCollectible(rewardId)) return;

    awardStallReward("ringtoss");
  }, []);

  usePageFadeIn();
  const router = useRouter();
  const tokens = useTokenStore((s) => s.tokens);

  const syncAimUi = useCallback(() => {
    setAimUi({ ...aimRef.current });
  }, []);

  const resetGame = useCallback(() => {
    stallRewardGrantedRef.current = false;
    roundEndHandledRef.current = false;
    scoreRef.current = 0;
    consecutiveHitsRef.current = 0;
    throwIdRef.current += 1;
    if (flyTimerRef.current) clearTimeout(flyTimerRef.current);
    landedRingsRef.current = [];
    targetsRef.current = resetTargets(playableCellsRef.current);
    ringRef.current = createRing();
    aimRef.current = initialAim();
    lastCycleTickRef.current = performance.now();
    setScore(0);
    setRingsLeft(RINGS_PER_ROUND);
    setGameOver(false);
    setRoundEnd(null);
    syncAimUi();
  }, [syncAimUi]);

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

      if (target) {
        sfxRef.current?.playHit();
        target.hit = true;
        const land = ringLandAt(gx, gy);
        landedRingsRef.current.push({ gx, gy, x: land.x, y: land.y });
        consecutiveHitsRef.current += 1;
        const pts = Math.round(HIT_SCORE * comboMultiplier(consecutiveHitsRef.current));
        setScore((s) => {
          const next = s + pts;
          scoreRef.current = next;
          return next;
        });
        tryGrantRingTossReward();
      } else {
        sfxRef.current?.playMiss();
        consecutiveHitsRef.current = 0;
      }

      setRingsLeft((left) => {
        const next = left - 1;
        if (next <= 0) {
          tryGrantRingTossReward();
          reportStallScore("ringtoss", scoreRef.current);
          setGameOver(true);
          if (!roundEndHandledRef.current) {
            roundEndHandledRef.current = true;
            const summary = finalizeGameRound(scoreRef.current);
            setRoundEnd({ score: summary.score, lotteryYuan: summary.lotteryYuan });
          }
        } else {
          ringRef.current = createRing();
          resetAimForNextThrow();
        }
        syncAimUi();
        return next;
      });
    },
    [resetAimForNextThrow, syncAimUi, tryGrantRingTossReward],
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
      sfxRef.current?.playToss();
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
    if (!targetsReady || gameOver || ringsLeft <= 0 || ringRef.current.flying) return;

    const aim = aimRef.current;
    const active = activeTargets(targetsRef.current);
    if (active.length === 0) return;

    const axis = aim.phase === "x" ? "x" : "y";
    const value = cycleValueForAim(
      active,
      aim.cycleIndex,
      axis,
      aim.lockedX,
    );

    if (aim.phase === "x") {
      aim.lockedX = value;
      aim.phase = "y";
      aim.cycleIndex = 0;
      lastCycleTickRef.current = performance.now();
      syncAimUi();
      return;
    }

    if (aim.phase === "y" && aim.lockedX != null) {
      aim.lockedY = value;
      launchToCell(aim.lockedX, value);
    }
  }, [targetsReady, gameOver, ringsLeft, launchToCell, syncAimUi]);

  const tick = useCallback(
    (now: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const aim = aimRef.current;
      const ring = ringRef.current;
      const targets = targetsRef.current;
      const active = activeTargets(targets);

      if (
        !gameOver &&
        ringsLeft > 0 &&
        !ring.flying &&
        active.length > 0 &&
        (aim.phase === "x" || aim.phase === "y")
      ) {
        if (now - lastCycleTickRef.current >= CYCLE_MS) {
          const cycleLen = cycleLengthForAim(
            active,
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
    const sfx = createRingTossSoundFx();
    sfxRef.current = sfx;
    sfx.preload();
    return () => {
      sfx.dispose();
      sfxRef.current = null;
    };
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
        playableCellsRef.current = playable.map(({ gx, gy, points }) => ({
          gx,
          gy,
          points,
          hit: false,
        }));
        targetsRef.current = assignBonusBottles(playableCellsRef.current);
        landedRingsRef.current = [];
        setTargetsReady(playableCellsRef.current.length > 0);
      })
      .catch(() => {
        assetsRef.current = null;
        setTargetsReady(false);
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

  const actionLabel =
    aimUi.phase === "x" ? "鎖定 X" : aimUi.phase === "y" ? "鎖定 Y 並投出" : "...";

  return (
    <div ref={stageRef} className="ringtoss-stage">
      <canvas
        ref={canvasRef}
        className="ringtoss-stage__canvas"
        onPointerDown={() => confirmAim()}
      />

      <button
        type="button"
        className="ringtoss-back-link"
        onClick={() => void navigateWithFade(router, "/market")}
      >
        ← 返回夜市
      </button>

      <GameHudBar score={score} resource={ringsLeft} resourceLabel="套圈" />

      <button
        type="button"
        onClick={confirmAim}
        disabled={!targetsReady || gameOver || ringsLeft <= 0 || aimUi.phase === "flying"}
        className="ringtoss-action-btn"
      >
        {actionLabel}
      </button>

      <GameRoundEndModal
        open={gameOver && roundEnd !== null}
        score={roundEnd?.score ?? 0}
        lotteryYuan={roundEnd?.lotteryYuan ?? 0}
        tokens={tokens}
        onPlayAgain={() => {
          if (!trySpendPlayCost()) return;
          resetGame();
        }}
        onReturnToMarket={() => returnToMarketAfterRound(router)}
      />
    </div>
  );
}
