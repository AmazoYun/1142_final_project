/** 背景圖原生尺寸（與 public/goldfish/background.webp 一致） */
export const BG_NATIVE_W = 2972;
export const BG_NATIVE_H = 1440;

/** 右側魚桶中心（背景設計座標，對應右側白瓷碗區） */
export const BUCKET_DESIGN = { x: 2410, y: 820 };

export function backgroundCoverTransform(cw: number, ch: number) {
  const scale = Math.max(cw / BG_NATIVE_W, ch / BG_NATIVE_H);
  const dw = BG_NATIVE_W * scale;
  const dh = BG_NATIVE_H * scale;
  const dx = (cw - dw) / 2;
  const dy = (ch - dh) / 2;
  return { scale, dx, dy };
}

export function designToCanvas(designX: number, designY: number, cw: number, ch: number) {
  const { scale, dx, dy } = backgroundCoverTransform(cw, ch);
  return { x: dx + designX * scale, y: dy + designY * scale };
}

export function bucketTargetPosition(cw: number, ch: number) {
  return designToCanvas(BUCKET_DESIGN.x, BUCKET_DESIGN.y, cw, ch);
}
