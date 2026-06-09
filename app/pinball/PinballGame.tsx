"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGameRoundActive } from "@/components/game/GameRoundActiveContext";
import GameHudBar from "@/components/game/GameHudBar";
import GameRoundEndModal from "@/components/game/GameRoundEndModal";
import PinballMarbleHud from "@/components/pinball/PinballMarbleHud";
import { awardStallReward } from "@/lib/collectibles/awardStallReward";
import { acquireCollectible, hasCollectible } from "@/lib/collectibles/acquireItem";
import { STALL_REWARD } from "@/lib/collectibles/stallRewards";
import { isGameInputBlocked } from "@/lib/collectibles/isGameInputBlocked";
import { returnToMarketAfterRound } from "@/lib/economy/returnToMarket";
import { finalizeGameRound } from "@/lib/economy/processRoundEnd";
import { trySpendPlayCost } from "@/lib/economy/playGame";
import { clearStallRoundDismissed } from "@/lib/game/stallRoundLeave";
import { useStallRoundEndLeave } from "@/lib/game/useStallRoundEndLeave";
import { reportStallScore } from "@/lib/player/reportStallScore";
import { useCollectibleStore } from "@/store/collectibleStore";
import { useTokenStore } from "@/store/tokenStore";
import {
  loadPinballAssets,
  randomPinballColor,
  type LoadedPinballAssets,
  type PinballColorIndex,
} from "@/lib/pinball/assets";
import {
  drawChargeMeter,
  drawObstacleSprites,
  drawPinballBackground,
  drawPinballSprite,
} from "@/lib/pinball/drawSprites";
import { collideBallWithImageBody, isBallTouchingImageBody } from "@/lib/pinball/imageBody";
import { createPinballSoundFx } from "@/lib/pinball/sounds";
import { playImpactSound } from "@/lib/sfx/randomSfx";
import { migrateToUnifiedLayout } from "@/lib/pinball/unifiedLayout";

import type { LayoutData, Segment, Vec } from "@/lib/pinball/types";
import {
  ballRadiusForColor,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  CENTER_X,
  CHANNEL_BOTTOM,
  CHANNEL_LANE_COUNT,
  CHANNEL_STACK_MAX,
  CHANNEL_TOP,
  CHANNEL_DIVIDER_X,
  CHANNEL_DIVIDER_COLLIDE_TOP,
  channelBallY,
  channelLaneCenterX,
  channelLaneFromX,
  initialBallPos,
  LAUNCH_ARC_CONTROL,
  LAUNCH_DIVIDER_X,
  LAUNCH_EXIT,
  launchArcExitTangent,
  launchArcStart,
  launchDividerFilletCenter,
  launchDividerVerticalSegment,
  LAUNCH_DIVIDER_FILLET_R,
  launchRailCenterX,
  launchRailTravelY,
  LAUNCH_RAIL_LEFT,
  LAUNCH_RAIL_RIGHT,
  PHYSICS_SCALE,
  PLAYFIELD_RIGHT,
  PLAYFIELD_TOP,
  PLAYFIELD_CEILING,
  WALL,
} from "@/lib/pinball/boardLayout";

type Ball = { pos: Vec; vel: Vec; radius: number; launched: boolean; colorIndex: PinballColorIndex };
type SettledBall = { x: number; y: number; colorIndex: PinballColorIndex; lane: number; radius: number };
type Flash = { x: number; y: number; r: number; life: number; color: string };
type ChargeTier = "low" | "mid" | "high";

const emptyLayout: LayoutData = { version: 2, obstacles: [] };

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
function dot(a: Vec, b: Vec) {
  return a.x * b.x + a.y * b.y;
}
function normalize(v: Vec): Vec {
  const len = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / len, y: v.y / len };
}
function reflect(v: Vec, n: Vec): Vec {
  const d = dot(v, n);
  return { x: v.x - 2 * d * n.x, y: v.y - 2 * d * n.y };
}

function getChargeTier(ratio: number): ChargeTier {
  if (ratio < LOW_TIER_MAX) return "low";
  if (ratio < MID_TIER_MAX) return "mid";
  return "high";
}

