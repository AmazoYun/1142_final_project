import {
  computeNearestStallBgm,
  type HubLayout,
  type HubMetrics,
} from "@/lib/market/hubLayout";
import type { StallId } from "@/lib/narrative/types";
import { createAmbientRandomSfx } from "@/lib/sfx/randomSfx";

const HUB_BGM_SRC = "/sfx/hub/BGM.mp3";
const MAIN_BGM_SRC = "/sfx/hub/main_bgm.mp3";
const CASH_SRC = "/sfx/hub/cash.mp3";
const REWARD_SRC = "/sfx/hub/reward.mp3";
const GET_COIN_SRC = "/sfx/hub/get_coin.mp3";

const FOOTSTEP_SRC = [
  "/sfx/hub/footstep_1.mp3",
  "/sfx/hub/footstep_2.mp3",
  "/sfx/hub/footstep_3.mp3",
] as const;

const STALL_BGM_SRC: Record<StallId, string> = {
  pinball: "/sfx/hub/bgm_stall_1.mp3",
  balloonshoot: "/sfx/hub/bgm_stall_2.mp3",
  ringtoss: "/sfx/hub/bgm_stall_3.mp3",
  catchfish: "/sfx/hub/bgm_stall_4.mp3",
};

const HUB_BGM_VOLUME = 0.12;
const MAIN_BGM_VOLUME = 0.15;
export const MAIN_BGM_FADE_MS = 2000;
const FOOTSTEP_VOLUME = 0.05;
const CASH_VOLUME = 0.35;
const REWARD_VOLUME = 0.25;
const GET_COIN_VOLUME = 0.15;

let cashAudio: HTMLAudioElement | null = null;
let rewardAudio: HTMLAudioElement | null = null;
let getCoinAudio: HTMLAudioElement | null = null;

function playOneShot(template: HTMLAudioElement, volume: number) {
  const clip = template.cloneNode() as HTMLAudioElement;
  clip.volume = volume;
  void clip.play().catch(() => {});
}

function getCashAudio() {
  if (!cashAudio) {
    cashAudio = new Audio(CASH_SRC);
    cashAudio.preload = "auto";
    cashAudio.volume = CASH_VOLUME;
  }
  return cashAudio;
}

function getRewardAudio() {
  if (!rewardAudio) {
    rewardAudio = new Audio(REWARD_SRC);
    rewardAudio.preload = "auto";
    rewardAudio.volume = REWARD_VOLUME;
  }
  return rewardAudio;
}

function getGetCoinAudio() {
  if (!getCoinAudio) {
    getCoinAudio = new Audio(GET_COIN_SRC);
    getCoinAudio.preload = "auto";
    getCoinAudio.volume = GET_COIN_VOLUME;
  }
  return getCoinAudio;
}

/** 背包兌換彩券為代幣時播放 */
export function playCashSound() {
  playOneShot(getCashAudio(), CASH_VOLUME);
}

/** 獲得道具時播放 */
export function playRewardSound() {
  playOneShot(getRewardAudio(), REWARD_VOLUME);
}

/** 拾取地上彩票時播放 */
export function playGetCoinSound() {
  playOneShot(getGetCoinAudio(), GET_COIN_VOLUME);
}
/** 攤位 BGM 音量追蹤目標值的平滑係數（愈小愈慢） */
const STALL_BGM_FADE_LERP = 0.1;
const STALL_BGM_SILENCE_THRESHOLD = 0.003;

/** 與 globals.css hub-player-walk 同步：每兩幀播一次（1.17s ÷ 3 幀 × 2） */
const WALK_STEP_MS = (1170 / 3) * 2;

let hubBgmAudio: HTMLAudioElement | null = null;
let mainBgmAudio: HTMLAudioElement | null = null;
let mainBgmFadeRaf = 0;

function cancelMainBgmFade() {
  if (!mainBgmFadeRaf) return;
  cancelAnimationFrame(mainBgmFadeRaf);
  mainBgmFadeRaf = 0;
}

