"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import CatchfishNetHud from "@/components/catchfish/CatchfishNetHud";
import GameHudBar from "@/components/game/GameHudBar";
import GamePageHeader from "@/components/game/GamePageHeader";
import {
  GameRoundActiveProvider,
  useGameRoundActive,
} from "@/components/game/GameRoundActiveContext";
import { narrativeDefault } from "@/data/narrative-default";
import GameRoundEndModal from "@/components/game/GameRoundEndModal";
import { awardStallReward } from "@/lib/collectibles/awardStallReward";
import { STALL_REWARD } from "@/lib/collectibles/stallRewards";
import { isGameInputBlocked } from "@/lib/collectibles/isGameInputBlocked";
import {
  navigateToMarketFromGame,
  returnToMarketAfterRound,
} from "@/lib/economy/returnToMarket";
import { finalizeGameRound } from "@/lib/economy/processRoundEnd";
import { trySpendPlayCost } from "@/lib/economy/playGame";
import { navigateWithFade } from "@/lib/navigation/navigateWithFade";
import { usePageFadeIn } from "@/lib/navigation/usePageFadeIn";
import { clearStallRoundDismissed } from "@/lib/game/stallRoundLeave";
import { useStallRoundEndLeave } from "@/lib/game/useStallRoundEndLeave";
import { reportStallScore } from "@/lib/player/reportStallScore";
import { useTokenStore } from "@/store/tokenStore";
import { loadCatchFishAssets, type LoadedCatchFishAssets } from "@/lib/catchfish/assets";
import {
  catchAnimPose,
  catchAnimToDisplay,
  createCatchAnimation,
  type CatchAnimation,
} from "@/lib/catchfish/catchAnimation";
import {
  relayoutCaughtFishStack,
  type CaughtFishDisplay,
} from "@/lib/catchfish/caughtDisplay";
import {
  createEscapeAnimation,
  escapeAnimPose,
  type EscapeAnimation,
} from "@/lib/catchfish/escapeAnimation";
import {
  drawCatchFishBackground,
  drawFishSprite,
  drawNetSprite,
  drawScoopProgressBar,
} from "@/lib/catchfish/drawSprites";
import { CatchFishEffects } from "@/lib/catchfish/effects";
import {
  createCatchFishAmbientSfx,
  createCatchFishSoundFx,
  type CatchFishSoundFx,
} from "@/lib/catchfish/sounds";
import { playImpactSound } from "@/lib/sfx/randomSfx";
import { netArenaMargin, pickFishSpriteIndex } from "@/lib/catchfish/spriteMeta";
import {
  canThrowBackCaught,
  findLargeCaughtFishAt,
  isLargeCaughtFish,
  isPointInThrowBackPool,
} from "@/lib/catchfish/throwBack";
import {
  catchDurabilityCost,
  FLEE_DELAY_SEC,
  FLEE_RADIUS,
  FLEE_CONTACT_SPEED_MUL,
  FLEE_SCOOP_FAR_MUL,
  FLEE_SCOOP_NEAR_MUL,
  FLEE_SPEED_MUL,
  SCOOP_STRUGGLE_JITTER,
  SCOOP_STRUGGLE_SPEED_MUL,
  holdDrainPerSecond,
  scoopHoldDuration,
} from "@/lib/catchfish/scoopMechanics";
import {
  FISH_SIZE_CONFIG,
  FishSize,
  INITIAL_NETS,
  randomPointsForSize,
  useGameStore,
} from "@/store/gameStore";
import { useCollectibleStore } from "@/store/collectibleStore";

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
  spriteIndex: number;
  points: number;
  spawnAlpha: number;
  rippleTimer: number;
  fleeTimer: number;
  wanderTimer: number;
  wanderOffset: number;
  scoopStruggle: number;
  prevX: number;
  prevY: number;
};

