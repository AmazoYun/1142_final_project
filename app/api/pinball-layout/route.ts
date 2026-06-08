import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { migrateToUnifiedLayout } from "@/lib/pinball/unifiedLayout";

const layoutPath = path.join(process.cwd(), "data", "pinball-layout.json");
const savedLayoutPath = path.join(process.cwd(), "data", "pinball-layout.saved.json");

async function loadUnifiedLayout(filePath: string) {
  const raw = JSON.parse(await fs.readFile(filePath, "utf8"));
  return migrateToUnifiedLayout(raw);
}

export async function GET() {
  try {
    let layout = await loadUnifiedLayout(layoutPath);
    if (layout.obstacles.length === 0) {
      layout = await loadUnifiedLayout(savedLayoutPath);
    }
    return NextResponse.json(layout);
  } catch {
    try {
      const layout = await loadUnifiedLayout(savedLayoutPath);
      return NextResponse.json(layout);
    } catch {
      return NextResponse.json({ error: "layout_not_found" }, { status: 404 });
    }
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const layout = migrateToUnifiedLayout(body);
    const serialized = `${JSON.stringify(layout, null, 2)}\n`;
    await fs.writeFile(layoutPath, serialized, "utf8");
    await fs.writeFile(savedLayoutPath, serialized, "utf8");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
}