function fadeMainBgmTo(target: number, durationMs: number): Promise<void> {
  cancelMainBgmFade();
  const audio = getMainBgmAudio();
  const from = audio.volume;
  if (durationMs <= 0 || Math.abs(from - target) < 0.001) {
    audio.volume = target;
    return Promise.resolve();
  }

  const start = performance.now();
  return new Promise((resolve) => {
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = t * (2 - t);
      audio.volume = from + (target - from) * eased;
      if (t < 1) {
        mainBgmFadeRaf = requestAnimationFrame(tick);
        return;
      }
      mainBgmFadeRaf = 0;
      audio.volume = target;
      resolve();
    };
    mainBgmFadeRaf = requestAnimationFrame(tick);
  });
}

function makeLoopAudio(src: string, volume: number) {
  const audio = new Audio(src);
  audio.preload = "auto";
  audio.loop = true;
  audio.volume = volume;
  return audio;
}

function getHubBgmAudio() {
  if (!hubBgmAudio) {
    hubBgmAudio = makeLoopAudio(HUB_BGM_SRC, HUB_BGM_VOLUME);
  }
  return hubBgmAudio;
}

/** 夜市主 BGM；進入攤位小遊戲後仍持續播放 */
export function startHubBgm() {
  const audio = getHubBgmAudio();
  audio.load();
  if (audio.paused) {
    void audio.play().catch(() => {});
  }
}

export function stopHubBgm() {
  if (!hubBgmAudio) return;
  hubBgmAudio.pause();
  hubBgmAudio.currentTime = 0;
}

function getMainBgmAudio() {
  if (!mainBgmAudio) {
    mainBgmAudio = makeLoopAudio(MAIN_BGM_SRC, MAIN_BGM_VOLUME);
  }
  return mainBgmAudio;
}

/** 預載首頁 BGM（不自動播放，避免瀏覽器阻擋） */
export function preloadMainBgm() {
  getMainBgmAudio().load();
}

/** 首頁主選單 BGM（淡入；需在使用者點擊後呼叫） */
export function startMainBgm() {
  const audio = getMainBgmAudio();
  cancelMainBgmFade();
  audio.load();
  if (!audio.paused && audio.volume >= MAIN_BGM_VOLUME * 0.9) return;
  if (audio.paused) {
    audio.volume = 0;
    void audio.play().catch(() => {});
  }
  void fadeMainBgmTo(MAIN_BGM_VOLUME, MAIN_BGM_FADE_MS);
}

/** 首頁主選單 BGM（淡出後停止） */
export function fadeOutMainBgm(): Promise<void> {
  if (!mainBgmAudio || mainBgmAudio.paused) {
    return Promise.resolve();
  }
  return fadeMainBgmTo(0, MAIN_BGM_FADE_MS).then(() => {
    if (!mainBgmAudio) return;
    mainBgmAudio.pause();
    mainBgmAudio.currentTime = 0;
    mainBgmAudio.volume = MAIN_BGM_VOLUME;
  });
}

export function stopMainBgm() {
  cancelMainBgmFade();
  if (!mainBgmAudio) return;
  mainBgmAudio.pause();
  mainBgmAudio.currentTime = 0;
  mainBgmAudio.volume = MAIN_BGM_VOLUME;
}

/** 首頁 BGM 是否正在播放（結局返回主畫面時用來延續播放） */
export function isMainBgmPlaying(): boolean {
  return !!mainBgmAudio && !mainBgmAudio.paused && mainBgmAudio.volume > 0.01;
}

export type HubSoundFx = {
  preload: () => void;
  startHubBgm: () => void;
  setWalking: (active: boolean) => void;
  updateStallProximity: (
    playerX: number,
    layout: HubLayout,
    metrics: HubMetrics,
  ) => void;
  dispose: () => void;
};

