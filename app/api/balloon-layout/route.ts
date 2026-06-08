import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { migrateBalloonLayout } from "@/lib/balloonshoot/layoutData";

const layoutPath = path.join(process.cwd(), "data", "balloon-layout.json");
const savedLayoutPath = path.join(process.cwd(), "data", "balloon-layout.saved.json");

async function loadLayout(filePath: string) {
  const raw = JSON.parse(await fs.readFile(filePath, "utf8"));
  return migrateBalloonLayout(raw);
}

export async function GET() {
  try {
    return NextResponse.json(await loadLayout(layoutPath));
  } catch {
    try {
      return NextResponse.json(await loadLayout(savedLayoutPath));
    } catch {
      return NextResponse.json({ error: "layout_not_found" }, { status: 404 });
    }
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const layout = migrateBalloonLayout(body);
    const serialized = `${JSON.stringify(layout, null, 2)}\n`;
    await fs.writeFile(layoutPath, serialized, "utf8");
    await fs.writeFile(savedLayoutPath, serialized, "utf8");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
}
