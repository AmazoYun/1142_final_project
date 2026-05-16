"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent, type WheelEvent } from "react";

type Vec = { x: number; y: number };
type Ball = { pos: Vec; vel: Vec; radius: number; launched: boolean };
type Bumper = { x: number; y: number; r: number; score: number };
type Segment = { a: Vec; b: Vec };
type Flash = { x: number; y: number; r: number; life: number; color: string };
type Triangle = { a: Vec; b: Vec; c: Vec };
type RandomCircle = { kind: "circle"; x: number; y: number; r: number };
type RandomRect = { kind: "rect"; x: number; y: number; w: number; h: number };
type RandomBar = { kind: "bar"; segment: Segment };
type RandomObstacle = RandomCircle | RandomRect | RandomBar;
type ChargeTier = "low" | "mid" | "high";
type LayoutData = {
  bumpers: Bumper[];
  rails: Segment[];
  cornerTriangles: Triangle[];
  randomObstacles: RandomObstacle[];
};

const BOARD_WIDTH = 420;
const BOARD_HEIGHT = 600;
const WALL = 18;
const CHANNEL_HEIGHT = 110;
const CHANNEL_TOP = BOARD_HEIGHT - WALL - CHANNEL_HEIGHT;
const MAX_CHARGE_MS = 3000;
const GRAVITY = 0.2;
const DRAG = 0.998;
const BOUNCE = 0.9;
const LOW_TIER_MAX = 0.34;
const MID_TIER_MAX = 0.74;
const HIGH_TIER_MULTIPLIER = 1.2;
const CENTER_X = BOARD_WIDTH / 2;
const LAUNCH_RAIL_LEFT = BOARD_WIDTH - 40;
const LAUNCH_RAIL_RIGHT = BOARD_WIDTH - 22;
const LAUNCH_RAIL_TOP = 50;
const LAUNCH_RAIL_BOTTOM = BOARD_HEIGHT - WALL - 14;
const LAUNCH_ARC_START = { x: LAUNCH_RAIL_RIGHT, y: LAUNCH_RAIL_TOP + 14 };
const LAUNCH_ARC_CONTROL = { x: CENTER_X + 90, y: 12 };
const LAUNCH_EXIT = { x: CENTER_X, y: 74 };
const LAUNCH_DIVIDER_X = LAUNCH_RAIL_LEFT - 8;
const PLAYFIELD_RIGHT = LAUNCH_DIVIDER_X - 6;

const channelLabels = ["+2球", "+500", "x0.5", "隨機", "-500", "x1.5"] as const;
const bumpers: Bumper[] = [
  { x: 136, y: 150, r: 20, score: 20 },
  { x: 244, y: 150, r: 20, score: 20 },
  { x: 190, y: 248, r: 24, score: 50 },
  { x: 130, y: 356, r: 18, score: 15 },
  { x: 250, y: 356, r: 18, score: 15 },
  { x: 190, y: 450, r: 22, score: 30 },
];
const rails: Segment[] = [
  { a: { x: 102, y: 262 }, b: { x: 158, y: 236 } },
  { a: { x: 222, y: 236 }, b: { x: 278, y: 262 } },
];
const cornerTriangles: Triangle[] = [
  // Isosceles right triangles in corner-oriented layout
  { a: { x: 44, y: 92 }, b: { x: 140, y: 92 }, c: { x: 44, y: 188 } },
  { a: { x: 342, y: 92 }, b: { x: 246, y: 92 }, c: { x: 342, y: 188 } },
  { a: { x: 44, y: 438 }, b: { x: 140, y: 438 }, c: { x: 44, y: 342 } },
  { a: { x: 342, y: 438 }, b: { x: 246, y: 438 }, c: { x: 342, y: 342 } },
];
const launchDivider: Segment = {
  // Keep a top opening so launched balls can exit.
  a: { x: LAUNCH_DIVIDER_X, y: LAUNCH_EXIT.y + 20 },
  b: { x: LAUNCH_DIVIDER_X, y: BOARD_HEIGHT - WALL },
};
const defaultLayout: LayoutData = {
  bumpers,
  rails,
  cornerTriangles,
  randomObstacles: [
    { kind: "rect", x: 104, y: 308, w: 30, h: 18 },
    { kind: "circle", x: 104, y: 388, r: 15 },
    { kind: "bar", segment: { a: { x: 96, y: 334 }, b: { x: 138, y: 376 } } },
    { kind: "rect", x: 268, y: 308, w: 30, h: 18 },
    { kind: "circle", x: 268, y: 388, r: 15 },
    { kind: "bar", segment: { a: { x: 276, y: 334 }, b: { x: 234, y: 376 } } },
  ],
};

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

function makeQuadraticSegments(start: Vec, control: Vec, end: Vec, steps: number): Segment[] {
  const points: Vec[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const mt = 1 - t;
    points.push({
      x: mt * mt * start.x + 2 * mt * t * control.x + t * t * end.x,
      y: mt * mt * start.y + 2 * mt * t * control.y + t * t * end.y,
    });
  }
  const segments: Segment[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    segments.push({ a: points[i], b: points[i + 1] });
  }
  return segments;
}

function triangleEdges(t: Triangle): Segment[] {
  return [
    { a: t.a, b: t.b },
    { a: t.b, b: t.c },
    { a: t.c, b: t.a },
  ];
}

type TriangleOrientation = "top-left" | "top-right" | "bottom-left" | "bottom-right";

function resolveTriangleOrientation(anchor: Vec): TriangleOrientation {
  const left = anchor.x - WALL;
  const right = PLAYFIELD_RIGHT - anchor.x;
  const top = anchor.y - WALL;
  const bottom = CHANNEL_TOP - anchor.y;
  if (top <= bottom) {
    return left <= right ? "top-left" : "top-right";
  }
  return left <= right ? "bottom-left" : "bottom-right";
}

function buildRightIsoscelesTriangle(
  anchor: Vec,
  leg: number,
  orientation: TriangleOrientation,
): Triangle {
  if (orientation === "top-left") {
    return { a: anchor, b: { x: anchor.x + leg, y: anchor.y }, c: { x: anchor.x, y: anchor.y + leg } };
  }
  if (orientation === "top-right") {
    return { a: anchor, b: { x: anchor.x - leg, y: anchor.y }, c: { x: anchor.x, y: anchor.y + leg } };
  }
  if (orientation === "bottom-left") {
    return { a: anchor, b: { x: anchor.x + leg, y: anchor.y }, c: { x: anchor.x, y: anchor.y - leg } };
  }
  return { a: anchor, b: { x: anchor.x - leg, y: anchor.y }, c: { x: anchor.x, y: anchor.y - leg } };
}

