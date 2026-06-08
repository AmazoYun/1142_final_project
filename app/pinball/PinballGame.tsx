"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type MouseEvent, type WheelEvent } from "react";
import GameHudBar from "@/components/game/GameHudBar";
import GameRoundEndModal from "@/components/game/GameRoundEndModal";
import PinballMarbleHud from "@/components/pinball/PinballMarbleHud";
import { awardStallReward } from "@/lib/collectibles/awardStallReward";
import { hasCollectible } from "@/lib/collectibles/acquireItem";
import { returnToMarketAfterRound } from "@/lib/economy/returnToMarket";
import { finalizeGameRound } from "@/lib/economy/processRoundEnd";
import { trySpendPlayCost } from "@/lib/economy/playGame";
import { reportStallScore } from "@/lib/player/reportStallScore";
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
  drawPinballCollisionDebug,
  drawPinballSprite,
} from "@/lib/pinball/drawSprites";
import { collideBallWithImageBody, isBallTouchingImageBody } from "@/lib/pinball/imageBody";
import { createPinballSoundFx } from "@/lib/pinball/sounds";
import {
  rotateObstacleByPointer,
  rotateObstacleDegrees,
  scaleObstacleByCorner,
  scaleObstacleUniform,
  translateObstacle,
  updateObstacleByKey,
} from "@/lib/pinball/obstacleEdit";
import {
  pickObstacleAtPoint,
  pickObstacleHandle,
} from "@/lib/pinball/editSelection";
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
type EditDrag =
  | { mode: "move"; key: string; lastX: number; lastY: number }
  | { mode: "scale"; key: string; corner: number; startPointer: Vec; startScale: number }
  | { mode: "rotate"; key: string; startAngle: number; startRotation: number; cx: number; cy: number };

