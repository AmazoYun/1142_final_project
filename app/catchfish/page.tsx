"use client";

import React, { useEffect, useRef, useSyncExternalStore } from "react";
import {
  durabilityCostForPoints,
  FISH_SIZE_CONFIG,
  FishSize,
  randomPointsForSize,
  useGameStore,
} from "@/store/gameStore";

/**
 * ============================================================================
 * app/page.tsx — 撈金魚小遊戲主頁面
 * ============================================================================
 *
 * 【檔案角色】
 * 本檔是遊戲的「整合層」：把 UI 版型、全域狀態（Zustand）、即時繪圖（Canvas）接在一起。
 *
 * 【三層分工】
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ ① React + Tailwind（本檔 JSX）                                   │
 * │    靜態版型、按鈕、右側分數方塊、春聯預留區、開始/結束遮罩          │
 * ├─────────────────────────────────────────────────────────────────┤
 * │ ② Zustand（@/store/gameStore.ts）                                │
 * │    分數、耐久%、剩餘撈網、遊戲狀態 — 變更時觸發 React 重繪          │
 * ├─────────────────────────────────────────────────────────────────┤
 * │ ③ Canvas + requestAnimationFrame（本檔 useEffect 內）             │
 * │    每幀：畫圓池/魚/網 → 更新物理 → 碰撞 → 呼叫 store.onFishCaught  │
 * │    魚座標、撈網速度存在 useRef，避免 60fps 刷爆 React              │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * 【畫面區塊 ↔ 程式對照（原型圖）】
 * ┌──────────────────────────────────────────────────────────────┐
 * │ ← 返回          → <header> handleBack / resetToIdle           │
 * │ ┌春聯┐         → <aside> 左側，writingMode: vertical-rl       │
 * │ ┌圓池┐         → <section> + <canvas> + drawArena()          │
 * │ │魚│網│       → fishRef / netRef / update() / drawFish()     │
 * │ 🔍 100%       → 圓池右下 DOM 區塊，綁定 store.durability        │
 * │ ┌35┐得分      → 右側方塊上：score                               │
 * │ ┌50┐本次      → 右側方塊中：lastCatchPoints（琥珀色高亮）        │
 * │ ┌100┐撈網     → 右側方塊下：netsRemaining                       │
 * │ ┌春聯┐         → <aside> 右側                                  │
 * └──────────────────────────────────────────────────────────────┘
 *
 * 【單帧遊戲迴圈順序】（render 函式內）
 *   clearRect → drawArena → drawNet → drawFish(全部)
 *   → update(dt)：撈網物理 → 魚移動 → 碰撞 → store → 補魚
 *
 * 【玩家操作流程】
 *   開始 → startGame() + resetGame()
 *   移動滑鼠 → onPointerMove 寫入 net.targetX/Y
 *   每幀撈網慣性追上 target → 距離判定撈魚 → onFishCaught
 *   網壞且無備用網 → status=gameover → 遮罩顯示最終得分
 */

// =============================================================================
// 區塊 A：Canvas 專用型別與常數（不經 React state）
// =============================================================================
// 說明：下列資料每幀都會變，若放 useState 會造成 60fps re-render。
//       因此用 useRef 保存，只在需要顯示在 DOM 的數值才交給 Zustand。

/**
 * Fish — 單一魚的執行時資料（存在 fishRef.current 陣列裡）
 *
 * 與 store 的關係：
 * - size / points / durabilityCost 在 spawnFish() 時從 gameStore 的常數與函式算出
 * - 撈到時把 points、durabilityCost 傳給 onFishCaught，魚物件本身從陣列移除
 */