function normalizeRightIsoscelesTriangle(t: Triangle): Triangle {
  const ab = { x: t.b.x - t.a.x, y: t.b.y - t.a.y };
  const ac = { x: t.c.x - t.a.x, y: t.c.y - t.a.y };
  const leg = clamp((Math.hypot(ab.x, ab.y) + Math.hypot(ac.x, ac.y)) / 2, 28, 140);
  const anchor = {
    x: clamp(t.a.x, WALL + 8, PLAYFIELD_RIGHT - 8),
    y: clamp(t.a.y, WALL + 8, CHANNEL_TOP - 8),
  };
  const orientation = resolveTriangleOrientation(anchor);
  return buildRightIsoscelesTriangle(anchor, leg, orientation);
}

function normalizeLayoutTriangles(layout: LayoutData): LayoutData {
  return {
    ...layout,
    cornerTriangles: layout.cornerTriangles.map(normalizeRightIsoscelesTriangle),
  };
}

function getChargeTier(ratio: number): ChargeTier {
  if (ratio < LOW_TIER_MAX) return "low";
  if (ratio < MID_TIER_MAX) return "mid";
  return "high";
}

const topCurveSegments = makeQuadraticSegments(
  { x: WALL + 20, y: 58 },
  { x: CENTER_X, y: 8 },
  { x: BOARD_WIDTH - WALL - 20, y: 58 },
  14,
);

