const NET_SRC = [
  "/sfx/catchfish/net_1.mp3",
  "/sfx/catchfish/net_2.mp3",
  "/sfx/catchfish/net_3.mp3",
  "/sfx/catchfish/net_4.mp3",
] as const;

const CATCHING_SRC = "/sfx/catchfish/catching.mp3";
const FISH_MISS_SRC = "/sfx/catchfish/fish_miss.mp3";
const CAUGHT_SRC = "/sfx/catchfish/caught.mp3";
const NET_BREAK_SRC = "/sfx/catchfish/net_break.mp3";

const NET_SOUND_COOLDOWN_MS = 65;
/** 瞬間移動速度（px/s）超過此值才播放網子音效 */
const NET_SOUND_MIN_SPEED = 180;

export type CatchFishSoundFx = {
  preload: () => void;
  maybePlayNetOnMove: (instantSpeed: number) => void;
  startCatching: () => void;
  stopCatching: () => void;
  playFishMiss: () => void;
  playCaught: () => void;
  playNetBreak: () => void;
  dispose: () => void;
};

function playOneShot(audio: HTMLAudioElement) {
  const clip = audio.cloneNode() as HTMLAudioElement;
  clip.volume = audio.volume;
  void clip.play().catch(() => {});
}

function isAudioPlaying(audio: HTMLAudioElement | null): boolean {
  return audio !== null && !audio.paused && !audio.ended;
}

export function createCatchFishSoundFx(): CatchFishSoundFx {
  const netClips = NET_SRC.map((src) => {
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.volume = 0.17;
    return audio;
  });

  let activeNetClip: HTMLAudioElement | null = null;

  const playNetOneShot = (template: HTMLAudioElement): boolean => {
    if (isAudioPlaying(activeNetClip)) return false;
    const clip = template.cloneNode() as HTMLAudioElement;
    clip.volume = template.volume;
    activeNetClip = clip;
    clip.addEventListener(
      "ended",
      () => {
        if (activeNetClip === clip) activeNetClip = null;
      },
      { once: true },
    );
    void clip.play().catch(() => {
      if (activeNetClip === clip) activeNetClip = null;
    });
    return true;
  };
  const catching = new Audio(CATCHING_SRC);
  catching.preload = "auto";
  catching.loop = true;
  catching.volume = 0.32;

  const fishMiss = new Audio(FISH_MISS_SRC);
  fishMiss.preload = "auto";
  fishMiss.volume = 0.26;

  const caught = new Audio(CAUGHT_SRC);
  caught.preload = "auto";
  caught.volume = 0.19;

  const netBreak = new Audio(NET_BREAK_SRC);
  netBreak.preload = "auto";
  netBreak.volume = 0.32;

  let lastNetSoundAt = 0;
  let catchingActive = false;

  const stopCatching = () => {
    if (!catchingActive) return;
    catchingActive = false;
    catching.pause();
    catching.currentTime = 0;
  };

  return {
    preload: () => {
      for (const audio of [...netClips, catching, fishMiss, caught, netBreak]) {
        audio.load();
      }
    },
    maybePlayNetOnMove: (instantSpeed) => {
      if (instantSpeed < NET_SOUND_MIN_SPEED) return;

      const now = performance.now();
      if (now - lastNetSoundAt < NET_SOUND_COOLDOWN_MS) return;

      const pick = netClips[Math.floor(Math.random() * netClips.length)]!;
      if (playNetOneShot(pick)) {
        lastNetSoundAt = now;
      }
    },
    startCatching: () => {
      if (catchingActive) return;
      catchingActive = true;
      catching.currentTime = 0;
      void catching.play().catch(() => {});
    },
    stopCatching,
    playFishMiss: () => {
      stopCatching();
      playOneShot(fishMiss);
    },
    playCaught: () => {
      stopCatching();
      playOneShot(caught);
    },
    playNetBreak: () => {
      stopCatching();
      playOneShot(netBreak);
    },
    dispose: () => {
      stopCatching();
      if (activeNetClip) {
        activeNetClip.pause();
        activeNetClip = null;
      }
    },
  };
}