const MAX_CHARGE_MS = 2000;
const GRAVITY = 0.2 * PHYSICS_SCALE;
const DRAG = 0.996;
/** 牆面／木軌碰撞恢復係數（1 = 無碰撞能量損失） */
const WALL_RESTITUTION = 0.94;
const CHANNEL_SEGMENT_RESTITUTION = 0.94;
const LOW_OBSTACLE_RESTITUTION = 0.92;
const ROUND_OBSTACLE_RESTITUTION = 0.97;
const SCORE_OBSTACLE_RESTITUTION = 0.96;
const TRIANGLE_OBSTACLE_RESTITUTION = 0.92;
const LINE_COLLISION_PUSH = 0.28 * PHYSICS_SCALE;
const ROUND_COLLISION_PUSH = 0.18 * PHYSICS_SCALE;
const MAX_BOUNCE_SPEED = 7.5 * PHYSICS_SCALE;
const LOW_TIER_MAX = 0.34;
const MID_TIER_MAX = 0.74;
const HIGH_TIER_MULTIPLIER = 1.2;
const OBSTACLE_STUCK_MS = 220;
const MAX_SCORE = 500;
const OBSTACLE_HIT_POINTS = 5;
const CHANNEL_BONUS_POINTS = 20;
const CHANNEL_PENALTY_POINTS = 8;


