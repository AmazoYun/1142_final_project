"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useGameRoundActive } from "@/components/game/GameRoundActiveContext";
import GameHudBar from "@/components/game/GameHudBar";
import GameRoundEndModal from "@/components/game/GameRoundEndModal";
import { hasCollectible } from "@/lib/collectibles/acquireItem";
import { isGameInputBlocked } from "@/lib/collectibles/isGameInputBlocked";
import { awardStallReward } from "@/lib/collectibles/awardStallReward";
import { balloonAdvancedRewardEligible } from "@/lib/collectibles/rewardConditions";
import { STALL_REWARD } from "@/lib/collectibles/stallRewards";
import { returnToMarketAfterRound } from "@/lib/economy/returnToMarket";
import { finalizeGameRound } from "@/lib/economy/processRoundEnd";
import { trySpendPlayCost } from "@/lib/economy/playGame";
import { clearStallRoundDismissed } from "@/lib/game/stallRoundLeave";
import { useStallRoundEndLeave } from "@/lib/game/useStallRoundEndLeave";
import { reportStallScore } from "@/lib/player/reportStallScore";
import { useCollectibleStore } from "@/store/collectibleStore";
import { useTokenStore } from "@/store/tokenStore";
import {
  BALLOON_ADVANCED_BUTTON,
  BALLOON_COLORS,
  loadBalloonAssets,
  type BalloonAssets,
  type BalloonColor,
} from "@/lib/balloonshoot/assets";
import { playImpactSound } from "@/lib/sfx/randomSfx";
import {
  aHookPosition,
  BALLOON_BODY_DROP,
  BALLOON_TIE_Y_RATIO,
  bHookPosition,
  type BalloonZone,
} from "@/lib/balloonshoot/hookLayout";
import {
  DEFAULT_BALLOON_LAYOUT,
  normalizeBalloonLayout,
  type BalloonLayoutData,
} from "@/lib/balloonshoot/layoutData";
import { createBalloonShootSoundFx, type BalloonShootSoundFx } from "@/lib/balloonshoot/sounds";

const W = 960;
const H = 480;
const INITIAL_BULLETS = 10;
const PLAY_LEFT = 8;
const PLAY_RIGHT = W - 8;
const PLAY_TOP = 40;
const PLAY_BOTTOM = H - 12;

const SCOPE_CX = W / 2;
const SCOPE_CY = H / 2;
const SCOPE_R = 100;
const SCOPE_DIAMETER = SCOPE_R * 2;
const ZOOM = 1.2;
const CROSSHAIR_R = 5;

type Zone = BalloonZone;

const BALLOON_SIZE_SCALE = 1.32;

type Balloon = {
  id: string;
  zone: Zone;
  area: "A" | "B";
  ringIndex?: number;
  bRow?: number;
  bCol?: number;
  color: BalloonColor;
  r: number;
  alive: boolean;
  popStart?: number;
  x: number;
  y: number;
};

type ShotFlash = { x: number; y: number; start: number };

const ZONE_HIT_SCORE: Record<Zone, number> = {
  left: 20,
  center: 10,
  right: 20,
};

const ZONE_RING_BONUS: Record<Zone, number> = {
  left: 100,
  center: 50,
  right: 100,
};

const ROT_SPEED: Record<Zone, number> = {
  left: 0.016,
  center: 0.009,
  right: 0.016,
};

