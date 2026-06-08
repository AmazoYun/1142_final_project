const BUMP_SRC = [
  "/sfx/pinball/bump_1.mp3",
  "/sfx/pinball/bump_2.mp3",
  "/sfx/pinball/bump_3.mp3",
] as const;

const PRESS_SRC = "/sfx/pinball/spring_press.mp3";
const SCORE_SRC = "/sfx/pinball/pinball_score.mp3";
const ROLLING_SRC = "/sfx/pinball/pinball_rolling.mp3";

const BUMP_COOLDOWN_MS = 60;
const PEAK_VOLUME = 0.5;
const ROLLING_PEAK_VOLUME = 0.275;
const FADE_IN_MS = 30;
const FADE_OUT_MS = 30;

export type PinballSoundFx = {
  preload: () => void;
  playBump: () => void;
  playPress: () => void;
  playScore: () => void;
  startRolling: () => void;
  stopRolling: () => void;
  dispose: () => void;
};

type FadeHandle = { cancel: () => void };

function fadeVolume(
  audio: HTMLAudioElement,
  from: number,
  to: number,
  durationMs: number,
  onComplete?: () => void,
): FadeHandle {
  if (durationMs <= 0) {
    audio.volume = to;
    onComplete?.();
    return { cancel: () => {} };
  }

  const startAt = performance.now();
  let raf = 0;

  const step = (now: number) => {
    const t = Math.min(1, (now - startAt) / durationMs);
    audio.volume = from + (to - from) * t;
    if (t < 1) {
      raf = requestAnimationFrame(step);
    } else {
      onComplete?.();
    }
  };

  raf = requestAnimationFrame(step);
  return {
    cancel: () => {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    },
  };
}

function playOneShot(template: HTMLAudioElement) {
  const clip = template.cloneNode() as HTMLAudioElement;
  const peak = template.volume;
  clip.volume = 0;

  let fadeIn: FadeHandle | null = null;
  let fadeOut: FadeHandle | null = null;
  let fadeOutTimer = 0;

  const cleanup = () => {
    fadeIn?.cancel();
    fadeOut?.cancel();
    if (fadeOutTimer) window.clearTimeout(fadeOutTimer);
  };

  const scheduleFadeOut = () => {
    const durationMs = Number.isFinite(clip.duration) ? clip.duration * 1000 : 0;
    const delay = Math.max(FADE_IN_MS, durationMs - FADE_OUT_MS);
    fadeOutTimer = window.setTimeout(() => {
      fadeIn?.cancel();
      fadeOut = fadeVolume(clip, clip.volume, 0, FADE_OUT_MS, () => {
        clip.pause();
      });
    }, delay);
  };

  clip.addEventListener("ended", cleanup, { once: true });

  void clip.play().then(() => {
    fadeIn = fadeVolume(clip, 0, peak, FADE_IN_MS);
    if (Number.isFinite(clip.duration) && clip.duration > 0) {
      scheduleFadeOut();
    } else {
      clip.addEventListener("loadedmetadata", scheduleFadeOut, { once: true });
    }
  }).catch(() => {
    cleanup();
  });
}

export function createPinballSoundFx(): PinballSoundFx {
  const bumpClips = BUMP_SRC.map((src) => {
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.volume = PEAK_VOLUME;
    return audio;
  });
  const press = new Audio(PRESS_SRC);
  press.preload = "auto";
  press.volume = PEAK_VOLUME;
  const score = new Audio(SCORE_SRC);
  score.preload = "auto";
  score.volume = PEAK_VOLUME;
  const rolling = new Audio(ROLLING_SRC);
  rolling.preload = "auto";
  rolling.loop = true;
  rolling.volume = ROLLING_PEAK_VOLUME;

  let lastBumpAt = 0;
  let rollingActive = false;
  let rollingFade: FadeHandle | null = null;

  const stopRolling = () => {
    if (!rollingActive) return;
    rollingActive = false;
    rollingFade?.cancel();
    rollingFade = fadeVolume(rolling, rolling.volume, 0, FADE_OUT_MS, () => {
      rolling.pause();
      rolling.currentTime = 0;
      rolling.volume = ROLLING_PEAK_VOLUME;
    });
  };

  return {
    preload: () => {
      for (const audio of [...bumpClips, press, score, rolling]) {
        audio.load();
      }
    },
    playBump: () => {
      const now = performance.now();
      if (now - lastBumpAt < BUMP_COOLDOWN_MS) return;
      lastBumpAt = now;
      const pick = bumpClips[Math.floor(Math.random() * bumpClips.length)];
      playOneShot(pick);
    },
    playPress: () => playOneShot(press),
    playScore: () => {
      stopRolling();
      playOneShot(score);
    },
    startRolling: () => {
      if (rollingActive) return;
      rollingActive = true;
      rollingFade?.cancel();
      rolling.currentTime = 0;
      rolling.volume = 0;
      void rolling.play().then(() => {
        rollingFade = fadeVolume(rolling, 0, ROLLING_PEAK_VOLUME, FADE_IN_MS);
      }).catch(() => {
        rollingActive = false;
      });
    },
    stopRolling,
    dispose: () => {
      rollingFade?.cancel();
      rollingFade = null;
      if (rollingActive) {
        rollingActive = false;
        rolling.pause();
        rolling.currentTime = 0;
        rolling.volume = ROLLING_PEAK_VOLUME;
      }
    },
  };
}
