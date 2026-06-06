"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import GameHudBar from "@/components/game/GameHudBar";
import { awardStallReward } from "@/lib/collectibles/awardStallReward";

const W = 960;
const H = 640;
const INITIAL_BULLETS = 10;
const GUN_X = W / 2;
const FRONT_ROW_Y = H - 56;
const PLAY_LEFT = 8;
const PLAY_RIGHT = W - 8;
const PLAY_TOP = 48;
const PLAY_BOTTOM = FRONT_ROW_Y - 4;

const SCOPE_CX = W / 2;
const SCOPE_CY = H / 2;
const SCOPE_R = 100;
const SCOPE_DIAMETER = SCOPE_R * 2;
const ZOOM = 1.2;
const CROSSHAIR_R = 5;

const COL_W = W / 3;
const A_RING_CY = 118;
const A_RING_R_CENTER = 68;
const A_RING_R_SIDE = 54;
const B_ZONE_TOP = 368;
const B_CELL_H = 54;
const B_COL_OFFSETS = [-92, -38, 38, 92];

type Zone = "left" | "center" | "right";

type Balloon = {
  id: string;
  zone: Zone;
  area: "A" | "B";
  ringIndex?: number;
  bRow?: number;
  bCol?: number;
  color: string;
  r: number;
  alive: boolean;
  popStart?: number;
  x: number;
  y: number;
};

type ShotFlash = { x: number; y: number; start: number };

const ZONE_CENTER_X: Record<Zone, number> = {
  left: COL_W * 0.5,
  center: COL_W * 1.5,
  right: COL_W * 2.5,
};

const A_BASE_SCORE: Record<Zone, number> = {
  left: 200,
  center: 100,
  right: 200,
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

const B_COLORS = ["#ef4444", "#facc15", "#3b82f6", "#a855f7", "#22c55e", "#f97316", "#ec4899", "#14b8a6"];

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function zoneRingRadius(zone: Zone) {
  return zone === "center" ? A_RING_R_CENTER : A_RING_R_SIDE;
}

function calcAScore(zone: Zone, popped: number, total: number) {
  return Math.max(0, A_BASE_SCORE[zone] - (total - popped) * 50);
}

function balloonRx(b: Balloon) {
  return b.r * 0.72;
}

function pointHitsBalloon(wx: number, wy: number, b: Balloon) {
  const ex = (wx - b.x) / (balloonRx(b) + 2);
  const ey = (wy - b.y) / (b.r + 2);
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

function createBalloons(): Balloon[] {
  const list: Balloon[] = [];
  const zones: Zone[] = ["left", "center", "right"];

  for (const zone of zones) {
    const cx = ZONE_CENTER_X[zone];
    const r = BALLOON_R[zone];

    for (let i = 0; i < 6; i++) {
      list.push({
        id: `${zone}-A-${i}`,
        zone,
        area: "A",
        ringIndex: i,
        color: B_COLORS[i % B_COLORS.length]!,
        r,
        alive: true,
        x: cx,
        y: A_RING_CY,
      });
    }

    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 4; col++) {
        const idx = row * 4 + col;
        list.push({
          id: `${zone}-B-${idx}`,
          zone,
          area: "B",
          bRow: row,
          bCol: col,
          color: B_COLORS[(idx + zones.indexOf(zone)) % B_COLORS.length]!,
          r,
          alive: true,
          x: cx + B_COL_OFFSETS[col]!,
          y: B_ZONE_TOP + row * B_CELL_H,
        });
      }
    }
  }

  return list;
}

function updateRotatingPositions(balloons: Balloon[], angles: Record<Zone, number>) {
  for (const b of balloons) {
    if (b.area !== "A" || !b.alive || b.ringIndex === undefined) continue;
    const cx = ZONE_CENTER_X[b.zone];
    const ringR = zoneRingRadius(b.zone);
    const angle = angles[b.zone] + (b.ringIndex / 6) * Math.PI * 2;
    b.x = cx + Math.cos(angle) * ringR;
    b.y = A_RING_CY + Math.sin(angle) * ringR;
  }
}

