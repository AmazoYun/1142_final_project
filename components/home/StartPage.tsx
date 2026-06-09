"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import GamePageFallback from "@/components/game/GamePageFallback";

const IntroFlow = lazy(() => import("@/components/intro/IntroFlow"));
import CreditsModal from "@/components/home/CreditsModal";
import EndingSelectModal from "@/components/home/EndingSelectModal";
import LoginModal from "@/components/home/LoginModal";
import SaveListModal from "@/components/home/SaveListModal";
import { navigateWithFade } from "@/lib/navigation/navigateWithFade";
import { usePageFadeIn } from "@/lib/navigation/usePageFadeIn";
import {
  fadeOutMainBgm,
  isMainBgmPlaying,
  preloadMainBgm,
  startMainBgm,
  stopHubBgm,
} from "@/lib/market/hubSounds";
import { resetGameProgress } from "@/lib/player/resetGameProgress";
import { usePlayerStore } from "@/store/playerStore";
import type { EndingId } from "@/lib/endings/types";
import { useNarrativeStore } from "@/store/narrativeStore";

type BootPhase = "loading" | "intro" | "home";
type BgFade = "hidden" | "visible" | "leaving";
type HomeModal = null | "login" | "save-play" | "save-view" | "ending-select" | "credits";

const INTRO_REPLAY_LEAVE_MS = 1200;

function StartPageBackground({ fade }: { fade: BgFade }) {
  const fadeClass =
    fade === "visible" ? "is-visible" : fade === "leaving" ? "is-leaving" : "";

  return (
    <div className={`start-page__bg ${fadeClass}`.trim()} aria-hidden>
      <div className="start-page__video-stage">
        <video
          className="start-page__video"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
        >
          <source src="/narrative/intro.webm" type="video/webm" />
        </video>
        <div className="start-page__chromatic start-page__chromatic--r" />
        <div className="start-page__chromatic start-page__chromatic--b" />
      </div>
      <div className="start-page__scanlines" />
      <div className="start-page__noise" />
      <div className="start-page__overlay" />
    </div>
  );
}

