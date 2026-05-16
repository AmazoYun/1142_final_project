import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

const layoutPath = path.join(process.cwd(), "data", "pinball-layout.json");

export async function GET() {
  try {
    const raw = await fs.readFile(layoutPath, "utf8");
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: "layout_not_found" }, { status: 404 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await fs.writeFile(layoutPath, `${JSON.stringify(body, null, 2)}\n`, "utf8");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
}
