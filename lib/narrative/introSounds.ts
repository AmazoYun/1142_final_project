"use client";

const BASE = "/sfx/intro_ending";

const SRC = {
  nightMarket: `${BASE}/night_market_ambience.mp3`,
  toilet: `${BASE}/toilet_ambience.mp3`,
  cave: `${BASE}/cave_ambience.mp3`,
  peeing: `${BASE}/peeing.mp3`,
  washHand: `${BASE}/wash_hand.mp3`,
  ghostCry: `${BASE}/ghost_cry.mp3`,
  horror: `${BASE}/horror.mp3`,
  impact: `${BASE}/impact.mp3`,
} as const;

const VOL = {
  nightMarket: 0.7,
  toilet: 0.3,
  cave: 0.24,
  peeing: 0.1,
  washHand: 0.1,
  ghostCry: 0.12,
  horror: 0.1,
  impact: 0.12,
} as const;

const FADE_MS = 2000;
const OPEN_AMB_FADE_MS = 3000;
const HORROR_PLAY_MS = 3000;
const HORROR_FADE_MS = 2000;
const WASH_MS = 3000;

type AmbKey = "nightMarket" | "toilet" | "cave";

let nightMarketAmb: HTMLAudioElement | null = null;
let toiletAmb: HTMLAudioElement | null = null;
let caveAmb: HTMLAudioElement | null = null;
let activeAmb: AmbKey | null = null;

const fadeRafs = new WeakMap<HTMLAudioElement, number>();

function cancelFadeFor(audio: HTMLAudioElement) {
  const raf = fadeRafs.get(audio);
  if (!raf) return;
  cancelAnimationFrame(raf);
  fadeRafs.delete(audio);
}

function fadeAudioTo(audio: HTMLAudioElement, target: number, durationMs: number): Promise<void> {
  cancelFadeFor(audio);
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
        const raf = requestAnimationFrame(tick);
        fadeRafs.set(audio, raf);
        return;
      }
      fadeRafs.delete(audio);
      audio.volume = target;
      resolve();
    };
    const raf = requestAnimationFrame(tick);
    fadeRafs.set(audio, raf);
  });
}

function ambFor(key: AmbKey): HTMLAudioElement {
  if (key === "nightMarket") {
    if (!nightMarketAmb) {
      nightMarketAmb = new Audio(SRC.nightMarket);
      nightMarketAmb.loop = true;
      nightMarketAmb.preload = "auto";
    }
    return nightMarketAmb;
  }
  if (key === "toilet") {
    if (!toiletAmb) {
      toiletAmb = new Audio(SRC.toilet);
      toiletAmb.loop = true;
      toiletAmb.preload = "auto";
    }
    return toiletAmb;
  }
  if (!caveAmb) {
    caveAmb = new Audio(SRC.cave);
    caveAmb.loop = true;
    caveAmb.preload = "auto";
  }
  return caveAmb;
}

async function playAmb(key: AmbKey, fadeMs = FADE_MS) {
  const next = ambFor(key);
  const target = VOL[key];
  if (activeAmb === key && !next.paused) return;

  const prevKey = activeAmb;
  const prev = prevKey ? ambFor(prevKey) : null;

  if (prev && prevKey && prevKey !== key) {
    cancelFadeFor(prev);
    prev.pause();
    prev.currentTime = 0;
    prev.volume = VOL[prevKey];
  }

  next.volume = 0;
  next.currentTime = 0;
  try {
    await next.play();
  } catch {
    /* autoplay gate */
  }

  activeAmb = key;
  await fadeAudioTo(next, target, fadeMs);
}

function stopAmbImmediate(key: AmbKey) {
  const audio = ambFor(key);
  cancelFadeFor(audio);
  audio.pause();
  audio.currentTime = 0;
  audio.volume = VOL[key];
  if (activeAmb === key) activeAmb = null;
}

async function stopAmb(key: AmbKey, fadeMs = FADE_MS) {
  const audio = ambFor(key);
  if (audio.paused && audio.volume <= 0.001) return;
  await fadeAudioTo(audio, 0, fadeMs);
  audio.pause();
  audio.currentTime = 0;
  audio.volume = VOL[key];
  if (activeAmb === key) activeAmb = null;
}

function playOneShot(src: string, volume: number) {
  const clip = new Audio(src);
  clip.volume = volume;
  void clip.play().catch(() => {});
}

export function stopNightMarketAmbience() {
  stopAmbImmediate("nightMarket");
}

export function startIntroAmbience() {
  void playAmb("nightMarket", OPEN_AMB_FADE_MS);
}

export function crossfadeToToiletAmbience() {
  void playAmb("toilet", FADE_MS);
}

export function playPeeingSound() {
  playOneShot(SRC.peeing, VOL.peeing);
}

export async function playWashHandsSequence() {
  const wash = new Audio(SRC.washHand);
  wash.volume = VOL.washHand;
  try {
    await wash.play();
  } catch {
    return;
  }
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, WASH_MS);
  });
  wash.pause();
  await stopAmb("toilet", FADE_MS);
}

export async function leaveToiletAmbience() {
  await stopAmb("toilet", FADE_MS);
}

export function returnToNightMarketAmbience() {
  void playAmb("nightMarket", FADE_MS);
}

export function playGhostCry() {
  playOneShot(SRC.ghostCry, VOL.ghostCry);
}

export async function playHorrorFlash() {
  const horror = new Audio(SRC.horror);
  horror.volume = VOL.horror;
  try {
    await horror.play();
  } catch {
    return;
  }
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, HORROR_PLAY_MS);
  });
  await fadeAudioTo(horror, 0, HORROR_FADE_MS);
  horror.pause();
}

export function startCaveAmbience() {
  playOneShot(SRC.impact, VOL.impact);
  void playAmb("cave", FADE_MS);
}

export async function stopIntroSounds() {
  for (const key of ["nightMarket", "toilet", "cave"] as AmbKey[]) {
    const audio = ambFor(key);
    cancelFadeFor(audio);
  }

  if (caveAmb && !caveAmb.paused) {
    await stopAmb("cave", FADE_MS);
  }

  for (const key of ["nightMarket", "toilet"] as AmbKey[]) {
    const audio = ambFor(key);
    audio.pause();
    audio.currentTime = 0;
    audio.volume = VOL[key];
  }
  activeAmb = null;
}
