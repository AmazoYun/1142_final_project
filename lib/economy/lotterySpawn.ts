import type { LotteryTicketType } from "@/store/tokenStore";

type SpawnTier = {
  tier: number;
  locationMin: number;
  locationMax: number;
  prob10: number;
  prob50: number;
  qty10Min: number;
  qty10Max: number;
  qty50Min: number;
  qty50Max: number;
};

const SPAWN_TIERS: SpawnTier[] = [
  { tier: 100, locationMin: 0, locationMax: 0, prob10: 0, prob50: 0, qty10Min: 0, qty10Max: 0, qty50Min: 0, qty50Max: 0 },
  { tier: 90, locationMin: 0, locationMax: 0, prob10: 0, prob50: 0, qty10Min: 0, qty10Max: 0, qty50Min: 0, qty50Max: 0 },
  { tier: 80, locationMin: 0, locationMax: 0, prob10: 0, prob50: 0, qty10Min: 0, qty10Max: 0, qty50Min: 0, qty50Max: 0 },
  { tier: 70, locationMin: 0, locationMax: 1, prob10: 1, prob50: 0, qty10Min: 1, qty10Max: 1, qty50Min: 0, qty50Max: 0 },
  { tier: 60, locationMin: 0, locationMax: 1, prob10: 1, prob50: 0, qty10Min: 1, qty10Max: 1, qty50Min: 0, qty50Max: 0 },
  { tier: 50, locationMin: 1, locationMax: 2, prob10: 0.8, prob50: 0.2, qty10Min: 1, qty10Max: 2, qty50Min: 1, qty50Max: 1 },
  { tier: 40, locationMin: 1, locationMax: 2, prob10: 0.8, prob50: 0.2, qty10Min: 1, qty10Max: 2, qty50Min: 1, qty50Max: 1 },
  { tier: 30, locationMin: 1, locationMax: 2, prob10: 0.8, prob50: 0.2, qty10Min: 1, qty10Max: 2, qty50Min: 1, qty50Max: 1 },
  { tier: 20, locationMin: 1, locationMax: 3, prob10: 0.7, prob50: 0.3, qty10Min: 1, qty10Max: 3, qty50Min: 1, qty50Max: 1 },
  { tier: 10, locationMin: 1, locationMax: 3, prob10: 0.7, prob50: 0.3, qty10Min: 1, qty10Max: 3, qty50Min: 1, qty50Max: 1 },
  { tier: 0, locationMin: 3, locationMax: 3, prob10: 0.5, prob50: 0.5, qty10Min: 3, qty10Max: 3, qty50Min: 2, qty50Max: 2 },
];

function tokenTier(tokens: number): number {
  if (tokens >= 100) return 100;
  if (tokens >= 90) return 90;
  if (tokens >= 80) return 80;
  if (tokens >= 70) return 70;
  if (tokens >= 60) return 60;
  if (tokens >= 50) return 50;
  if (tokens >= 40) return 40;
  if (tokens >= 30) return 30;
  if (tokens >= 20) return 20;
  if (tokens >= 10) return 10;
  return 0;
}

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pickType(tier: SpawnTier): LotteryTicketType {
  if (tier.prob10 <= 0 && tier.prob50 <= 0) return "ticket10";
  if (tier.prob50 <= 0) return "ticket10";
  if (tier.prob10 <= 0) return "ticket50";
  return Math.random() < tier.prob10 / (tier.prob10 + tier.prob50) ? "ticket10" : "ticket50";
}

export type GeneratedRoadSpawn = {
  ticketType: LotteryTicketType;
  quantity: number;
};

export function generateRoadLotteryDrops(tokens: number): GeneratedRoadSpawn[] {
  const tierValue = tokenTier(tokens);
  const tier = SPAWN_TIERS.find((t) => t.tier === tierValue)!;
  const locationCount = randInt(tier.locationMin, tier.locationMax);
  if (locationCount <= 0) return [];

  const drops: GeneratedRoadSpawn[] = [];
  for (let i = 0; i < locationCount; i += 1) {
    const ticketType = pickType(tier);
    const quantity =
      ticketType === "ticket10"
        ? randInt(tier.qty10Min, tier.qty10Max)
        : randInt(tier.qty50Min, tier.qty50Max);
    if (quantity > 0) {
      drops.push({ ticketType, quantity });
    }
  }
  return drops;
}
