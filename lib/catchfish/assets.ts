export const CATCHFISH_ASSET_PATHS = {
  background: "/goldfish/background.webp",
  backgroundBloody: "/goldfish/background_bloody.webp",
  net: "/goldfish/net.webp",
  netBroken: "/goldfish/net_broken.webp",
  fish: [
    "/goldfish/fish_1.webp",
    "/goldfish/fish_2.webp",
    "/goldfish/fish_3.webp",
    "/goldfish/fish_4.webp",
    "/goldfish/fish_5.webp",
    "/goldfish/fish_6.webp",
  ],
} as const;

export type LoadedCatchFishAssets = {
  background: HTMLImageElement;
  backgroundBloody: HTMLImageElement | null;
  net: HTMLImageElement;
  netBroken: HTMLImageElement | null;
  fish: HTMLImageElement[];
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function loadImageOptional(src: string): Promise<HTMLImageElement | null> {
  return loadImage(src).catch(() => null);
}

export function loadCatchFishAssets(): Promise<LoadedCatchFishAssets> {
  return Promise.all([
    loadImage(CATCHFISH_ASSET_PATHS.background),
    loadImageOptional(CATCHFISH_ASSET_PATHS.backgroundBloody),
    loadImage(CATCHFISH_ASSET_PATHS.net),
    loadImageOptional(CATCHFISH_ASSET_PATHS.netBroken),
    ...CATCHFISH_ASSET_PATHS.fish.map(loadImage),
  ]).then(([background, backgroundBloody, net, netBroken, ...fish]) => ({
    background,
    backgroundBloody,
    net,
    netBroken,
    fish,
  }));
}
