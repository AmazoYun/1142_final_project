"use client";

let blockCount = 0;

export function pushStoryInputBlock(): void {
  blockCount += 1;
}

export function popStoryInputBlock(): void {
  blockCount = Math.max(0, blockCount - 1);
}

export function isStoryInputBlocked(): boolean {
  return blockCount > 0;
}
