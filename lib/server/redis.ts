type RedisCommand = (string | number)[];

let configured: boolean | undefined;

function getCredentials() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ""), token };
}

/** 是否已設定 Upstash Redis 環境變數 */
export function isRedisConfigured() {
  if (configured !== undefined) return configured;
  configured = getCredentials() !== null;
  return configured;
}

async function exec(command: RedisCommand): Promise<unknown> {
  const creds = getCredentials();
  if (!creds) throw new Error("redis_not_configured");

  const res = await fetch(creds.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${creds.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`redis_request_failed:${res.status}`);
  }

  const data = (await res.json()) as { result?: unknown; error?: string };
  if (data.error) throw new Error(data.error);
  return data.result ?? null;
}

export const redis = {
  async get<T>(key: string): Promise<T | null> {
    const result = await exec(["GET", key]);
    if (result == null) return null;
    if (typeof result !== "string") return result as T;
    try {
      return JSON.parse(result) as T;
    } catch {
      return result as T;
    }
  },

  async set(key: string, value: unknown): Promise<void> {
    const payload = typeof value === "string" ? value : JSON.stringify(value);
    await exec(["SET", key, payload]);
  },

  async sadd(key: string, member: string): Promise<void> {
    await exec(["SADD", key, member]);
  },

  async smembers<T = string>(key: string): Promise<T[]> {
    const result = await exec(["SMEMBERS", key]);
    return Array.isArray(result) ? (result as T[]) : [];
  },
};
