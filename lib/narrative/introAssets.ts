import type { VisualKind } from "@/lib/narrative/types";

/** 前導圖更新後請遞增，避免瀏覽器／Next 圖片快取 */
const INTRO_ASSET_VERSION = "2";

export const INTRO_SCENE_IMAGES: Partial<Record<VisualKind, string>> = {
  "market-friends": "/narrative/pre_plot/night_market_friend.webp",
  toilet: "/narrative/pre_plot/peeing.webp",
  "night-market": "/narrative/pre_plot/night_market.webp",
  "market-weird": "/narrative/pre_plot/night_market_weird.webp",
  "glowing-stall": "/narrative/pre_plot/night_market_glowing.webp",
};

const INTRO_TRANSITION_FLASH_BASE = "/narrative/pre_plot/night_market_transition.webp";

function withCacheBust(path: string): string {
  return `${path}?v=${INTRO_ASSET_VERSION}`;
}

export const INTRO_TRANSITION_FLASH = withCacheBust(INTRO_TRANSITION_FLASH_BASE);

export function introSceneSrc(visual: VisualKind): string | null {
  const base = INTRO_SCENE_IMAGES[visual];
  return base ? withCacheBust(base) : null;
}
