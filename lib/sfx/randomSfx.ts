const AMBIENT_SRC = [
  "/sfx/random_sfx/fresh.mp3",
  "/sfx/random_sfx/ghost_cry.mp3",
  "/sfx/random_sfx/heart_beat.mp3",
  "/sfx/random_sfx/swell.mp3",
  "/sfx/random_sfx/wind.mp3",
] as const;

const IMPACT_SRC = "/sfx/random_sfx/impact.mp3";

/** 環境隨機音效：極度小聲 */
const AMBIENT_VOLUME = 0.018;
/** 事件觸發 impact：略低於一般遊戲音效 */
const IMPACT_VOLUME = 0.28;

const AMBIENT_MIN_MS = 30_000;
const AMBIENT_MAX_MS = 50_000;

function randomAmbientDelayMs() {
  return AMBIENT_MIN_MS + Math.random() * (AMBIENT_MAX_MS - AMBIENT_MIN_MS);
}

function playOneShot(template: HTMLAudioElement, volume: number) {
  const clip = template.cloneNode() as HTMLAudioElement;
  clip.volume = volume;
  void clip.play().catch(() => {});
}

let impactTemplate: HTMLAudioElement | null = null;

function getImpactTemplate() {
  if (!impactTemplate) {
    impactTemplate = new Audio(IMPACT_SRC);
    impactTemplate.preload = "auto";
    impactTemplate.volume = IMPACT_VOLUME;
  }
  return impactTemplate;
}

/** 拿下彈珠、套圈按鈕、砸瓶、丟回大魚等事件 */
export function playImpactSound() {
  playOneShot(getImpactTemplate(), IMPACT_VOLUME);
}

export type AmbientRandomSfx = {
  preload: () => void;
  start: () => void;
  dispose: () => void;
};

export function createAmbientRandomSfx(): AmbientRandomSfx {
  const clips = AMBIENT_SRC.map((src) => {
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.volume = AMBIENT_VOLUME;
    return audio;
  });

  let timer: ReturnType<typeof setTimeout> | null = null;
  let active = false;

  const playAmbient = () => {
    if (!active) return;
    const pick = clips[Math.floor(Math.random() * clips.length)]!;
    playOneShot(pick, AMBIENT_VOLUME);
    timer = setTimeout(playAmbient, randomAmbientDelayMs());
  };

  const clearTimer = () => {
    if (!timer) return;
    clearTimeout(timer);
    timer = null;
  };

  return {
    preload: () => {
      getImpactTemplate().load();
      for (const audio of clips) {
        audio.load();
      }
    },
    start: () => {
      if (active) return;
      active = true;
      timer = setTimeout(playAmbient, randomAmbientDelayMs());
    },
    dispose: () => {
      active = false;
      clearTimer();
    },
  };
}
