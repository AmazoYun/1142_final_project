export const BALLOON_COLORS = [
  "red",
  "yellow",
  "blue",
  "purple",
  "green",
  "orange",
  "pink",
] as const;

export type BalloonColor = (typeof BALLOON_COLORS)[number];

export const BALLOON_COLOR_HEX: Record<BalloonColor, string> = {
  red: "#ef4444",
  yellow: "#facc15",
  blue: "#3b82f6",
  purple: "#a855f7",
  green: "#22c55e",
  orange: "#f97316",
  pink: "#ec4899",
};

export type BalloonAssets = {
  background: HTMLImageElement;
  full: Record<BalloonColor, HTMLImageElement>;
  broken: Record<BalloonColor, HTMLImageElement>;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function loadBalloonAssets(): Promise<BalloonAssets> {
  const full = {} as Record<BalloonColor, HTMLImageElement>;
  const broken = {} as Record<BalloonColor, HTMLImageElement>;

  return loadImage("/balloonshoot/background.webp").then(async (background) => {
    await Promise.all(
      BALLOON_COLORS.map(async (color) => {
        full[color] = await loadImage(`/balloonshoot/balloon_${color}_full.webp`);
        broken[color] = await loadImage(`/balloonshoot/balloon_${color}_broken.webp`);
      }),
    );
    return { background, full, broken };
  });
}