type Fish = {
  id: number; // 唯一 id，由 gameStatsRef.nextFishId 遞增
  x: number; // 圓池座標系中的位置（px）
  y: number;
  r: number; // 碰撞半徑，來自 FISH_SIZE_CONFIG[size].radius
  speed: number; // 游動速率（px/s）
  angle: number; // 朝向（弧度），決定 vx/vy 方向
  turnRate: number; // 每秒轉向量，讓路徑不會完全直線
  size: FishSize;
  points: number; // 1~10，spawn 時 randomPointsForSize 決定
  durabilityCost: number; // 撈到時扣幾 % 耐久
};

/**
 * Arena — 圓形遊戲區的幾何定義
 *
 * 在 resize() 依 Canvas 寬高重算；魚與撈網都不得超出此圓（扣除自身半徑）。
 * cx, cy：圓心；r：有效半徑（通常為 min(w,h)/2 - 邊距）
 */
type Arena = {
  cx: number;
  cy: number;
  r: number;
};

/**
 * GAME_PARAMS — 平衡用常數（原型版不提供 UI 調參）
 *
 * | 鍵名            | 影響 |
 * |-----------------|------|
 * | initialFish     | 開局與補魚的基準數量 |
 * | fishCountMax    | 場上魚數上限 |
 * | catchRadius     | 撈網判定圓半徑；與魚距離 < catchRadius + 魚半徑 → 撈到 |
 * | netRadius       | 繪製網口大小 |
 * | followK         | 撈網追 target 的加速度係數，越大越跟手 |
 * | damping         | 速度衰減，越大慣性越弱 |
 * | baseFishSpeed   | 魚速基準（px/s） |
 * | fishSpeedRange  | 每條魚速度隨機浮動比例 |
 * | baseTurnRate    | 轉向基準 |
 * | turnRateRange   | 轉向隨機浮動 |
 */
const GAME_PARAMS = {
  initialFish: 8,
  fishCountMax: 12,
  catchRadius: 32,
  netRadius: 36,
  followK: 28,
  damping: 7.5,
  baseFishSpeed: 65,
  fishSpeedRange: 0.85,
  baseTurnRate: 0.42,
  turnRateRange: 0.75,
};

/** 數值夾在 [min, max]，用於限制 dt、座標等 */
function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/**
 * pickFishSize — 加權隨機體型
 * 50% 小、35% 中、15% 大 → 大魚少見但高分高消耗
 */
function pickFishSize(): FishSize {
  const u = Math.random();
  if (u < 0.5) return "small";
  if (u < 0.85) return "medium";
  return "large";
}

/**
 * clampToCircle — 把 (x,y) 投影到圓內可活動範圍
 *
 * @param margin 預留邊距（通常用 netRadius 或 fish.r），避免貼邊時判定異常
 * 用於：onPointerMove 限制滑鼠目標、update 限制撈網位置
 */
function clampToCircle(x: number, y: number, arena: Arena, margin: number) {
  const dx = x - arena.cx;
  const dy = y - arena.cy;
  const dist = Math.hypot(dx, dy);
  const maxDist = Math.max(0, arena.r - margin);
  if (dist <= maxDist || dist === 0) return { x, y };
  const s = maxDist / dist;
  return { x: arena.cx + dx * s, y: arena.cy + dy * s };
}

// =============================================================================
// 區塊 B：Zustand → React 的橋接
// =============================================================================

/**
 * useGameSelector — 訂閱 store 的某一欄位，變更時讓元件 re-render
 *
 * 為何不用 useGameStore(s => s.score)？
 * 使用 useSyncExternalStore 可精準訂閱，且與 React 18+ 外部 store 模式一致。
 *
 * 使用處：下方 score、durability 等 → 只更新有訂閱的 DOM（右側方塊、耐久標籤）
 */
function useGameSelector<T>(selector: (s: ReturnType<typeof useGameStore.getState>) => T): T {
  return useSyncExternalStore(
    useGameStore.subscribe,
    () => selector(useGameStore.getState()),
    () => selector(useGameStore.getState())
  );
}

// =============================================================================
// 區塊 C：Home 元件 — React 狀態、ref、事件處理
// =============================================================================