export default function PinballPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const marbleRef = useRef<HTMLImageElement | null>(null);
  const marbleLoadedRef = useRef(false);
  const playfieldBgRef = useRef<HTMLImageElement | null>(null);
  const playfieldBgLoadedRef = useRef(false);
  const flashesRef = useRef<Flash[]>([]);
  const layoutRef = useRef<LayoutData>(defaultLayout);

  const ballsRef = useRef(5);
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
  const spawnDropRef = useRef(false);
  const spawnYRef = useRef(0);
  const settleTimeoutRef = useRef<number | null>(null);
  const stuckFramesRef = useRef(0);
  const noticeTimeoutRef = useRef<number | null>(null);
  const noticeClearTimeoutRef = useRef<number | null>(null);
  const roundScoreRef = useRef(0);
  const scoreMultiplierRef = useRef(1);
  const lowPowerFallbackRef = useRef(false);
  const railDirRef = useRef<1 | -1>(1);
  const launchPowerRef = useRef(0);

  const [balls, setBalls] = useState(5);
  const [score, setScore] = useState(0);
  const [displayScore, setDisplayScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [chargeRatio, setChargeRatio] = useState(0);
  const [scoreFlash, setScoreFlash] = useState<"up" | "down" | null>(null);
  const [rewardText, setRewardText] = useState("");
  const [rewardVisible, setRewardVisible] = useState(false);
  const [chargeTier, setChargeTier] = useState<ChargeTier>("low");
  const [status, setStatus] = useState("按住空白鍵蓄力，放開發球");
  const [triangleRotateInput, setTriangleRotateInput] = useState("15");
  const [layout, setLayout] = useState<LayoutData>(defaultLayout);
  const [editMode, setEditMode] = useState(false);
  const [savingLayout, setSavingLayout] = useState(false);
  const [selectedObstacle, setSelectedObstacle] = useState<string>("");
  const dragRef = useRef<{ key: string; lastX: number; lastY: number } | null>(null);

  const initialBall = useMemo<Ball>(
    () => ({
      pos: { x: (LAUNCH_RAIL_LEFT + LAUNCH_RAIL_RIGHT) / 2, y: LAUNCH_RAIL_BOTTOM - 12 },
      vel: { x: 0, y: 0 },
      radius: 9,
      launched: false,
    }),
    [],
  );

  const updateLayoutByKey = (key: string, dx: number, dy: number) => {
    setLayout((prev) => {
      const next: LayoutData = structuredClone(prev);
      if (key.startsWith("bumper:")) {
        const i = Number(key.split(":")[1]);
        next.bumpers[i].x += dx;
        next.bumpers[i].y += dy;
      } else if (key.startsWith("rail:")) {
        const i = Number(key.split(":")[1]);
        next.rails[i].a.x += dx;
        next.rails[i].a.y += dy;
        next.rails[i].b.x += dx;
        next.rails[i].b.y += dy;
      } else if (key.startsWith("tri:")) {
        const i = Number(key.split(":")[1]);
        next.cornerTriangles[i].a.x += dx;
        next.cornerTriangles[i].a.y += dy;
        next.cornerTriangles[i].b.x += dx;
        next.cornerTriangles[i].b.y += dy;
        next.cornerTriangles[i].c.x += dx;
        next.cornerTriangles[i].c.y += dy;
      } else if (key.startsWith("obs:")) {
        const i = Number(key.split(":")[1]);
        const obs = next.randomObstacles[i];
        if (obs.kind === "circle" || obs.kind === "rect") {
          obs.x += dx;
          obs.y += dy;
        } else {
          obs.segment.a.x += dx;
          obs.segment.a.y += dy;
          obs.segment.b.x += dx;
          obs.segment.b.y += dy;
        }
      }
      return normalizeLayoutTriangles(next);
    });
  };

  const scaleLayoutByKey = (key: string, factor: number) => {
    setLayout((prev) => {
      const next: LayoutData = structuredClone(prev);
      if (key.startsWith("bumper:")) {
        const i = Number(key.split(":")[1]);
        next.bumpers[i].r = clamp(next.bumpers[i].r * factor, 8, 48);
      } else if (key.startsWith("obs:")) {
        const i = Number(key.split(":")[1]);
        const obs = next.randomObstacles[i];
        if (obs.kind === "circle") obs.r = clamp(obs.r * factor, 8, 40);
        if (obs.kind === "rect") {
          obs.w = clamp(obs.w * factor, 12, 80);
          obs.h = clamp(obs.h * factor, 10, 70);
        }
        if (obs.kind === "bar") {
          const mx = (obs.segment.a.x + obs.segment.b.x) / 2;
          const my = (obs.segment.a.y + obs.segment.b.y) / 2;
          obs.segment.a.x = mx + (obs.segment.a.x - mx) * factor;
          obs.segment.a.y = my + (obs.segment.a.y - my) * factor;
          obs.segment.b.x = mx + (obs.segment.b.x - mx) * factor;
          obs.segment.b.y = my + (obs.segment.b.y - my) * factor;
        }
      } else if (key.startsWith("tri:")) {
        const i = Number(key.split(":")[1]);
        const t = next.cornerTriangles[i];
        const cx = (t.a.x + t.b.x + t.c.x) / 3;
        const cy = (t.a.y + t.b.y + t.c.y) / 3;
        t.a.x = cx + (t.a.x - cx) * factor;
        t.a.y = cy + (t.a.y - cy) * factor;
        t.b.x = cx + (t.b.x - cx) * factor;
        t.b.y = cy + (t.b.y - cy) * factor;
        t.c.x = cx + (t.c.x - cx) * factor;
        t.c.y = cy + (t.c.y - cy) * factor;
      }
      return normalizeLayoutTriangles(next);
    });
  };

  const rotateTriangleByKey = (key: string, degree: number) => {
    if (!key.startsWith("tri:")) return;
    setLayout((prev) => {
      const next: LayoutData = structuredClone(prev);
      const i = Number(key.split(":")[1]);
      const t = next.cornerTriangles[i];
      const cx = (t.a.x + t.b.x + t.c.x) / 3;
      const cy = (t.a.y + t.b.y + t.c.y) / 3;
      const rad = (degree * Math.PI) / 180;
      const rot = (p: Vec): Vec => ({
        x: cx + (p.x - cx) * Math.cos(rad) - (p.y - cy) * Math.sin(rad),
        y: cy + (p.x - cx) * Math.sin(rad) + (p.y - cy) * Math.cos(rad),
      });
      t.a = rot(t.a);
      t.b = rot(t.b);
      t.c = rot(t.c);
      return normalizeLayoutTriangles(next);
    });
  };

  const stretchTriangleByKey = (key: string, factorX: number, factorY: number) => {
    if (!key.startsWith("tri:")) return;
    setLayout((prev) => {
      const next: LayoutData = structuredClone(prev);
      const i = Number(key.split(":")[1]);
      const t = next.cornerTriangles[i];
      const cx = (t.a.x + t.b.x + t.c.x) / 3;
      const cy = (t.a.y + t.b.y + t.c.y) / 3;
      const stretch = (p: Vec): Vec => ({
        x: cx + (p.x - cx) * factorX,
        y: cy + (p.y - cy) * factorY,
      });
      t.a = stretch(t.a);
      t.b = stretch(t.b);
      t.c = stretch(t.c);
      return normalizeLayoutTriangles(next);
    });
  };

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  useEffect(() => {
    const loadLayout = async () => {
      try {
        const res = await fetch("/api/pinball-layout");
        if (!res.ok) return;
        const data = (await res.json()) as LayoutData;
        setLayout(normalizeLayoutTriangles(data));
      } catch {
        // keep default layout
      }
    };
    loadLayout();
  }, []);

  useEffect(() => {
    ballsRef.current = balls;
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
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src =
      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Marbles_01.jpg/256px-Marbles_01.jpg";
    img.onload = () => {
      marbleRef.current = img;
      marbleLoadedRef.current = true;
    };
    img.onerror = () => {
      marbleLoadedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const img = new Image();
    img.src = "/playfield-bg.jpg";
    img.onload = () => {
      playfieldBgRef.current = img;
      playfieldBgLoadedRef.current = true;
    };
    img.onerror = () => {
      playfieldBgLoadedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const ball: Ball = structuredClone(initialBall);

    const tone = (f: number, ms: number, type: OscillatorType, gain = 0.04) => {
      try {
        const ac = audioRef.current ?? new AudioContext();
        audioRef.current = ac;
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.type = type;
        o.frequency.value = f;
        g.gain.value = gain;
        o.connect(g);
        g.connect(ac.destination);
        const now = ac.currentTime;
        g.gain.setValueAtTime(gain, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + ms / 1000);
        o.start(now);
        o.stop(now + ms / 1000);
      } catch {
        // noop
      }
    };

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
      ball.pos = { ...initialBall.pos };
      ball.vel = { ...initialBall.vel };
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
    };

    const spawnNextBall = () => {
      resetBall();
      spawnDropRef.current = true;
      spawnYRef.current = initialBall.pos.y - 26;
      ball.pos.y = spawnYRef.current;
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
      setCombo(1);
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
      tone(320 + p * 220, 120, "triangle", 0.05);
    };

    const collideWalls = () => {
      const left = WALL + ball.radius;
      const right = BOARD_WIDTH - WALL - ball.radius;
      const top = WALL + ball.radius;
      if (ball.pos.x < left) {
        ball.pos.x = left;
        ball.vel.x = Math.abs(ball.vel.x) * BOUNCE;
      } else if (ball.pos.x > right) {
        ball.pos.x = right;
        ball.vel.x = -Math.abs(ball.vel.x) * BOUNCE;
      }
      if (ball.pos.y < top) {
        ball.pos.y = top;
        ball.vel.y = Math.abs(ball.vel.y) * BOUNCE;
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
      ball.vel.x *= 0.94;
      ball.vel.y *= 0.94;
      flashesRef.current.push({ x: c.x, y: c.y, r: 24, life: 1, color: "255,220,120" });
      tone(170, 26, "square", 0.02);
      return true;
    };

    const collideSeparators = () => {
      if (ball.pos.y + ball.radius < CHANNEL_TOP) return;
      const laneW = (PLAYFIELD_RIGHT - WALL) / channelLabels.length;
      for (let i = 1; i < channelLabels.length; i += 1) {
        const x = WALL + laneW * i;
        if (Math.abs(ball.pos.x - x) < ball.radius + 2) {
          const dir = ball.pos.x < x ? -1 : 1;
          ball.pos.x = x + dir * (ball.radius + 2);
          ball.vel.x = dir * Math.abs(ball.vel.x) * 0.9;
          flashesRef.current.push({ x, y: ball.pos.y, r: 14, life: 1, color: "255,210,100" });
          tone(190, 24, "square", 0.02);
        }
      }
    };

    const collideRect = (x: number, y: number, w: number, h: number) => {
      const cx = clamp(ball.pos.x, x - w / 2, x + w / 2);
      const cy = clamp(ball.pos.y, y - h / 2, y + h / 2);
      const off = { x: ball.pos.x - cx, y: ball.pos.y - cy };
      const dist = Math.hypot(off.x, off.y);
      if (dist >= ball.radius + 1) return;
      const n = normalize(dist < 1e-4 ? { x: 0, y: -1 } : off);
      ball.pos.x = cx + n.x * (ball.radius + 1);
      ball.pos.y = cy + n.y * (ball.radius + 1);
      ball.vel = reflect(ball.vel, n);
      ball.vel.x *= 0.95;
      ball.vel.y *= 0.95;
      flashesRef.current.push({ x: cx, y: cy, r: 30, life: 1, color: "255,200,130" });
      tone(210, 28, "square", 0.018);
    };

    const collideRandomObstacle = (obs: RandomObstacle) => {
      if (obs.kind === "circle") {
        const dx = ball.pos.x - obs.x;
        const dy = ball.pos.y - obs.y;
        const dist = Math.hypot(dx, dy);
        const minDist = ball.radius + obs.r;
        if (dist >= minDist) return;
        const n = normalize({ x: dx, y: dy });
        ball.pos.x = obs.x + n.x * minDist;
        ball.pos.y = obs.y + n.y * minDist;
        ball.vel = reflect(ball.vel, n);
        ball.vel.x *= 0.96;
        ball.vel.y *= 0.96;
        flashesRef.current.push({ x: obs.x, y: obs.y, r: 34, life: 1, color: "255,210,130" });
        tone(230, 30, "square", 0.02);
        addRoundPoints(10, "up");
        return;
      }
      if (obs.kind === "rect") {
        collideRect(obs.x, obs.y, obs.w, obs.h);
        return;
      }
      collideSegment(obs.segment);
    };

    const collideBumper = (b: Bumper) => {
      const dx = ball.pos.x - b.x;
      const dy = ball.pos.y - b.y;
      const dist = Math.hypot(dx, dy);
      const minDist = ball.radius + b.r;
      if (dist >= minDist) return;
      const n = normalize({ x: dx, y: dy });
      ball.pos.x = b.x + n.x * minDist;
      ball.pos.y = b.y + n.y * minDist;
      ball.vel = reflect(ball.vel, n);
      ball.vel.x *= 1.03;
      ball.vel.y *= 1.03;

      lastHitRef.current = performance.now();
      addRoundPoints(10, "up");
      flashesRef.current.push({ x: b.x, y: b.y, r: 50, life: 1, color: "120,235,255" });
      tone(500 + comboRef.current * 35, 70, "sine");
    };

    const resolveChannel = () => {
      const inner = PLAYFIELD_RIGHT - WALL;
      const laneW = inner / channelLabels.length;
      const lane = clamp(Math.floor((ball.pos.x - WALL) / laneW), 0, channelLabels.length - 1);
      const prevScore = scoreRef.current;
      let msg = `通道 ${lane + 1}：`;
      if (lane === 0) {
        ballsRef.current += 2;
        setBalls(ballsRef.current);
        msg += "獲得兩顆彈珠";
      } else if (lane === 1) {
        const gain = addRoundPoints(500, "up");
        msg += `獲得 ${gain} 分`;
      } else if (lane === 2) {
        scoreRef.current = Math.floor(scoreRef.current * 0.5);
        msg += "總分 x0.5";
      } else if (lane === 3) {
        const randomItem = Math.floor(Math.random() * 3);
        if (randomItem === 0) {
          ballsRef.current += 1;
          setBalls(ballsRef.current);
          msg += "隨機道具：+1球";
        } else if (randomItem === 1) {
          const gain = addRoundPoints(300, "up");
          msg += `隨機道具：+${gain}分`;
        } else {
          comboRef.current = Math.min(comboRef.current + 1, 5);
          setCombo(comboRef.current);
          msg += "隨機道具：連擊+1";
        }
      } else if (lane === 4) {
        scoreRef.current = Math.max(0, scoreRef.current - 500);
        msg += "扣除 500 分";
      } else {
        scoreRef.current = Math.floor(scoreRef.current * 1.5);
        msg += "總分 x1.5";
      }
      const gained = scoreRef.current - prevScore;
      roundScoreRef.current += gained;
      setScore(scoreRef.current);
      flashScore(lane === 3 ? "down" : "up");
      showRewardNotice(`${msg}\n本局得分 ${roundScoreRef.current >= 0 ? "+" : ""}${roundScoreRef.current}`);
      runDoneRef.current = true;
      ball.launched = false;
      ball.vel = { x: 0, y: 0 };
      // Hide ball while waiting for next round spawn.
      ball.pos = { x: -999, y: -999 };
      setStatus(msg);
      tone(lane === 3 ? 130 : 650, 170, "triangle", 0.06);
      flashesRef.current.push({
        x: ball.pos.x,
        y: ball.pos.y,
        r: 48,
        life: 1,
        color: lane === 3 ? "255,90,90" : "255,245,120",
      });

      if (settleTimeoutRef.current) window.clearTimeout(settleTimeoutRef.current);
      settleTimeoutRef.current = window.setTimeout(() => {
        if (ballsRef.current > 0) {
          runDoneRef.current = false;
          spawnNextBall();
        } else {
          setStatus(`彈珠用完，總分 ${scoreRef.current}。按 R 重新開始`);
        }
      }, 2000);
    };

    const draw = () => {
      ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
      const wood = ctx.createLinearGradient(0, 0, 0, BOARD_HEIGHT);
      wood.addColorStop(0, "#5b442f");
      wood.addColorStop(0.5, "#684d34");
      wood.addColorStop(1, "#3d2d20");
      ctx.fillStyle = wood;
      ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);

      const plastic = ctx.createLinearGradient(0, WALL, 0, CHANNEL_TOP);
      plastic.addColorStop(0, "rgba(236,236,236,0.58)");
      plastic.addColorStop(1, "rgba(166,166,166,0.46)");
      ctx.fillStyle = plastic;
      ctx.fillRect(WALL, WALL, BOARD_WIDTH - WALL * 2, BOARD_HEIGHT - WALL * 2);
      if (playfieldBgLoadedRef.current && playfieldBgRef.current) {
        ctx.save();
        ctx.globalAlpha = 0.28;
        ctx.drawImage(playfieldBgRef.current, WALL, WALL, PLAYFIELD_RIGHT - WALL, CHANNEL_TOP - WALL);
        ctx.restore();
      }

      ctx.strokeStyle = "rgba(255,210,110,0.95)";
      ctx.lineWidth = 2;
      ctx.strokeRect(WALL, WALL, BOARD_WIDTH - WALL * 2, BOARD_HEIGHT - WALL * 2);

      ctx.strokeStyle = "#7f1d1d";
      ctx.lineWidth = 7;
      for (const s of layoutRef.current.rails) {
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.4)";
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(s.a.x, s.a.y);
        ctx.lineTo(s.b.x, s.b.y);
        ctx.stroke();
        ctx.restore();
        ctx.strokeStyle = "rgba(255,236,138,0.7)";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(s.a.x + 1, s.a.y - 1);
        ctx.lineTo(s.b.x + 1, s.b.y - 1);
        ctx.stroke();
        ctx.strokeStyle = "#7f1d1d";
        ctx.lineWidth = 7;
      }

      ctx.strokeStyle = "rgba(232,96,48,0.9)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(topCurveSegments[0].a.x, topCurveSegments[0].a.y);
      for (const s of topCurveSegments) ctx.lineTo(s.b.x, s.b.y);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255,214,120,0.92)";
      ctx.lineWidth = 2;
      ctx.strokeRect(LAUNCH_RAIL_LEFT, LAUNCH_RAIL_TOP, 18, LAUNCH_RAIL_BOTTOM - LAUNCH_RAIL_TOP);
      ctx.beginPath();
      ctx.moveTo(LAUNCH_ARC_START.x, LAUNCH_ARC_START.y);
      ctx.quadraticCurveTo(LAUNCH_ARC_CONTROL.x, LAUNCH_ARC_CONTROL.y, LAUNCH_EXIT.x, LAUNCH_EXIT.y);
      ctx.stroke();
      ctx.strokeStyle = "rgba(232,94,45,0.92)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(launchDivider.a.x, launchDivider.a.y);
      ctx.lineTo(launchDivider.b.x, launchDivider.b.y);
      ctx.stroke();

      for (const b of layoutRef.current.bumpers) {
        const rg = ctx.createRadialGradient(
          b.x - b.r * 0.24,
          b.y - b.r * 0.26,
          2,
          b.x,
          b.y,
          b.r,
        );
        rg.addColorStop(0, "rgba(255,255,255,0.98)");
        rg.addColorStop(0.45, "rgba(255,242,184,0.95)");
        rg.addColorStop(1, "rgba(148,26,26,0.99)");
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,226,120,0.95)";
        ctx.lineWidth = 2.1;
        ctx.stroke();
      }

      for (const tri of layoutRef.current.cornerTriangles) {
        const tg = ctx.createLinearGradient(tri.a.x, tri.a.y, tri.c.x, tri.c.y);
        tg.addColorStop(0, "rgba(255,255,255,0.88)");
        tg.addColorStop(0.45, "rgba(255,224,130,0.9)");
        tg.addColorStop(1, "rgba(147,28,28,0.92)");
        ctx.fillStyle = tg;
        ctx.strokeStyle = "rgba(255,218,120,0.95)";
        ctx.lineWidth = 2.3;
        ctx.beginPath();
        ctx.moveTo(tri.a.x, tri.a.y);
        ctx.lineTo(tri.b.x, tri.b.y);
        ctx.lineTo(tri.c.x, tri.c.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      for (const obs of layoutRef.current.randomObstacles) {
        ctx.strokeStyle = "rgba(255,228,148,0.9)";
        ctx.fillStyle = "rgba(255,228,148,0.2)";
        ctx.lineWidth = 2.2;
        if (obs.kind === "circle") {
          const og = ctx.createRadialGradient(
            obs.x - obs.r * 0.25,
            obs.y - obs.r * 0.25,
            2,
            obs.x,
            obs.y,
            obs.r,
          );
          og.addColorStop(0, "rgba(255,255,255,0.98)");
          og.addColorStop(0.48, "rgba(255,244,196,0.92)");
          og.addColorStop(1, "rgba(136,24,24,0.98)");
          ctx.fillStyle = og;
          ctx.beginPath();
          ctx.arc(obs.x, obs.y, obs.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "rgba(255,226,130,0.95)";
          ctx.stroke();
        } else if (obs.kind === "rect") {
          const rx = obs.x - obs.w / 2;
          const ry = obs.y - obs.h / 2;
          const rg = ctx.createLinearGradient(rx, ry, rx, ry + obs.h);
          rg.addColorStop(0, "rgba(255,255,255,0.8)");
          rg.addColorStop(1, "rgba(145,30,30,0.9)");
          ctx.fillStyle = rg;
          ctx.fillRect(rx, ry, obs.w, obs.h);
          ctx.strokeStyle = "rgba(250,235,170,0.85)";
          ctx.strokeRect(rx, ry, obs.w, obs.h);
          ctx.strokeStyle = "rgba(99,24,24,0.78)";
          ctx.beginPath();
          ctx.moveTo(rx, ry + obs.h);
          ctx.lineTo(rx + obs.w, ry + obs.h);
          ctx.stroke();
        } else {
          ctx.save();
          ctx.shadowColor = "rgba(0,0,0,0.32)";
          ctx.shadowBlur = 4;
          const tube = ctx.createLinearGradient(
            obs.segment.a.x,
            obs.segment.a.y,
            obs.segment.b.x,
            obs.segment.b.y,
          );
          tube.addColorStop(0, "rgba(255,255,255,0.68)");
          tube.addColorStop(0.35, "rgba(255,222,130,0.72)");
          tube.addColorStop(1, "rgba(174,24,24,0.85)");
          ctx.strokeStyle = tube;
          ctx.lineWidth = 8;
          ctx.beginPath();
          ctx.moveTo(obs.segment.a.x, obs.segment.a.y);
          ctx.lineTo(obs.segment.b.x, obs.segment.b.y);
          ctx.stroke();
          ctx.restore();
          ctx.strokeStyle = "rgba(255,255,255,0.6)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(obs.segment.a.x + 1, obs.segment.a.y - 1);
          ctx.lineTo(obs.segment.b.x + 1, obs.segment.b.y - 1);
          ctx.stroke();
          ctx.strokeStyle = "rgba(255,236,140,0.8)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(obs.segment.a.x - 1, obs.segment.a.y + 1);
          ctx.lineTo(obs.segment.b.x - 1, obs.segment.b.y + 1);
          ctx.stroke();
          ctx.strokeStyle = "rgba(255,228,148,0.9)";
          ctx.lineWidth = 2.2;
        }
      }

      const inner = PLAYFIELD_RIGHT - WALL;
      const laneW = inner / channelLabels.length;
      for (let i = 0; i < channelLabels.length; i += 1) {
        const x = WALL + i * laneW;
        ctx.strokeStyle = "rgba(133,40,30,0.88)";
        ctx.lineWidth = 1;
        ctx.strokeRect(x, CHANNEL_TOP, laneW, CHANNEL_HEIGHT);

        const cx = x + laneW / 2;
        const cy = CHANNEL_TOP + 20;
        ctx.strokeStyle = "rgba(255,220,130,0.95)";
        ctx.fillStyle = "rgba(120,30,20,0.78)";
        ctx.lineWidth = 1.4;
        // Retro icon badges instead of text labels.
        if (i === 0) {
          ctx.beginPath();
          ctx.arc(cx - 7, cy, 5, 0, Math.PI * 2);
          ctx.arc(cx + 7, cy, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else if (i === 1) {
          ctx.fillRect(cx - 10, cy - 6, 20, 12);
          ctx.strokeRect(cx - 10, cy - 6, 20, 12);
        } else if (i === 2 || i === 5) {
          ctx.beginPath();
          ctx.moveTo(cx - 10, cy + 5);
          ctx.lineTo(cx, cy - 8);
          ctx.lineTo(cx + 10, cy + 5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          if (i === 2) {
            ctx.beginPath();
            ctx.moveTo(cx - 6, cy - 10);
            ctx.lineTo(cx + 6, cy - 10);
            ctx.stroke();
          } else {
            ctx.beginPath();
            ctx.moveTo(cx, cy - 12);
            ctx.lineTo(cx, cy + 8);
            ctx.stroke();
          }
        } else if (i === 3) {
          ctx.beginPath();
          ctx.moveTo(cx - 10, cy);
          ctx.lineTo(cx + 10, cy);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(cx, cy - 9);
          ctx.lineTo(cx, cy + 9);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(cx, cy, 7, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(cx - 6, cy - 6);
          ctx.lineTo(cx + 6, cy + 6);
          ctx.stroke();
        }
      }
      ctx.strokeStyle = "rgba(255,210,110,0.95)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(WALL, CHANNEL_TOP);
      ctx.lineTo(PLAYFIELD_RIGHT, CHANNEL_TOP);
      ctx.stroke();

      if (marbleLoadedRef.current && marbleRef.current) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(ball.pos.x, ball.pos.y, ball.radius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(
          marbleRef.current,
          ball.pos.x - ball.radius,
          ball.pos.y - ball.radius,
          ball.radius * 2,
          ball.radius * 2,
        );
        ctx.restore();
      } else {
        ctx.fillStyle = "#95dfff";
        ctx.beginPath();
        ctx.arc(ball.pos.x, ball.pos.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Glass-like reflection layers for the marble.
      const glassBody = ctx.createRadialGradient(
        ball.pos.x - ball.radius * 0.22,
        ball.pos.y - ball.radius * 0.28,
        1,
        ball.pos.x,
        ball.pos.y,
        ball.radius + 2,
      );
      glassBody.addColorStop(0, "rgba(255,255,255,0.28)");
      glassBody.addColorStop(0.6, "rgba(255,255,255,0.08)");
      glassBody.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = glassBody;
      ctx.beginPath();
      ctx.arc(ball.pos.x, ball.pos.y, ball.radius + 1, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(
        ball.pos.x - ball.radius * 0.12,
        ball.pos.y - ball.radius * 0.14,
        ball.radius * 0.63,
        Math.PI * 1.08,
        Math.PI * 1.78,
      );
      ctx.stroke();
      ctx.restore();

      const specular = ctx.createRadialGradient(
        ball.pos.x - ball.radius * 0.42,
        ball.pos.y - ball.radius * 0.45,
        0.5,
        ball.pos.x - ball.radius * 0.42,
        ball.pos.y - ball.radius * 0.45,
        ball.radius * 0.44,
      );
      specular.addColorStop(0, "rgba(255,255,255,0.95)");
      specular.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = specular;
      ctx.beginPath();
      ctx.arc(
        ball.pos.x - ball.radius * 0.42,
        ball.pos.y - ball.radius * 0.45,
        ball.radius * 0.44,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      ctx.save();
      ctx.shadowColor = "rgba(145,240,255,0.9)";
      ctx.shadowBlur = 16;
      ctx.strokeStyle = "rgba(175,240,255,0.95)";
      ctx.beginPath();
      ctx.arc(ball.pos.x, ball.pos.y, ball.radius + 1, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

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

      // Corner vignette to calm the overall contrast.
      const corners = [
        [WALL, WALL],
        [BOARD_WIDTH - WALL, WALL],
        [WALL, BOARD_HEIGHT - WALL],
        [BOARD_WIDTH - WALL, BOARD_HEIGHT - WALL],
      ] as const;
      for (const [cx, cy] of corners) {
        const vg = ctx.createRadialGradient(cx, cy, 6, cx, cy, 96);
        vg.addColorStop(0, "rgba(0,0,0,0.38)");
        vg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = vg;
        ctx.beginPath();
        ctx.arc(cx, cy, 100, 0, Math.PI * 2);
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
        ball.pos.x = initialBall.pos.x;
        if (spawnDropRef.current) {
          spawnYRef.current += 1.2;
          ball.pos.y = Math.min(initialBall.pos.y, spawnYRef.current);
          if (ball.pos.y >= initialBall.pos.y) spawnDropRef.current = false;
        } else {
          ball.pos.y = initialBall.pos.y;
        }
      } else {
        if (inRailRef.current) {
          if (railPhaseRef.current === 0) {
            railProgressRef.current += railSpeedRef.current * railDirRef.current;
            const t = clamp(railProgressRef.current, 0, 1);
            ball.pos.x = (LAUNCH_RAIL_LEFT + LAUNCH_RAIL_RIGHT) / 2;
            ball.pos.y = LAUNCH_RAIL_BOTTOM - (LAUNCH_RAIL_BOTTOM - LAUNCH_RAIL_TOP - 16) * t;
            if (lowPowerFallbackRef.current && railDirRef.current > 0 && t >= 0.62) {
              railDirRef.current = -1;
            } else if (railDirRef.current < 0 && t <= 0) {
              // Low power: climbs partway then slides back down the rail.
              inRailRef.current = false;
              runDoneRef.current = true;
              ball.launched = false;
              ball.vel = { x: 0, y: 0 };
              ball.pos = { x: -999, y: -999 };
              setStatus("力度不足，彈珠沿軌道滑回去（本次機會已消耗）");
              tone(180, 130, "square", 0.05);
              if (settleTimeoutRef.current) window.clearTimeout(settleTimeoutRef.current);
              settleTimeoutRef.current = window.setTimeout(() => {
                if (ballsRef.current > 0) {
                  runDoneRef.current = false;
                  spawnNextBall();
                } else {
                  setStatus(`彈珠用完，總分 ${scoreRef.current}。按 R 重新開始`);
                }
              }, 900);
            } else if (t >= 1) {
              railPhaseRef.current = 1;
              railArcProgressRef.current = 0;
            }
          } else {
            railArcProgressRef.current += railSpeedRef.current * 0.8;
            const t = clamp(railArcProgressRef.current, 0, 1);
            const mt = 1 - t;
            ball.pos.x =
              mt * mt * LAUNCH_ARC_START.x +
              2 * mt * t * LAUNCH_ARC_CONTROL.x +
              t * t * LAUNCH_EXIT.x;
            ball.pos.y =
              mt * mt * LAUNCH_ARC_START.y +
              2 * mt * t * LAUNCH_ARC_CONTROL.y +
              t * t * LAUNCH_EXIT.y;
            if (t >= 1) {
              inRailRef.current = false;
              ball.pos.x = LAUNCH_EXIT.x;
              ball.pos.y = LAUNCH_EXIT.y;
              const spreadX = (Math.random() - 0.5) * 1.8 + (0.5 - chargeRatioRef.current) * 1.0;
              const launchPower = launchPowerRef.current;
              const linearBoost = 0.65 + launchPower * 1.4;
              ball.vel = { x: spreadX * linearBoost, y: 0.9 + launchPower * 2.2 };
            }
          }
        } else {
          ball.vel.y += GRAVITY;
          ball.vel.x *= DRAG;
          ball.vel.y *= DRAG;
          ball.pos.x += ball.vel.x;
          ball.pos.y += ball.vel.y;
          collideWalls();
          for (const s of layoutRef.current.rails) collideSegment(s);
          for (const tri of layoutRef.current.cornerTriangles) {
            let hitTri = false;
            for (const edge of triangleEdges(tri)) {
              if (collideSegment(edge)) hitTri = true;
            }
            if (hitTri) {
              addRoundPoints(30, "up");
            }
          }
          collideSegment(launchDivider);
          // Top arc is decorative only; no collision to prevent launch jams.
          for (const b of layoutRef.current.bumpers) collideBumper(b);
          for (const obs of layoutRef.current.randomObstacles) collideRandomObstacle(obs);
          collideSeparators();
          const speed = Math.hypot(ball.vel.x, ball.vel.y);
          if (speed < 0.14 && ball.pos.y < CHANNEL_TOP + 10) {
            stuckFramesRef.current += 1;
            if (stuckFramesRef.current > 22) {
              ball.vel.y += 0.65;
              ball.vel.x += ball.pos.x < CENTER_X ? 0.25 : -0.25;
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
          if (ball.pos.y > CHANNEL_TOP + CHANNEL_HEIGHT * 0.72 && ball.vel.y > 0) resolveChannel();
        }
      }

      draw();
      raf = requestAnimationFrame(tick);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (editMode && e.code === "Space") {
        e.preventDefault();
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        if (!ball.launched && !runDoneRef.current && !chargingRef.current && ballsRef.current > 0) {
          chargingRef.current = true;
          chargeStartRef.current = performance.now();
          chargeRatioRef.current = 0;
          setChargeRatio(0);
          setStatus("蓄力中...");
        }
      }
      if (e.key.toLowerCase() === "r") {
        scoreRef.current = 0;
        comboRef.current = 1;
        lastHitRef.current = 0;
        runDoneRef.current = false;
        spawnDropRef.current = false;
        if (settleTimeoutRef.current) {
          window.clearTimeout(settleTimeoutRef.current);
          settleTimeoutRef.current = null;
        }
        chargingRef.current = false;
        chargeStartRef.current = 0;
        chargeRatioRef.current = 0;
        ballsRef.current = 5;
        setScore(0);
        setDisplayScore(0);
        setBalls(5);
        setCombo(1);
        setChargeRatio(0);
        setChargeTier("low");
        setRewardText("");
        setRewardVisible(false);
        scoreMultiplierRef.current = 1;
        setStatus("已重置，按住空白鍵蓄力，放開發球");
        resetBall();
      }
    };

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
    };
  }, [initialBall, editMode]);

  const pickObstacleAt = (x: number, y: number): string => {
    const l = layoutRef.current;
    for (let i = l.bumpers.length - 1; i >= 0; i -= 1) {
      const b = l.bumpers[i];
      if (Math.hypot(x - b.x, y - b.y) <= b.r + 8) return `bumper:${i}`;
    }
    for (let i = l.randomObstacles.length - 1; i >= 0; i -= 1) {
      const o = l.randomObstacles[i];
      if (o.kind === "circle" && Math.hypot(x - o.x, y - o.y) <= o.r + 8) return `obs:${i}`;
      if (o.kind === "rect" && x >= o.x - o.w / 2 && x <= o.x + o.w / 2 && y >= o.y - o.h / 2 && y <= o.y + o.h / 2) return `obs:${i}`;
      if (o.kind === "bar") {
        const mx = (o.segment.a.x + o.segment.b.x) / 2;
        const my = (o.segment.a.y + o.segment.b.y) / 2;
        if (Math.hypot(x - mx, y - my) < 16) return `obs:${i}`;
      }
    }
    for (let i = l.rails.length - 1; i >= 0; i -= 1) {
      const s = l.rails[i];
      const mx = (s.a.x + s.b.x) / 2;
      const my = (s.a.y + s.b.y) / 2;
      if (Math.hypot(x - mx, y - my) < 16) return `rail:${i}`;
    }
    for (let i = l.cornerTriangles.length - 1; i >= 0; i -= 1) {
      const t = l.cornerTriangles[i];
      const cx = (t.a.x + t.b.x + t.c.x) / 3;
      const cy = (t.a.y + t.b.y + t.c.y) / 3;
      if (Math.hypot(x - cx, y - cy) < 22) return `tri:${i}`;
    }
    return "";
  };

  const getCanvasPoint = (e: MouseEvent<HTMLCanvasElement> | WheelEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  };

  const onCanvasMouseDown = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!editMode) return;
    const p = getCanvasPoint(e);
    const key = pickObstacleAt(p.x, p.y);
    if (!key) return;
    setSelectedObstacle(key);
    dragRef.current = { key, lastX: p.x, lastY: p.y };
  };

  const onCanvasMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!editMode || !dragRef.current) return;
    const p = getCanvasPoint(e);
    const dx = p.x - dragRef.current.lastX;
    const dy = p.y - dragRef.current.lastY;
    dragRef.current.lastX = p.x;
    dragRef.current.lastY = p.y;
    updateLayoutByKey(dragRef.current.key, dx, dy);
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
    <main
      className="h-screen w-screen overflow-hidden bg-zinc-900 text-zinc-100"
      style={{
        backgroundImage:
          "linear-gradient(rgba(4,6,12,0.62), rgba(4,6,12,0.62)), url('/window-bg-blur.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="mx-auto flex h-full max-w-7xl flex-col gap-3 p-4">
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-2 rounded-lg bg-zinc-800/85 px-4 py-3 text-center">Pinball</div>
          <div
            className={`col-span-4 rounded-lg px-4 py-3 text-center transition-all ${
              scoreFlash === "up"
                ? "bg-yellow-300 text-zinc-900 shadow-[0_0_24px_rgba(255,230,90,0.95)]"
                : scoreFlash === "down"
                  ? "bg-red-400 text-white shadow-[0_0_24px_rgba(255,90,90,0.95)]"
                  : "bg-zinc-800/85"
            }`}
          >
            分數：{displayScore}
          </div>
          <div className="col-span-2 rounded-lg bg-zinc-800/85 px-4 py-3 text-center">連擊：x{combo}</div>
          <div className="col-span-2 rounded-lg bg-zinc-800/85 px-4 py-3 text-center text-sm">
            <button
              type="button"
              onClick={() => setEditMode((v) => !v)}
              className={`rounded px-2 py-1 text-xs ${editMode ? "bg-amber-400 text-zinc-900" : "bg-zinc-700 text-zinc-100"}`}
            >
              {editMode ? "編輯中" : "編輯模式"}
            </button>
          </div>
          <div className="col-span-2 rounded-lg bg-zinc-800/85 px-2 py-3 text-center text-sm">
            <button
              type="button"
              onClick={saveLayout}
              disabled={savingLayout}
              className="rounded bg-emerald-500 px-2 py-1 text-xs text-zinc-900 disabled:opacity-60"
            >
              {savingLayout ? "儲存中" : "儲存布局"}
            </button>
          </div>
          <div className="col-span-2 rounded-lg bg-zinc-800/85 px-2 py-3 text-center text-xs">{status}</div>
        </div>
        {editMode && selectedObstacle.startsWith("tri:") ? (
          <div className="grid grid-cols-6 gap-2 text-xs">
            <button
              type="button"
              onClick={() => rotateTriangleByKey(selectedObstacle, -8)}
              className="rounded bg-zinc-800/85 px-2 py-2"
            >
              三角形左轉
            </button>
            <button
              type="button"
              onClick={() => rotateTriangleByKey(selectedObstacle, 8)}
              className="rounded bg-zinc-800/85 px-2 py-2"
            >
              三角形右轉
            </button>
            <div className="col-span-2 flex items-center gap-2 rounded bg-zinc-800/85 px-2 py-2">
              <input
                value={triangleRotateInput}
                onChange={(e) => setTriangleRotateInput(e.target.value)}
                className="w-14 rounded bg-zinc-900 px-2 py-1 text-center text-xs"
                inputMode="numeric"
              />
              <button
                type="button"
                onClick={() => {
                  const deg = Number(triangleRotateInput);
                  if (!Number.isFinite(deg)) return;
                  rotateTriangleByKey(selectedObstacle, deg);
                }}
                className="rounded bg-amber-400 px-2 py-1 text-xs text-zinc-900"
              >
                角度套用
              </button>
            </div>
            <button
              type="button"
              onClick={() => stretchTriangleByKey(selectedObstacle, 1.12, 1)}
              className="rounded bg-zinc-800/85 px-2 py-2"
            >
              橫向拉伸
            </button>
            <button
              type="button"
              onClick={() => stretchTriangleByKey(selectedObstacle, 0.9, 1)}
              className="rounded bg-zinc-800/85 px-2 py-2"
            >
              橫向縮回
            </button>
            <button
              type="button"
              onClick={() => stretchTriangleByKey(selectedObstacle, 1, 1.12)}
              className="rounded bg-zinc-800/85 px-2 py-2"
            >
              縱向拉伸
            </button>
            <button
              type="button"
              onClick={() => stretchTriangleByKey(selectedObstacle, 1, 0.9)}
              className="rounded bg-zinc-800/85 px-2 py-2"
            >
              縱向縮回
            </button>
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1 items-center justify-center gap-5">
          <section className="relative border-4 border-[#5b0f0f] bg-[linear-gradient(165deg,#f6b7a8_0%,#d84132_12%,#8f1f1a_36%,#5e1010_62%,#b52d25_84%,#f0a796_100%)] p-3 shadow-[0_0_22px_rgba(255,90,70,0.25),inset_0_1px_0_rgba(255,220,210,0.7),inset_0_-10px_16px_rgba(60,8,8,0.45)]">
            <canvas
              ref={canvasRef}
              width={BOARD_WIDTH}
              height={BOARD_HEIGHT}
              className="rounded-[22px] border border-zinc-600"
              onMouseDown={onCanvasMouseDown}
              onMouseMove={onCanvasMouseMove}
              onMouseUp={onCanvasMouseUp}
              onMouseLeave={onCanvasMouseUp}
              onWheel={onCanvasWheel}
            />
            <div className="pointer-events-none absolute left-1/2 -top-5 -translate-x-1/2 rounded-full bg-zinc-100/95 px-5 py-2 text-3xl font-semibold text-zinc-900 shadow-[0_0_18px_rgba(255,255,255,0.45)]">
              {balls}
            </div>
          </section>

          <aside className="w-20 rounded-md border border-cyan-400/40 bg-zinc-900/80 p-2">
            <div className="mb-2 text-center text-xs text-zinc-300">力度(3s)</div>
            <div className="mb-2 rounded bg-zinc-800/80 py-1 text-center text-[10px] text-zinc-200">
              {chargeTier === "low"
                ? "低段"
                : chargeTier === "mid"
                  ? "中段"
                  : chargeRatio >= 0.999
                    ? "高段 x1.2"
                    : "高段"}
            </div>
            <div className="flex h-[210px] flex-col-reverse gap-[2px]">
              {Array.from({ length: 20 }).map((_, i) => {
                const lit = chargeRatio >= (i + 1) / 20;
                const colorClass =
                  i < 7
                    ? "bg-cyan-300 shadow-[0_0_10px_rgba(80,230,255,0.95)]"
                    : i < 14
                      ? "bg-yellow-300 shadow-[0_0_10px_rgba(255,240,120,0.95)]"
                      : "bg-red-400 shadow-[0_0_10px_rgba(255,100,100,0.95)]";
                return (
                  <div
                    key={i}
                    className={`h-full rounded-[2px] ${lit ? colorClass : "bg-zinc-700/50"}`}
                  />
                );
              })}
            </div>
            <div className="mt-2 text-center text-[10px] text-zinc-400">低(易滑回) / 中 / 高(滿蓄力x1.2)</div>
          </aside>
        </div>

        {rewardText ? (
          <div
            className={`pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-500 ${
              rewardVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="whitespace-pre-line rounded-xl border border-amber-200/70 bg-black/75 px-8 py-4 text-center text-3xl font-semibold text-amber-200 shadow-[0_0_24px_rgba(255,220,120,0.55)]">
              {rewardText}
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-6 gap-2 text-center text-xs">
          <div className="flex items-center justify-center rounded bg-zinc-800/85 p-2">
            <span className="inline-block h-3 w-3 rounded-full border border-amber-200 bg-red-600" />
            <span className="mx-1 inline-block h-3 w-3 rounded-full border border-amber-200 bg-red-600" />
          </div>
          <div className="flex items-center justify-center rounded bg-zinc-800/85 p-2">
            <span className="inline-block h-3 w-6 rounded-sm border border-amber-200 bg-red-700" />
          </div>
          <div className="flex items-center justify-center rounded bg-zinc-800/85 p-2">
            <span className="inline-block h-0 w-0 border-x-[8px] border-b-[12px] border-x-transparent border-b-amber-300" />
          </div>
          <div className="flex items-center justify-center rounded bg-zinc-800/85 p-2">
            <span className="inline-block h-4 w-4 rotate-45 border border-amber-200 bg-red-800" />
          </div>
          <div className="flex items-center justify-center rounded bg-zinc-800/85 p-2">
            <span className="inline-block h-3 w-3 rounded-full border border-amber-200 bg-zinc-600" />
            <span className="mx-1 inline-block h-[1px] w-4 bg-amber-300/90" />
          </div>
          <div className="flex items-center justify-center rounded bg-zinc-800/85 p-2">
            <span className="inline-block h-[2px] w-5 bg-amber-300/95" />
            <span className="ml-1 inline-block h-5 w-[2px] bg-amber-300/95" />
          </div>
        </div>
      </div>
    </main>
  );
}
