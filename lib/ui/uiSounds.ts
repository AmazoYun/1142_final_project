"use client";

const BUTTON_SRC = "/sfx/hub/button.mp3";
const ENTER_SRC = "/sfx/hub/enter.mp3";
const UI_BUTTON_VOLUME = 0.18;
const UI_ENTER_VOLUME = 0.2;

let buttonTemplate: HTMLAudioElement | null = null;
let enterTemplate: HTMLAudioElement | null = null;

function makeTemplate(src: string, volume: number) {
  const audio = new Audio(src);
  audio.preload = "auto";
  audio.volume = volume;
  return audio;
}

export function preloadUiSounds() {
  if (typeof window === "undefined") return;
  if (!buttonTemplate) {
    buttonTemplate = makeTemplate(BUTTON_SRC, UI_BUTTON_VOLUME);
    buttonTemplate.load();
  }
  if (!enterTemplate) {
    enterTemplate = makeTemplate(ENTER_SRC, UI_ENTER_VOLUME);
    enterTemplate.load();
  }
}

function playTemplate(template: HTMLAudioElement | null) {
  if (!template) return;
  const clip = template.cloneNode() as HTMLAudioElement;
  clip.volume = template.volume;
  void clip.play().catch(() => {});
}

export function playUiButtonSound() {
  if (!buttonTemplate) preloadUiSounds();
  playTemplate(buttonTemplate);
}

export function playUiEnterSound() {
  if (!enterTemplate) preloadUiSounds();
  playTemplate(enterTemplate);
}

export function resolveUiSoundKind(target: EventTarget | null): "enter" | "button" | null {
  if (!(target instanceof Element)) return null;
  const el = target.closest(
    "button, a.game-btn-primary, a.game-btn-ghost, .game-btn-primary, .game-btn-ghost, .stall-enter-btn",
  );
  if (!el) return null;
  if (el instanceof HTMLButtonElement && el.disabled) return null;
  if (el.getAttribute("aria-disabled") === "true") return null;

  const sound =
    el.getAttribute("data-ui-sound") ??
    el.closest("[data-ui-sound]")?.getAttribute("data-ui-sound");
  if (sound === "none") return null;
  if (sound === "enter") return "enter";
  return "button";
}
