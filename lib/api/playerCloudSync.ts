"use client";

import type { PlayerCloudPayload } from "@/lib/player/saveTypes";
import type { SaveRecord } from "@/lib/player/saveTypes";

export type CloudProfileResponse = {
  configured: boolean;
  saves: SaveRecord[];
  introDone: boolean;
  activeSaveId: string | null;
  syncedAt: number | null;
};

const pendingSync = new Map<string, ReturnType<typeof setTimeout>>();

export function mergeSaveRecords(local: SaveRecord[], remote: SaveRecord[]): SaveRecord[] {
  const map = new Map<string, SaveRecord>();
  for (const save of remote) map.set(save.saveId, save);
  for (const save of local) {
    const existing = map.get(save.saveId);
    if (!existing || save.updatedAt >= existing.updatedAt) {
      map.set(save.saveId, save);
    }
  }
  return [...map.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}

/** 從雲端拉取完整玩家資料（存檔 + 帳號設定） */
export async function fetchCloudProfile(nickname: string): Promise<CloudProfileResponse> {
  const trimmed = nickname.trim();
  if (!trimmed) {
    return { configured: false, saves: [], introDone: false, activeSaveId: null, syncedAt: null };
  }

  try {
    const res = await fetch(`/api/player-saves?nickname=${encodeURIComponent(trimmed)}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      return { configured: false, saves: [], introDone: false, activeSaveId: null, syncedAt: null };
    }
    const data = (await res.json()) as CloudProfileResponse;
    if (!data.configured || !Array.isArray(data.saves)) {
      return { configured: false, saves: [], introDone: false, activeSaveId: null, syncedAt: null };
    }
    return {
      configured: true,
      saves: data.saves,
      introDone: data.introDone === true,
      activeSaveId: data.activeSaveId ?? null,
      syncedAt: data.syncedAt ?? null,
    };
  } catch {
    return { configured: false, saves: [], introDone: false, activeSaveId: null, syncedAt: null };
  }
}

/** @deprecated 請改用 fetchCloudProfile */
export async function fetchCloudSaves(nickname: string): Promise<SaveRecord[]> {
  const profile = await fetchCloudProfile(nickname);
  return profile.saves;
}

export async function pushCloudProfile(
  nickname: string,
  profile: Pick<PlayerCloudPayload, "introDone" | "activeSaveId" | "saves">,
): Promise<boolean> {
  const trimmed = nickname.trim();
  if (!trimmed) return false;

  try {
    const res = await fetch("/api/player-saves", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: trimmed, ...profile }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function playerSavesForNickname(nickname: string, saves: SaveRecord[]) {
  const trimmed = nickname.trim();
  return saves.filter((save) => save.nickname === trimmed);
}

/** 將指定玩家資料上傳至雲端（防抖） */
export function scheduleCloudSync(
  nickname: string,
  profile: Pick<PlayerCloudPayload, "introDone" | "activeSaveId" | "saves">,
  delayMs = 600,
) {
  const trimmed = nickname.trim();
  if (!trimmed) return;

  const pending = pendingSync.get(trimmed);
  if (pending) clearTimeout(pending);

  pendingSync.set(
    trimmed,
    setTimeout(() => {
      pendingSync.delete(trimmed);
      void pushCloudProfile(trimmed, profile);
    }, delayMs),
  );
}

/** 立即上傳至雲端 */
export async function flushCloudSync(
  nickname: string,
  profile: Pick<PlayerCloudPayload, "introDone" | "activeSaveId" | "saves">,
) {
  const trimmed = nickname.trim();
  if (!trimmed) return false;

  const pending = pendingSync.get(trimmed);
  if (pending) {
    clearTimeout(pending);
    pendingSync.delete(trimmed);
  }

  return pushCloudProfile(trimmed, profile);
}

export function buildProfileForNickname(
  nickname: string,
  saves: SaveRecord[],
  introDone: boolean,
  activeSaveId: string | null,
): Pick<PlayerCloudPayload, "introDone" | "activeSaveId" | "saves"> {
  return {
    introDone,
    activeSaveId,
    saves: playerSavesForNickname(nickname, saves),
  };
}
