"use client";

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MutableRefObject,
} from "react";
import Link from "next/link";
import DialoguePanel from "@/components/narrative/DialoguePanel";
import SceneCaption from "@/components/narrative/SceneCaption";
import StallStoryModal from "./StallStoryModal";
import StallHowToModal from "./StallHowToModal";
import StallEnterBar from "./StallEnterBar";
import LeaveMarketModal from "./LeaveMarketModal";
import TokenDisplay from "@/components/economy/TokenDisplay";
import PointCardPickupBar from "./PointCardPickupBar";
import LotteryPickupBar from "./LotteryPickupBar";
import HubPlayer from "./HubPlayer";
import HubShadowEditorPanel from "./HubShadowEditorPanel";
import { narrativeDefault } from "@/data/narrative-default";
import { HUB_SHADOW_IMAGES, HUB_SHADOW_PLACEMENTS } from "@/lib/market/hubSceneLayers";
import {
  createShadowPlacement,
  normalizeShadowPlacements,
  type HubShadowPlacement,
} from "@/lib/market/hubShadowLayout";

const HubStallLayers = lazy(() => import("./HubStallLayers"));
const HubFrontLayers = lazy(() => import("./HubFrontLayers"));
import {
  clampCameraOffset,
  ENTER_BAR_Z_INDEX,
  findNearInteractiveStall,
  findNearestInteractiveStall,
  isPlayerNearLotterySpawn,
  LOTTERY_PICKUP_RANGE_PX,
  lotteryGroundY,
  HUB_BACKGROUND,
  HUB_LAYOUT,
  PLAYER_FLOOR_RATIO,
  PLAYER_Z_INDEX,
  playerSpawnX,
  resolveHubMetrics,
  stallCenterX,
  stallDimensions,
  STALL_FLOOR_RATIO,
} from "@/lib/market/hubLayout";
import {
  readHubPlayerPosition,
  saveHubPlayerPosition,
} from "@/lib/market/hubPlayerPosition";
import { createHubSoundFx, type HubSoundFx } from "@/lib/market/hubSounds";
import { loadLotteryFrontMask } from "@/lib/market/lotteryFrontMask";
import type { StallId } from "@/lib/narrative/types";
import { useStoryKeyAdvance } from "@/lib/useStoryKeyAdvance";
import { usePageFadeIn } from "@/lib/navigation/usePageFadeIn";
import { isAcquireSequenceBlocking } from "@/lib/collectibles/acquireSequence";
import { useCollectibleStore } from "@/store/collectibleStore";
import { useNarrativeStore } from "@/store/narrativeStore";
import { useTokenStore } from "@/store/tokenStore";

const REQUIRED_STALLS = 4;

const PLAYER_SPEED = 4 * 0.7;
const DRAG_MOVE_FACTOR = 0.8 * 0.7;
const MOVE_HINT_HIDE_MS = 3000;