export function createHubSoundFx(): HubSoundFx {
  const ambientSfx = createAmbientRandomSfx();

  const footstepClips = FOOTSTEP_SRC.map((src) => {
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.volume = FOOTSTEP_VOLUME;
    return audio;
  });

  const stallTracks = (Object.keys(STALL_BGM_SRC) as StallId[]).reduce(
    (acc, id) => {
      acc[id] = makeLoopAudio(STALL_BGM_SRC[id], 0);
      return acc;
    },
    {} as Record<StallId, HTMLAudioElement>,
  );

  let walkingActive = false;
  let walkTimer: ReturnType<typeof setInterval> | null = null;

  const stallTargets = (Object.keys(STALL_BGM_SRC) as StallId[]).reduce(
    (acc, id) => {
      acc[id] = 0;
      return acc;
    },
    {} as Record<StallId, number>,
  );

  const lerpVolume = (current: number, target: number) =>
    current + (target - current) * STALL_BGM_FADE_LERP;

  const playFootstep = () => {
    const template =
      footstepClips[Math.floor(Math.random() * footstepClips.length)]!;
    const clip = template.cloneNode() as HTMLAudioElement;
    clip.volume = FOOTSTEP_VOLUME;
    void clip.play().catch(() => {});
  };

  const stopWalking = () => {
    if (!walkingActive) return;
    walkingActive = false;
    if (walkTimer) {
      clearInterval(walkTimer);
      walkTimer = null;
    }
  };

  const stopAllStallTracks = () => {
    for (const id of Object.keys(stallTracks) as StallId[]) {
      stallTargets[id] = 0;
      const audio = stallTracks[id];
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 0;
    }
  };

  const tickStallTracks = () => {
    for (const id of Object.keys(stallTracks) as StallId[]) {
      const track = stallTracks[id];
      const target = stallTargets[id];
      const next = lerpVolume(track.volume, target);
      track.volume = next;

      if (target > STALL_BGM_SILENCE_THRESHOLD || next > STALL_BGM_SILENCE_THRESHOLD) {
        if (track.paused) {
          void track.play().catch(() => {});
        }
        continue;
      }

      if (track.volume <= STALL_BGM_SILENCE_THRESHOLD) {
        track.pause();
        track.currentTime = 0;
        track.volume = 0;
      }
    }
  };

  let stallFadeRaf = 0;

  const stopStallFadeLoop = () => {
    if (stallFadeRaf) {
      cancelAnimationFrame(stallFadeRaf);
      stallFadeRaf = 0;
    }
  };

  const stallFadeStep = () => {
    tickStallTracks();
    const stillFading = (Object.keys(stallTracks) as StallId[]).some(
      (id) => Math.abs(stallTracks[id].volume - stallTargets[id]) > STALL_BGM_SILENCE_THRESHOLD,
    );
    if (stillFading) {
      stallFadeRaf = requestAnimationFrame(stallFadeStep);
      return;
    }
    stallFadeRaf = 0;
  };

  const ensureStallFadeLoop = () => {
    tickStallTracks();
    if (stallFadeRaf) return;
    stallFadeRaf = requestAnimationFrame(stallFadeStep);
  };

  return {
    preload: () => {
      getHubBgmAudio().load();
      ambientSfx.preload();
      for (const audio of [...footstepClips, ...Object.values(stallTracks)]) {
        audio.load();
      }
    },
    startHubBgm: () => {
      startHubBgm();
      ambientSfx.start();
    },
    setWalking: (active) => {
      if (active) {
        if (walkingActive) return;
        walkingActive = true;
        playFootstep();
        walkTimer = setInterval(playFootstep, WALK_STEP_MS);
        return;
      }
      stopWalking();
    },
    updateStallProximity: (playerX, layout, metrics) => {
      const nearest = computeNearestStallBgm(playerX, layout, metrics);

      for (const id of Object.keys(stallTargets) as StallId[]) {
        stallTargets[id] = nearest?.stallId === id ? nearest.volume : 0;
      }

      ensureStallFadeLoop();
    },
    dispose: () => {
      stopWalking();
      stopStallFadeLoop();
      stopAllStallTracks();
      ambientSfx.dispose();
    },
  };
}
