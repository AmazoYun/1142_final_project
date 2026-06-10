/** `public/balloonshoot/background.webp` 原始尺寸 */
export const BALLOON_BACKGROUND_SIZE = { width: 2976, height: 1430 } as const;

/** 進階按鈕在背景圖上的槽位（與 `button_unpressed.webp` 同尺寸） */
export const BALLOON_ADVANCED_BUTTON_IMAGE_RECT = {
  x: 2068,
  y: 1172,
  width: 320,
  height: 126,
} as const;

export type BalloonBoardRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/** 將背景圖上的槽位換算為 960×480 棋盤座標（與 drawCoverBackground 一致） */
export function balloonAdvancedButtonBoardRect(
  boardWidth = 960,
  boardHeight = 480,
): BalloonBoardRect {
  const { width: iw, height: ih } = BALLOON_BACKGROUND_SIZE;
  const { x, y, width: bw, height: bh } = BALLOON_ADVANCED_BUTTON_IMAGE_RECT;

  const scale = Math.max(boardWidth / iw, boardHeight / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const offsetX = (boardWidth - dw) / 2;
  const offsetY = (boardHeight - dh) / 2;

  return {
    left: x * scale + offsetX,
    top: y * scale + offsetY,
    width: bw * scale,
    height: bh * scale,
  };
}

/** 轉成覆蓋在 canvas 上的百分比定位 */
export function balloonAdvancedButtonStyle(
  boardWidth = 960,
  boardHeight = 480,
): { left: string; top: string; width: string; height: string } {
  const rect = balloonAdvancedButtonBoardRect(boardWidth, boardHeight);
  return {
    left: `${(rect.left / boardWidth) * 100}%`,
    top: `${(rect.top / boardHeight) * 100}%`,
    width: `${(rect.width / boardWidth) * 100}%`,
    height: `${(rect.height / boardHeight) * 100}%`,
  };
}

/** 手機版：按鈕底緣對齊背景圖底（cover 邏輯），並再下移此距（960×480 棋盤 px） */
const MOBILE_ADVANCED_BUTTON_EXTRA_DOWN_BOARD_PX = 100;

/** 手機版：以背景圖底緣為基準（與 drawCoverBackground / object-fit: cover 一致） */
export function balloonAdvancedButtonMobileStyle(
  boardWidth = 960,
  boardHeight = 480,
): { left: string; top: string; bottom: string; width: string; height: string } {
  const rect = balloonAdvancedButtonBoardRect(boardWidth, boardHeight);
  const insetFromImageBottom = boardHeight - rect.top - rect.height;
  const bottomInset = Math.max(
    0,
    insetFromImageBottom - MOBILE_ADVANCED_BUTTON_EXTRA_DOWN_BOARD_PX,
  );
  return {
    left: `${(rect.left / boardWidth) * 100}%`,
    top: "auto",
    bottom: `${(bottomInset / boardHeight) * 100}%`,
    width: `${(rect.width / boardWidth) * 100}%`,
    height: `${(rect.height / boardHeight) * 100}%`,
  };
}
