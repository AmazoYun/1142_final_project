import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  getDefaultShadowPlacements,
  normalizeShadowPlacements,
} from "@/lib/market/hubShadowLayout";

const layoutPath = path.join(process.cwd(), "data", "hub-shadow-placements.json");
const savedLayoutPath = path.join(
  process.cwd(),
  "data",
  "hub-shadow-placements.saved.json",
);

async function readPlacements(filePath: string) {
  const raw = JSON.parse(await fs.readFile(filePath, "utf8"));
  return normalizeShadowPlacements(raw);
}

export async function GET() {
  try {
    return NextResponse.json(await readPlacements(layoutPath));
  } catch {
    try {
      return NextResponse.json(await readPlacements(savedLayoutPath));
    } catch {
      return NextResponse.json(getDefaultShadowPlacements());
    }
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const placements = normalizeShadowPlacements(body);
    const serialized = `${JSON.stringify(placements, null, 2)}\n`;
    await fs.writeFile(layoutPath, serialized, "utf8");
    await fs.writeFile(savedLayoutPath, serialized, "utf8");
    return NextResponse.json({ ok: true, count: placements.length });
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
}