export default function Home() {
  // ----- DOM ref：Canvas 尺寸與繪圖目標 -----
  const containerRef = useRef<HTMLDivElement | null>(null); // 包住 canvas，ResizeObserver 量寬高
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // ----- 遊戲物件 ref（高頻更新，不觸發 React render）-----
  const fishRef = useRef<Fish[]>([]);
  /**
   * netRef — 撈網狀態
   * - x, y：目前網口位置（慣性計算結果）
   * - vx, vy：速度
   * - targetX, targetY：滑鼠希望網去的位置（onPointerMove 寫入）
   */
  const netRef = useRef({ x: 0, y: 0, vx: 0, vy: 0, targetX: 0, targetY: 0 });
  const arenaRef = useRef<Arena>({ cx: 0, cy: 0, r: 200 });
  const gameStatsRef = useRef({ nextFishId: 1 });
  /** resetGameRef：Canvas effect 內定義 resetGame，掛到 ref 供按鈕在 effect 外呼叫 */
  const resetGameRef = useRef<() => void>(() => {});

  /**
   * statusRef — 鏡像 store.status，供 RAF 內的 update() 讀取
   * 若直接在 update 閉包讀 useGameStore.getState() 也可以，但訂閱 ref 可減少重複 getState
   */
  const statusRef = useRef(useGameStore.getState().status);
  useEffect(() => {
    return useGameStore.subscribe((s) => {
      statusRef.current = s.status;
    });
  }, []);

  // ----- 從 Zustand 訂閱 → 驅動 JSX 顯示（低頻更新）-----
  const score = useGameSelector((s) => s.score);
  const bestScore = useGameSelector((s) => s.bestScore);
  const durability = useGameSelector((s) => s.durability);
  const netsRemaining = useGameSelector((s) => s.netsRemaining);
  const lastCatchPoints = useGameSelector((s) => s.lastCatchPoints);
  const status = useGameSelector((s) => s.status);
  const netReplacedMessage = useGameSelector((s) => s.netReplacedMessage);

  const startGame = useGameStore((s) => s.startGame);
  const resetToIdle = useGameStore((s) => s.resetToIdle);
  const clearNetReplacedMessage = useGameStore((s) => s.clearNetReplacedMessage);

  /** 換網 toast：store 設 netReplacedMessage=true 後，2.5 秒自動關閉 */
  useEffect(() => {
    if (!netReplacedMessage) return;
    const t = window.setTimeout(() => clearNetReplacedMessage(), 2500);
    return () => window.clearTimeout(t);
  }, [netReplacedMessage, clearNetReplacedMessage]);

  /** 開始／再玩：先重置 Zustand，再重置 Canvas 魚群與撈網位置 */
  const handleStart = () => {
    startGame();
    resetGameRef.current();
  };

  /** 返回：回到 idle，清空本局 store，並重置 Canvas（魚重新生成） */
  const handleBack = () => {
    resetToIdle();
    resetGameRef.current();
  };

  // ===========================================================================
  // 區塊 D：Canvas 遊戲迴圈（useEffect 僅在元件掛載時執行一次 []）
  // ===========================================================================
  // 生命週期：掛載 → resize → resetGame → requestAnimationFrame 迴圈
  //          → 卸載時 cancelAnimationFrame + disconnect ResizeObserver
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let lastT = performance.now();
    let w = 0;
    let h = 0;
    const dpr = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));

    // --- D1. 尺寸與圓池幾何 ---
    const resize = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      w = Math.max(280, rect.width);
      h = Math.max(280, rect.height);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // 圓形遊戲區：以 Canvas 中心為圓心，半徑取短邊一半再留邊距
      const arenaR = Math.min(w, h) / 2 - 16;
      arenaRef.current = { cx: w / 2, cy: h / 2, r: arenaR };
    };

    resize();
    const ro = new ResizeObserver(resize);
    if (containerRef.current) ro.observe(containerRef.current);

    // --- D2. 生成單條魚（極座標隨機點 → 落在圓內）---
    const spawnFish = () => {
      const arena = arenaRef.current;
      const size = pickFishSize();
      const cfg = FISH_SIZE_CONFIG[size];
      const points = randomPointsForSize(size);
      const durabilityCost = durabilityCostForPoints(points, size);
      const r = cfg.radius;

      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * Math.max(0, arena.r - r - 8);
      const x = arena.cx + Math.cos(angle) * dist;
      const y = arena.cy + Math.sin(angle) * dist;

      const speedMul = 1 + (Math.random() * 2 - 1) * GAME_PARAMS.fishSpeedRange;
      const speed = GAME_PARAMS.baseFishSpeed * speedMul;
      const turnRate =
        (Math.random() * 2 - 1) * GAME_PARAMS.turnRateRange * GAME_PARAMS.baseTurnRate;

      fishRef.current.push({
        id: gameStatsRef.current.nextFishId++,
        x,
        y,
        r,
        speed,
        angle: Math.random() * Math.PI * 2,
        turnRate,
        size,
        points,
        durabilityCost,
      });
    };

    // --- D3. 重置場上實體（魚陣列清空、撈網回初始點、補滿 initialFish）---
    const resetGame = () => {
      const arena = arenaRef.current;
      const net = netRef.current;
      net.x = arena.cx;
      net.y = arena.cy + arena.r * 0.35;
      net.vx = 0;
      net.vy = 0;
      net.targetX = net.x;
      net.targetY = net.y;

      fishRef.current = [];
      gameStatsRef.current.nextFishId = 1;
      for (let i = 0; i < GAME_PARAMS.initialFish; i++) spawnFish();
    };

    resetGameRef.current = resetGame;
    resetGame();

    // --- D4. 繪圖函式（每幀呼叫，無動畫、無粒子）---

    /** drawArena：灰色圓池 + 描邊，對應原型中央圓形遊戲區 */
    const drawArena = () => {
      const { cx, cy, r } = arenaRef.current;
      ctx.fillStyle = "#d4d4d4";
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#a3a3a3";
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    /** drawFish：橢圓身體 + 三角形尾巴；深淺灰區分大中小 */
    const drawFish = (fish: Fish) => {
      const gray =
        fish.size === "large" ? "#525252" : fish.size === "medium" ? "#737373" : "#a3a3a3";

      ctx.save();
      ctx.translate(fish.x, fish.y);
      ctx.rotate(fish.angle);
      ctx.fillStyle = gray;
      ctx.strokeStyle = "#404040";
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.ellipse(0, 0, fish.r * 1.5, fish.r, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-fish.r * 1.4, 0);
      ctx.lineTo(-fish.r * 1.85, -fish.r * 0.5);
      ctx.lineTo(-fish.r * 1.85, fish.r * 0.5);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    };

    /**
     * drawNet：撈網視覺
     * - 棕色直線：桿
     * - 上半弧：網口（開口朝上）
     * - 半透明實心圓：catchRadius 除錯用，實際碰撞在 update 用同半徑計算
     */
    const drawNet = () => {
      const net = netRef.current;
      const { x, y } = net;
      const nr = GAME_PARAMS.netRadius;

      ctx.strokeStyle = "#78350f";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x, y + nr * 0.1);
      ctx.lineTo(x, y + nr * 1.7);
      ctx.stroke();

      ctx.strokeStyle = "#57534e";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x, y, nr, Math.PI, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = 0.15;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(x, y, GAME_PARAMS.catchRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    };

    /**
     * moveFish — 更新單條魚的位置
     * 1. angle 依 turnRate 轉向
     * 2. 沿 angle 方向以 speed 移動
     * 3. 若超出圓周：貼回邊界並依法線反射（鏡面反彈）
     */
    const moveFish = (fish: Fish, dt: number) => {
      const arena = arenaRef.current;
      fish.angle += fish.turnRate * dt;
      fish.x += Math.cos(fish.angle) * fish.speed * dt;
      fish.y += Math.sin(fish.angle) * fish.speed * dt;

      const dx = fish.x - arena.cx;
      const dy = fish.y - arena.cy;
      const dist = Math.hypot(dx, dy);
      const maxDist = arena.r - fish.r;
      if (dist > maxDist && dist > 0) {
        const nx = dx / dist;
        const ny = dy / dist;
        fish.x = arena.cx + nx * maxDist;
        fish.y = arena.cy + ny * maxDist;
        const vx = Math.cos(fish.angle) * fish.speed;
        const vy = Math.sin(fish.angle) * fish.speed;
        const dot = vx * nx + vy * ny;
        const rvx = vx - 2 * dot * nx;
        const rvy = vy - 2 * dot * ny;
        fish.angle = Math.atan2(rvy, rvx);
      }
    };

    // --- D5. 物理與碰撞（僅 status === playing 時執行）---
    const update = (dt: number) => {
      if (statusRef.current !== "playing") return;

      const arena = arenaRef.current;
      const net = netRef.current;

      // (1) 撈網慣性：spring-damper 模型追 targetX/Y，再 clamp 在圓內
      const ax = (net.targetX - net.x) * GAME_PARAMS.followK;
      const ay = (net.targetY - net.y) * GAME_PARAMS.followK;
      net.vx += ax * dt;
      net.vy += ay * dt;
      const damp = Math.exp(-GAME_PARAMS.damping * dt);
      net.vx *= damp;
      net.vy *= damp;
      net.x += net.vx * dt;
      net.y += net.vy * dt;

      const clamped = clampToCircle(net.x, net.y, arena, GAME_PARAMS.netRadius);
      net.x = clamped.x;
      net.y = clamped.y;

      // (2) 所有魚移動
      for (const fish of fishRef.current) moveFish(fish, dt);

      // (3) 碰撞撈取：圓形距離判定，多條可同幀撈到
      const caught: Fish[] = [];
      const remaining: Fish[] = [];
      for (const fish of fishRef.current) {
        const d = Math.hypot(fish.x - net.x, fish.y - net.y);
        if (d < GAME_PARAMS.catchRadius + fish.r * 0.5) {
          caught.push(fish);
        } else {
          remaining.push(fish);
        }
      }

      if (caught.length > 0) {
        fishRef.current = remaining;
        for (const fish of caught) {
          // 直接 getState() 呼叫，不經 React，避免在 RAF 內觸發額外渲染排程
          useGameStore.getState().onFishCaught(fish.points, fish.durabilityCost);
          if (statusRef.current !== "playing") break; // gameover 後不再處理後續魚
        }
        // (4) 補魚：分數越高 target 略增，不超過 fishCountMax
        const target = clamp(
          GAME_PARAMS.initialFish + Math.floor(useGameStore.getState().score / 50),
          6,
          GAME_PARAMS.fishCountMax
        );
        while (fishRef.current.length < target && statusRef.current === "playing") {
          spawnFish();
        }
      }
    };

    // --- D6. 主迴圈：算 dt → 畫 → 更新 → 下一幀 ---
    const render = (now: number) => {
      const dt = clamp((now - lastT) / 1000, 0, 0.033); // 上限 33ms 防卡頓後瞬移
      lastT = now;

      ctx.clearRect(0, 0, w, h);
      drawArena();
      drawNet();
      for (const fish of fishRef.current) drawFish(fish);
      update(dt);

      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  // =============================================================================
  // 區塊 E：玩家輸入（指標事件）
  // =============================================================================
  /**
   * onPointerMove — 將螢幕座標轉成 Canvas 內座標，寫入 net.targetX/Y
   * 注意：只設定「目標」，實際網位置由 update 的慣性計算，形成延遲感
   */
  const onPointerMove: React.PointerEventHandler<HTMLCanvasElement> = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || status !== "playing") return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const clamped = clampToCircle(x, y, arenaRef.current, GAME_PARAMS.netRadius);
    netRef.current.targetX = clamped.x;
    netRef.current.targetY = clamped.y;
  };

  const isPlaying = status === "playing";
  const isGameOver = status === "gameover";

  // ----- 區塊 F：JSX 版型；子區塊註解標為 F1、F2a…F3，對應原型圖各區域 -----
  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900">
      <div className="min-h-screen flex flex-col p-4 md:p-6">
        {/* F1. 頂部導覽：返回 → handleBack()，重置 store 為 idle 並 resetGame() */}
        <header className="mb-4 shrink-0">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1 text-sm text-neutral-700 hover:text-neutral-900"
          >
            <span aria-hidden>←</span>
            <span>返回</span>
          </button>
        </header>

        {/* F2. 主版型：flex 橫向五欄（春聯 | 圓池 | 資訊方塊 | 春聯） */}
        <div className="flex flex-1 gap-4 md:gap-6 items-stretch min-h-0 justify-center">
          {/* F2a. 左側文字框：灰底直書，日後可替換為春聯 API／props 文字 */}
          <aside
            className="hidden md:flex w-14 lg:w-16 shrink-0 bg-neutral-300 rounded-sm items-center justify-center"
            aria-label="左側文字顯示區"
          >
            <p
              className="text-neutral-600 text-sm tracking-widest"
              style={{ writingMode: "vertical-rl" }}
            >
              這是春聯
            </p>
          </aside>

          {/* F2b. 中央欄：Canvas 圓池 + 絕對定位疊層（耐久、toast、遮罩） */}
          <section className="flex flex-col items-center flex-1 max-w-[min(72vh,640px)] min-w-0">
            <div className="relative w-full aspect-square max-h-[min(72vh,640px)]">
              {/* 圓形裁切：CSS 圓形遮罩；魚的運動邊界由 arenaRef 數學圓控制 */}
              <div className="absolute inset-0 rounded-full overflow-hidden bg-neutral-200 shadow-inner">
                <div ref={containerRef} className="w-full h-full">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-full block touch-none select-none cursor-crosshair"
                    style={{ touchAction: "none" }}
                    onPointerMove={onPointerMove}
                  />
                </div>
              </div>

              {/*
                F2b-1. 撈網耐久顯示（原型右下 🔍 + 100%）
                資料來源：useGameSelector → durability
                更新時機：每次 onFishCaught 扣耐久後由 Zustand 觸發 re-render
              */}
              <div
                className="absolute bottom-2 right-2 md:bottom-4 md:right-4 flex items-center gap-1.5 bg-white/90 border border-neutral-300 rounded-lg px-2.5 py-1.5 text-sm font-medium shadow-sm"
                aria-live="polite"
                aria-label={`撈網耐久 ${Math.round(durability)} 百分比`}
              >
                <svg
                  className="w-4 h-4 text-neutral-600 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="M16 16l5 5" />
                </svg>
                <span>{Math.round(durability)}%</span>
              </div>

              {/* F2b-2. 換網 toast：store.netReplacedMessage，2.5 秒後 clearNetReplacedMessage */}
              {netReplacedMessage && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/95 border border-amber-300 rounded-xl px-4 py-2 text-sm text-amber-900 shadow">
                  撈網損壞，已更換新網（剩餘 {netsRemaining} 張）
                </div>
              )}

              {/*
                F2b-3. 開始／結束遮罩
                - idle：說明 +「開始遊戲」→ handleStart
                - gameover：顯示 score +「再玩一次」→ handleStart
                進行中 (playing) 時不顯示，讓玩家看見完整圓池
              */}
              {(!isPlaying || isGameOver) && (
                <div className="absolute inset-0 rounded-full bg-black/25 flex items-center justify-center">
                  <div className="bg-white rounded-2xl border border-neutral-200 shadow-lg px-6 py-5 max-w-[90%] text-center">
                    {isGameOver ? (
                      <>
                        <p className="text-lg font-semibold mb-1">遊戲結束</p>
                        <p className="text-sm text-neutral-600 mb-4">
                          撈網已用盡。最終得分：{score}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-lg font-semibold mb-1">撈金魚</p>
                        <p className="text-sm text-neutral-600 mb-4 leading-relaxed">
                          移動滑鼠控制撈網（帶慣性延遲）。魚僅在圓池內游動；大魚高分但較耗耐久。
                        </p>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={handleStart}
                      className="px-5 py-2 rounded-xl bg-neutral-800 text-white font-medium hover:bg-neutral-700"
                    >
                      {isGameOver ? "再玩一次" : "開始遊戲"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* F2b-4. 手機版：春聯側欄隱藏時，在圓池下方顯示體型／分數／撈網提示 */}
            <p className="md:hidden mt-2 text-xs text-neutral-500 text-center">
              小魚 1~3 分 · 中魚 4~7 分 · 大魚 8~10 分 · 備用撈網 {netsRemaining} 張
            </p>
          </section>

          {/* F2c. 右側資訊方塊堆疊（原型三個圓角正方形，介於圓池與右春聯之間） */}
          <div className="flex flex-col gap-3 shrink-0 w-16 md:w-20 justify-center" aria-label="遊戲資訊面板">
            {/* 上方方塊：累計得分 ← store.score */}
            <div className="aspect-square rounded-2xl bg-neutral-200 border border-neutral-300 flex flex-col items-center justify-center shadow-sm">
              <span className="text-[10px] text-neutral-500 mb-0.5">得分</span>
              <span className="text-xl md:text-2xl font-bold tabular-nums">{score}</span>
            </div>
            {/* 中間（琥珀色高亮）：上一筆撈魚得分 ← store.lastCatchPoints，無則顯示 — */}
            <div className="aspect-square rounded-2xl bg-amber-100 border-2 border-amber-300 flex flex-col items-center justify-center shadow-md ring-2 ring-amber-200/80">
              <span className="text-[10px] text-amber-800 mb-0.5">本次</span>
              <span className="text-xl md:text-2xl font-bold tabular-nums text-amber-950">
                {lastCatchPoints > 0 ? lastCatchPoints : "—"}
              </span>
            </div>
            {/* 下方：剩餘撈網張數 ← store.netsRemaining（含使用中，初始 3） */}
            <div className="aspect-square rounded-2xl bg-neutral-200 border border-neutral-300 flex flex-col items-center justify-center shadow-sm">
              <span className="text-[10px] text-neutral-500 mb-0.5">撈網</span>
              <span className="text-xl md:text-2xl font-bold tabular-nums">{netsRemaining}</span>
            </div>
          </div>

          {/* F2d. 右側文字框：與左側對稱，預留直書文案 */}
          <aside
            className="hidden md:flex w-14 lg:w-16 shrink-0 bg-neutral-300 rounded-sm items-center justify-center"
            aria-label="右側文字顯示區"
          >
            <p
              className="text-neutral-600 text-sm tracking-widest"
              style={{ writingMode: "vertical-rl" }}
            >
              這是春聯
            </p>
          </aside>
        </div>

        {/* F3. 頁尾：桌面版體型／分數／耐久對照 + bestScore（跨局保留） */}
        <footer className="hidden md:block mt-4 text-center text-xs text-neutral-500">
          小魚 1~3 分（耐久 -8% 起）· 中魚 4~7 分 · 大魚 8~10 分 · 最佳紀錄 {bestScore}
        </footer>
      </div>
    </div>
  );
}
