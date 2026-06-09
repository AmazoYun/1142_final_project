const AIMING_SRC = "/sfx/balloonshoot/aiming.mp3";
const SHOOT_SRC = "/sfx/balloonshoot/shoot.mp3";
const SHOOT_MISS_SRC = "/sfx/balloonshoot/shoot_miss.mp3";
const ROTATING_SRC = "/sfx/balloonshoot/rotating.mp3";
const BUTTON_PRESSED_SRC = "/sfx/ringtoss/button_pressed.mp3";

const ROTATING_PEAK_VOLUME = 0.028;
const ROTATING_FADE_IN_MS = 600;
const ROTATING_FADE_OUT_MS = 500;

export type BalloonShootSoundFx = {
  preload: () => void;
  startRotating: () => void;
  stopRotating: () => void;
  startAiming: () => void;
  stopAiming: () => void;
  playShoot: () => void;
  playShootMiss: () => void;
  playButtonPressed: () => void;
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

function playOneShot(audio: HTMLAudioElement) {
  const clip = audio.cloneNode() as HTMLAudioElement;
  clip.volume = audio.volume;
  void clip.play().catch(() => {});
}

export function createBalloonShootSoundFx(): BalloonShootSoundFx {
  const rotating = new Audio(ROTATING_SRC);
  rotating.preload = "auto";
  rotating.loop = true;
  rotating.volume = ROTATING_PEAK_VOLUME;

  const aiming = new Audio(AIMING_SRC);
  aiming.preload = "auto";
  aiming.loop = false;
  aiming.volume = 0.32;

  const shoot = new Audio(SHOOT_SRC);
  shoot.preload = "auto";
  shoot.volume = 0.266;

  const shootMiss = new Audio(SHOOT_MISS_SRC);
  shootMiss.preload = "auto";
  shootMiss.volume = 0.26;

  const buttonPressed = new Audio(BUTTON_PRESSED_SRC);
  buttonPressed.preload = "auto";
  buttonPressed.volume = 0.28;

  let rotatingActive = false;
  let aimingActive = false;
  let rotatingFade: FadeHandle | null = null;

  const stopRotating = () => {
    if (!rotatingActive) return;
    rotatingActive = false;
    rotatingFade?.cancel();
    rotatingFade = fadeVolume(rotating, rotating.volume, 0, ROTATING_FADE_OUT_MS, () => {
      rotating.pause();
      rotating.currentTime = 0;
      rotating.volume = ROTATING_PEAK_VOLUME;
    });
  };

  const stopAiming = () => {
    if (!aimingActive) return;
    aimingActive = false;
    aiming.pause();
    aiming.currentTime = 0;
  };

  return {
    preload: () => {
      for (const audio of [rotating, aiming, shoot, shootMiss, buttonPressed]) {
        audio.load();
      }
    },
    startRotating: () => {
      if (rotatingActive) return;
      rotatingActive = true;
      rotatingFade?.cancel();
      rotating.currentTime = 0;
      rotating.volume = 0;
      void rotating.play().then(() => {
        rotatingFade = fadeVolume(rotating, 0, ROTATING_PEAK_VOLUME, ROTATING_FADE_IN_MS);
      }).catch(() => {
        rotatingActive = false;
      });
    },
    stopRotating,
    startAiming: () => {
      if (aimingActive) return;
      aimingActive = true;
      aiming.currentTime = 0;
      void aiming.play().catch(() => {});
    },
    stopAiming,
    playShoot: () => playOneShot(shoot),
    playShootMiss: () => playOneShot(shootMiss),
    playButtonPressed: () => playOneShot(buttonPressed),
    dispose: () => {
      rotatingFade?.cancel();
      rotatingFade = null;
      if (rotatingActive) {
        rotatingActive = false;
        rotating.pause();
        rotating.currentTime = 0;
        rotating.volume = ROTATING_PEAK_VOLUME;
      }
      stopAiming();
    },
  };
}