type ScoopState = {
  fishId: number;
  progress: number;
  holdSec: number;
  catchCost: number;
  points: number;
  spriteIndex: number;
  r: number;
  size: FishSize;
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
/** 魚池圓形活動半徑（原 80% 再縮小 20% → 64%） */
const ARENA_RADIUS_SCALE = 0.64;

const GAME_PARAMS = {
  initialFish: 7,
  fishCountMax: 10,
  catchRadius: 29,
  followK: 28,
  damping: 7.5,
  baseFishSpeed: 100,
  fishSpeedRange: 1.1,
  baseTurnRate: 0.55,
  turnRateRange: 1.35,
  wanderIntervalMin: 0.18,
  wanderIntervalMax: 0.75,
  wanderJitter: 2.6,
  fishSeparationGap: 20,
  fishSpawnFadeDuration: 0.55,
  fishRippleInterval: 0.85,
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

export default function CatchFishGame() {
  return (
    <GameRoundActiveProvider>
      <CatchFishGameInner />
    </GameRoundActiveProvider>
  );
}

function CatchFishGameInner() {
  const router = useRouter();
  usePageFadeIn();

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
  const assetsRef = useRef<LoadedCatchFishAssets | null>(null);
  const catchAnimRef = useRef<CatchAnimation | null>(null);
  const caughtDisplayRef = useRef<CaughtFishDisplay[]>([]);
  const scoopRef = useRef<ScoopState | null>(null);
  const spaceHeldRef = useRef(false);
  const escapeAnimRef = useRef<EscapeAnimation | null>(null);
  const effectsRef = useRef(new CatchFishEffects());
  const onNetBreakEndRef = useRef<() => void>(() => {});
  const catchfishRewardGrantedRef = useRef(false);
  const catchfishExitPendingRef = useRef(false);
  const throwBackSequenceRef = useRef(false);
  const bloodyAlphaRef = useRef(0);
  const bloodyFadeStartRef = useRef<number | null>(null);
  const largeFishCaughtRef = useRef(0);
  const totalFishCaughtRef = useRef(0);
  const sevenFishBonusGivenRef = useRef(false);
  const roundEndHandledRef = useRef(false);
  const sfxRef = useRef<CatchFishSoundFx | null>(null);

  const tokens = useTokenStore((s) => s.tokens);
  const [roundEnd, setRoundEnd] = useState<{ score: number; lotteryYuan: number } | null>(null);

  const [loadedAssets, setLoadedAssets] = useState<LoadedCatchFishAssets | null>(null);
  const [breakingSlot, setBreakingSlot] = useState<number | null>(null);
  const [showReplaceToast, setShowReplaceToast] = useState(false);
  const [throwBackReady, setThrowBackReady] = useState(false);
  const [throwBackExit, setThrowBackExit] = useState(false);
  const [darkRedUiAlpha, setDarkRedUiAlpha] = useState(0);
  const throwDragRef = useRef<{ fishIndex: number; x: number; y: number } | null>(null);
  const collectiblesHydrated = useCollectibleStore((s) => s.hydrated);
  const acquired = useCollectibleStore((s) => s.acquired);
  const hasCatchfishReward = useCollectibleStore((s) => s.hasAcquired(STALL_REWARD.catchfish));
  const pendingAcquireDialogue = useCollectibleStore((s) => s.pendingAcquireDialogue);
  const pendingAcquireAnimation = useCollectibleStore((s) => s.pendingAcquireAnimation);
  const { setRoundActive } = useGameRoundActive();

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
  const durability = useGameSelector((s) => s.durability);
  const netsRemaining = useGameSelector((s) => s.netsRemaining);
  const status = useGameSelector((s) => s.status);

  useEffect(() => {
    setRoundActive(status === "playing" && !throwBackExit);
  }, [status, throwBackExit, setRoundActive]);

  const startGame = useGameStore((s) => s.startGame);
  const resetToIdle = useGameStore((s) => s.resetToIdle);
  const clearNetReplacedMessage = useGameStore((s) => s.clearNetReplacedMessage);

  onNetBreakEndRef.current = () => {
    setBreakingSlot(null);
  };

  useEffect(() => {
    if (!showReplaceToast) return;
    const t = window.setTimeout(() => {
      setShowReplaceToast(false);
      clearNetReplacedMessage();
    }, 2200);
    return () => window.clearTimeout(t);
  }, [showReplaceToast, clearNetReplacedMessage]);

  useEffect(() => {
    if (status !== "gameover") return;
    if (throwBackExit) return;
    const finalScore = useGameStore.getState().score;
    reportStallScore("catchfish", finalScore);
    if (!roundEndHandledRef.current) {
      roundEndHandledRef.current = true;
      const summary = finalizeGameRound(finalScore);
      setRoundEnd({ score: summary.score, lotteryYuan: summary.lotteryYuan });
    }
  }, [status, throwBackExit]);

  useEffect(() => {
    if (!catchfishExitPendingRef.current) return;
    if (pendingAcquireDialogue) return;
    if (pendingAcquireAnimation?.mode === "acquire") return;
    catchfishExitPendingRef.current = false;
    void navigateToMarketFromGame(router);
  }, [pendingAcquireDialogue, pendingAcquireAnimation, router]);

  useEffect(() => {
    document.title = "撈金魚｜無人夜市";
  }, []);

  useEffect(() => {
    useCollectibleStore.getState().hydrate();
  }, []);

  const syncThrowBackReady = () => {
    if (hasCatchfishReward) {
      setThrowBackReady(false);
      return;
    }
    const stage = containerRef.current;
    if (stage && caughtDisplayRef.current.length > 0) {
      const { width: cw, height: ch } = stage.getBoundingClientRect();
      if (cw > 0 && ch > 0) {
        relayoutCaughtFishStack(caughtDisplayRef.current, cw, ch);
      }
    }
    setThrowBackReady(
      canThrowBackCaught(caughtDisplayRef.current, catchfishRewardGrantedRef.current),
    );
  };

  useEffect(() => {
    if (!collectiblesHydrated) return;
    syncThrowBackReady();
  }, [collectiblesHydrated, acquired, hasCatchfishReward]);

  useEffect(() => {
    const sfx = createCatchFishSoundFx();
    const ambient = createCatchFishAmbientSfx();
    sfxRef.current = sfx;
    sfx.preload();
    ambient.preload();
    ambient.start();
    return () => {
      sfx.dispose();
      ambient.dispose();
      sfxRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadCatchFishAssets()
      .then((assets) => {
        if (cancelled) return;
        assetsRef.current = assets;
        setLoadedAssets(assets);
      })
      .catch(() => {
        assetsRef.current = null;
        setLoadedAssets(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** 進入頁面後直接開始（玩法說明已在攤位顯示） */
  useEffect(() => {
    if (!loadedAssets || status !== "idle") return;
    catchfishRewardGrantedRef.current = false;
    largeFishCaughtRef.current = 0;
    totalFishCaughtRef.current = 0;
    sevenFishBonusGivenRef.current = false;
    roundEndHandledRef.current = false;
    setRoundEnd(null);
    startGame();
    resetGameRef.current();
  }, [loadedAssets, startGame, status]);

  /** 開始／再玩：先重置 Zustand，再重置 Canvas 魚群與撈網位置 */
  const dismissRoundEndUi = () => {
    catchfishRewardGrantedRef.current = false;
    catchfishExitPendingRef.current = false;
    throwBackSequenceRef.current = false;
    bloodyAlphaRef.current = 0;
    bloodyFadeStartRef.current = null;
    setDarkRedUiAlpha(0);
    setThrowBackExit(false);
    setThrowBackReady(false);
    largeFishCaughtRef.current = 0;
    totalFishCaughtRef.current = 0;
    sevenFishBonusGivenRef.current = false;
    roundEndHandledRef.current = false;
    setRoundEnd(null);
    startGame();
    resetGameRef.current();
  };

  const handleStart = () => {
    catchfishRewardGrantedRef.current = false;
    catchfishExitPendingRef.current = false;
    throwBackSequenceRef.current = false;
    bloodyAlphaRef.current = 0;
    bloodyFadeStartRef.current = null;
    setDarkRedUiAlpha(0);
    setThrowBackExit(false);
    setThrowBackReady(false);
    largeFishCaughtRef.current = 0;
    totalFishCaughtRef.current = 0;
    sevenFishBonusGivenRef.current = false;
    roundEndHandledRef.current = false;
    setRoundEnd(null);
    startGame();
    resetGameRef.current();
  };

  const isGameOver = status === "gameover";

  useStallRoundEndLeave(
    "catchfish",
    isGameOver && roundEnd !== null && !throwBackExit,
    dismissRoundEndUi,
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isGameInputBlocked()) return;
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        spaceHeldRef.current = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (isGameInputBlocked()) return;
      if (e.code === "Space" || e.key === " ") {
        spaceHeldRef.current = false;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

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
      const arenaR = (Math.min(w, h) / 2 - 16) * ARENA_RADIUS_SCALE;
      arenaRef.current = { cx: w / 2, cy: h / 2, r: arenaR };
      if (caughtDisplayRef.current.length > 0) {
        relayoutCaughtFishStack(caughtDisplayRef.current, w, h);
      }
    };

    resize();
    const ro = new ResizeObserver(resize);
    if (containerRef.current) ro.observe(containerRef.current);

    const effects = effectsRef.current;

    const spawnFish = () => {
      const arena = arenaRef.current;
      const size = pickFishSize();
      const cfg = FISH_SIZE_CONFIG[size];
      const points = randomPointsForSize(size);
      const r = cfg.radius;

      const entryAngle = Math.random() * Math.PI * 2;
      const spawnDist = Math.max(r + 4, arena.r - r - 6);
      const x = arena.cx + Math.cos(entryAngle) * spawnDist;
      const y = arena.cy + Math.sin(entryAngle) * spawnDist;
      const toCenter = Math.atan2(arena.cy - y, arena.cx - x);

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
        angle: toCenter + (Math.random() - 0.5) * 1.2,
        turnRate,
        size,
        spriteIndex: pickFishSpriteIndex(size),
        points,
        spawnAlpha: 0.2,
        rippleTimer: Math.random() * GAME_PARAMS.fishRippleInterval,
        fleeTimer: 0,
        wanderTimer: Math.random() * GAME_PARAMS.wanderIntervalMax,
        wanderOffset: (Math.random() - 0.5) * GAME_PARAMS.wanderJitter,
        scoopStruggle: 0,
        prevX: x,
        prevY: y,
      });
    };

    const fishInContact = (fish: Fish, netX: number, netY: number) =>
      Math.hypot(fish.x - netX, fish.y - netY) < GAME_PARAMS.catchRadius + fish.r * 0.85;

    const refreshThrowBackReady = () => {
      if (useCollectibleStore.getState().hasAcquired(STALL_REWARD.catchfish)) {
        setThrowBackReady(false);
        return;
      }
      if (caughtDisplayRef.current.length > 0) {
        relayoutCaughtFishStack(caughtDisplayRef.current, w, h);
      }
      setThrowBackReady(
        canThrowBackCaught(caughtDisplayRef.current, catchfishRewardGrantedRef.current),
      );
    };

    const beginCatch = (fish: Fish) => {
      const previousCaught = caughtDisplayRef.current.map((c) => ({
        r: c.r,
        spriteIndex: c.spriteIndex,
        scaleMul: c.scaleMul,
      }));
      const slotIndex = caughtDisplayRef.current.length;
      catchAnimRef.current = createCatchAnimation(fish, w, h, slotIndex, previousCaught);
      effects.addSplash(netRef.current.x, netRef.current.y);
    };

    const showNetBreakNotification = (force = false) => {
      const state = useGameStore.getState();
      if (!force && !state.netReplacedMessage) return;
      const brokenSlot = INITIAL_NETS - state.netsRemaining - 1;
      setBreakingSlot(Math.max(0, brokenSlot));
      setShowReplaceToast(true);
      effects.startNetBreak(netRef.current.x, netRef.current.y);
      sfxRef.current?.playNetBreak();
    };

    const triggerNetBreak = () => {
      const netsBefore = useGameStore.getState().netsRemaining;
      useGameStore.getState().breakNet();
      if (netsBefore <= 1) {
        effects.startNetBreak(netRef.current.x, netRef.current.y);
        sfxRef.current?.playNetBreak();
        return;
      }
      showNetBreakNotification();
    };

    const triggerFishEscape = (fish: Fish) => {
      const away = Math.atan2(
        fish.y - netRef.current.y,
        fish.x - netRef.current.x,
      );
      fishRef.current = fishRef.current.filter((f) => f.id !== fish.id);
      escapeAnimRef.current = createEscapeAnimation({ ...fish, angle: away });
      scoopRef.current = null;
      sfxRef.current?.playFishMiss();
      effects.addSplash(fish.x, fish.y, 10);
    };

    const finishCatchAnimation = () => {
      const anim = catchAnimRef.current;
      if (!anim) return;

      caughtDisplayRef.current.push(catchAnimToDisplay(anim));
      replenishFish();
      catchAnimRef.current = null;
      refreshThrowBackReady();
    };

    const updateCatchAnimation = (dt: number) => {
      const anim = catchAnimRef.current;
      if (!anim) return;
      anim.progress += dt / anim.duration;
      if (anim.progress >= 1) finishCatchAnimation();
    };

    const updateEscapeAnimation = (dt: number) => {
      const anim = escapeAnimRef.current;
      if (!anim) return;
      anim.progress += dt / anim.duration;
      anim.x += anim.vx * dt;
      anim.y += anim.vy * dt;
      if (anim.progress >= 1) escapeAnimRef.current = null;
    };

    const completeScoop = (fish: Fish, scoop: ScoopState) => {
      const before = useGameStore.getState();
      fishRef.current = fishRef.current.filter((f) => f.id !== fish.id);
      scoopRef.current = null;
      useGameStore.getState().onFishCaught(scoop.points, scoop.catchCost);

      totalFishCaughtRef.current += 1;
      if (scoop.size === "large") {
        largeFishCaughtRef.current += 1;
      }

      let bonus = 0;
      if (totalFishCaughtRef.current > 7 && !sevenFishBonusGivenRef.current) {
        bonus += 50;
        sevenFishBonusGivenRef.current = true;
      }
      if (bonus > 0) {
        useGameStore.setState((s) => ({
          score: s.score + bonus,
          bestScore: Math.max(s.bestScore, s.score + bonus),
        }));
      }

      const after = useGameStore.getState();
      if (after.netReplacedMessage || after.netsRemaining < before.netsRemaining) {
        showNetBreakNotification(true);
      }
      sfxRef.current?.playCaught();
      beginCatch(fish);
    };

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
      caughtDisplayRef.current = [];
      catchAnimRef.current = null;
      scoopRef.current = null;
      escapeAnimRef.current = null;
      spaceHeldRef.current = false;
      sfxRef.current?.stopCatching();
      effects.ripples = [];
      effects.splashes = [];
      effects.netBreak = null;
      gameStatsRef.current.nextFishId = 1;
      largeFishCaughtRef.current = 0;
      totalFishCaughtRef.current = 0;
      sevenFishBonusGivenRef.current = false;
      bloodyAlphaRef.current = 0;
      bloodyFadeStartRef.current = null;
      throwBackSequenceRef.current = false;
      setDarkRedUiAlpha(0);
      setThrowBackReady(false);
      throwDragRef.current = null;
      setBreakingSlot(null);
      setShowReplaceToast(false);
      for (let i = 0; i < GAME_PARAMS.initialFish; i++) spawnFish();
    };

    const replenishFish = () => {
      const target = clamp(
        GAME_PARAMS.initialFish + Math.floor(useGameStore.getState().score / 50),
        5,
        GAME_PARAMS.fishCountMax,
      );
      while (fishRef.current.length < target && statusRef.current === "playing") {
        spawnFish();
      }
    };

    resetGameRef.current = resetGame;
    resetGame();

    const netMargin = netArenaMargin(GAME_PARAMS.catchRadius);

    const clampFishInArena = (fish: Fish, bounce = false) => {
      const arena = arenaRef.current;
      const dx = fish.x - arena.cx;
      const dy = fish.y - arena.cy;
      const dist = Math.hypot(dx, dy);
      const maxDist = arena.r - fish.r;
      if (dist <= maxDist || dist === 0) return;

      const nx = dx / dist;
      const ny = dy / dist;
      fish.x = arena.cx + nx * maxDist;
      fish.y = arena.cy + ny * maxDist;

      if (!bounce) return;

      const vx = Math.cos(fish.angle) * fish.speed;
      const vy = Math.sin(fish.angle) * fish.speed;
      const dot = vx * nx + vy * ny;
      const rvx = vx - 2 * dot * nx;
      const rvy = vy - 2 * dot * ny;
      fish.angle = Math.atan2(rvy, rvx);
    };

    const separateFish = () => {
      const fish = fishRef.current;
      const gap = GAME_PARAMS.fishSeparationGap;
      for (let i = 0; i < fish.length; i += 1) {
        for (let j = i + 1; j < fish.length; j += 1) {
          const a = fish[i];
          const b = fish[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy) || 1;
          const minDist = a.r + b.r + gap;
          if (dist >= minDist) continue;
          const push = (minDist - dist) * 0.5;
          const nx = dx / dist;
          const ny = dy / dist;
          a.x -= nx * push;
          a.y -= ny * push;
          b.x += nx * push;
          b.y += ny * push;
        }
      }
      for (const f of fish) clampFishInArena(f);
    };

    const refreshFishWander = (fish: Fish) => {
      fish.wanderTimer =
        GAME_PARAMS.wanderIntervalMin +
        Math.random() * (GAME_PARAMS.wanderIntervalMax - GAME_PARAMS.wanderIntervalMin);
      fish.wanderOffset = (Math.random() - 0.5) * GAME_PARAMS.wanderJitter;
      fish.turnRate =
        (Math.random() * 2 - 1) * GAME_PARAMS.turnRateRange * GAME_PARAMS.baseTurnRate;
    };

    const fleeSpeedMul = (fish: Fish, netX: number, netY: number, urgent: boolean) => {
      if (fishInContact(fish, netX, netY)) return FLEE_CONTACT_SPEED_MUL;
      if (urgent) return FLEE_SCOOP_NEAR_MUL;
      return FLEE_SPEED_MUL;
    };

    const steerFishAway = (
      fish: Fish,
      netX: number,
      netY: number,
      dt: number,
      turnSharpness: number,
    ) => {
      const away = Math.atan2(fish.y - netY, fish.x - netX);
      let diff = away - fish.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      fish.angle += diff * Math.min(1, dt * turnSharpness);
    };

    const applyFishSwim = (fish: Fish, dt: number, speedMul = 1) => {
      fish.wanderTimer -= dt;
      if (fish.wanderTimer <= 0) refreshFishWander(fish);

      const jitter = (Math.random() - 0.5) * 1.15 * dt;
      fish.angle += (fish.turnRate + fish.wanderOffset * 0.45 + jitter) * dt;
      fish.x += Math.cos(fish.angle) * fish.speed * speedMul * dt;
      fish.y += Math.sin(fish.angle) * fish.speed * speedMul * dt;
    };

    const applyFishFlee = (
      fish: Fish,
      netX: number,
      netY: number,
      dt: number,
      urgent: boolean,
    ): boolean => {
      const d = Math.hypot(fish.x - netX, fish.y - netY);
      if (d > FLEE_RADIUS) {
        fish.fleeTimer = 0;
        return false;
      }

      fish.fleeTimer += dt;
      if (!urgent && fish.fleeTimer < FLEE_DELAY_SEC) return false;

      const speedMul = fleeSpeedMul(fish, netX, netY, urgent);
      steerFishAway(fish, netX, netY, dt, urgent ? 14 : 7);
      fish.x += Math.cos(fish.angle) * fish.speed * speedMul * dt;
      fish.y += Math.sin(fish.angle) * fish.speed * speedMul * dt;
      applyFishSwim(fish, dt, urgent ? 0.4 : 0.2);
      clampFishInArena(fish, true);
      return true;
    };

    const moveScoopTarget = (fish: Fish, dt: number) => {
      fish.scoopStruggle += dt;
      const wobble = fish.scoopStruggle;
      const struggleAngle =
        fish.angle + Math.sin(wobble * 14) * 0.55 + Math.cos(wobble * 9) * 0.35;
      fish.x += Math.cos(struggleAngle) * fish.speed * SCOOP_STRUGGLE_SPEED_MUL * dt;
      fish.y += Math.sin(struggleAngle) * fish.speed * SCOOP_STRUGGLE_SPEED_MUL * dt;
      fish.x += (Math.random() - 0.5) * SCOOP_STRUGGLE_JITTER * dt;
      fish.y += (Math.random() - 0.5) * SCOOP_STRUGGLE_JITTER * dt;
      clampFishInArena(fish, false);
    };

    /** 按住空白鍵時，非目標魚快速逃離（無顫抖抖動，僅直線加速逃離） */
    const moveFishFleeWhileScooping = (fish: Fish, netX: number, netY: number, dt: number) => {
      const d = Math.hypot(fish.x - netX, fish.y - netY);
      const inContact = fishInContact(fish, netX, netY);
      const speedMul = inContact
        ? FLEE_CONTACT_SPEED_MUL
        : d <= FLEE_RADIUS
          ? FLEE_SCOOP_NEAR_MUL
          : FLEE_SCOOP_FAR_MUL;

      steerFishAway(fish, netX, netY, dt, 16);
      fish.x += Math.cos(fish.angle) * fish.speed * speedMul * dt;
      fish.y += Math.sin(fish.angle) * fish.speed * speedMul * dt;
      clampFishInArena(fish, true);
    };

    const moveFish = (fish: Fish, netX: number, netY: number, dt: number) => {
      fish.spawnAlpha = Math.min(1, fish.spawnAlpha + dt / GAME_PARAMS.fishSpawnFadeDuration);
      fish.rippleTimer += dt;
      if (fish.rippleTimer >= GAME_PARAMS.fishRippleInterval) {
        fish.rippleTimer = 0;
        effects.addRipple(fish.x, fish.y, fish.r * 1.8);
      }

      const scoop = scoopRef.current;
      const isScoopTarget = scoop?.fishId === fish.id;
      const spaceHeld = spaceHeldRef.current;

      if (isScoopTarget) {
        moveScoopTarget(fish, dt);
        return;
      }

      if (spaceHeld) {
        moveFishFleeWhileScooping(fish, netX, netY, dt);
        return;
      }

      const fled = applyFishFlee(fish, netX, netY, dt, scoop !== null);
      if (!fled) {
        applyFishSwim(fish, dt);
        clampFishInArena(fish, true);
      }
    };

    const updateScoop = (netX: number, netY: number, dt: number) => {
      if (catchAnimRef.current || effects.isNetBreaking() || escapeAnimRef.current) {
        if (scoopRef.current) {
          scoopRef.current = null;
          sfxRef.current?.stopCatching();
        }
        return;
      }

      const scoop = scoopRef.current;
      const spaceHeld = spaceHeldRef.current;

      if (!spaceHeld) {
        if (scoopRef.current) {
          scoopRef.current = null;
          sfxRef.current?.stopCatching();
        }
        return;
      }

      let targetFish: Fish | undefined;
      if (scoop) {
        targetFish = fishRef.current.find((f) => f.id === scoop.fishId);
        if (!targetFish || !fishInContact(targetFish, netX, netY)) {
          scoopRef.current = null;
          sfxRef.current?.stopCatching();
          return;
        }
      } else {
        let best: Fish | undefined;
        let bestD = Infinity;
        for (const fish of fishRef.current) {
          if (!fishInContact(fish, netX, netY)) continue;
          const d = Math.hypot(fish.x - netX, fish.y - netY);
          if (d < bestD) {
            bestD = d;
            best = fish;
          }
        }
        if (!best) return;
        targetFish = best;
        scoopRef.current = {
          fishId: best.id,
          progress: 0,
          holdSec: scoopHoldDuration(best.size),
          catchCost: catchDurabilityCost(best.size),
          points: best.points,
          spriteIndex: best.spriteIndex,
          r: best.r,
          size: best.size,
        };
        sfxRef.current?.startCatching();
        effects.addSplash(netX, netY, 8);
      }

      const active = scoopRef.current;
      if (!active || !targetFish) return;

      active.progress = Math.min(1, active.progress + dt / active.holdSec);
      const holdDrain = holdDrainPerSecond(active.size) * dt;
      const durabilityBeforeDrain = useGameStore.getState().durability;
      const cappedDrain =
        active.progress >= 1
          ? Math.min(holdDrain, Math.max(0, durabilityBeforeDrain - active.catchCost))
          : holdDrain;
      useGameStore.getState().drainDurability(cappedDrain);

      const durability = useGameStore.getState().durability;

      if (active.progress >= 1) {
        // 允許些微浮點誤差；剛好夠扣撈到耐久時仍算成功（大魚 25%→0%）
        if (durability + 0.5 < active.catchCost) {
          triggerFishEscape(targetFish);
          return;
        }
        completeScoop(targetFish, active);
        return;
      }

      // 按住期間耐久歸零且尚未撈成功 → 掙脫並破網
      if (durability <= 0) {
        triggerFishEscape(targetFish);
        triggerNetBreak();
      }
    };

    const update = (dt: number) => {
      const wasNetBreaking = effects.isNetBreaking();
      effects.update(dt);
      if (throwBackSequenceRef.current) {
        if (wasNetBreaking && !effects.isNetBreaking()) {
          onNetBreakEndRef.current();
        }
        return;
      }
      updateEscapeAnimation(dt);
      updateCatchAnimation(dt);
      if (wasNetBreaking && !effects.isNetBreaking()) {
        onNetBreakEndRef.current();
      }

      if (statusRef.current !== "playing") return;

      const arena = arenaRef.current;
      const net = netRef.current;

      const prevNetX = net.x;
      const prevNetY = net.y;

      const ax = (net.targetX - net.x) * GAME_PARAMS.followK;
      const ay = (net.targetY - net.y) * GAME_PARAMS.followK;
      net.vx += ax * dt;
      net.vy += ay * dt;
      const damp = Math.exp(-GAME_PARAMS.damping * dt);
      net.vx *= damp;
      net.vy *= damp;
      net.x += net.vx * dt;
      net.y += net.vy * dt;

      const clamped = clampToCircle(net.x, net.y, arena, netMargin);
      net.x = clamped.x;
      net.y = clamped.y;

      const instantSpeed = Math.hypot(net.x - prevNetX, net.y - prevNetY) / dt;
      sfxRef.current?.maybePlayNetOnMove(instantSpeed);

      for (const fish of fishRef.current) {
        const prevX = fish.prevX;
        const prevY = fish.prevY;
        moveFish(fish, net.x, net.y, dt);
        const swimSpeed = Math.hypot(fish.x - prevX, fish.y - prevY) / dt;
        sfxRef.current?.maybePlayFishOnFastSwim(swimSpeed);
        fish.prevX = fish.x;
        fish.prevY = fish.y;
      }
      separateFish();
      updateScoop(net.x, net.y, dt);
    };

    const render = (now: number) => {
      const dt = clamp((now - lastT) / 1000, 0, 0.033);
      lastT = now;

      ctx.clearRect(0, 0, w, h);
      let fishFadeMul = 1;
      if (bloodyFadeStartRef.current !== null) {
        const elapsed = (now - bloodyFadeStartRef.current) / 1000;
        const alpha = clamp(elapsed / 2, 0, 1);
        bloodyAlphaRef.current = alpha;
        fishFadeMul = 1 - alpha;
        setDarkRedUiAlpha(clamp(alpha * 0.82, 0, 0.82));
      }
      drawCatchFishBackground(ctx, assetsRef.current, w, h, bloodyAlphaRef.current);
      effects.drawRipples(ctx);

      const netBreak = effects.netBreak;
      const shakeX = netBreak
        ? Math.sin(netBreak.progress * Math.PI * 16) * (1 - netBreak.progress) * 12
        : 0;

      drawNetSprite(
        ctx,
        assetsRef.current,
        netRef.current.x,
        netRef.current.y,
        GAME_PARAMS.catchRadius,
        { shakeX },
      );

      const scoop = scoopRef.current;
      const shakeT = now * 0.001;

      for (const fish of fishRef.current) {
        const isScoopTarget = scoop?.fishId === fish.id;
        const shakeX = isScoopTarget
          ? Math.sin(shakeT * 52) * 6 + Math.sin(shakeT * 81) * 2.5
          : 0;
        const shakeY = isScoopTarget
          ? Math.cos(shakeT * 47) * 5 + Math.cos(shakeT * 73) * 2
          : 0;

        drawFishSprite(ctx, assetsRef.current, {
          ...fish,
          alpha: fish.spawnAlpha * fishFadeMul,
          shakeX,
          shakeY,
        });
      }

      if (scoop) {
        const fish = fishRef.current.find((f) => f.id === scoop.fishId);
        if (fish) drawScoopProgressBar(ctx, fish.x, fish.y, fish.r, scoop.progress);
      }

      const throwDrag = throwDragRef.current;
      for (let i = 0; i < caughtDisplayRef.current.length; i++) {
        const caught = caughtDisplayRef.current[i];
        if (throwDrag && throwDrag.fishIndex === i) continue;
        drawFishSprite(ctx, assetsRef.current, { ...caught, alpha: fishFadeMul });
      }
      if (throwDrag) {
        const caught = caughtDisplayRef.current[throwDrag.fishIndex];
        if (caught) {
          drawFishSprite(ctx, assetsRef.current, {
            ...caught,
            x: throwDrag.x,
            y: throwDrag.y,
            alpha: fishFadeMul,
          });
        }
      }

      const catchAnim = catchAnimRef.current;
      if (catchAnim) {
        const pose = catchAnimPose(catchAnim);
        drawFishSprite(ctx, assetsRef.current, {
          x: pose.x,
          y: pose.y,
          angle: pose.angle,
          r: catchAnim.r,
          spriteIndex: catchAnim.spriteIndex,
          scaleMul: pose.scale,
          alpha: fishFadeMul,
        });
      }

      const escapeAnim = escapeAnimRef.current;
      if (escapeAnim) {
        const pose = escapeAnimPose(escapeAnim);
        drawFishSprite(ctx, assetsRef.current, {
          x: pose.x,
          y: pose.y,
          angle: pose.angle,
          r: escapeAnim.r,
          spriteIndex: escapeAnim.spriteIndex,
          scaleMul: pose.scaleMul,
          alpha: pose.alpha * fishFadeMul,
        });
      }

      effects.drawOverlays(ctx);
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
  const canvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown: React.PointerEventHandler<HTMLCanvasElement> = (e) => {
    if (status !== "playing" || !throwBackReady || throwBackExit || hasCatchfishReward) return;
    const pt = canvasPoint(e);
    if (!pt) return;
    const idx = findLargeCaughtFishAt(pt.x, pt.y, caughtDisplayRef.current);
    if (idx < 0) return;
    e.preventDefault();
    spaceHeldRef.current = false;
    scoopRef.current = null;
    sfxRef.current?.stopCatching();
    canvasRef.current?.setPointerCapture(e.pointerId);
    throwDragRef.current = { fishIndex: idx, x: pt.x, y: pt.y };
  };

  const onPointerMove: React.PointerEventHandler<HTMLCanvasElement> = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || status !== "playing" || throwBackExit) return;

    if (throwDragRef.current) {
      const pt = canvasPoint(e);
      if (!pt) return;
      throwDragRef.current.x = pt.x;
      throwDragRef.current.y = pt.y;
      return;
    }

    if (throwBackReady) return;

    const pt = canvasPoint(e);
    if (!pt) return;
    const clamped = clampToCircle(pt.x, pt.y, arenaRef.current, netArenaMargin(GAME_PARAMS.catchRadius));
    netRef.current.targetX = clamped.x;
    netRef.current.targetY = clamped.y;
  };

  const onPointerUp: React.PointerEventHandler<HTMLCanvasElement> = (e) => {
    const drag = throwDragRef.current;
    if (!drag) return;
    throwDragRef.current = null;
    canvasRef.current?.releasePointerCapture(e.pointerId);

    const pt = canvasPoint(e);
    const stage = containerRef.current;
    if (!pt || !throwBackReady || !stage) return;
    const { width: cw, height: ch } = stage.getBoundingClientRect();
    if (isPointInThrowBackPool(pt.x, pt.y, arenaRef.current, cw, ch)) {
      handleThrowBackLargeFish(drag.fishIndex);
    }
  };

  const onPointerCancel: React.PointerEventHandler<HTMLCanvasElement> = () => {
    throwDragRef.current = null;
  };

  const handleThrowBackLargeFish = (fishIndex?: number) => {
    if (!throwBackReady || catchfishRewardGrantedRef.current || hasCatchfishReward) return;
    const idx =
      fishIndex ??
      caughtDisplayRef.current.findIndex((c) => isLargeCaughtFish(c.r));
    if (idx < 0 || !isLargeCaughtFish(caughtDisplayRef.current[idx]?.r ?? 0)) return;

    const thrown = caughtDisplayRef.current[idx];
    caughtDisplayRef.current.splice(idx, 1);
    playImpactSound();
    setThrowBackReady(false);
    setThrowBackExit(true);
    throwBackSequenceRef.current = true;
    roundEndHandledRef.current = true;
    scoopRef.current = null;
    catchAnimRef.current = null;
    escapeAnimRef.current = null;
    sfxRef.current?.stopCatching();
    useGameStore.setState({ score: 0 });
    if (thrown) {
      effectsRef.current.addSplash(thrown.x, thrown.y, 12);
    }
    bloodyFadeStartRef.current = performance.now();
    bloodyAlphaRef.current = 0;
    setDarkRedUiAlpha(0);

    window.setTimeout(() => {
      if (catchfishRewardGrantedRef.current) return;
      const reward = awardStallReward("catchfish");
      if (reward.success) {
        catchfishRewardGrantedRef.current = true;
        catchfishExitPendingRef.current = true;
      }
    }, 4000);
  };

  return (
    <div className="catchfish-fullscreen">
      {darkRedUiAlpha > 0 ? (
        <div
          className="catchfish-darkred-overlay"
          style={{ opacity: darkRedUiAlpha }}
          aria-hidden
        />
      ) : null}

      <GamePageHeader title={narrativeDefault.stalls.catchfish.title} />

      <div ref={containerRef} className="catchfish-stage">
      <canvas
        ref={canvasRef}
        className={`catchfish-stage__canvas${throwBackReady ? " catchfish-stage__canvas--throwback" : ""}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      />

      <GameHudBar
        score={score}
        resource={netsRemaining}
        resourceLabel=""
        extra={
          <CatchfishNetHud
            netsRemaining={netsRemaining}
            durability={durability}
            assets={loadedAssets}
            breakingSlot={breakingSlot}
          />
        }
      />

      {showReplaceToast && (
        <div className="catchfish-replace-toast" role="status">
          撈網損壞！更換新網（剩餘 {netsRemaining} 張）
        </div>
      )}

      {throwBackReady ? (
        <div className="catchfish-throwback-hint" role="status">
          拖曳右側大魚丟回池中
        </div>
      ) : null}

      <GameRoundEndModal
        open={isGameOver && roundEnd !== null && !throwBackExit}
        score={roundEnd?.score ?? 0}
        lotteryYuan={roundEnd?.lotteryYuan ?? 0}
        tokens={tokens}
        onPlayAgain={() => {
          clearStallRoundDismissed("catchfish");
          if (!trySpendPlayCost()) return;
          handleStart();
        }}
        onReturnToMarket={() => {
          const score = roundEnd?.score ?? 0;
          returnToMarketAfterRound(
            router,
            { stallId: "catchfish", score },
            () => {
              roundEndHandledRef.current = false;
              setRoundEnd(null);
            },
          );
        }}
      />
      </div>
    </div>
  );
}