const channelLabels = ["+1球", "÷2", "銅幣", "+30", "-10", "×2"] as const;
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
const BOUNCE = 0.32;
const WALL_BOUNCE_DAMP = 0.55;
const LOW_OBSTACLE_RESTITUTION = 0.28;
const ROUND_OBSTACLE_RESTITUTION = 0.82;
const SCORE_OBSTACLE_RESTITUTION = 0.96;
const TRIANGLE_OBSTACLE_RESTITUTION = 0.76;
const LOW_BOUNCE_VEL_SCALE = 0.62;
const LOW_TIER_MAX = 0.34;
const MID_TIER_MAX = 0.74;
const HIGH_TIER_MULTIPLIER = 1.2;
const OBSTACLE_STUCK_MS = 500;


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
  const [rotateInput, setRotateInput] = useState("15");
  const [layout, setLayout] = useState<LayoutData>(emptyLayout);
  const [editMode, setEditMode] = useState(false);
  const [savingLayout, setSavingLayout] = useState(false);
  const [selectedObstacle, setSelectedObstacle] = useState<string>("");
  const selectedObstacleRef = useRef("");
  const editModeRef = useRef(false);
  const dragRef = useRef<EditDrag | null>(null);

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

  const updateLayoutByKey = (key: string, dx: number, dy: number) => {
    if (!key.startsWith("obs:")) return;
    setLayout((prev) => {
      const next: LayoutData = structuredClone(prev);
      updateObstacleByKey(next, key, (obs) => translateObstacle(obs, dx, dy));
      layoutRef.current = next;
      return next;
    });
  };

  const scaleLayoutByKey = (key: string, factor: number) => {
    if (!key.startsWith("obs:")) return;
    setLayout((prev) => {
      const next: LayoutData = structuredClone(prev);
      updateObstacleByKey(next, key, (obs) => scaleObstacleUniform(obs, factor));
      layoutRef.current = next;
      return next;
    });
  };

  const deleteObstacleByKey = (key: string) => {
    if (!key.startsWith("obs:")) return;
    const i = Number(key.split(":")[1]);
    setLayout((prev) => {
      const next: LayoutData = {
        version: prev.version,
        obstacles: prev.obstacles.filter((_, idx) => idx !== i),
      };
      layoutRef.current = next;
      return next;
    });
    setSelectedObstacle("");
  };

  const rotateObstacleByKey = (key: string, degree: number) => {
    if (!key.startsWith("obs:")) return;
    setLayout((prev) => {
      const next: LayoutData = structuredClone(prev);
      updateObstacleByKey(next, key, (obs) => rotateObstacleDegrees(obs, degree));
      layoutRef.current = next;
      return next;
    });
  };

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  useEffect(() => {
    selectedObstacleRef.current = selectedObstacle;
  }, [selectedObstacle]);

  useEffect(() => {
    editModeRef.current = editMode;
    if (editMode) {
      setStatus("編輯模式：拖曳移動；拖角點縮放、↻ 旋轉；繪製與碰撞皆用 PNG 不透明邊緣");
    } else {
      setSelectedObstacle("");
      setStatus("");
    }
  }, [editMode]);

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
        setLayout(data);
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

    const addRoundPoints = (base: number, dir: "up" | "down" = "up") => {
      const scaled = Math.round(base * scoreMultiplierRef.current);
      scoreRef.current += scaled;
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
      sfx.playPress();
    };

    const collideWalls = () => {
      const left = WALL + ball.radius;
      const right = LAUNCH_DIVIDER_X - ball.radius;
      const top = PLAYFIELD_CEILING + ball.radius;
      if (ball.pos.x < left) {
        ball.pos.x = left;
        ball.vel.x = Math.abs(ball.vel.x) * BOUNCE * WALL_BOUNCE_DAMP;
        sfx.playBump();
      } else if (ball.pos.x > right) {
        ball.pos.x = right;
        ball.vel.x = -Math.abs(ball.vel.x) * BOUNCE * WALL_BOUNCE_DAMP;
        sfx.playBump();
      }
      if (ball.pos.y < top) {
        ball.pos.y = top;
        ball.vel.y = Math.abs(ball.vel.y) * BOUNCE * WALL_BOUNCE_DAMP;
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
      ball.vel.x *= 0.48;
      ball.vel.y *= 0.48;
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
          ball.vel.x = dir * Math.abs(ball.vel.x) * 0.38;
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
      ball.vel.x *= 0.5;
      ball.vel.y *= 0.5;
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

      const push = 1.35 * PHYSICS_SCALE;
      ball.vel.x = touch.normal.x * push + (Math.random() - 0.5) * 0.3 * PHYSICS_SCALE;
      ball.vel.y = touch.normal.y * push - 0.15 * PHYSICS_SCALE;
      ball.pos.x += touch.normal.x * ball.radius * 0.4;
      ball.pos.y += touch.normal.y * ball.radius * 0.4;
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
          if (!bouncy) {
            ball.vel.x *= LOW_BOUNCE_VEL_SCALE;
            ball.vel.y *= LOW_BOUNCE_VEL_SCALE;
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
              addRoundPoints(10, "up");
            }
            sfx.playBump();
          }
        }
      }
    };

    const resolveChannel = () => {
      const lane = channelLaneFromX(ball.pos.x);
      const prevScore = scoreRef.current;
      let msg = `通道 ${lane + 1}：`;
      if (lane === 0) {
        ballsRef.current += 1;
        setBalls(ballsRef.current);
        msg += "獲得 1 顆彈珠";
      } else if (lane === 1) {
        scoreRef.current = Math.floor(scoreRef.current * 0.5);
        msg += "總分 ÷2";
      } else if (lane === 2) {
        if (hasCollectible("rust-coin")) {
          msg += "無效果（已擁有生鏽銅幣）";
        } else {
          const reward = awardStallReward("pinball");
          msg += reward.success ? "獲得生鏽銅幣" : "無效果";
          if (reward.success) {
            stallRewardGrantedRef.current = true;
          }
        }
      } else if (lane === 3) {
        const gain = addRoundPoints(30, "up");
        msg += `+${gain} 分`;
      } else if (lane === 4) {
        scoreRef.current = Math.max(0, scoreRef.current - 10);
        msg += "-10 分";
      } else {
        scoreRef.current = scoreRef.current * 2;
        msg += "總分 ×2";
      }
      const gained = scoreRef.current - prevScore;
      roundScoreRef.current += gained;
      setScore(scoreRef.current);
      flashScore(lane === 4 ? "down" : "up");
      showRewardNotice(`${msg}\n本局得分 ${roundScoreRef.current >= 0 ? "+" : ""}${roundScoreRef.current}`);
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
      setStatus(msg);
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

      drawObstacleSprites(
        ctx,
        assets,
        layoutRef.current,
        editModeRef.current ? selectedObstacleRef.current : "",
        editModeRef.current,
      );

      if (!editModeRef.current) {
        for (const settled of settledBallsRef.current) {
          drawPinballSprite(ctx, assets, settled.x, settled.y, settled.colorIndex);
        }
        drawPinballSprite(ctx, assets, ball.pos.x, ball.pos.y, ball.colorIndex);
        drawChargeMeter(ctx, assets, chargeRatioRef.current);
      }

      const debugBalls = editModeRef.current
        ? []
        : [
            ...settledBallsRef.current.map((s) => ({ x: s.x, y: s.y, radius: s.radius })),
            { x: ball.pos.x, y: ball.pos.y, radius: ball.radius },
          ];
      drawPinballCollisionDebug(ctx, assets, layoutRef.current, debugBalls);

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
      if (!editModeRef.current) {
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
        ball.pos.x = clamp(ball.pos.x, railLeft, railRight);
        ball.pos.y = initialBallPos(ball.radius).y;
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
      }

      draw();
      raf = requestAnimationFrame(tick);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (editModeRef.current && (e.code === "Delete" || e.code === "Backspace") && selectedObstacleRef.current) {
        e.preventDefault();
        const key = selectedObstacleRef.current;
        if (key.startsWith("obs:")) {
          const idx = Number(key.split(":")[1]);
          setLayout((prev) => {
            const next: LayoutData = {
              version: prev.version,
              obstacles: prev.obstacles.filter((_, i) => i !== idx),
            };
            layoutRef.current = next;
            return next;
          });
          setSelectedObstacle("");
          setStatus("已刪除障礙物");
        }
      }
      if (editMode && e.code === "Space") {
        e.preventDefault();
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
        }
      }
      if (e.key.toLowerCase() === "r" && gameOverRef.current) {
        return;
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
      if (editMode) return;
      if (e.code === "Space" && chargingRef.current) {
        chargingRef.current = false;
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
  }, [initialBall, editMode]);

  const pickObstacleAt = (x: number, y: number): string =>
    pickObstacleAtPoint(x, y, layoutRef.current, assetsRef.current);

  const getCanvasPoint = (e: MouseEvent<HTMLCanvasElement> | WheelEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * BOARD_WIDTH,
      y: ((e.clientY - rect.top) / rect.height) * BOARD_HEIGHT,
    };
  };

  const onCanvasMouseDown = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!editMode) return;
    e.preventDefault();
    const p = getCanvasPoint(e);
    const layout = layoutRef.current;
    const assets = assetsRef.current;

    const handlePick = pickObstacleHandle(p.x, p.y, layout, assets, selectedObstacleRef.current);
    if (handlePick) {
      setSelectedObstacle(handlePick.key);
      const { key, hit, frame } = handlePick;
      const obs = layout.obstacles[Number(key.split(":")[1])];
      if (hit.kind === "rotate") {
        dragRef.current = {
          mode: "rotate",
          key,
          startAngle: Math.atan2(p.y - frame.cy, p.x - frame.cx),
          startRotation: obs.rotation,
          cx: frame.cx,
          cy: frame.cy,
        };
        return;
      }
      if (hit.kind === "corner" && hit.corner !== undefined) {
        dragRef.current = {
          mode: "scale",
          key,
          corner: hit.corner,
          startPointer: p,
          startScale: obs.scale,
        };
        return;
      }
    }

    const key = pickObstacleAt(p.x, p.y);
    if (!key) {
      setSelectedObstacle("");
      return;
    }
    setSelectedObstacle(key);
    dragRef.current = { mode: "move", key, lastX: p.x, lastY: p.y };
  };

  const onCanvasMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!editMode || !dragRef.current) return;
    const p = getCanvasPoint(e);
    const drag = dragRef.current;
    const assets = assetsRef.current;
    if (!assets) return;

    if (drag.mode === "move") {
      const dx = p.x - drag.lastX;
      const dy = p.y - drag.lastY;
      dragRef.current = { ...drag, lastX: p.x, lastY: p.y };
      updateLayoutByKey(drag.key, dx, dy);
      return;
    }

    const i = Number(drag.key.split(":")[1]);

    if (drag.mode === "scale") {
      setLayout((prev) => {
        const next: LayoutData = structuredClone(prev);
        const obs = next.obstacles[i];
        const body = assets.bodies[obs.kind];
        next.obstacles[i] = scaleObstacleByCorner(
          obs,
          body.nativeW,
          body.nativeH,
          drag.corner,
          p,
          drag.startPointer,
          drag.startScale,
        );
        layoutRef.current = next;
        return next;
      });
      return;
    }

    if (drag.mode === "rotate") {
      setLayout((prev) => {
        const next: LayoutData = structuredClone(prev);
        next.obstacles[i] = rotateObstacleByPointer(
          next.obstacles[i],
          p,
          drag.startAngle,
          drag.startRotation,
          drag.cx,
          drag.cy,
        );
        layoutRef.current = next;
        return next;
      });
    }
  };

  const onCanvasMouseUp = () => {
    dragRef.current = null;
  };

  const onCanvasWheel = (e: WheelEvent<HTMLCanvasElement>) => {
    if (!editMode || !selectedObstacle) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.07 : 0.93;
    scaleLayoutByKey(selectedObstacle, factor);
  };

  const saveLayout = async () => {
    try {
      setSavingLayout(true);
      const res = await fetch("/api/pinball-layout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(layoutRef.current),
      });
      setStatus(res.ok ? "障礙物布局已儲存" : "儲存失敗");
    } catch {
      setStatus("儲存失敗");
    } finally {
      setSavingLayout(false);
    }
  };

  return (
    <main className="relative flex h-full min-h-0 w-full flex-col overflow-hidden">
      <div className="pinball-play-row">
        <div ref={stageRef} className="pinball-stage relative min-h-0 min-w-0 flex-1">
          <GameHudBar
            score={displayScore}
            resource={0}
            resourceLabel=""
            scoreFlash={scoreFlash}
            extra={<PinballMarbleHud balls={balls} peakBalls={peakBalls} />}
          />
          <canvas
            ref={canvasRef}
            width={BOARD_WIDTH}
            height={BOARD_HEIGHT}
            className={`block h-full w-full touch-none ${editMode ? "cursor-crosshair" : ""}`}
            onMouseDown={onCanvasMouseDown}
            onMouseMove={onCanvasMouseMove}
            onMouseUp={onCanvasMouseUp}
            onMouseLeave={onCanvasMouseUp}
            onWheel={onCanvasWheel}
          />
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 px-3 pb-2 text-xs game-message">
        <button
          type="button"
          onClick={() => setEditMode((v) => !v)}
          className={`game-action-btn text-xs ${editMode ? "border-amber-500" : ""}`}
        >
          {editMode ? "編輯中" : "編輯模式"}
        </button>
        <button
          type="button"
          onClick={saveLayout}
          disabled={savingLayout}
          className="game-action-btn text-xs disabled:opacity-50"
        >
          {savingLayout ? "儲存中" : "儲存布局"}
        </button>
        <span>{status}</span>
      </div>

      {editMode && selectedObstacle ? (
        <div className="shrink-0 space-y-2 px-3 pb-2 text-xs">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => scaleLayoutByKey(selectedObstacle, 1.1)}
              className="game-action-btn text-xs"
            >
              放大
            </button>
            <button
              type="button"
              onClick={() => scaleLayoutByKey(selectedObstacle, 0.9)}
              className="game-action-btn text-xs"
            >
              縮小
            </button>
          </div>

          {selectedObstacle.startsWith("obs:") ? (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => deleteObstacleByKey(selectedObstacle)}
                className="game-action-btn border-red-400 text-xs"
              >
                刪除
              </button>
              <span className="text-ink/70">
                {layout.obstacles[Number(selectedObstacle.split(":")[1])]?.kind ?? ""} · 拖角點縮放 · ↻ 旋轉
              </span>
              <button
                type="button"
                onClick={() => rotateObstacleByKey(selectedObstacle, -15)}
                className="game-action-btn text-xs"
              >
                左轉 15°
              </button>
              <button
                type="button"
                onClick={() => rotateObstacleByKey(selectedObstacle, 15)}
                className="game-action-btn text-xs"
              >
                右轉 15°
              </button>
              <div className="flex items-center gap-2 game-overlay-panel px-2 py-2">
                <input
                  value={rotateInput}
                  onChange={(e) => setRotateInput(e.target.value)}
                  className="w-14 border border-ink/30 bg-white/40 px-2 py-1 text-center text-xs text-ink"
                  inputMode="numeric"
                />
                <button
                  type="button"
                  onClick={() => {
                    const deg = Number(rotateInput);
                    if (!Number.isFinite(deg)) return;
                    rotateObstacleByKey(selectedObstacle, deg);
                  }}
                  className="game-action-btn text-xs"
                >
                  角度套用
                </button>
              </div>
            </div>
          ) : null}
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
          if (!trySpendPlayCost()) return;
          resetGameRef.current();
        }}
        onReturnToMarket={() => returnToMarketAfterRound(router)}
      />
    </main>
  );
}
