"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import GameHudBar from "@/components/game/GameHudBar";
import { awardStallReward } from "@/lib/collectibles/awardStallReward";
import {
  BALLOON_COLORS,
  loadBalloonAssets,
  type BalloonAssets,
  type BalloonColor,
} from "@/lib/balloonshoot/assets";

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

type Zone = "left" | "center" | "right";

const COL_W = W / 3;
const BALLOON_SHIFT_Y = 40;
const ZONE_OFFSET_X: Record<Zone, number> = { left: 25, center: 0, right: -25 };
/** A 區旋轉氣球：左右再往內 10px */
const A_ZONE_EXTRA_X: Record<Zone, number> = { left: 10, center: 0, right: -10 };
/** A 區旋轉氣球：左右 +50px、中央 +35px（相對 A_RING_CY） */
const A_ZONE_EXTRA_Y: Record<Zone, number> = { left: 50, center: 35, right: 50 };
/** 左區 B 區氣球再往右 10px */
const B_ZONE_EXTRA_X: Record<Zone, number> = { left: 10, center: 0, right: 0 };
/** B 區最下排：左 +5px、右 -5px */
const B_ZONE_BOTTOM_ROW_EXTRA_X: Record<Zone, number> = { left: 5, center: 0, right: -5 };
const BALLOON_SIZE_SCALE = 1.44;
const A_RING_CY = 118 + BALLOON_SHIFT_Y;
const A_RING_R_CENTER = 68;
const A_RING_R_SIDE = 54;
const B_ZONE_TOP = 368 + BALLOON_SHIFT_Y;
const B_CELL_H = 54;
const B_COL_OFFSETS = [-92, -38, 38, 92];

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

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function zoneRingRadius(zone: Zone) {
  return zone === "center" ? A_RING_R_CENTER : A_RING_R_SIDE;
}

function zoneCenterX(zone: Zone, area: "A" | "B" = "B") {
  const base = ZONE_CENTER_X[zone] + ZONE_OFFSET_X[zone];
  if (area === "A") return base + A_ZONE_EXTRA_X[zone];
  return base;
}

function aRingCenterY(zone: Zone) {
  return A_RING_CY + A_ZONE_EXTRA_Y[zone];
}

function bZoneBalloonX(zone: Zone, row: number, col: number) {
  const bottomExtra = row === 1 ? B_ZONE_BOTTOM_ROW_EXTRA_X[zone] : 0;
  return zoneCenterX(zone) + B_ZONE_EXTRA_X[zone] + bottomExtra + B_COL_OFFSETS[col]!;
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
    const cx = zoneCenterX(zone, "A");
    const r = BALLOON_R[zone] * BALLOON_SIZE_SCALE;

    for (let i = 0; i < 6; i++) {
      list.push({
        id: `${zone}-A-${i}`,
        zone,
        area: "A",
        ringIndex: i,
        color: BALLOON_COLORS[i % BALLOON_COLORS.length]!,
        r,
        alive: true,
        x: cx,
        y: aRingCenterY(zone),
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
          color: BALLOON_COLORS[(idx + zones.indexOf(zone)) % BALLOON_COLORS.length]!,
          r,
          alive: true,
          x: bZoneBalloonX(zone, row, col),
          y: B_ZONE_TOP + row * B_CELL_H,
        });
      }
    }
  }

  return list;
}

function updateRotatingPositions(balloons: Balloon[], angles: Record<Zone, number>) {
  for (const b of balloons) {
    if (b.area !== "A" || b.ringIndex === undefined) continue;
    const cx = zoneCenterX(b.zone, "A");
    const ringR = zoneRingRadius(b.zone);
    const angle = angles[b.zone] + (b.ringIndex / 6) * Math.PI * 2;
    b.x = cx + Math.cos(angle) * ringR;
    b.y = aRingCenterY(b.zone) + Math.sin(angle) * ringR;
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
    const drawY = b.y - h * 0.55;
    drawBalloonShadow(ctx, b.x, drawY, w, h, true);
    ctx.drawImage(img, b.x - w / 2, drawY, w, h);
    return;
  }

  const img = assets.full[b.color];
  const targetH = b.r * 2.15;
  const scale = targetH / img.naturalHeight;
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  const drawY = b.y - h * 0.52;
  drawBalloonShadow(ctx, b.x, drawY, w, h);
  ctx.drawImage(img, b.x - w / 2, drawY, w, h);
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

function renderGameScene(
  ctx: CanvasRenderingContext2D,
  assets: BalloonAssets | null,
  balloons: Balloon[],
  now: number,
  drawGunSprite: boolean,
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
  const assetsRef = useRef<BalloonAssets | null>(null);
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
    loadBalloonAssets()
      .then((assets) => {
        assetsRef.current = assets;
      })
      .catch(() => {
        setToast("素材載入失敗，使用備用顯示");
      });
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
      renderGameScene(bctx, assetsRef.current, balloons, now, !aimModeRef.current);

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
        <div className="game-playfield-frame overflow-hidden">
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
          <p className="game-score-board-bg px-6 py-3 text-lg font-bold tracking-widest text-center">
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
