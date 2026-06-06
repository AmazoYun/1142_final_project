"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MutableRefObject } from "react";
import Link from "next/link";
import Image from "next/image";
import DialoguePanel from "@/components/narrative/DialoguePanel";
import SceneCaption from "@/components/narrative/SceneCaption";
import StallIntroModal from "./StallIntroModal";
import StallRevisitBar from "./StallRevisitBar";
import LeaveMarketModal from "./LeaveMarketModal";
import HubPlayer from "./HubPlayer";
import { narrativeDefault } from "@/data/narrative-default";
import {
  clampCameraOffset,
  EDGE_STALL_Z_INDEX,
  edgeStallCenterX,
  edgeStallDimensions,
  findNearInteractiveStall,
  HUB_BACKGROUND,
  HUB_LAYOUT,
  stallGlowClass,
  isPlayerNearStallGlow,
  PLAYER_FLOOR_RATIO,
  PLAYER_Z_INDEX,
  playerSpawnX,
  resolveHubMetrics,
  stallCenterX,
  stallDimensions,
  STALL_FLOOR_RATIO,
} from "@/lib/market/hubLayout";
import type { StallId } from "@/lib/narrative/types";
import { useStoryKeyAdvance } from "@/lib/useStoryKeyAdvance";
import { useNarrativeStore } from "@/store/narrativeStore";

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
  const hasVisitedStall = useNarrativeStore((s) => s.hasVisitedStall);
  const nextBoundaryLine = useNarrativeStore((s) => s.nextBoundaryLine);
  const editMode = useNarrativeStore((s) => s.editMode);
  const setEditMode = useNarrativeStore((s) => s.setEditMode);
  const getText = useNarrativeStore((s) => s.getText);

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

  const [playerX, setPlayerX] = useState(initialSpawnX);
  const [opening, setOpening] = useState(false);
  const [openingIndex, setOpeningIndex] = useState(0);
  const [moveHintVisible, setMoveHintVisible] = useState(true);
  const [activeStall, setActiveStall] = useState<StallId | null>(null);
  const [nearStallId, setNearStallId] = useState<StallId | null>(null);
  const [boundaryMsg, setBoundaryMsg] = useState<string | null>(null);
  const [leavePrompt, setLeavePrompt] = useState(false);
  const keysRef = useRef({ left: false, right: false });
  const movedMsRef = useRef(0);
  const dragRef = useRef<{ active: boolean; lastX: number }>({ active: false, lastX: 0 });
  const stallTriggeredRef = useRef<Set<StallId>>(new Set());
  const spawnSyncedRef = useRef(false);
  const playerAnimRef = useRef<{ facing: "left" | "right"; walking: boolean }>({
    facing: "right",
    walking: false,
  });
  const [playerAnim, setPlayerAnim] = useState(playerAnimRef.current);

  const updatePlayerAnim = useCallback(
    (facing: "left" | "right", walking: boolean) => {
      const prev = playerAnimRef.current;
      if (prev.facing === facing && prev.walking === walking) return;
      playerAnimRef.current = { facing, walking };
      setPlayerAnim({ facing, walking });
    },
    [],
  );

  const movementLocked = opening || activeStall !== null || boundaryMsg !== null || leavePrompt;

  useEffect(() => {
    const el = playRef.current;
    if (!el) return;

    const update = () => {
      setSceneSize({
        width: el.clientWidth,
        height: el.clientHeight,
      });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (spawnSyncedRef.current) return;
    setPlayerX(initialSpawnX);
    spawnSyncedRef.current = true;
  }, [initialSpawnX]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

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

  const movePlayer = useCallback(
    (nextX: number) => {
      const min = metrics.playerMinX;
      const max = metrics.playerMaxX;
      if (nextX < min) {
        setBoundaryMsg(nextBoundaryLine());
        return min;
      }
      if (nextX > max) {
        setLeavePrompt(true);
        return max;
      }
      return nextX;
    },
    [metrics.playerMinX, metrics.playerMaxX, nextBoundaryLine],
  );

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

      if (dx !== 0) {
        setPlayerX((x) => {
          const nx = movePlayer(x + dx);
          trackSuccessfulMove(
            movedMsRef,
            dt,
            nx !== x,
            setMoveHintVisible,
          );
          return nx;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [movementLocked, movePlayer, updatePlayerAnim]);

  const nearStall = useCallback(
    () => findNearInteractiveStall(playerX, hubLayout, metrics),
    [playerX, hubLayout, metrics],
  );

  useEffect(() => {
    const id = nearStall();
    setNearStallId(id);

    if (!hydrated) return;
    if (movementLocked) return;
    if (!id) return;
    if (stallTriggeredRef.current.has(id)) return;
    stallTriggeredRef.current.add(id);
    setActiveStall(id);
  }, [playerX, movementLocked, nearStall, hydrated]);

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

  const sceneStyle = {
    "--stall-floor": STALL_FLOOR_RATIO,
    "--player-floor": PLAYER_FLOOR_RATIO,
  } as CSSProperties;

  if (opening && openingLine) {
    return (
      <div className="fixed inset-0 z-50 overflow-hidden hub-shell">
        <div ref={playRef} className="absolute inset-0 overflow-hidden" style={sceneStyle}>
          <Image
            src={HUB_BACKGROUND}
            alt=""
            fill
            className="object-cover object-center"
            priority
            draggable={false}
          />
          <div className="hub-vignette" aria-hidden />
        </div>
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
    );
  }

  return (
    <div className="hub-shell h-screen flex flex-col overflow-hidden">
      <header className="game-header shrink-0 flex items-center justify-between px-4 py-2">
        <span className="game-title text-sm sm:text-lg">無人夜市</span>
        <div className="flex gap-2 items-center">
          {editMode && <span className="hub-edit-badge">編輯模式</span>}
          <button
            type="button"
            className="game-btn-ghost text-xs"
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? "關閉編輯" : "編輯模式"}
          </button>
          <Link href="/backpack" className="game-btn-ghost text-xs">
            背包
          </Link>
          <Link href="/?replayIntro=1" className="game-btn-ghost text-xs">
            重播開場
          </Link>
        </div>
      </header>

      <div ref={playRef} className="relative flex-1 overflow-hidden" style={sceneStyle}>
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
              draggable={false}
            />
          </div>

          {hubLayout.edgeStalls.map((stall, i) => {
            const centerX = edgeStallCenterX(stall, metrics);
            const { width, height } = edgeStallDimensions(stall, metrics);

            return (
              <div
                key={`edge-${i}`}
                className="absolute hub-stall-slot"
                style={{ left: centerX, zIndex: EDGE_STALL_Z_INDEX }}
              >
                <Image
                  src={stall.image}
                  alt="夜市攤位"
                  width={width}
                  height={height}
                  className="hub-stall-image hub-stall-image--edge"
                  draggable={false}
                />
              </div>
            );
          })}

          {hubLayout.stalls
            .slice()
            .sort((a, b) => {
              if (a.kind === b.kind) return 0;
              return a.kind === "decorative" ? -1 : 1;
            })
            .map((stall, i) => {
            const centerX = stallCenterX(stall, metrics);
            const { width, height } = stallDimensions(stall, metrics);
            const nearGlow =
              stall.kind === "interactive" &&
              isPlayerNearStallGlow(playerX, centerX, width);

            return (
              <div
                key={`${stall.kind}-${stall.kind === "interactive" ? stall.id : stall.image}-${i}`}
                className="absolute hub-stall-slot"
                style={{ left: centerX, zIndex: stall.zIndex }}
              >
                <div className={`hub-stall-inner ${stallGlowClass(nearGlow)}`}>
                  {stall.kind === "interactive" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={stall.image}
                      alt={stall.label}
                      width={width}
                      height={height}
                      className="hub-stall-image"
                      style={{ width, height }}
                      draggable={false}
                    />
                  ) : (
                    <Image
                      src={stall.image}
                      alt="夜市攤位"
                      width={width}
                      height={height}
                      className="hub-stall-image hub-stall-image--decorative"
                      draggable={false}
                      priority={i < 4}
                    />
                  )}
                </div>
              </div>
            );
          })}

          <div
            className="hub-player-slot"
            style={{ left: playerX, zIndex: PLAYER_Z_INDEX }}
          >
            <HubPlayer facing={playerAnim.facing} walking={playerAnim.walking} />
          </div>
        </div>

        <div className="hub-vignette" aria-hidden />

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
      </div>

      {leavePrompt && (
        <LeaveMarketModal
          onCancel={() => setLeavePrompt(false)}
          onLeave={() => setLeavePrompt(false)}
        />
      )}

      {activeStall && (
        <StallIntroModal
          script={narrativeDefault.stalls[activeStall]}
          onClose={() => setActiveStall(null)}
        />
      )}

      {nearStallId &&
        hasVisitedStall(nearStallId) &&
        !activeStall &&
        !opening &&
        !boundaryMsg && <StallRevisitBar stallId={nearStallId} />}
    </div>
  );
}