export default function PinballGame() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasSizeRef = useRef({ width: BOARD_WIDTH, height: BOARD_HEIGHT });
  const assetsRef = useRef<LoadedPinballAssets | null>(null);
  const flashesRef = useRef<Flash[]>([]);
  const settledBallsRef = useRef<SettledBall[]>([]);
  const layoutRef = useRef<LayoutData>(emptyLayout);

  const ballsRef = useRef(5);
  const peakBallsRef = useRef(5);
  const stallRewardGrantedRef = useRef(false);
  const scoreRef = useRef(0);
  const comboRef = useRef(1);
  const lastHitRef = useRef(0);
  const chargingRef = useRef(false);
  const chargeStartRef = useRef(0);
  const chargeRatioRef = useRef(0);
  const runDoneRef = useRef(false);
  const inRailRef = useRef(false);
  const railPhaseRef = useRef<0 | 1>(0);
  const railProgressRef = useRef(0);
  const railArcProgressRef = useRef(0);
  const railSpeedRef = useRef(0.02);
  const settleTimeoutRef = useRef<number | null>(null);
  const stuckFramesRef = useRef(0);
  const obstacleStuckRef = useRef<{ index: number; since: number; normal: Vec } | null>(null);
  const noticeTimeoutRef = useRef<number | null>(null);
  const noticeClearTimeoutRef = useRef<number | null>(null);
  const roundScoreRef = useRef(0);
  const scoreMultiplierRef = useRef(1);
  const lowPowerFallbackRef = useRef(false);
  const railDirRef = useRef<1 | -1>(1);
  const launchPowerRef = useRef(0);
  const gameOverRef = useRef(false);
  const roundEndHandledRef = useRef(false);
  const resetGameRef = useRef<() => void>(() => {});

  const router = useRouter();
  const tokens = useTokenStore((s) => s.tokens);
  const hydrateCollectibles = useCollectibleStore((s) => s.hydrate);
  const hasFortuneJia = useCollectibleStore((s) => s.hasAcquired("fortune-slip-jia"));
  const hasPinballMarble = useCollectibleStore((s) => s.hasAcquired("pinball-marble"));
  const hasRingTossReward = useCollectibleStore((s) => s.hasAcquired(STALL_REWARD.ringtoss));

  const [balls, setBalls] = useState(5);
  const [peakBalls, setPeakBalls] = useState(5);
  const [score, setScore] = useState(0);
  const [displayScore, setDisplayScore] = useState(0);
  const [chargeRatio, setChargeRatio] = useState(0);
  const [scoreFlash, setScoreFlash] = useState<"up" | "down" | null>(null);
  const [rewardText, setRewardText] = useState("");
  const [rewardVisible, setRewardVisible] = useState(false);
  const [chargeTier, setChargeTier] = useState<ChargeTier>("low");
  const [status, setStatus] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [roundEnd, setRoundEnd] = useState<{ score: number; lotteryYuan: number } | null>(null);
  const { setRoundActive } = useGameRoundActive();

  useEffect(() => {
    hydrateCollectibles();
  }, [hydrateCollectibles]);

  useEffect(() => {
    setRoundActive(!gameOver);
  }, [gameOver, setRoundActive]);

  const dismissRoundEndUi = useCallback(() => {
    gameOverRef.current = false;
    roundEndHandledRef.current = false;
    setGameOver(false);
    setRoundEnd(null);
    resetGameRef.current();
  }, []);

  useStallRoundEndLeave("pinball", gameOver && roundEnd !== null, dismissRoundEndUi);

  const marbleGrabEnabled =
    hasFortuneJia &&
    !hasPinballMarble &&
    !hasRingTossReward &&
    balls > 0 &&
    !gameOver &&
    !isGameInputBlocked();

  const handleGrabMarble = useCallback(() => {
    if (isGameInputBlocked()) return;
    if (!hasFortuneJia || hasPinballMarble || hasRingTossReward || ballsRef.current <= 0) return;
    const result = acquireCollectible("pinball-marble");
    if (result.success) {
      playImpactSound();
      setStatus("已取得彈珠，可帶至套圈圈使用");
    }
  }, [hasFortuneJia, hasPinballMarble, hasRingTossReward]);

  const initialBall = useMemo<Ball>(() => {
    const colorIndex = 0 as PinballColorIndex;
    const radius = ballRadiusForColor(colorIndex);
    const spawn = initialBallPos(radius);
    return {
      pos: spawn,
      vel: { x: 0, y: 0 },
      radius,
      launched: false,
      colorIndex,
    };
  }, []);

  useEffect(() => {
    const loadLayout = async () => {
      try {
        const res = await fetch("/api/pinball-layout");
        if (!res.ok) {
          setStatus("障礙物布局載入失敗");
          return;
        }
        const data = migrateToUnifiedLayout(await res.json());
        if (data.obstacles.length === 0) {
          setStatus("障礙物布局為空，請還原 data/pinball-layout.saved.json");
          return;
        }
        layoutRef.current = data;
      } catch {
        setStatus("障礙物布局載入失敗");
      }
    };
    loadLayout();
  }, []);

  useEffect(() => {
    ballsRef.current = balls;
    if (balls > peakBallsRef.current) {
      peakBallsRef.current = balls;
      setPeakBalls(balls);
    }
  }, [balls]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setDisplayScore((prev) => {
        if (prev === score) return prev;
        const step = Math.max(1, Math.ceil(Math.abs(score - prev) / 12));
        return prev + Math.sign(score - prev) * step;
      });
    }, 16);
    return () => window.clearInterval(id);
  }, [score]);

  useEffect(() => {
    let cancelled = false;
    loadPinballAssets()
      .then((assets) => {
        if (!cancelled) assetsRef.current = assets;
      })
      .catch(() => {
        assetsRef.current = null;
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const ball: Ball = structuredClone(initialBall);
    ball.colorIndex = randomPinballColor();
    ball.radius = ballRadiusForColor(ball.colorIndex);

    const sfx = createPinballSoundFx();
    sfx.preload();

    const flashScore = (dir: "up" | "down") => {
      setScoreFlash(dir);
      window.setTimeout(() => setScoreFlash(null), 220);
    };

    const clampScore = (v: number) => Math.max(0, Math.min(MAX_SCORE, v));

    const addRoundPoints = (base: number, dir: "up" | "down" = "up") => {
      const scaled = Math.round(base * scoreMultiplierRef.current);
      scoreRef.current = clampScore(scoreRef.current + scaled);
      roundScoreRef.current += scaled;
      setScore(scoreRef.current);
      flashScore(dir);
      return scaled;
    };

    const showRewardNotice = (text: string) => {
      setRewardText(text);
      setRewardVisible(true);
      if (noticeTimeoutRef.current) window.clearTimeout(noticeTimeoutRef.current);
      if (noticeClearTimeoutRef.current) window.clearTimeout(noticeClearTimeoutRef.current);
      noticeTimeoutRef.current = window.setTimeout(() => {
        setRewardVisible(false);
      }, 2000);
      noticeClearTimeoutRef.current = window.setTimeout(() => {
        setRewardText("");
      }, 2400);
    };

    const resetBall = () => {
      ball.colorIndex = randomPinballColor();
      ball.radius = ballRadiusForColor(ball.colorIndex);
      ball.pos = { ...initialBallPos(ball.radius) };
      ball.vel = { x: 0, y: 0 };
      ball.launched = false;
      inRailRef.current = false;
      railPhaseRef.current = 0;
      railProgressRef.current = 0;
      railArcProgressRef.current = 0;
      railDirRef.current = 1;
      lowPowerFallbackRef.current = false;
      launchPowerRef.current = 0;
      chargingRef.current = false;
      chargeStartRef.current = 0;
      chargeRatioRef.current = 0;
      setChargeRatio(0);
      setChargeTier("low");
      sfx.stopPress();
      scoreMultiplierRef.current = 1;
      obstacleStuckRef.current = null;
    };

    const spawnNextBall = () => {
      resetBall();
      setStatus("新彈珠已就位，按住空白鍵蓄力");
    };

    const launch = () => {
      if (ball.launched || runDoneRef.current || ballsRef.current <= 0) return;
      const p = chargeRatioRef.current;
      const tier = getChargeTier(p);
      setChargeTier(tier);
      launchPowerRef.current = p;
      ballsRef.current -= 1;
      setBalls(ballsRef.current);
      comboRef.current = 1;
      roundScoreRef.current = 0;
      scoreMultiplierRef.current = p >= 0.999 ? HIGH_TIER_MULTIPLIER : 1;
      ball.launched = true;
      inRailRef.current = true;
      railPhaseRef.current = 0;
      railProgressRef.current = 0;
      railArcProgressRef.current = 0;
      railDirRef.current = 1;
      lowPowerFallbackRef.current = p < LOW_TIER_MAX;
      railSpeedRef.current = 0.016 + p * 0.03;
      ball.vel = { x: 0, y: 0 };
      setStatus(p >= 0.999 ? "滿蓄力發射！本局得分 x1.2" : tier === "high" ? "高力度發射！" : tier === "mid" ? "中力度發射！" : "低力度發射");
    };

    const collideWalls = () => {
      const left = WALL + ball.radius;
      const right = LAUNCH_DIVIDER_X - ball.radius;
      const top = PLAYFIELD_CEILING + ball.radius;
      if (ball.pos.x < left) {
        ball.pos.x = left;
        ball.vel.x = -ball.vel.x * WALL_RESTITUTION;
        sfx.playBump();
      } else if (ball.pos.x > right) {
        ball.pos.x = right;
        ball.vel.x = -ball.vel.x * WALL_RESTITUTION;
        sfx.playBump();
      }
      if (ball.pos.y < top) {
        ball.pos.y = top;
        ball.vel.y = -ball.vel.y * WALL_RESTITUTION;
        sfx.playBump();
      }
    };

    const collideSegment = (s: Segment) => {
      const ab = { x: s.b.x - s.a.x, y: s.b.y - s.a.y };
      const ap = { x: ball.pos.x - s.a.x, y: ball.pos.y - s.a.y };
      const t = clamp(dot(ap, ab) / (dot(ab, ab) || 1), 0, 1);
      const c = { x: s.a.x + ab.x * t, y: s.a.y + ab.y * t };
      const off = { x: ball.pos.x - c.x, y: ball.pos.y - c.y };
      const dist = Math.hypot(off.x, off.y);
      if (dist >= ball.radius + 1.5) return false;
      const n = normalize(dist < 1e-4 ? { x: 0, y: -1 } : off);
      ball.pos.x = c.x + n.x * (ball.radius + 1.5);
      ball.pos.y = c.y + n.y * (ball.radius + 1.5);
      ball.vel = reflect(ball.vel, n);
      ball.vel.x *= CHANNEL_SEGMENT_RESTITUTION;
      ball.vel.y *= CHANNEL_SEGMENT_RESTITUTION;
      flashesRef.current.push({ x: c.x, y: c.y, r: 24, life: 1, color: "255,220,120" });
      sfx.playBump();
      return true;
    };

    const collideSeparators = () => {
      if (ball.pos.y + ball.radius < CHANNEL_DIVIDER_COLLIDE_TOP) return;
      for (const x of CHANNEL_DIVIDER_X) {
        if (Math.abs(ball.pos.x - x) < ball.radius + 2) {
          const dir = ball.pos.x < x ? -1 : 1;
          ball.pos.x = x + dir * (ball.radius + 2);
          ball.vel.x = -ball.vel.x * CHANNEL_SEGMENT_RESTITUTION;
          flashesRef.current.push({ x, y: ball.pos.y, r: 14, life: 1, color: "255,210,100" });
          sfx.playBump();
        }
      }
    };

    const collideLaunchDivider = () => {
      collideSegment(launchDividerVerticalSegment());

      const R = LAUNCH_DIVIDER_FILLET_R;
      const { x: cx, y: cy } = launchDividerFilletCenter();
      if (ball.pos.x > LAUNCH_DIVIDER_X + ball.radius) return;
      if (ball.pos.y > cy + ball.radius) return;

      const dx = ball.pos.x - cx;
      const dy = ball.pos.y - cy;
      const dist = Math.hypot(dx, dy);
      if (dist >= R + ball.radius + 1.5) return;
      if (dx < 0 || dy > 0) return;

      const n = normalize(dist < 1e-4 ? { x: -1, y: 0 } : { x: dx / dist, y: dy / dist });
      ball.pos.x = cx + n.x * (R + ball.radius + 1.5);
      ball.pos.y = cy + n.y * (R + ball.radius + 1.5);
      ball.vel = reflect(ball.vel, n);
      ball.vel.x *= CHANNEL_SEGMENT_RESTITUTION;
      ball.vel.y *= CHANNEL_SEGMENT_RESTITUTION;
      flashesRef.current.push({ x: ball.pos.x, y: ball.pos.y, r: 20, life: 1, color: "255,220,120" });
      sfx.playBump();
    };

    const applyObstacleStuckEscape = () => {
      if (!ball.launched || inRailRef.current || runDoneRef.current) {
        obstacleStuckRef.current = null;
        return;
      }
      const assets = assetsRef.current;
      if (!assets) return;

      let touch: { index: number; normal: Vec } | null = null;
      for (let i = 0; i < layoutRef.current.obstacles.length; i += 1) {
        const obs = layoutRef.current.obstacles[i];
        const body = assets.bodies[obs.kind];
        const placed = { x: obs.x, y: obs.y, rotation: obs.rotation, scale: obs.scale };
        const hit = isBallTouchingImageBody(ball.pos, ball.radius, body, placed);
        if (hit) {
          touch = { index: i, normal: hit.normal };
          break;
        }
      }

      if (!touch) {
        obstacleStuckRef.current = null;
        return;
      }

      const now = performance.now();
      const prev = obstacleStuckRef.current;
      if (prev?.index !== touch.index) {
        obstacleStuckRef.current = { index: touch.index, since: now, normal: touch.normal };
        return;
      }

      if (now - prev.since < OBSTACLE_STUCK_MS) return;

      const push = 1.8 * PHYSICS_SCALE;
      ball.vel.x = touch.normal.x * push + (Math.random() - 0.5) * 0.4 * PHYSICS_SCALE;
      ball.vel.y = touch.normal.y * push - 0.2 * PHYSICS_SCALE;
      ball.pos.x += touch.normal.x * ball.radius * 0.55;
      ball.pos.y += touch.normal.y * ball.radius * 0.55;
      obstacleStuckRef.current = null;
      flashesRef.current.push({
        x: ball.pos.x,
        y: ball.pos.y,
        r: 26,
        life: 1,
        color: "255,100,100",
      });
      sfx.playBump();
    };

    const collideImageObstacles = () => {
      const assets = assetsRef.current;
      if (!assets) return;
      for (let pass = 0; pass < 2; pass += 1) {
        for (const obs of layoutRef.current.obstacles) {
          const body = assets.bodies[obs.kind];
          const placed = { x: obs.x, y: obs.y, rotation: obs.rotation, scale: obs.scale };
          const bouncy = obs.kind === "round" || obs.kind === "triangle";
          const restitution = obs.score
            ? SCORE_OBSTACLE_RESTITUTION
            : obs.kind === "round"
              ? ROUND_OBSTACLE_RESTITUTION
              : obs.kind === "triangle"
                ? TRIANGLE_OBSTACLE_RESTITUTION
                : LOW_OBSTACLE_RESTITUTION;
          const res = collideBallWithImageBody(
            ball.pos,
            ball.vel,
            ball.radius,
            body,
            placed,
            restitution,
          );
          if (!res.hit) continue;
          ball.pos = res.pos;
          ball.vel = res.vel;
          if (obs.kind === "line" || obs.kind === "rect") {
            ball.vel.x += res.normal.x * LINE_COLLISION_PUSH;
            ball.vel.y += res.normal.y * LINE_COLLISION_PUSH;
          }
          if (obs.kind === "round") {
            ball.vel.x += res.normal.x * ROUND_COLLISION_PUSH;
            ball.vel.y += res.normal.y * ROUND_COLLISION_PUSH;
          }
          if (bouncy) {
            const speed = Math.hypot(ball.vel.x, ball.vel.y);
            if (speed > MAX_BOUNCE_SPEED) {
              const scale = MAX_BOUNCE_SPEED / speed;
              ball.vel.x *= scale;
              ball.vel.y *= scale;
            }
          }
          if (pass === 0) {
            flashesRef.current.push({
              x: res.contact.x,
              y: res.contact.y,
              r: obs.score ? 50 : 24,
              life: 1,
              color: obs.score ? "120,235,255" : "255,220,120",
            });
            if (obs.kind === "round") {
              lastHitRef.current = performance.now();
              addRoundPoints(OBSTACLE_HIT_POINTS, "up");
            }
            sfx.playBump();
          }
        }
      }
    };

    const channelRewardLabel = (lane: number, bonusGain?: number, gotItem = false) => {
      if (lane === 0) return "彈珠+1";
      if (lane === 1) return "÷2";
      if (lane === 2) return gotItem ? "銅幣" : null;
      if (lane === 3) return `+${bonusGain ?? CHANNEL_BONUS_POINTS}分`;
      if (lane === 4) return `-${CHANNEL_PENALTY_POINTS}分`;
      return "×2";
    };

    const resolveChannel = () => {
      const lane = channelLaneFromX(ball.pos.x);
      const prevScore = scoreRef.current;
      let bonusGain = 0;
      let gotItem = false;
      if (lane === 0) {
        ballsRef.current += 1;
        setBalls(ballsRef.current);
      } else if (lane === 1) {
        scoreRef.current = clampScore(Math.floor(scoreRef.current * 0.5));
      } else if (lane === 2) {
        if (!hasCollectible("rust-coin")) {
          const reward = awardStallReward("pinball");
          if (reward.success) {
            stallRewardGrantedRef.current = true;
            gotItem = true;
          }
        }
      } else if (lane === 3) {
        bonusGain = Math.round(CHANNEL_BONUS_POINTS * scoreMultiplierRef.current);
        scoreRef.current = clampScore(scoreRef.current + bonusGain);
      } else if (lane === 4) {
        scoreRef.current = clampScore(scoreRef.current - CHANNEL_PENALTY_POINTS);
      } else {
        scoreRef.current = clampScore(scoreRef.current * 2);
      }
      const gained = scoreRef.current - prevScore;
      roundScoreRef.current += gained;
      setScore(scoreRef.current);
      const msg = channelRewardLabel(lane, bonusGain, gotItem);
      flashScore(lane === 4 ? "down" : "up");
      if (msg) {
        showRewardNotice(msg);
        setStatus(msg);
      }
      runDoneRef.current = true;
      ball.launched = false;
      ball.vel = { x: 0, y: 0 };

      const laneCx = channelLaneCenterX(lane);
      const laneStack = settledBallsRef.current.filter((s) => s.lane === lane).length;
      const stackIndex = Math.min(laneStack, CHANNEL_STACK_MAX - 1);
      if (laneStack < CHANNEL_STACK_MAX) {
        settledBallsRef.current.push({
          x: laneCx,
          y: channelBallY(stackIndex, ball.radius),
          colorIndex: ball.colorIndex,
          lane,
          radius: ball.radius,
        });
      }

      ball.pos = { x: -999, y: -999 };
      sfx.playScore();
      flashesRef.current.push({
        x: laneCx,
        y: channelBallY(stackIndex, ball.radius),
        r: 48,
        life: 1,
        color: lane === 4 ? "255,90,90" : "255,245,120",
      });

      if (settleTimeoutRef.current) window.clearTimeout(settleTimeoutRef.current);
      settleTimeoutRef.current = window.setTimeout(() => {
        if (ballsRef.current > 0) {
          runDoneRef.current = false;
          spawnNextBall();
        } else {
          reportStallScore("pinball", scoreRef.current);
          setStatus(`彈珠用完，總分 ${scoreRef.current}`);
          if (!roundEndHandledRef.current) {
            roundEndHandledRef.current = true;
            const summary = finalizeGameRound(scoreRef.current);
            setRoundEnd({ score: summary.score, lotteryYuan: summary.lotteryYuan });
          }
          gameOverRef.current = true;
          setGameOver(true);
        }
      }, 2000);
    };

    const syncCanvasSize = () => {
      canvas.width = BOARD_WIDTH;
      canvas.height = BOARD_HEIGHT;
      canvasSizeRef.current = { width: BOARD_WIDTH, height: BOARD_HEIGHT };
    };

    syncCanvasSize();

    const draw = () => {
      const assets = assetsRef.current;
      const { width: cw, height: ch } = canvasSizeRef.current;
      ctx.clearRect(0, 0, cw, ch);
      drawPinballBackground(ctx, assets, cw, ch);

      drawObstacleSprites(ctx, assets, layoutRef.current);

      for (const settled of settledBallsRef.current) {
        drawPinballSprite(ctx, assets, settled.x, settled.y, settled.colorIndex);
      }
      drawPinballSprite(ctx, assets, ball.pos.x, ball.pos.y, ball.colorIndex);
      drawChargeMeter(ctx, assets, chargeRatioRef.current);

      flashesRef.current = flashesRef.current
        .map((f) => ({ ...f, life: f.life - 0.06 }))
        .filter((f) => f.life > 0);
      for (const f of flashesRef.current) {
        const g = ctx.createRadialGradient(f.x, f.y, 2, f.x, f.y, f.r);
        g.addColorStop(0, `rgba(${f.color},${0.34 * f.life})`);
        g.addColorStop(1, `rgba(${f.color},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    let raf = 0;
    const tick = () => {
      if (chargingRef.current && !ball.launched && !runDoneRef.current) {
        const linear = clamp((performance.now() - chargeStartRef.current) / MAX_CHARGE_MS, 0, 1);
        const p = Math.pow(linear, 1.85);
        chargeRatioRef.current = p;
        setChargeRatio(p);
        setChargeTier(getChargeTier(p));
      }

      if (!ball.launched) {
        const railLeft = LAUNCH_RAIL_LEFT + ball.radius;
        const railRight = LAUNCH_RAIL_RIGHT - ball.radius;
        ball.pos.x = launchRailCenterX();
        ball.pos.y = initialBallPos(ball.radius).y;
        ball.pos.x = clamp(ball.pos.x, railLeft, railRight);
      } else if (inRailRef.current) {
          if (railPhaseRef.current === 0) {
            railProgressRef.current += railSpeedRef.current * railDirRef.current;
            const t = clamp(railProgressRef.current, 0, 1);
            ball.pos.x = launchRailCenterX();
            ball.pos.y = launchRailTravelY(ball.radius, t);
            if (lowPowerFallbackRef.current && railDirRef.current > 0 && t >= 0.62) {
              railDirRef.current = -1;
            } else if (railDirRef.current < 0 && t <= 0) {
              // Low power: climbs partway then slides back — no ball consumed.
              inRailRef.current = false;
              runDoneRef.current = false;
              ball.launched = false;
              ballsRef.current += 1;
              setBalls(ballsRef.current);
              scoreMultiplierRef.current = 1;
              roundScoreRef.current = 0;
              resetBall();
              setStatus("力度不足，彈珠沿軌道滑回去（不消耗彈珠）");
              sfx.stopRolling();
            } else if (t >= 1) {
              railPhaseRef.current = 1;
              railArcProgressRef.current = 0;
            }
          } else {
            const arcStart = launchArcStart(ball.radius);
            railArcProgressRef.current += railSpeedRef.current * 0.8;
            const t = clamp(railArcProgressRef.current, 0, 1);
            const mt = 1 - t;
            ball.pos.x =
              mt * mt * arcStart.x +
              2 * mt * t * LAUNCH_ARC_CONTROL.x +
              t * t * LAUNCH_EXIT.x;
            ball.pos.y =
              mt * mt * arcStart.y +
              2 * mt * t * LAUNCH_ARC_CONTROL.y +
              t * t * LAUNCH_EXIT.y;
            if (t >= 1) {
              inRailRef.current = false;
              ball.pos.x = LAUNCH_EXIT.x;
              ball.pos.y = LAUNCH_EXIT.y;
              const launchPower = launchPowerRef.current;
              const speed = (0.65 + launchPower * 1.15) * PHYSICS_SCALE;
              const tangent = launchArcExitTangent();
              const spread = (Math.random() - 0.5) * 0.35;
              ball.vel = {
                x: (tangent.x + spread) * speed,
                y: (tangent.y + 0.25 + launchPower * 0.35) * speed,
              };
              sfx.startRolling();
            }
          }
        } else {
          ball.vel.y += GRAVITY;
          ball.vel.x *= DRAG;
          ball.vel.y *= DRAG;
          ball.pos.x += ball.vel.x;
          ball.pos.y += ball.vel.y;
          collideWalls();
          collideImageObstacles();
          applyObstacleStuckEscape();
          collideLaunchDivider();
          collideSeparators();
          const speed = Math.hypot(ball.vel.x, ball.vel.y);
          if (speed < 0.14 * PHYSICS_SCALE && ball.pos.y < CHANNEL_TOP + 10) {
            stuckFramesRef.current += 1;
            if (stuckFramesRef.current > 22) {
              ball.vel.y += 0.65 * PHYSICS_SCALE;
              ball.vel.x += (ball.pos.x < CENTER_X ? 0.25 : -0.25) * PHYSICS_SCALE;
              flashesRef.current.push({
                x: ball.pos.x,
                y: ball.pos.y,
                r: 18,
                life: 1,
                color: "150,230,255",
              });
              stuckFramesRef.current = 0;
            }
          } else {
            stuckFramesRef.current = 0;
          }
          if (ball.pos.y + ball.radius >= CHANNEL_BOTTOM - 4 && ball.vel.y > 0) resolveChannel();
        }

      draw();
      raf = requestAnimationFrame(tick);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isGameInputBlocked()) {
        if (chargingRef.current) {
          chargingRef.current = false;
          chargeRatioRef.current = 0;
          setChargeRatio(0);
          sfx.stopPress();
        }
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        if (gameOverRef.current) return;
        if (!ball.launched && !runDoneRef.current && !chargingRef.current && ballsRef.current > 0) {
          chargingRef.current = true;
          chargeStartRef.current = performance.now();
          chargeRatioRef.current = 0;
          setChargeRatio(0);
          setStatus("蓄力中...");
          sfx.startPress();
        }
      }
    };

    const resetGame = () => {
      scoreRef.current = 0;
      comboRef.current = 1;
      lastHitRef.current = 0;
      runDoneRef.current = false;
      if (settleTimeoutRef.current) {
        window.clearTimeout(settleTimeoutRef.current);
        settleTimeoutRef.current = null;
      }
      chargingRef.current = false;
      chargeStartRef.current = 0;
      chargeRatioRef.current = 0;
      ballsRef.current = 5;
      peakBallsRef.current = 5;
      stallRewardGrantedRef.current = false;
      roundEndHandledRef.current = false;
      gameOverRef.current = false;
      settledBallsRef.current = [];
      setScore(0);
      setDisplayScore(0);
      setBalls(5);
      setPeakBalls(5);
      setChargeRatio(0);
      setChargeTier("low");
      setRewardText("");
      setRewardVisible(false);
      setGameOver(false);
      setRoundEnd(null);
      scoreMultiplierRef.current = 1;
      setStatus("按住空白鍵蓄力，放開發球");
      resetBall();
    };
    resetGameRef.current = resetGame;

    const onKeyUp = (e: KeyboardEvent) => {
      if (isGameInputBlocked()) return;
      if (e.code === "Space" && chargingRef.current) {
        chargingRef.current = false;
        sfx.stopPress();
        launch();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    tick();
    return () => {
      cancelAnimationFrame(raf);
      if (settleTimeoutRef.current) window.clearTimeout(settleTimeoutRef.current);
      if (noticeTimeoutRef.current) window.clearTimeout(noticeTimeoutRef.current);
      if (noticeClearTimeoutRef.current) window.clearTimeout(noticeClearTimeoutRef.current);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      sfx.dispose();
    };
  }, [initialBall]);

  return (
    <main className="relative flex h-full min-h-0 w-full flex-col overflow-hidden">
      <div className="pinball-play-row">
        <div ref={stageRef} className="pinball-stage relative min-h-0 min-w-0 flex-1">
          <GameHudBar
            score={displayScore}
            resource={0}
            resourceLabel=""
            scoreFlash={scoreFlash}
            extra={
              <PinballMarbleHud
                balls={balls}
                peakBalls={peakBalls}
                grabEnabled={marbleGrabEnabled}
                onGrabMarble={handleGrabMarble}
              />
            }
          />
          <canvas
            ref={canvasRef}
            width={BOARD_WIDTH}
            height={BOARD_HEIGHT}
            className="block h-full w-full touch-none"
          />
        </div>
      </div>

      {status ? (
        <div className="flex shrink-0 items-center justify-center px-3 pb-2 text-xs game-message">
          <span>{status}</span>
        </div>
      ) : null}

      {rewardText ? (
        <div
          className={`pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-500 ${
            rewardVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="game-reward-overlay">{rewardText}</div>
        </div>
      ) : null}

      <GameRoundEndModal
        open={gameOver && roundEnd !== null}
        score={roundEnd?.score ?? 0}
        lotteryYuan={roundEnd?.lotteryYuan ?? 0}
        tokens={tokens}
        onPlayAgain={() => {
          clearStallRoundDismissed("pinball");
          if (!trySpendPlayCost()) return;
          resetGameRef.current();
        }}
        onReturnToMarket={() => {
          const score = roundEnd?.score ?? 0;
          returnToMarketAfterRound(
            router,
            { stallId: "pinball", score },
            () => {
              gameOverRef.current = false;
              roundEndHandledRef.current = false;
              setGameOver(false);
              setRoundEnd(null);
            },
          );
        }}
      />
    </main>
  );
}
