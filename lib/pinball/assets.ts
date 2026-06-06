import type { ObstacleKind } from "@/lib/pinball/types";
import { buildImageBody, buildTriangleBody, type ImageBody } from "@/lib/pinball/imageBody";

export const PINBALL_ASSET_PATHS = {
  background: "/pinball/background.png",
  channelWood: "/pinball/channel_woodstick.png",
  obstacleRound: "/pinball/obstacle_round.png",
  obstacleRect: "/pinball/obstacle_rectangle.png",
  obstacleLine: "/pinball/obstacle_line.png",
  obstacleTriangle: "/pinball/obstacle_triangle.png",
  pinballs: [
    "/pinball/pinball_blue.png",
    "/pinball/pinball_green.png",
    "/pinball/pinball_orange.png",
  ],
} as const;

export type PinballColorIndex = 0 | 1 | 2;

export type LoadedPinballAssets = {
  background: HTMLImageElement;
  channelWood: HTMLImageElement;
  obstacleRound: HTMLImageElement;
  obstacleRect: HTMLImageElement;
  obstacleLine: HTMLImageElement;
  obstacleTriangle: HTMLImageElement;
  pinballs: HTMLImageElement[];
  bodies: Record<ObstacleKind, ImageBody>;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function loadPinballAssets(): Promise<LoadedPinballAssets> {
  return Promise.all([
    loadImage(PINBALL_ASSET_PATHS.background),
    loadImage(PINBALL_ASSET_PATHS.channelWood),
    loadImage(PINBALL_ASSET_PATHS.obstacleRound),
    loadImage(PINBALL_ASSET_PATHS.obstacleRect),
    loadImage(PINBALL_ASSET_PATHS.obstacleLine),
    loadImage(PINBALL_ASSET_PATHS.obstacleTriangle),
    ...PINBALL_ASSET_PATHS.pinballs.map(loadImage),
  ]).then(
    ([
      background,
      channelWood,
      obstacleRound,
      obstacleRect,
      obstacleLine,
      obstacleTriangle,
      ...pinballs
    ]) => {
      const bodies: Record<ObstacleKind, ImageBody> = {
        round: buildImageBody(obstacleRound),
        line: buildImageBody(obstacleLine),
        triangle: buildTriangleBody(obstacleTriangle.naturalWidth, obstacleTriangle.naturalHeight),
        rect: buildImageBody(obstacleRect),
      };
      return {
        background,
        channelWood,
        obstacleRound,
        obstacleRect,
        obstacleLine,
        obstacleTriangle,
        pinballs,
        bodies,
      };
    },
  );
}

export function randomPinballColor(): PinballColorIndex {
  return Math.floor(Math.random() * PINBALL_ASSET_PATHS.pinballs.length) as PinballColorIndex;
}
