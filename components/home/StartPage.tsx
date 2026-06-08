"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import IntroFlow from "@/components/intro/IntroFlow";
import { navigateWithFade } from "@/lib/navigation/navigateWithFade";
import { usePageFadeIn } from "@/lib/navigation/usePageFadeIn";
import { stopHubBgm } from "@/lib/market/hubSounds";
import { resetGameProgress } from "@/lib/player/resetGameProgress";
import { usePlayerStore } from "@/store/playerStore";
import { useNarrativeStore } from "@/store/narrativeStore";

type BootPhase = "loading" | "intro" | "home";
type NicknamePhase = "input" | "continue" | "finished" | "new";

export default function StartPage() {
  const router = useRouter();
  usePageFadeIn();

  const hydratePlayers = usePlayerStore((s) => s.hydrate);
  const playersHydrated = usePlayerStore((s) => s.hydrated);
  const findRecord = usePlayerStore((s) => s.findRecord);
  const beginNewRun = usePlayerStore((s) => s.beginNewRun);
  const resumeRun = usePlayerStore((s) => s.resumeRun);

  const hydrateNarrative = useNarrativeStore((s) => s.hydrate);
  const narrativeHydrated = useNarrativeStore((s) => s.hydrated);
  const introDone = useNarrativeStore((s) => s.introDone);

  const [bootPhase, setBootPhase] = useState<BootPhase>("loading");
  const [modalOpen, setModalOpen] = useState(false);
  const [nickname, setNickname] = useState("");
  const [phase, setPhase] = useState<NicknamePhase>("input");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    hydratePlayers();
    hydrateNarrative();
    stopHubBgm();
  }, [hydratePlayers, hydrateNarrative]);

  useEffect(() => {
    if (!playersHydrated || !narrativeHydrated) return;
    setBootPhase(introDone ? "home" : "intro");
  }, [playersHydrated, narrativeHydrated, introDone]);

  const enterMarket = useCallback(async () => {
    await navigateWithFade(router, "/market");
  }, [router]);

  const resolveNickname = useCallback(() => {
    const trimmed = nickname.trim();
    if (!trimmed) return;

    const record = findRecord(trimmed);
    if (!record) {
      setPhase("new");
      setStatusMessage("尚無此玩家紀錄，將新增玩家紀錄開啟新遊戲");
      return;
    }
    if (record.endingId) {
      setPhase("finished");
      setStatusMessage("已有此玩家紀錄，上一輪遊戲已結束，將開啟新遊戲");
      return;
    }
    if (record.isActive) {
      setPhase("continue");
      setStatusMessage("已有此玩家紀錄，請選擇繼續遊戲或開啟新遊戲");
      return;
    }
    setPhase("new");
    setStatusMessage("尚無此玩家紀錄，將新增玩家紀錄開啟新遊戲");
  }, [findRecord, nickname]);

  const confirmNewGame = useCallback(() => {
    const trimmed = nickname.trim();
    if (!trimmed) return;
    resetGameProgress();
    beginNewRun(trimmed);
    setModalOpen(false);
    void enterMarket();
  }, [beginNewRun, nickname, enterMarket]);

  const confirmContinue = useCallback(() => {
    const trimmed = nickname.trim();
    if (!trimmed) return;
    resumeRun(trimmed);
    setModalOpen(false);
    void enterMarket();
  }, [nickname, resumeRun, enterMarket]);

  const openStartModal = () => {
    setNickname("");
    setPhase("input");
    setStatusMessage("");
    setModalOpen(true);
  };

  if (bootPhase === "loading") {
    return (
      <div className="start-page min-h-screen flex items-center justify-center">
        <p className="text-sm opacity-60">載入中…</p>
      </div>
    );
  }

  if (bootPhase === "intro") {
    return (
      <IntroFlow
        onComplete={() => {
          setBootPhase("home");
        }}
      />
    );
  }

  return (
    <div className="start-page min-h-screen flex flex-col items-center px-4 py-10 sm:py-14">
      <div className="w-full max-w-xl flex flex-col items-center gap-8">
        <header className="text-center space-y-2">
          <h1 className="game-title text-2xl sm:text-3xl tracking-widest">無人夜市</h1>
          <p className="text-sm opacity-70 tracking-wide">2005 年 6 月，畢業旅行的那一夜</p>
        </header>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button type="button" className="game-btn-primary text-base px-10 py-3" onClick={openStartModal}>
            開始遊戲
          </button>
          <Link href="/leaderboard" className="game-btn-ghost text-base px-10 py-3" data-ui-sound="enter">
            排行榜
          </Link>
        </div>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="game-panel w-full max-w-md p-6 space-y-4">
            <h2 className="game-title text-center text-lg">輸入玩家暱稱</h2>

            {phase === "input" ? (
              <>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") resolveNickname();
                  }}
                  className="w-full px-3 py-2 bg-paper border-2 border-ink text-ink text-sm"
                  placeholder="請輸入暱稱"
                  maxLength={20}
                  autoFocus
                />
                <div className="flex justify-end gap-3">
                  <button type="button" className="game-btn-ghost" onClick={() => setModalOpen(false)}>
                    取消
                  </button>
                  <button
                    type="button"
                    className="game-btn-primary"
                    disabled={!nickname.trim()}
                    onClick={resolveNickname}
                  >
                    下一步
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm leading-relaxed">{statusMessage}</p>
                <p className="text-xs opacity-70">玩家：{nickname.trim()}</p>
                <div className="flex flex-wrap justify-end gap-3">
                  <button type="button" className="game-btn-ghost" onClick={() => setPhase("input")}>
                    返回
                  </button>
                  {phase === "continue" ? (
                    <>
                      <button type="button" className="game-btn-ghost" onClick={confirmNewGame}>
                        開啟新遊戲
                      </button>
                      <button type="button" className="game-btn-primary" onClick={confirmContinue}>
                        繼續遊戲
                      </button>
                    </>
                  ) : (
                    <button type="button" className="game-btn-primary" onClick={confirmNewGame}>
                      開始
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
