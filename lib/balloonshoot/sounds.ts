const AIMING_SRC = "/sfx/balloonshoot/aiming.mp3";
const SHOOT_SRC = "/sfx/balloonshoot/shoot.mp3";
const SHOOT_MISS_SRC = "/sfx/balloonshoot/shoot_miss.mp3";
const ROTATING_SRC = "/sfx/balloonshoot/rotating.mp3";

export type BalloonShootSoundFx = {
  preload: () => void;
  startRotating: () => void;
  stopRotating: () => void;
  startAiming: () => void;
  stopAiming: () => void;
  playShoot: () => void;
  playShootMiss: () => void;
  dispose: () => void;
};

function playOneShot(audio: HTMLAudioElement) {
  const clip = audio.cloneNode() as HTMLAudioElement;
  clip.volume = audio.volume;
  void clip.play().catch(() => {});
}

export function createBalloonShootSoundFx(): BalloonShootSoundFx {
  const rotating = new Audio(ROTATING_SRC);
  rotating.preload = "auto";
  rotating.loop = true;
  rotating.volume = 0.035;

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

  let rotatingActive = false;
  let aimingActive = false;

  const stopRotating = () => {
    if (!rotatingActive) return;
    rotatingActive = false;
    rotating.pause();
    rotating.currentTime = 0;
  };

  const stopAiming = () => {
    if (!aimingActive) return;
    aimingActive = false;
    aiming.pause();
    aiming.currentTime = 0;
  };

  return {
    preload: () => {
      for (const audio of [rotating, aiming, shoot, shootMiss]) {
        audio.load();
      }
    },
    startRotating: () => {
      if (rotatingActive) return;
      rotatingActive = true;
      rotating.currentTime = 0;
      void rotating.play().catch(() => {});
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
    dispose: () => {
      stopRotating();
      stopAiming();
    },
  };
}
