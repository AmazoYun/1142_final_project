"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import DialoguePanel from "@/components/narrative/DialoguePanel";
import SceneCaption from "@/components/narrative/SceneCaption";
import StallIntroModal from "./StallIntroModal";
import StallRevisitBar from "./StallRevisitBar";
import { narrativeDefault } from "@/data/narrative-default";
import type { StallId } from "@/lib/narrative/types";
import { useStoryKeyAdvance } from "@/lib/useStoryKeyAdvance";
import { useNarrativeStore } from "@/store/narrativeStore";

const STALL_COUNT = 10;
const STALL_W = 200;
const WORLD_W = STALL_COUNT * STALL_W;
const PLAYER_SPEED = 4;
const INTERACTIVE: { index: number; id: StallId; label: string }[] = [
  { index: 1, id: "pinball", label: "彈珠台" },
  { index: 3, id: "balloonshoot", label: "射飛鏢" },
  { index: 5, id: "ringtoss", label: "套圈圈" },
  { index: 7, id: "catchfish", label: "撈金魚" },
];

export default function NightMarketHub() {
  const hydrate = useNarrativeStore((s) => s.hydrate);
  const hydrated = useNarrativeStore((s) => s.hydrated);
  const marketOpeningDone = useNarrativeStore((s) => s.marketOpeningDone);
  const completeMarketOpening = useNarrativeStore((s) => s.completeMarketOpening);
  const hasVisitedStall = useNarrativeStore((s) => s.hasVisitedStall);
  const visitedStalls = useNarrativeStore((s) => s.visitedStalls);
  const nextBoundaryLine = useNarrativeStore((s) => s.nextBoundaryLine);
  const editMode = useNarrativeStore((s) => s.editMode);
  const setEditMode = useNarrativeStore((s) => s.setEditMode);
  const getText = useNarrativeStore((s) => s.getText);

  const [playerX, setPlayerX] = useState(WORLD_W / 2);
  const [opening, setOpening] = useState(false);
  const [openingIndex, setOpeningIndex] = useState(0);
  const [moveHintVisible, setMoveHintVisible] = useState(true);
  const [activeStall, setActiveStall] = useState<StallId | null>(null);
  const [nearStallId, setNearStallId] = useState<StallId | null>(null);
  const [boundaryMsg, setBoundaryMsg] = useState<string | null>(null);
  const keysRef = useRef({ left: false, right: false });
  const movedMsRef = useRef(0);
  const dragRef = useRef<{ active: boolean; lastX: number }>({ active: false, lastX: 0 });
  const stallTriggeredRef = useRef<Set<StallId>>(new Set());

  const movementLocked = opening || activeStall !== null || boundaryMsg !== null;

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
      if (dx !== 0) {
        movedMsRef.current += dt;
        if (movedMsRef.current > 3000) setMoveHintVisible(false);
      }
      setPlayerX((x) => {
        const min = 120;
        const max = WORLD_W - 120;
        const nx = x + dx;
        if (nx < min) {
          setBoundaryMsg(nextBoundaryLine());
          return min;
        }
        if (nx > max) {
          setBoundaryMsg(nextBoundaryLine());
          return max;
        }
        return nx;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [movementLocked, nextBoundaryLine]);

  const nearStall = useCallback(() => {
    for (const s of INTERACTIVE) {
      const sx = s.index * STALL_W + STALL_W / 2;
      if (Math.abs(playerX - sx) < 90) return s.id;
    }
    return null;
  }, [playerX]);

  useEffect(() => {
    const id = nearStall();
    setNearStallId(id);

    if (!hydrated) return;
    if (movementLocked) return;
    if (!id) return;
    if (hasVisitedStall(id)) return;
    if (stallTriggeredRef.current.has(id)) return;
    stallTriggeredRef.current.add(id);
    setActiveStall(id);
  }, [playerX, movementLocked, nearStall, hasVisitedStall, hydrated, visitedStalls]);

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

  if (opening && openingLine) {
    return (
      <div className="fixed inset-0 z-50 overflow-hidden">
        <div className="absolute inset-0 bg-zinc-950" />
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

  const viewOffset = playerX - 480;

  return (
    <div className="h-screen flex flex-col bg-zinc-950 overflow-hidden">
      <header className="game-header shrink-0 flex items-center justify-between px-4 py-2">
        <span className="game-title text-lg">無人夜市</span>
        <div className="flex gap-2 items-center">
          {editMode && (
            <span className="text-[10px] text-amber-400 border border-amber-500/50 px-2 py-0.5 rounded">
              編輯模式
            </span>
          )}
          <button
            type="button"
            className="game-btn-ghost text-xs"
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? "關閉編輯" : "編輯模式"}
          </button>
          <Link href="/?replayIntro=1" className="game-btn-ghost text-xs">
            重播開場
          </Link>
        </div>
      </header>

      <div className="relative flex-1 overflow-hidden">
        <div
          className="absolute top-0 left-1/2 h-full transition-transform duration-75"
          style={{
            width: WORLD_W,
            transform: `translateX(calc(-50% - ${viewOffset}px))`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-800 via-zinc-900 to-zinc-950" />
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-zinc-800/80 border-t border-amber-900/30" />

          {Array.from({ length: STALL_COUNT }).map((_, i) => {
            const interactive = INTERACTIVE.find((s) => s.index === i);
            const x = i * STALL_W;
            const near = interactive && Math.abs(playerX - (x + STALL_W / 2)) < 90;
            return (
              <div
                key={i}
                className="absolute bottom-16"
                style={{ left: x, width: STALL_W }}
              >
                <div
                  className={`mx-4 h-36 rounded-t-lg border-2 flex flex-col items-center justify-end pb-2 transition-shadow ${
                    interactive
                      ? near
                        ? "border-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.5)] bg-amber-950/40"
                        : "border-amber-700/50 bg-zinc-800/60"
                      : "border-zinc-700 bg-zinc-800/30 opacity-60"
                  }`}
                >
                  <span className="text-[10px] text-zinc-500 mb-8">
                    {interactive ? "可互動" : "攤位"}
                  </span>
                  <p className="text-sm font-bold text-amber-100">
                    {interactive?.label ?? `攤位 ${i + 1}`}
                  </p>
                </div>
              </div>
            );
          })}

          <div
            className="absolute bottom-8 w-8 h-12 -ml-4 rounded-t-full bg-zinc-600 border-2 border-zinc-400"
            style={{ left: playerX }}
          />
        </div>

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
              movedMsRef.current += 16;
              if (movedMsRef.current > 3000) setMoveHintVisible(false);
              setPlayerX((x) => clamp(x + dx * 0.8, 120, WORLD_W - 120));
            }}
            onPointerUp={() => {
              dragRef.current.active = false;
            }}
            onPointerLeave={() => {
              dragRef.current.active = false;
            }}
          />
        )}
      </div>

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
        !boundaryMsg && (
          <StallRevisitBar stallId={nearStallId} />
        )}
    </div>
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
