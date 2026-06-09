import type { EndingId } from "./types";

const ENDING_FOLDERS: Record<EndingId, string> = {
  basic: "first_ending",
  loop: "second_ending",
  stuck: "third_ending",
  true: "fourth_ending",
};

/** 各結局分幕圖片檔名（依劇情順序） */
const ENDING_SLIDE_FILES: Record<EndingId, string[]> = {
  basic: ["第一幕", "第二幕", "第三幕", "第四幕", "第五幕"],
  loop: ["第一幕", "第二幕", "第三幕", "第四幕", "第五幕", "第六幕"],
  stuck: ["第一幕", "第二幕", "第三幕", "第四幕", "第五幕", "第六幕", "第七慕"],
  true: ["第一幕", "第二幕", "第三幕", "第四幕", "第五幕", "第六幕", "第七慕", "第八幕", "第九慕"],
};

export function endingSlideSrc(endingId: EndingId, slide: number): string | null {
  const files = ENDING_SLIDE_FILES[endingId];
  const folder = ENDING_FOLDERS[endingId];
  const name = files[slide];
  if (!name || !folder) return null;
  return `/narrative/endings/${folder}/${name}.webp`;
}

export function endingSlideCount(endingId: EndingId): number {
  return ENDING_SLIDE_FILES[endingId].length;
}
