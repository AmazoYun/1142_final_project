import { HUB_BACKGROUND, HUB_LAYOUT } from "@/lib/market/hubLayout";
import { HUB_BACKGROUND_FRONT, HUB_SHADOW_IMAGES } from "@/lib/market/hubSceneLayers";

const HUB_CHARACTER_IMAGES = [
  "/character/character_standstill.webp",
  "/character/character_stepout.webp",
  "/character/character_stepout_2.webp",
] as const;

function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });
}

let hubScenePreloaded = false;
let hubScenePreloadPromise: Promise<void> | null = null;

export function isHubScenePreloaded(): boolean {
  return hubScenePreloaded;
}

/** Hub 場景所有圖片 URL（背景、攤位、前景、陰影、角色） */
export function collectHubImageUrls(): string[] {
  const urls = new Set<string>();
  urls.add(HUB_BACKGROUND);
  urls.add(HUB_BACKGROUND_FRONT);
  for (const image of HUB_SHADOW_IMAGES) urls.add(image);
  for (const stall of HUB_LAYOUT.stalls) urls.add(stall.image);
  for (const stall of HUB_LAYOUT.edgeStalls) urls.add(stall.image);
  for (const image of HUB_CHARACTER_IMAGES) urls.add(image);
  return [...urls];
}

export async function preloadHubSceneAssets(): Promise<void> {
  if (hubScenePreloaded) return;
  if (hubScenePreloadPromise) return hubScenePreloadPromise;

  hubScenePreloadPromise = Promise.all(collectHubImageUrls().map(preloadImage)).then(() => {
    hubScenePreloaded = true;
  });
  return hubScenePreloadPromise;
}
