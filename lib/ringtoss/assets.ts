export const RINGTOSS_ASSET_PATHS = {
  background: "/ringtoss/background.webp",
  bottle: "/ringtoss/bottles.webp",
  ring: "/ringtoss/rings.webp",
} as const;

export type LoadedRingTossAssets = {
  background: HTMLImageElement;
  bottle: HTMLImageElement;
  ring: HTMLImageElement;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function loadRingTossAssets(): Promise<LoadedRingTossAssets> {
  return Promise.all([
    loadImage(RINGTOSS_ASSET_PATHS.background),
    loadImage(RINGTOSS_ASSET_PATHS.bottle),
    loadImage(RINGTOSS_ASSET_PATHS.ring),
  ]).then(([background, bottle, ring]) => ({ background, bottle, ring }));
}
