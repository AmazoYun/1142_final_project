const TOSS_SRC = "/sfx/ringtoss/toss.mp3";
const HIT_SRC = "/sfx/ringtoss/hit.mp3";
const MISS_SRC = "/sfx/ringtoss/miss.mp3";
const BOTTLE_BROKEN_SRC = "/sfx/ringtoss/bottle_broken.mp3";
const BUTTON_PRESSED_SRC = "/sfx/ringtoss/button_pressed.mp3";

export type RingTossSoundFx = {
  preload: () => void;
  playToss: () => void;
  playHit: () => void;
  playMiss: () => void;
  playBottleBroken: () => void;
  playButtonPressed: () => void;
  dispose: () => void;
};

function playOneShot(audio: HTMLAudioElement) {
  const clip = audio.cloneNode() as HTMLAudioElement;
  clip.volume = audio.volume;
  void clip.play().catch(() => {});
}

export function createRingTossSoundFx(): RingTossSoundFx {
  const toss = new Audio(TOSS_SRC);
  toss.preload = "auto";
  toss.volume = 0.38;

  const hit = new Audio(HIT_SRC);
  hit.preload = "auto";
  hit.volume = 0.38;

  const miss = new Audio(MISS_SRC);
  miss.preload = "auto";
  miss.volume = 0.26;

  const bottleBroken = new Audio(BOTTLE_BROKEN_SRC);
  bottleBroken.preload = "auto";
  bottleBroken.volume = 0.42;

  const buttonPressed = new Audio(BUTTON_PRESSED_SRC);
  buttonPressed.preload = "auto";
  buttonPressed.volume = 0.28;

  return {
    preload: () => {
      for (const audio of [toss, hit, miss, bottleBroken, buttonPressed]) {
        audio.load();
      }
    },
    playToss: () => playOneShot(toss),
    playHit: () => playOneShot(hit),
    playMiss: () => playOneShot(miss),
    playBottleBroken: () => playOneShot(bottleBroken),
    playButtonPressed: () => playOneShot(buttonPressed),
    dispose: () => {},
  };
}