function trackSuccessfulMove(
  movedMsRef: MutableRefObject<number>,
  dt: number,
  didMove: boolean,
  setMoveHintVisible: (v: boolean) => void,
) {
  if (!didMove) return;
  movedMsRef.current += dt;
  if (movedMsRef.current >= MOVE_HINT_HIDE_MS) {
    setMoveHintVisible(false);
  }
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export default function NightMarketHub() {
  const hydrate = useNarrativeStore((s) => s.hydrate);
  const hydrated = useNarrativeStore((s) => s.hydrated);
  const marketOpeningDone = useNarrativeStore((s) => s.marketOpeningDone);
  const completeMarketOpening = useNarrativeStore((s) => s.completeMarketOpening);
  const markStallVisited = useNarrativeStore((s) => s.markStallVisited);
  const hasVisitedStall = useNarrativeStore((s) => s.hasVisitedStall);
  const playedStalls = useNarrativeStore((s) => s.playedStalls);
  const pointCardSpawnStall = useNarrativeStore((s) => s.pointCardSpawnStall);
  const ensurePointCardSpawn = useNarrativeStore((s) => s.ensurePointCardSpawn);
  const hasPointCard = useCollectibleStore((s) => s.hasAcquired("point-card"));
  const hydrateCollectibles = useCollectibleStore((s) => s.hydrate);
  const collectiblesHydrated = useCollectibleStore((s) => s.hydrated);
  const nextBoundaryLine = useNarrativeStore((s) => s.nextBoundaryLine);
  const getText = useNarrativeStore((s) => s.getText);
  const hydrateTokens = useTokenStore((s) => s.hydrate);
  const tokensHydrated = useTokenStore((s) => s.hydrated);
  const roadSpawns = useTokenStore((s) => s.roadSpawns);

  usePageFadeIn();

  const hubLayout = HUB_LAYOUT;
  const playRef = useRef<HTMLDivElement>(null);
  const [sceneSize, setSceneSize] = useState({ width: 960, height: 540 });

  const metrics = useMemo(
    () => resolveHubMetrics(sceneSize.width, sceneSize.height, hubLayout),
    [sceneSize.width, sceneSize.height, hubLayout],
  );

  const initialSpawnX = useMemo(
    () => playerSpawnX(metrics),
    [metrics],
  );

  const resolveSpawnX = useCallback(() => {
    const restored = readHubPlayerPosition(metrics.worldWidth);
    if (restored === null) return initialSpawnX;
    return clamp(restored, metrics.playerMinX, metrics.playerMaxX);
  }, [initialSpawnX, metrics.playerMinX, metrics.playerMaxX, metrics.worldWidth]);

  const [playerX, setPlayerX] = useState(initialSpawnX);
  const [opening, setOpening] = useState(false);
  const [openingIndex, setOpeningIndex] = useState(0);
  const [moveHintVisible, setMoveHintVisible] = useState(true);
  const [storyStallId, setStoryStallId] = useState<StallId | null>(null);
  const [howToStallId, setHowToStallId] = useState<StallId | null>(null);
  const [nearStallId, setNearStallId] = useState<StallId | null>(null);
  const [enterBarStallId, setEnterBarStallId] = useState<StallId | null>(null);
  const [enterBarVisible, setEnterBarVisible] = useState(false);
  const [boundaryMsg, setBoundaryMsg] = useState<string | null>(null);
  const [leavePrompt, setLeavePrompt] = useState(false);
  const [pointCardSpawned, setPointCardSpawned] = useState(false);
  const keysRef = useRef({ left: false, right: false });
  const movedMsRef = useRef(0);
  const dragRef = useRef<{ active: boolean; lastX: number }>({ active: false, lastX: 0 });
  const sfxRef = useRef<HubSoundFx | null>(null);
  const spawnSyncedRef = useRef(false);
  const playerAnimRef = useRef<{ facing: "left" | "right"; walking: boolean }>({
    facing: "right",
    walking: false,
  });
  const [playerAnim, setPlayerAnim] = useState(playerAnimRef.current);
  const [shadowPlacements, setShadowPlacements] =
    useState<HubShadowPlacement[]>(HUB_SHADOW_PLACEMENTS);
  const [shadowEditMode, setShadowEditMode] = useState(false);
  const [selectedShadowId, setSelectedShadowId] = useState<string | null>(null);
  const [shadowEditorStatus, setShadowEditorStatus] = useState<string | null>(null);
  const [shadowSaving, setShadowSaving] = useState(false);

  const updatePlayerAnim = useCallback(
    (facing: "left" | "right", walking: boolean) => {
      const prev = playerAnimRef.current;
      if (prev.facing === facing && prev.walking === walking) return;
      playerAnimRef.current = { facing, walking };
      setPlayerAnim({ facing, walking });
    },
    [],
  );

  const pendingAcquireDialogue = useCollectibleStore((s) => s.pendingAcquireDialogue);
  const pendingAcquireAnimation = useCollectibleStore((s) => s.pendingAcquireAnimation);
  const acquireSequenceBlocking = isAcquireSequenceBlocking(
    pendingAcquireDialogue,
    pendingAcquireAnimation,
  );

  const movementLocked =
    opening ||
    storyStallId !== null ||
    howToStallId !== null ||
    boundaryMsg !== null ||
    leavePrompt ||
    shadowEditMode ||
    acquireSequenceBlocking;

  useEffect(() => {
    if (!movementLocked) return;
    dragRef.current.active = false;
    keysRef.current.left = false;
    keysRef.current.right = false;
    updatePlayerAnim(playerAnimRef.current.facing, false);
    sfxRef.current?.setWalking(false);
  }, [movementLocked, updatePlayerAnim]);

  useEffect(() => {
    const el = playRef.current;
    if (!el) return;

    const update = () => {
      const width = el.clientWidth;
      const height = el.clientHeight;
      if (width <= 0 || height <= 0) return;
      setSceneSize({ width, height });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (spawnSyncedRef.current) return;
    setPlayerX(resolveSpawnX());
    spawnSyncedRef.current = true;
  }, [resolveSpawnX]);

  useEffect(() => {
    if (!spawnSyncedRef.current) return;
    saveHubPlayerPosition(playerX, metrics.worldWidth);
  }, [playerX, metrics.worldWidth]);

  useEffect(() => {
    hydrate();
    hydrateCollectibles();
    hydrateTokens();
  }, [hydrate, hydrateCollectibles, hydrateTokens]);

  useEffect(() => {
    void loadLotteryFrontMask(metrics);
  }, [metrics]);

  useEffect(() => {
    fetch("/api/hub-shadow-layout")
      .then((r) => r.json())
      .then((data) => setShadowPlacements(normalizeShadowPlacements(data)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("shadowEdit") === "1") {
      setShadowEditMode(true);
    }
  }, []);

  const selectedShadow =
    shadowPlacements.find((p) => p.id === selectedShadowId) ?? null;

  const handleShadowSave = useCallback(async () => {
    setShadowSaving(true);
    setShadowEditorStatus(null);
    try {
      const res = await fetch("/api/hub-shadow-layout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shadowPlacements),
      });
      if (!res.ok) throw new Error("save_failed");
      setShadowEditorStatus("已儲存至 data/hub-shadow-placements.json");
    } catch {
      setShadowEditorStatus("儲存失敗");
    } finally {
      setShadowSaving(false);
    }
  }, [shadowPlacements]);

  const handleShadowCopyJson = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(shadowPlacements, null, 2));
      setShadowEditorStatus("已複製 JSON");
    } catch {
      setShadowEditorStatus("複製失敗");
    }
  }, [shadowPlacements]);

  useEffect(() => {
    const sfx = createHubSoundFx();
    sfxRef.current = sfx;
    sfx.preload();
    sfx.startHubBgm();
    return () => {
      sfx.dispose();
      sfxRef.current = null;
    };
  }, []);

  useEffect(() => {
    sfxRef.current?.setWalking(playerAnim.walking);
  }, [playerAnim.walking]);

  useEffect(() => {
    sfxRef.current?.updateStallProximity(playerX, hubLayout, metrics);
  }, [playerX, hubLayout, metrics]);

  useEffect(() => {
    if (!hydrated) return;
    setOpening(!marketOpeningDone);
  }, [hydrated, marketOpeningDone]);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (movementLocked) return;
      if (e.key === "ArrowLeft") keysRef.current.left = true;
      if (e.key === "ArrowRight") keysRef.current.right = true;
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") keysRef.current.left = false;
      if (e.key === "ArrowRight") keysRef.current.right = false;
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [movementLocked]);

  const allStallsPlayed = playedStalls.length >= REQUIRED_STALLS;

  const movePlayer = useCallback(
    (nextX: number) => {
      const min = metrics.playerMinX;
      const max = metrics.playerMaxX;
      if (nextX < min) {
        setBoundaryMsg(nextBoundaryLine());
        return min;
      }
      if (nextX > max) {
        if (!allStallsPlayed) {
          setBoundaryMsg("四個攤位都還沒玩完，現在還不能離開夜市。");
          return max;
        }
        setLeavePrompt(true);
        return max;
      }
      return nextX;
    },
    [metrics.playerMinX, metrics.playerMaxX, nextBoundaryLine, allStallsPlayed],
  );

  useEffect(() => {
    if (!collectiblesHydrated || hasPointCard || !allStallsPlayed) return;
    ensurePointCardSpawn();
    setPointCardSpawned(true);
  }, [allStallsPlayed, collectiblesHydrated, ensurePointCardSpawn, hasPointCard]);

  useEffect(() => {
    if (movementLocked) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      let dx = 0;
      if (keysRef.current.left) dx -= PLAYER_SPEED * (dt / 16);
      if (keysRef.current.right) dx += PLAYER_SPEED * (dt / 16);

      const walking =
        keysRef.current.left || keysRef.current.right || dragRef.current.active;
      let facing = playerAnimRef.current.facing;
      if (keysRef.current.left) facing = "left";
      else if (keysRef.current.right) facing = "right";
      updatePlayerAnim(facing, walking);
      sfxRef.current?.setWalking(walking);

      if (dx !== 0) {
        setPlayerX((x) => {
          const nx = movePlayer(x + dx);
          trackSuccessfulMove(
            movedMsRef,
            dt,
            nx !== x,
            setMoveHintVisible,
          );
          sfxRef.current?.updateStallProximity(nx, hubLayout, metrics);
          return nx;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [movementLocked, movePlayer, updatePlayerAnim, hubLayout, metrics]);

  const nearStall = useCallback(
    () => findNearInteractiveStall(playerX, hubLayout, metrics),
    [playerX, hubLayout, metrics],
  );

  useEffect(() => {
    const id = nearStall();
    setNearStallId(id);
  }, [playerX, nearStall]);

  const openingLines = narrativeDefault.marketOpening;
  const openingLine = openingLines[openingIndex];

  const advanceOpening = () => {
    if (openingIndex >= openingLines.length - 1) {
      completeMarketOpening();
      setOpening(false);
    } else {
      setOpeningIndex((i) => i + 1);
    }
  };

  useStoryKeyAdvance(opening && openingLine ? advanceOpening : undefined, opening);

  useStoryKeyAdvance(
    boundaryMsg ? () => setBoundaryMsg(null) : undefined,
    Boolean(boundaryMsg),
  );

  const viewOffset = clampCameraOffset(playerX, sceneSize.width, metrics);

  const computeEnterBarPos = useCallback(
    (stallId: StallId) => {
      const stall = hubLayout.stalls.find(
        (s) => s.kind === "interactive" && s.id === stallId,
      );
      if (!stall || stall.kind !== "interactive") return null;
      const centerX = stallCenterX(stall, metrics);
      const { height } = stallDimensions(stall, metrics);
      return {
        worldX: centerX,
        worldY: metrics.worldHeight * STALL_FLOOR_RATIO - height * 0.38 - 100,
      };
    },
    [hubLayout, metrics],
  );

  const computeLotteryGroundPos = useCallback(
    (spawn: (typeof roadSpawns)[number]) => {
      if (spawn.worldX != null) {
        return {
          worldX: spawn.worldX,
          groundY: lotteryGroundY(metrics),
        };
      }
      if (spawn.worldRatio != null) {
        return {
          worldX: metrics.playableLeft + spawn.worldRatio * metrics.playableWidth,
          groundY: lotteryGroundY(metrics),
        };
      }
      const stall = hubLayout.stalls.find(
        (s) => s.kind === "interactive" && s.id === spawn.stallId,
      );
      if (!stall || stall.kind !== "interactive") return null;
      const centerX = stallCenterX(stall, metrics);
      return {
        worldX: centerX + spawn.worldOffsetX,
        groundY: lotteryGroundY(metrics),
      };
    },
    [hubLayout, metrics],
  );

  const activeLotterySpawn = useMemo(() => {
    if (!tokensHydrated || roadSpawns.length === 0) return null;
    let nearest: { spawn: (typeof roadSpawns)[number]; dist: number } | null = null;
    for (const spawn of roadSpawns) {
      const pos = computeLotteryGroundPos(spawn);
      if (!pos) continue;
      const dist = Math.abs(pos.worldX - playerX);
      if (dist > LOTTERY_PICKUP_RANGE_PX) continue;
      if (!nearest || dist < nearest.dist) {
        nearest = { spawn, dist };
      }
    }
    return nearest?.spawn ?? null;
  }, [tokensHydrated, roadSpawns, computeLotteryGroundPos, playerX]);

  const lotteryNear = Boolean(
    activeLotterySpawn &&
    !storyStallId &&
    !howToStallId &&
    !opening &&
    !boundaryMsg &&
    !leavePrompt,
  );

  const pointCardStallId =
    pointCardSpawned && !hasPointCard ? pointCardSpawnStall : null;

  const pointCardGroundPos = useMemo(() => {
    if (!pointCardStallId) return null;
    const stall = hubLayout.stalls.find(
      (s) => s.kind === "interactive" && s.id === pointCardStallId,
    );
    if (!stall || stall.kind !== "interactive") return null;
    return {
      worldX: stallCenterX(stall, metrics),
      groundY: lotteryGroundY(metrics),
    };
  }, [pointCardStallId, hubLayout, metrics]);

  const pointCardIsNear = Boolean(
    pointCardGroundPos &&
    isPlayerNearLotterySpawn(playerX, pointCardGroundPos.worldX),
  );

  const pointCardInteractable = Boolean(
    pointCardStallId &&
    !storyStallId &&
    !howToStallId &&
    !opening &&
    !boundaryMsg &&
    !leavePrompt,
  );

  const showPointCardPickup = pointCardInteractable && pointCardIsNear;
  const pointCardNear = showPointCardPickup;

  const enterBarActive = Boolean(
    nearStallId &&
    hasVisitedStall(nearStallId) &&
    !storyStallId &&
    !howToStallId &&
    !opening &&
    !boundaryMsg &&
    !leavePrompt &&
    !showPointCardPickup &&
    !lotteryNear,
  );

  useEffect(() => {
    if (storyStallId && nearStallId !== storyStallId) {
      setStoryStallId(null);
    }
  }, [nearStallId, storyStallId]);

  useEffect(() => {
    if (nearStallId && !hasVisitedStall(nearStallId) && !storyStallId) {
      setStoryStallId(nearStallId);
    }
  }, [nearStallId, hasVisitedStall, storyStallId]);

  useEffect(() => {
    if (enterBarActive && nearStallId) {
      setEnterBarStallId(nearStallId);
      setEnterBarVisible(true);
    } else {
      setEnterBarVisible(false);
    }
  }, [enterBarActive, nearStallId]);

  const displayedEnterBarPos = useMemo(() => {
    if (!enterBarStallId) return null;
    return computeEnterBarPos(enterBarStallId);
  }, [enterBarStallId, computeEnterBarPos]);

  const sceneStyle = {
    "--stall-floor": STALL_FLOOR_RATIO,
    "--player-floor": PLAYER_FLOOR_RATIO,
  } as CSSProperties;

  return (
    <div className="hub-shell h-screen flex flex-col overflow-hidden">
      {!opening ? (
        <header className="game-header shrink-0 flex items-center justify-between px-4 py-2">
          <span className="game-title text-sm sm:text-lg">無人夜市</span>
          <div className="relative flex gap-2 items-center">
            <TokenDisplay />
            <Link
              href="/backpack"
              className="game-btn-ghost hub-header-action text-xs"
              data-ui-sound="enter"
              data-backpack-fly-target
            >
              道具
            </Link>
          </div>
        </header>
      ) : null}

      <div ref={playRef} className="relative min-h-0 flex-1 overflow-hidden" style={sceneStyle}>
        {!opening ? (
          <>
            <div
              className="absolute top-0 left-0 h-full will-change-transform"
              style={{
                width: metrics.worldWidth,
                transform: `translateX(-${viewOffset}px)`,
              }}
            >
          <div
            className="absolute top-0 left-0 h-full hub-world-bg"
            style={{ width: metrics.worldWidth }}
            aria-hidden
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={HUB_BACKGROUND}
              alt=""
              className="absolute top-0 left-0 hub-world-bg-image"
              style={{
                width: metrics.worldWidth,
                height: metrics.worldHeight,
              }}
              decoding="async"
              draggable={false}
            />
          </div>

          <Suspense fallback={null}>
            <HubStallLayers
              hubLayout={hubLayout}
              metrics={metrics}
              playerX={playerX}
              pointCardStallId={pointCardStallId}
              pointCardNear={pointCardNear}
            />
          </Suspense>

          {tokensHydrated
            ? roadSpawns.map((spawn) => {
                const pos = computeLotteryGroundPos(spawn);
                if (!pos) return null;
                const isNearThis = isPlayerNearLotterySpawn(playerX, pos.worldX);
                const isActiveSpawn = activeLotterySpawn?.id === spawn.id;
                const showPickup = lotteryNear && isNearThis && isActiveSpawn;
                const glowing = isNearThis && isActiveSpawn;
                return (
                  <LotteryPickupBar
                    key={spawn.id}
                    spawn={spawn}
                    worldX={pos.worldX}
                    groundY={pos.groundY}
                    glowing={glowing}
                    visible={showPickup}
                  />
                );
              })
            : null}

          {pointCardGroundPos ? (
            <PointCardPickupBar
              worldX={pointCardGroundPos.worldX}
              groundY={pointCardGroundPos.groundY}
              glowing={showPointCardPickup}
              visible={showPointCardPickup}
              onPickedUp={() => setPointCardSpawned(false)}
            />
          ) : null}

          <div
            className="hub-player-slot"
            style={{ left: playerX, zIndex: PLAYER_Z_INDEX }}
          >
            <HubPlayer facing={playerAnim.facing} walking={playerAnim.walking} />
          </div>

          <Suspense fallback={null}>
            <HubFrontLayers
              metrics={metrics}
              shadowPlacements={shadowPlacements}
              shadowEditMode={shadowEditMode}
              selectedShadowId={selectedShadowId}
              onSelectShadow={setSelectedShadowId}
              onShadowPlacementsChange={setShadowPlacements}
            />
          </Suspense>

          {enterBarStallId && displayedEnterBarPos && (
            <StallEnterBar
              stallId={enterBarStallId}
              playerX={playerX}
              worldWidth={metrics.worldWidth}
              worldX={displayedEnterBarPos.worldX}
              worldY={displayedEnterBarPos.worldY}
              zIndex={ENTER_BAR_Z_INDEX}
              visible={enterBarVisible}
              onFadeOutComplete={() => setEnterBarStallId(null)}
              onEnterGame={setHowToStallId}
            />
          )}

            </div>

            <div className="hub-vignette" aria-hidden />

            {shadowEditMode ? (
              <HubShadowEditorPanel
                placements={shadowPlacements}
                selected={selectedShadow}
                saving={shadowSaving}
                status={shadowEditorStatus}
                onAdd={() => {
                  const centerX = viewOffset + sceneSize.width * 0.5;
                  const centerTop =
                    metrics.worldHeight * 0.95 + 200 * (metrics.worldHeight / 540);
                  const image =
                    HUB_SHADOW_IMAGES[shadowPlacements.length % HUB_SHADOW_IMAGES.length];
                  const created = createShadowPlacement(
                    centerX,
                    centerTop,
                    metrics,
                    image,
                  );
                  setShadowPlacements((prev) => [...prev, created]);
                  setSelectedShadowId(created.id);
                  setShadowEditorStatus("已新增陰影");
                }}
                onDelete={() => {
                  if (!selectedShadowId) return;
                  setShadowPlacements((prev) =>
                    prev.filter((p) => p.id !== selectedShadowId),
                  );
                  setSelectedShadowId(null);
                  setShadowEditorStatus("已刪除陰影");
                }}
                onScale={(factor) => {
                  if (!selectedShadow) return;
                  const scale = Math.max(0.2, Math.min(3, selectedShadow.scale * factor));
                  setShadowPlacements((prev) =>
                    prev.map((p) =>
                      p.id === selectedShadow.id ? { ...p, scale } : p,
                    ),
                  );
                  setShadowEditorStatus(`縮放：${scale.toFixed(2)}`);
                }}
                onSetImage={(image) => {
                  if (!selectedShadow) return;
                  setShadowPlacements((prev) =>
                    prev.map((p) =>
                      p.id === selectedShadow.id ? { ...p, image } : p,
                    ),
                  );
                }}
                onSave={handleShadowSave}
                onCopyJson={handleShadowCopyJson}
                onExit={() => {
                  setShadowEditMode(false);
                  setSelectedShadowId(null);
                  setShadowEditorStatus(null);
                }}
              />
            ) : null}

            {moveHintVisible && !movementLocked && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
                <SceneCaption
                  id={narrativeDefault.moveHint.id}
                  text={getText(
                    narrativeDefault.moveHint.id,
                    narrativeDefault.moveHint.text,
                  )}
                />
              </div>
            )}

            {boundaryMsg && (
              <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-20 w-full max-w-md px-4">
                <DialoguePanel
                  id="boundary-toast"
                  speaker="主角"
                  text={boundaryMsg}
                  onAdvance={() => setBoundaryMsg(null)}
                />
              </div>
            )}

            {!movementLocked && (
              <div
                className="absolute inset-0 z-10 touch-none md:hidden"
                onPointerDown={(e) => {
                  dragRef.current = { active: true, lastX: e.clientX };
                }}
                onPointerMove={(e) => {
                  if (!dragRef.current.active) return;
                  const dx = e.clientX - dragRef.current.lastX;
                  dragRef.current.lastX = e.clientX;
                  if (Math.abs(dx) < 0.5) return;
                  if (dx < 0) updatePlayerAnim("left", true);
                  else if (dx > 0) updatePlayerAnim("right", true);
                  setPlayerX((x) => {
                    const nx = movePlayer(x + dx * DRAG_MOVE_FACTOR);
                    trackSuccessfulMove(
                      movedMsRef,
                      16,
                      nx !== x,
                      setMoveHintVisible,
                    );
                    return nx;
                  });
                }}
                onPointerUp={() => {
                  dragRef.current.active = false;
                  updatePlayerAnim(playerAnimRef.current.facing, false);
                }}
                onPointerLeave={() => {
                  dragRef.current.active = false;
                  updatePlayerAnim(playerAnimRef.current.facing, false);
                }}
              />
            )}
          </>
        ) : null}

        {opening && openingLine ? (
          <div className="absolute inset-0 z-50 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={HUB_BACKGROUND}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-center"
              decoding="async"
              draggable={false}
            />
            <div className="hub-vignette" aria-hidden />
            <button
              type="button"
              className="absolute top-4 right-4 z-30 game-btn-ghost"
              onClick={() => {
                completeMarketOpening();
                setOpening(false);
              }}
            >
              跳過
            </button>
            <div className="absolute inset-x-0 bottom-0 z-20 p-4 pb-8 bg-gradient-to-t from-black via-black/90 to-transparent">
              {openingLine.type === "dialogue" && (
                <DialoguePanel
                  id={openingLine.id}
                  speaker={openingLine.speaker}
                  text={openingLine.text}
                  onAdvance={advanceOpening}
                />
              )}
              {openingLine.type === "caption" && (
                <SceneCaption
                  id={openingLine.id}
                  text={openingLine.text}
                  onDismiss={advanceOpening}
                />
              )}
            </div>
          </div>
        ) : null}

      </div>

      {leavePrompt && allStallsPlayed && (
        <LeaveMarketModal
          onCancel={() => setLeavePrompt(false)}
          onLeave={() => setLeavePrompt(false)}
        />
      )}

      {storyStallId && (
        <StallStoryModal
          script={narrativeDefault.stalls[storyStallId]}
          onComplete={() => {
            markStallVisited(storyStallId);
            setStoryStallId(null);
          }}
        />
      )}

      {howToStallId && (
        <StallHowToModal
          script={narrativeDefault.stalls[howToStallId]}
          playerX={playerX}
          worldWidth={metrics.worldWidth}
          onClose={() => setHowToStallId(null)}
        />
      )}
    </div>
  );
}
