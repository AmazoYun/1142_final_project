import { introSceneSrc } from "@/lib/narrative/introAssets";
import { HUB_BACKGROUND } from "@/lib/market/hubLayout";
import { normalizeRoutePath } from "@/lib/navigation/gameLoadingRoutes";

function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });
}

function preloadAudio(src: string): Promise<void> {
  return new Promise((resolve) => {
    const audio = new Audio(src);
    audio.preload = "auto";
    const done = () => resolve();
    audio.addEventListener("canplaythrough", done, { once: true });
    audio.addEventListener("error", done, { once: true });
    audio.load();
    window.setTimeout(done, 2500);
  });
}

async function preloadHubAssets(): Promise<void> {
  await Promise.allSettled([
    preloadAudio("/sfx/hub/BGM.mp3"),
    preloadImage("/character/character_standstill.webp"),
    preloadImage(HUB_BACKGROUND),
  ]);
}

export async function preloadForGameLoading(href: string): Promise<void> {
  const path = normalizeRoutePath(href);
  const toiletSrc = introSceneSrc("toilet");
  const base = toiletSrc ? [preloadImage(toiletSrc)] : [];

  if (path === "/market") {
    await Promise.allSettled([...base, preloadHubAssets()]);
    return;
  }

  await Promise.allSettled(base);
}