export default function StartPage() {
  const router = useRouter();
  usePageFadeIn();

  const hydratePlayers = usePlayerStore((s) => s.hydrate);
  const playersHydrated = usePlayerStore((s) => s.hydrated);
  const loggedInNickname = usePlayerStore((s) => s.loggedInNickname);
  const saves = usePlayerStore((s) => s.saves);
  const login = usePlayerStore((s) => s.login);
  const syncProfileFromCloud = usePlayerStore((s) => s.syncProfileFromCloud);
  const logout = usePlayerStore((s) => s.logout);
  const flushActiveSaveToCloud = usePlayerStore((s) => s.flushActiveSaveToCloud);
  const getPlayerSaves = usePlayerStore((s) => s.getPlayerSaves);
  const createNewSave = usePlayerStore((s) => s.createNewSave);
  const loadSave = usePlayerStore((s) => s.loadSave);

  const hydrateNarrative = useNarrativeStore((s) => s.hydrate);
  const narrativeHydrated = useNarrativeStore((s) => s.hydrated);
  const introDone = useNarrativeStore((s) => s.introDone);
  const seenEndingIds = useNarrativeStore((s) => s.seenEndingIds);

  const [bootPhase, setBootPhase] = useState<BootPhase>("loading");
  const [showIntroReplay, setShowIntroReplay] = useState(false);
  const [introLeaving, setIntroLeaving] = useState(false);
  const [bgFade, setBgFade] = useState<BgFade>("hidden");
  const [showButtons, setShowButtons] = useState(false);
  const [homeModal, setHomeModal] = useState<HomeModal>(null);
  const [nickname, setNickname] = useState("");

  const isLoggedIn = !!loggedInNickname;
  const playerSaves = useMemo(
    () => (loggedInNickname ? getPlayerSaves(loggedInNickname) : []),
    [getPlayerSaves, loggedInNickname, saves],
  );

  useEffect(() => {
    hydratePlayers();
    hydrateNarrative();
    stopHubBgm();
  }, [hydratePlayers, hydrateNarrative]);

  useEffect(() => {
    if (!playersHydrated || !loggedInNickname) return;
    void syncProfileFromCloud(loggedInNickname);
  }, [playersHydrated, loggedInNickname, syncProfileFromCloud]);

  useEffect(() => {
    if (!playersHydrated || !narrativeHydrated) return;
    setBootPhase(introDone ? "home" : "intro");
  }, [playersHydrated, narrativeHydrated, introDone]);

  useEffect(() => {
    if (bootPhase !== "home") {
      setBgFade("hidden");
      setShowButtons(false);
      return;
    }
    stopHubBgm();
    preloadMainBgm();
    if (isMainBgmPlaying()) {
      setShowButtons(true);
    } else {
      setShowButtons(false);
    }
    const frame = requestAnimationFrame(() => setBgFade("visible"));
    return () => {
      cancelAnimationFrame(frame);
      void fadeOutMainBgm();
      setBgFade("hidden");
      setShowButtons(false);
    };
  }, [bootPhase]);

  const revealButtons = useCallback(() => {
    startMainBgm();
    setShowButtons(true);
  }, []);

  const leaveHome = useCallback(
    async (href: string) => {
      setBgFade("leaving");
      await fadeOutMainBgm();
      await navigateWithFade(router, href);
    },
    [router],
  );

  const enterMarket = useCallback(async () => {
    await leaveHome("/market");
  }, [leaveHome]);

  const replayIntro = useCallback(async () => {
    if (introLeaving) return;
    await fadeOutMainBgm();
    setIntroLeaving(true);
    setBgFade("leaving");
    window.setTimeout(() => {
      setShowIntroReplay(true);
      setIntroLeaving(false);
    }, INTRO_REPLAY_LEAVE_MS);
  }, [introLeaving]);

  const finishIntroView = useCallback(() => {
    setShowIntroReplay(false);
    setIntroLeaving(false);
    if (bootPhase === "intro") {
      setBootPhase("home");
      return;
    }
    setShowButtons(false);
    setBgFade("hidden");
    requestAnimationFrame(() => setBgFade("visible"));
  }, [bootPhase]);

  const startNewSaveAndEnter = useCallback(
    (name: string) => {
      resetGameProgress();
      createNewSave(name);
      setHomeModal(null);
      void enterMarket();
    },
    [createNewSave, enterMarket],
  );

  const enterExistingSave = useCallback(
    (saveId: string) => {
      loadSave(saveId);
      setHomeModal(null);
      void enterMarket();
    },
    [loadSave, enterMarket],
  );

  const confirmLogin = useCallback(async () => {
    const trimmed = nickname.trim();
    if (!trimmed) return;
    login(trimmed);
    await syncProfileFromCloud(trimmed);
    setHomeModal("save-play");
  }, [login, syncProfileFromCloud, nickname]);

  const openStartFlow = useCallback(async () => {
    if (isLoggedIn && loggedInNickname) {
      await syncProfileFromCloud(loggedInNickname);
      setHomeModal("save-play");
      return;
    }
    setNickname("");
    setHomeModal("login");
  }, [isLoggedIn, loggedInNickname, syncProfileFromCloud]);

  const openSaveHistory = useCallback(async () => {
    if (!isLoggedIn || !loggedInNickname) return;
    await syncProfileFromCloud(loggedInNickname);
    setHomeModal("save-view");
  }, [isLoggedIn, loggedInNickname, syncProfileFromCloud]);

  const watchEnding = useCallback(
    (endingId: EndingId) => {
      setHomeModal(null);
      void leaveHome(`/ending?preview=${endingId}`);
    },
    [leaveHome],
  );

  const handleLogout = useCallback(() => {
    void flushActiveSaveToCloud().finally(() => {
      logout();
      setHomeModal(null);
    });
  }, [flushActiveSaveToCloud, logout]);

  if (bootPhase === "loading") {
    return (
      <div className="start-page min-h-screen flex items-center justify-center">
        <p className="text-sm opacity-60">載入中…</p>
      </div>
    );
  }

  if (bootPhase === "intro" || (showIntroReplay && !introLeaving)) {
    return (
      <Suspense fallback={<GamePageFallback />}>
        <IntroFlow key={showIntroReplay ? "intro-replay" : "intro-first"} onComplete={finishIntroView} />
      </Suspense>
    );
  }

  const homeBgFade: BgFade = introLeaving ? "leaving" : bgFade;

  return (
    <div className="start-page">
      <StartPageBackground fade={homeBgFade} />
      {introLeaving ? <div className="intro-replay-fade-overlay" aria-hidden /> : null}
      <div
        className={`start-page__content${introLeaving ? " start-page__content--leaving" : ""}${showButtons ? "" : " start-page__content--clickable"}`}
        onClick={showButtons || introLeaving ? undefined : revealButtons}
        onKeyDown={
          showButtons
            ? undefined
            : (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  revealButtons();
                }
              }
        }
        role={showButtons ? undefined : "button"}
        tabIndex={showButtons ? undefined : 0}
      >
        <div className="w-full max-w-xl flex flex-col items-center gap-8">
          <header className="start-page__header text-center space-y-2">
            <h1 className="start-page__title game-title text-2xl sm:text-3xl tracking-widest">
              <span className="start-page__title-base">無人夜市</span>
              <span className="start-page__title-ghost start-page__title-ghost--r" aria-hidden>
                無人夜市
              </span>
              <span className="start-page__title-ghost start-page__title-ghost--b" aria-hidden>
                無人夜市
              </span>
            </h1>
            <p className="start-page__subtitle text-sm opacity-70 tracking-wide">
              The Liminal Market
            </p>
            {isLoggedIn ? (
              <p className="text-xs opacity-60 tracking-wide">目前玩家：{loggedInNickname}</p>
            ) : null}
          </header>

          <div
            className={`start-page__actions flex w-full flex-col items-stretch gap-4${showButtons ? " is-visible" : ""}`}
          >
            <button type="button" className="game-btn-primary w-full text-center text-base px-10 py-3" onClick={openStartFlow}>
              開始遊戲
            </button>
            <button
              type="button"
              className={`game-btn-ghost w-full text-center text-base px-10 py-3${isLoggedIn ? "" : " opacity-45 cursor-not-allowed"}`}
              disabled={!isLoggedIn}
              onClick={openSaveHistory}
            >
              存檔紀錄
            </button>
            <button
              type="button"
              className="game-btn-ghost w-full text-center text-base px-10 py-3"
              disabled={introLeaving}
              onClick={() => void replayIntro()}
            >
              前導劇情
            </button>
            <button
              type="button"
              className="game-btn-ghost w-full text-center text-base px-10 py-3"
              onClick={() => setHomeModal("ending-select")}
            >
              觀看結局
            </button>
            <Link
              href="/leaderboard"
              className="game-btn-ghost block w-full text-center text-base px-10 py-3"
              data-ui-sound="enter"
              onClick={(e) => {
                e.preventDefault();
                void leaveHome("/leaderboard");
              }}
            >
              排行榜
            </Link>
            <button
              type="button"
              className="game-btn-ghost w-full text-center text-base px-10 py-3"
              onClick={() => setHomeModal("credits")}
            >
              Credits
            </button>
            {isLoggedIn ? (
              <button
                type="button"
                className="game-btn-ghost w-full text-center text-base px-10 py-3 opacity-70"
                onClick={handleLogout}
              >
                登出
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <p className="start-page__hint">
        請以電腦瀏覽器進行遊玩，並戴上耳機獲得最佳遊玩體驗。
      </p>

      <LoginModal
        open={homeModal === "login"}
        nickname={nickname}
        onNicknameChange={setNickname}
        onClose={() => setHomeModal(null)}
        onConfirm={confirmLogin}
      />

      {homeModal === "ending-select" ? (
        <EndingSelectModal
          open
          onClose={() => setHomeModal(null)}
          onSelectEnding={watchEnding}
          seenEndingIds={seenEndingIds}
          saves={playerSaves}
        />
      ) : null}

      <CreditsModal open={homeModal === "credits"} onClose={() => setHomeModal(null)} />

      {loggedInNickname && (homeModal === "save-play" || homeModal === "save-view") ? (
        <SaveListModal
          open
          title={homeModal === "save-play" ? "選擇存檔" : "存檔紀錄"}
          nickname={loggedInNickname}
          saves={playerSaves}
          mode={homeModal === "save-play" ? "play" : "view"}
          onClose={() => setHomeModal(null)}
          onSelectSave={homeModal === "save-play" ? enterExistingSave : undefined}
          onNewSave={homeModal === "save-play" ? () => startNewSaveAndEnter(loggedInNickname) : undefined}
        />
      ) : null}
    </div>
  );
}