function drawBalloon(ctx: CanvasRenderingContext2D, b: Balloon, now: number) {
  if (!b.alive && b.popStart) {
    const t = (now - b.popStart) / 300;
    if (t >= 1) return;
    ctx.save();
    ctx.globalAlpha = 1 - t;
    ctx.translate(b.x, b.y);
    ctx.scale(1 + t * 0.5, 1 + t * 0.5);
    ctx.beginPath();
    ctx.ellipse(0, 0, b.r * 0.72, b.r, 0, 0, Math.PI * 2);
    ctx.fillStyle = b.color;
    ctx.fill();
    ctx.restore();
    return;
  }
  if (!b.alive) return;

  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.beginPath();
  ctx.ellipse(0, 0, b.r * 0.72, b.r, 0, 0, Math.PI * 2);
  ctx.fillStyle = b.color;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.22)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, b.r);
  ctx.quadraticCurveTo(3, b.r + 12, 0, b.r + 18);
  ctx.strokeStyle = "rgba(50,50,50,0.45)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawGun(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.translate(GUN_X, FRONT_ROW_Y);

  ctx.fillStyle = "rgba(90,80,70,0.22)";
  ctx.fillRect(-56, -4, 112, 48);

  ctx.fillStyle = "#27272a";
  ctx.strokeStyle = "#18181b";
  ctx.lineWidth = 2;
  ctx.fillRect(-14, -2, 28, 20);
  ctx.strokeRect(-14, -2, 28, 20);

  const barrelH = 36;
  ctx.fillStyle = "#3f3f46";
  ctx.fillRect(-5, -barrelH, 10, barrelH);
  ctx.strokeRect(-5, -barrelH, 10, barrelH);

  ctx.fillStyle = "#52525b";
  ctx.beginPath();
  ctx.arc(0, -barrelH + 2, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawPanels(ctx: CanvasRenderingContext2D) {
  const zones: Zone[] = ["left", "center", "right"];
  for (let i = 0; i < 3; i++) {
    const x = i * COL_W + 8;
    const w = COL_W - 16;
    ctx.fillStyle = i === 1 ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.2)";
    ctx.fillRect(x, PLAY_TOP, w, FRONT_ROW_Y - PLAY_TOP);
    ctx.strokeStyle = "rgba(100,90,80,0.35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, PLAY_TOP, w, FRONT_ROW_Y - PLAY_TOP);

    const cx = ZONE_CENTER_X[zones[i]!];
    ctx.strokeStyle = "rgba(120,110,100,0.4)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, A_RING_CY, zoneRingRadius(zones[i]!) + 8, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "rgba(80,70,60,0.5)";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(i === 0 ? "左區" : i === 1 ? "中區" : "右區", cx, PLAY_TOP + 14);
    ctx.fillText("A區", cx, A_RING_CY - zoneRingRadius(zones[i]!) - 18);
    ctx.fillText("B區", cx, B_ZONE_TOP - 12);
  }
}