const BALLOON_R: Record<Zone, number> = {
  left: 16,
  center: 22,
  right: 16,
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function balloonBodyY(b: Balloon) {
  return b.y + b.r * BALLOON_BODY_DROP;
}

function balloonRx(b: Balloon) {
  return b.r * 0.72;
}

function pointHitsBalloon(wx: number, wy: number, b: Balloon) {
  const bodyY = balloonBodyY(b);
  const ex = (wx - b.x) / (balloonRx(b) + 2);
  const ey = (wy - bodyY) / (b.r + 2);
  return ex * ex + ey * ey < 1;
}

function findBalloonAt(wx: number, wy: number, balloons: Balloon[]): Balloon | null {
  for (const pass of ["A", "B"] as const) {
    for (const b of balloons) {
      if (!b.alive || b.area !== pass) continue;
      if (pointHitsBalloon(wx, wy, b)) return b;
    }
  }
  return null;
}

function createBalloons(layout: BalloonLayoutData): Balloon[] {
  const list: Balloon[] = [];
  const zones: Zone[] = ["left", "center", "right"];

  for (const zone of zones) {
    const r = BALLOON_R[zone] * BALLOON_SIZE_SCALE;

    for (let i = 0; i < 6; i++) {
      const hook = aHookPosition(zone, i, 0, layout);
      list.push({
        id: `${zone}-A-${i}`,
        zone,
        area: "A",
        ringIndex: i,
        color: BALLOON_COLORS[i % BALLOON_COLORS.length]!,
        r,
        alive: true,
        x: hook.x,
        y: hook.y,
      });
    }

    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 4; col++) {
        const idx = row * 4 + col;
        const color = BALLOON_COLORS[idx % BALLOON_COLORS.length]!;
        const hook = bHookPosition(zone, row, col, layout);
        list.push({
          id: `${zone}-B-${idx}`,
          zone,
          area: "B",
          bRow: row,
          bCol: col,
          color,
          r,
          alive: true,
          x: hook.x,
          y: hook.y,
        });
      }
    }
  }

  return list;
}

function applyAdvancedPops(
  balloons: Balloon[],
  targetColors: BalloonColor[],
  now: number,
  popBalloon: (b: Balloon, now: number, options?: { silent?: boolean }) => void,
) {
  const colorSet = new Set(targetColors);
  for (const b of balloons) {
    if (!b.alive) continue;

    const isSideA = b.area === "A" && (b.zone === "left" || b.zone === "right");
    const isSideBTarget =
      b.area === "B" &&
      (b.zone === "left" || b.zone === "right") &&
      colorSet.has(b.color);

    if (isSideA || isSideBTarget) {
      popBalloon(b, now, { silent: true });
    }
  }
}

function updateRotatingPositions(
  balloons: Balloon[],
  angles: Record<Zone, number>,
  layout: BalloonLayoutData,
) {
  for (const b of balloons) {
    if (b.area !== "A" || b.ringIndex === undefined) continue;
    const hook = aHookPosition(b.zone, b.ringIndex, angles[b.zone], layout);
    b.x = hook.x;
    b.y = hook.y;
  }
}

function drawCoverBackground(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  width: number,
  height: number,
) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.max(width / iw, height / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, (width - dw) / 2, (height - dh) / 2, dw, dh);
}

function drawBalloonShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  drawTop: number,
  w: number,
  h: number,
  broken = false,
) {
  const shadowY = drawTop + h * (broken ? 0.78 : 0.88);
  const rx = w * (broken ? 0.42 : 0.36);
  const ry = Math.max(3, h * (broken ? 0.09 : 0.075));
  ctx.save();
  ctx.fillStyle = broken ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.26)";
  ctx.beginPath();
  ctx.ellipse(x, shadowY, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBalloonSprite(
  ctx: CanvasRenderingContext2D,
  assets: BalloonAssets,
  b: Balloon,
) {
  if (!b.alive) {
    const img = assets.broken[b.color];
    const targetH = b.r * 2.4;
    const scale = targetH / img.naturalHeight;
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    const drawY = b.y - h * BALLOON_TIE_Y_RATIO;
    drawBalloonShadow(ctx, b.x, drawY, w, h, true);
    ctx.drawImage(img, b.x - w / 2, drawY, w, h);
    return;
  }

  const img = assets.full[b.color];
  const targetH = b.r * 2.15;
  const scale = targetH / img.naturalHeight;
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  const drawY = b.y - h * BALLOON_TIE_Y_RATIO;
  drawBalloonShadow(ctx, b.x, drawY, w, h);
  ctx.drawImage(img, b.x - w / 2, drawY, w, h);
}

function renderGameScene(
  ctx: CanvasRenderingContext2D,
  assets: BalloonAssets | null,
  balloons: Balloon[],
) {
  if (assets?.background) {
    drawCoverBackground(ctx, assets.background, W, H);
  } else {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#e8e4df");
    grad.addColorStop(1, "#d4cfc8");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  if (assets) {
    for (const b of balloons) {
      if (b.area === "B" && b.alive) drawBalloonSprite(ctx, assets, b);
    }
    for (const b of balloons) {
      if (b.area === "A" && b.alive) drawBalloonSprite(ctx, assets, b);
    }
    for (const b of balloons) {
      if (!b.alive) drawBalloonSprite(ctx, assets, b);
    }
  }

}

function drawScopeView(
  ctx: CanvasRenderingContext2D,
  buffer: HTMLCanvasElement,
  aimWorld: { x: number; y: number },
  now: number,
  shotFlash: ShotFlash | null,
  aimTarget: Balloon | null,
) {
  ctx.clearRect(0, 0, W, H);

  ctx.drawImage(buffer, 0, 0);

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.88)";
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(SCOPE_CX, SCOPE_CY, SCOPE_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
  ctx.restore();

  const viewW = SCOPE_DIAMETER / ZOOM;
  const viewH = SCOPE_DIAMETER / ZOOM;
  const sx = clamp(aimWorld.x - viewW / 2, 0, W - viewW);
  const sy = clamp(aimWorld.y - viewH / 2, 0, H - viewH);

  ctx.save();
  ctx.beginPath();
  ctx.arc(SCOPE_CX, SCOPE_CY, SCOPE_R, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(
    buffer,
    sx,
    sy,
    viewW,
    viewH,
    SCOPE_CX - SCOPE_R,
    SCOPE_CY - SCOPE_R,
    SCOPE_DIAMETER,
    SCOPE_DIAMETER,
  );
  ctx.restore();

  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(SCOPE_CX, SCOPE_CY, SCOPE_R, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = aimTarget ? "rgba(255,80,80,0.95)" : "rgba(255,255,255,0.95)";
  ctx.lineWidth = aimTarget ? 2 : 1.5;
  ctx.beginPath();
  ctx.arc(SCOPE_CX, SCOPE_CY, CROSSHAIR_R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(SCOPE_CX - CROSSHAIR_R - 4, SCOPE_CY);
  ctx.lineTo(SCOPE_CX + CROSSHAIR_R + 4, SCOPE_CY);
  ctx.moveTo(SCOPE_CX, SCOPE_CY - CROSSHAIR_R - 4);
  ctx.lineTo(SCOPE_CX, SCOPE_CY + CROSSHAIR_R + 4);
  ctx.stroke();

  if (shotFlash) {
    const t = (now - shotFlash.start) / 220;
    if (t < 1) {
      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = "#fbbf24";
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(SCOPE_CX, SCOPE_CY, 8 + t * 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }
}

export default function BalloonShootGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bufferRef = useRef<HTMLCanvasElement | null>(null);
  const assetsRef = useRef<BalloonAssets | null>(null);
  const layoutRef = useRef<BalloonLayoutData>(normalizeBalloonLayout(DEFAULT_BALLOON_LAYOUT));
  const balloonsRef = useRef<Balloon[]>(createBalloons(layoutRef.current));
  const aimWorldRef = useRef({ x: W / 2, y: H / 2 });
  const aimModeRef = useRef(false);
  const rotationRef = useRef<Record<Zone, number>>({ left: 0, center: 0, right: 0 });
  const scoredARef = useRef<Set<Zone>>(new Set());
  const shotFlashRef = useRef<ShotFlash | null>(null);
  const sfxRef = useRef<BalloonShootSoundFx | null>(null);

  const [score, setScore] = useState(0);
  const [bullets, setBullets] = useState(INITIAL_BULLETS);
  const [gameOver, setGameOver] = useState(false);
  const [aimMode, setAimMode] = useState(false);
  const [roundEnd, setRoundEnd] = useState<{ score: number; lotteryYuan: number } | null>(null);
  const [advancedStarted, setAdvancedStarted] = useState(false);
  const [layoutReady, setLayoutReady] = useState(false);

  const router = useRouter();
  const tokens = useTokenStore((s) => s.tokens);
  const hydrateCollectibles = useCollectibleStore((s) => s.hydrate);
  const hasFortuneYi = useCollectibleStore((s) => s.hasAcquired("fortune-slip-yi"));
  const hasBalloonReward = useCollectibleStore((s) => s.hasAcquired(STALL_REWARD.balloonshoot));
  const { setRoundActive } = useGameRoundActive();

  useEffect(() => {
    hydrateCollectibles();
  }, [hydrateCollectibles]);

  useEffect(() => {
    setRoundActive(!gameOver);
  }, [gameOver, setRoundActive]);

  const scoreRef = useRef(0);
  const bulletsRef = useRef(INITIAL_BULLETS);
  const gameOverRef = useRef(false);
  const stallRewardGrantedRef = useRef(false);
  const advancedModeRef = useRef(false);
  const advancedTargetColorsRef = useRef<BalloonColor[]>([]);
  const roundEndHandledRef = useRef(false);

  const addScore = useCallback((delta: number) => {
    scoreRef.current += delta;
    setScore(scoreRef.current);
  }, []);

  const tryAwardBalloonReward = useCallback(() => {
    if (stallRewardGrantedRef.current) return;
    if (
      !balloonAdvancedRewardEligible(
        balloonsRef.current,
        advancedModeRef.current,
        advancedTargetColorsRef.current,
      )
    ) {
      return;
    }

    stallRewardGrantedRef.current = true;
    const rewardId = STALL_REWARD.balloonshoot;
    if (hasCollectible(rewardId)) return;

    awardStallReward("balloonshoot");
  }, []);

  const spendBullet = useCallback(() => {
    if (bulletsRef.current <= 0) return false;
    bulletsRef.current -= 1;
    setBullets(bulletsRef.current);
    if (bulletsRef.current <= 0) {
      gameOverRef.current = true;
      setGameOver(true);
      aimModeRef.current = false;
      setAimMode(false);
      sfxRef.current?.stopAiming();
      sfxRef.current?.stopRotating();
      tryAwardBalloonReward();
      reportStallScore("balloonshoot", scoreRef.current);
      if (!roundEndHandledRef.current) {
        roundEndHandledRef.current = true;
        const summary = finalizeGameRound(scoreRef.current);
        setRoundEnd({ score: summary.score, lotteryYuan: summary.lotteryYuan });
      }
    }
    return true;
  }, [tryAwardBalloonReward]);

  const tryScoreAZone = useCallback(
    (zone: Zone) => {
      if (scoredARef.current.has(zone)) return;
      const aBalloons = balloonsRef.current.filter((b) => b.zone === zone && b.area === "A");
      if (!aBalloons.every((b) => !b.alive)) return;
      scoredARef.current.add(zone);
      addScore(ZONE_RING_BONUS[zone]);
    },
    [addScore],
  );

  const popBalloon = useCallback(
    (b: Balloon, now: number, options?: { silent?: boolean }) => {
      if (!b.alive) return;

      b.alive = false;
      b.popStart = now;
      if (options?.silent) return;

      addScore(ZONE_HIT_SCORE[b.zone]);
      if (b.area === "A") {
        tryScoreAZone(b.zone);
      }
      tryAwardBalloonReward();
    },
    [addScore, tryAwardBalloonReward, tryScoreAZone],
  );

  const popBalloonRef = useRef(popBalloon);
  popBalloonRef.current = popBalloon;

  const startAdvancedMode = useCallback(() => {
    if (advancedModeRef.current || gameOverRef.current) return;
    if (!hasFortuneYi) return;
    if (hasBalloonReward) return;

    const colors = [...BALLOON_COLORS];
    for (let i = colors.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [colors[i], colors[j]] = [colors[j]!, colors[i]!];
    }

    const targetColors = colors.slice(0, 4);
    advancedTargetColorsRef.current = targetColors;
    advancedModeRef.current = true;
    setAdvancedStarted(true);

    applyAdvancedPops(
      balloonsRef.current,
      targetColors,
      performance.now(),
      popBalloonRef.current,
    );
  }, [hasBalloonReward, hasFortuneYi]);

  const getCanvasPoint = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: W / 2, y: H / 2 };
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    return {
      x: clamp((clientX - rect.left) * sx, PLAY_LEFT, PLAY_RIGHT),
      y: clamp((clientY - rect.top) * sy, PLAY_TOP, PLAY_BOTTOM),
    };
  }, []);

  const shootAtCrosshair = useCallback(
    (now: number) => {
      if (!aimModeRef.current || gameOverRef.current || bulletsRef.current <= 0) return;
      if (!spendBullet()) return;

      const aim = aimWorldRef.current;
      const hit = findBalloonAt(aim.x, aim.y, balloonsRef.current);

      shotFlashRef.current = { x: aim.x, y: aim.y, start: now };

      if (hit) {
        sfxRef.current?.playShoot();
        popBalloonRef.current(hit, now);
      } else {
        sfxRef.current?.playShootMiss();
      }
    },
    [spendBullet],
  );

  useEffect(() => {
    loadBalloonAssets()
      .then((assets) => {
        assetsRef.current = assets;
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadLayout = async () => {
      try {
        const res = await fetch("/api/balloon-layout");
        if (!cancelled && res.ok) {
          const data = (await res.json()) as BalloonLayoutData;
          layoutRef.current = data;
          balloonsRef.current = createBalloons(data);
          if (advancedModeRef.current) {
            applyAdvancedPops(
              balloonsRef.current,
              advancedTargetColorsRef.current,
              performance.now(),
              popBalloonRef.current,
            );
          }
        }
      } catch {
        /* 使用預設布局 */
      } finally {
        if (!cancelled) setLayoutReady(true);
      }
    };

    void loadLayout();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const sfx = createBalloonShootSoundFx();
    sfxRef.current = sfx;
    sfx.preload();
    sfx.startRotating();
    return () => {
      sfx.dispose();
      sfxRef.current = null;
    };
  }, []);

  useEffect(() => {
    const buffer = document.createElement("canvas");
    buffer.width = W;
    buffer.height = H;
    bufferRef.current = buffer;

    const onKeyDown = (e: KeyboardEvent) => {
      if (isGameInputBlocked()) return;
      if (e.code !== "Space" || gameOverRef.current) return;
      e.preventDefault();
      if (e.repeat) return;
      if (bulletsRef.current <= 0) return;
      aimModeRef.current = true;
      setAimMode(true);
      sfxRef.current?.startAiming();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (isGameInputBlocked()) return;
      if (e.code !== "Space") return;
      e.preventDefault();
      aimModeRef.current = false;
      setAimMode(false);
      sfxRef.current?.stopAiming();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    const canvas = canvasRef.current;
    const buffer = bufferRef.current;
    if (!canvas || !buffer) return;
    const ctx = canvas.getContext("2d");
    const bctx = buffer.getContext("2d");
    if (!ctx || !bctx) return;

    const tick = (now: number) => {
      const layout = layoutRef.current;
      const rot = rotationRef.current;
      rot.left += ROT_SPEED.left;
      rot.center += ROT_SPEED.center;
      rot.right += ROT_SPEED.right;
      updateRotatingPositions(balloonsRef.current, rot, layout);

      if (shotFlashRef.current && now - shotFlashRef.current.start > 220) {
        shotFlashRef.current = null;
      }

      const balloons = balloonsRef.current;
      renderGameScene(bctx, assetsRef.current, balloons);

      if (aimModeRef.current) {
        const aim = aimWorldRef.current;
        const aimTarget = findBalloonAt(aim.x, aim.y, balloons);
        drawScopeView(ctx, buffer, aim, now, shotFlashRef.current, aimTarget);
      } else {
        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(buffer, 0, 0);
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!aimModeRef.current) return;
    aimWorldRef.current = getCanvasPoint(e.clientX, e.clientY);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!aimModeRef.current || e.button !== 0) return;
    e.preventDefault();
    aimWorldRef.current = getCanvasPoint(e.clientX, e.clientY);
    shootAtCrosshair(performance.now());
  };

  const resetGame = () => {
    balloonsRef.current = createBalloons(layoutRef.current);
    aimWorldRef.current = { x: W / 2, y: H / 2 };
    aimModeRef.current = false;
    rotationRef.current = { left: 0, center: 0, right: 0 };
    scoredARef.current = new Set();
    shotFlashRef.current = null;
    scoreRef.current = 0;
    bulletsRef.current = INITIAL_BULLETS;
    gameOverRef.current = false;
    stallRewardGrantedRef.current = false;
    advancedModeRef.current = false;
    advancedTargetColorsRef.current = [];
    roundEndHandledRef.current = false;
    setScore(0);
    setBullets(INITIAL_BULLETS);
    setGameOver(false);
    setAimMode(false);
    setRoundEnd(null);
    setAdvancedStarted(false);
    sfxRef.current?.startRotating();
  };

  const onAdvancedButtonClick = () => {
    if (advancedModeRef.current || gameOver || !layoutReady) return;
    if (!hasFortuneYi || hasBalloonReward) return;
    sfxRef.current?.playButtonPressed();
    playImpactSound();
    startAdvancedMode();
  };

  const showAdvancedButton = hasFortuneYi && !hasBalloonReward;

  useStallRoundEndLeave(
    "balloonshoot",
    gameOver && roundEnd !== null,
    resetGame,
  );

  return (
    <main className="flex h-full min-h-0 w-full flex-col overflow-hidden">
      <div className="balloonshoot-stage relative min-h-0 min-w-0 flex-1">
        <GameHudBar
          score={score}
          resource={bullets}
          resourceLabel="子彈"
          resourceMax={INITIAL_BULLETS}
        />
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className={`block h-full w-full touch-none ${aimMode ? "cursor-none" : "cursor-default"}`}
          onPointerMove={onPointerMove}
          onPointerDown={onPointerDown}
        />

        {showAdvancedButton ? (
          <button
            type="button"
            className="game-advanced-img-btn"
            disabled={gameOver || !layoutReady}
            aria-label="進階模式"
            onClick={onAdvancedButtonClick}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                advancedStarted
                  ? BALLOON_ADVANCED_BUTTON.pressed
                  : BALLOON_ADVANCED_BUTTON.unpressed
              }
              alt=""
              draggable={false}
            />
          </button>
        ) : null}

        <GameRoundEndModal
          open={gameOver && roundEnd !== null}
          score={roundEnd?.score ?? 0}
          lotteryYuan={roundEnd?.lotteryYuan ?? 0}
          tokens={tokens}
          onPlayAgain={() => {
            clearStallRoundDismissed("balloonshoot");
            if (!trySpendPlayCost()) return;
            resetGame();
          }}
          onReturnToMarket={() => {
            const score = roundEnd?.score ?? 0;
            returnToMarketAfterRound(
              router,
              { stallId: "balloonshoot", score },
              () => {
                gameOverRef.current = false;
                roundEndHandledRef.current = false;
                setGameOver(false);
                setRoundEnd(null);
              },
            );
          }}
        />
      </div>
    </main>
  );
}