function renderGameScene(
  ctx: CanvasRenderingContext2D,
  balloons: Balloon[],
  now: number,
  drawGunSprite: boolean,
) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#e8e4df");
  grad.addColorStop(1, "#d4cfc8");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  drawPanels(ctx);

  for (const b of balloons) {
    if (b.area === "B") drawBalloon(ctx, b, now);
  }
  for (const b of balloons) {
    if (b.area === "A") drawBalloon(ctx, b, now);
  }

  if (drawGunSprite) drawGun(ctx);
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
  const balloonsRef = useRef<Balloon[]>(createBalloons());
  const aimWorldRef = useRef({ x: W / 2, y: H / 2 });
  const aimModeRef = useRef(false);
  const rotationRef = useRef<Record<Zone, number>>({ left: 0, center: 0, right: 0 });
  const scoredARef = useRef<Set<Zone>>(new Set());
  const shotFlashRef = useRef<ShotFlash | null>(null);

  const [score, setScore] = useState(0);
  const [bullets, setBullets] = useState(INITIAL_BULLETS);
  const [gameOver, setGameOver] = useState(false);
  const [aimMode, setAimMode] = useState(false);
  const [toast, setToast] = useState("");

  const scoreRef = useRef(0);
  const bulletsRef = useRef(INITIAL_BULLETS);
  const gameOverRef = useRef(false);
  const stallRewardGrantedRef = useRef(false);

  const addScore = useCallback((delta: number, msg: string) => {
    scoreRef.current += delta;
    setScore(scoreRef.current);
    setToast(msg);
  }, []);

  const finalizeAScores = useCallback(() => {
    for (const zone of ["left", "center", "right"] as Zone[]) {
      if (scoredARef.current.has(zone)) continue;
      const aBalloons = balloonsRef.current.filter((b) => b.zone === zone && b.area === "A");
      const popped = aBalloons.filter((b) => !b.alive).length;
      if (popped === 0) continue;
      scoredARef.current.add(zone);
      const pts = calcAScore(zone, popped, 6);
      const label = zone === "center" ? "中區 A" : zone === "left" ? "左區 A" : "右區 A";
      addScore(pts, `${label} 區結算 +${pts} 分（少 ${6 - popped} 顆）`);
    }
  }, [addScore]);

  const spendBullet = useCallback(() => {
    if (bulletsRef.current <= 0) return false;
    bulletsRef.current -= 1;
    setBullets(bulletsRef.current);
    if (bulletsRef.current <= 0) {
      gameOverRef.current = true;
      setGameOver(true);
      aimModeRef.current = false;
      setAimMode(false);
      finalizeAScores();
      if (!stallRewardGrantedRef.current) {
        stallRewardGrantedRef.current = true;
        awardStallReward("balloonshoot");
      }
      setToast("子彈用完，遊戲結束");
    }
    return true;
  }, [finalizeAScores]);

  const tryScoreAZone = useCallback(
    (zone: Zone) => {
      if (scoredARef.current.has(zone)) return;
      const aBalloons = balloonsRef.current.filter((b) => b.zone === zone && b.area === "A");
      if (!aBalloons.every((b) => !b.alive)) return;
      scoredARef.current.add(zone);
      const pts = calcAScore(zone, aBalloons.length, 6);
      const label = zone === "center" ? "中區 A" : zone === "left" ? "左區 A" : "右區 A";
      addScore(pts, `${label} 區清空 +${pts} 分`);
    },
    [addScore],
  );

  const popBalloon = useCallback(
    (b: Balloon, now: number) => {
      b.alive = false;
      b.popStart = now;
      if (b.area === "B") {
        addScore(10, `B區氣球 +10（${b.zone === "center" ? "中" : b.zone === "left" ? "左" : "右"}區）`);
      } else {
        tryScoreAZone(b.zone);
      }
    },
    [addScore, tryScoreAZone],
  );

  const popBalloonRef = useRef(popBalloon);
  popBalloonRef.current = popBalloon;

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
        popBalloonRef.current(hit, now);
      } else {
        setToast("未命中");
      }
    },
    [spendBullet],
  );

  useEffect(() => {
    setToast("按住空白鍵進入瞄準模式，瞄準後點擊射擊");
  }, []);

  useEffect(() => {
    const buffer = document.createElement("canvas");
    buffer.width = W;
    buffer.height = H;
    bufferRef.current = buffer;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || gameOverRef.current) return;
      e.preventDefault();
      if (e.repeat) return;
      if (bulletsRef.current <= 0) return;
      aimModeRef.current = true;
      setAimMode(true);
      setToast("瞄準中：移動滑鼠調整準心，點擊左鍵發射");
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      e.preventDefault();
      aimModeRef.current = false;
      setAimMode(false);
      if (!gameOverRef.current) {
        setToast("按住空白鍵進入瞄準模式");
      }
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
      const rot = rotationRef.current;
      rot.left += ROT_SPEED.left;
      rot.center += ROT_SPEED.center;
      rot.right += ROT_SPEED.right;
      updateRotatingPositions(balloonsRef.current, rot);

      if (shotFlashRef.current && now - shotFlashRef.current.start > 220) {
        shotFlashRef.current = null;
      }

      const balloons = balloonsRef.current;
      renderGameScene(bctx, balloons, now, !aimModeRef.current);

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
    balloonsRef.current = createBalloons();
    aimWorldRef.current = { x: W / 2, y: H / 2 };
    aimModeRef.current = false;
    rotationRef.current = { left: 0, center: 0, right: 0 };
    scoredARef.current = new Set();
    shotFlashRef.current = null;
    scoreRef.current = 0;
    bulletsRef.current = INITIAL_BULLETS;
    gameOverRef.current = false;
    stallRewardGrantedRef.current = false;
    setScore(0);
    setBullets(INITIAL_BULLETS);
    setGameOver(false);
    setAimMode(false);
    setToast("按住空白鍵進入瞄準模式，瞄準後點擊射擊");
  };

  return (
    <main className="min-h-full w-full game-stage-shell flex flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-[960px]">
        <div className="mb-2">
          <GameHudBar
            score={score}
            resource={bullets}
            resourceLabel="子彈"
            resourceMax={INITIAL_BULLETS}
          />
        </div>

        <div className="game-playfield-frame overflow-hidden">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className={`relative z-0 block w-full h-auto touch-none ${aimMode ? "cursor-none" : "cursor-default"}`}
            onPointerMove={onPointerMove}
            onPointerDown={onPointerDown}
          />

          <div className="absolute bottom-3 left-4 right-4 flex flex-wrap items-center justify-end gap-2 pointer-events-none">
            <span className={`game-overlay-panel px-3 py-1 text-xs ${aimMode ? "border-accent-red" : ""}`}>
              {aimMode ? "瞄準模式（放開空白鍵退出）" : "按住空白鍵瞄準"}
            </span>
          </div>
        </div>
      </div>

      <p className="mt-3 max-w-[960px] text-center game-message px-2">
        中央手槍 · 空白鍵開啟 1.2 倍瞄準鏡（直徑 200px）· 點擊即射。左/右 A 區 200 分、中 A 區 100 分；B 區 +10。
      </p>

      {toast ? (
        <p className="mt-2 text-sm font-medium text-foreground/80 text-center min-h-[1.25rem]">
          {toast}
        </p>
      ) : null}

      {gameOver ? (
        <div className="mt-4 flex flex-col items-center gap-3">
          <p className="text-lg font-bold text-foreground tracking-widest">
            最終得分：{score}
          </p>
          <button type="button" onClick={resetGame} className="game-btn-primary">
            再玩一次
          </button>
        </div>
      ) : null}
    </main>
  );
}
