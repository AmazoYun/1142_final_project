#!/usr/bin/env python3
"""從夜市長背景偵測地面桌椅，輸出獨立圖層與去物件背景。"""

from __future__ import annotations

import json
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BG_PATH = ROOT / "public" / "final_pic" / "background_long.png"
OUT_DIR = ROOT / "public" / "final_pic" / "hub_layers"
MANIFEST_PATH = ROOT / "data" / "hub-ground-props.json"

PAD = 8
Y0_RATIO = 0.52
Y1_RATIO = 0.84
MIN_AREA = 80
MAX_AREA = 12000
MIN_W, MAX_W = 10, 180
MIN_H, MAX_H = 10, 120
FLOOR_MIN = 0.54
FLOOR_MAX = 0.84
WORLD_MIN = 0.07
WORLD_MAX = 0.93


def is_red_stool(r: int, g: int, b: int) -> bool:
    return r > g + 4 and r > b + 4 and 36 <= r <= 115 and g < 82 and b < 82


def is_dark_table(r: int, g: int, b: int) -> bool:
    avg = (r + g + b) / 3
    spread = max(r, g, b) - min(r, g, b)
    return avg < 28 and spread < 18 and r < 42


def red_ratio(comp_pixels: list[tuple[int, int, int]]) -> float:
    if not comp_pixels:
        return 0.0
    red = sum(1 for r, g, b in comp_pixels if is_red_stool(r, g, b))
    return red / len(comp_pixels)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)

    im = Image.open(BG_PATH).convert("RGBA")
    w, h = im.size
    px = im.load()
    y0, y1 = int(h * Y0_RATIO), int(h * Y1_RATIO)

    mask = [[False] * w for _ in range(y1 - y0)]
    for y in range(y0, y1):
        row = y - y0
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 10:
                continue
            if is_red_stool(r, g, b):
                mask[row][x] = True

    visited = [[False] * w for _ in range(y1 - y0)]
    components: list[dict] = []

    for sy in range(y1 - y0):
        for sx in range(w):
            if not mask[sy][sx] or visited[sy][sx]:
                continue
            q: deque[tuple[int, int]] = deque([(sx, sy)])
            visited[sy][sx] = True
            coords: list[tuple[int, int]] = []
            colors: list[tuple[int, int, int]] = []
            while q:
                x, cy = q.popleft()
                y = cy + y0
                coords.append((x, y))
                colors.append(px[x, y][:3])
                for nx, ny in ((x + 1, cy), (x - 1, cy), (x, cy + 1), (x, cy - 1)):
                    if (
                        0 <= nx < w
                        and 0 <= ny < y1 - y0
                        and mask[ny][nx]
                        and not visited[ny][nx]
                    ):
                        visited[ny][nx] = True
                        q.append((nx, ny))

            area = len(coords)
            if area < MIN_AREA or area > MAX_AREA:
                continue

            xs = [c[0] for c in coords]
            ys = [c[1] for c in coords]
            bw = max(xs) - min(xs) + 1
            bh = max(ys) - min(ys) + 1
            if bw < MIN_W or bh < MIN_H or bw > MAX_W or bh > MAX_H:
                continue

            cx = sum(xs) / area
            floor_ratio = max(ys) / h
            world_ratio = cx / w
            if not (FLOOR_MIN <= floor_ratio <= FLOOR_MAX):
                continue
            if not (WORLD_MIN <= world_ratio <= WORLD_MAX):
                continue

            rr = red_ratio(colors)
            density = area / (bw * bh)
            if rr < 0.15:
                continue
            if bw > 120 or bh > 100:
                continue

            components.append(
                {
                    "area": area,
                    "x0": max(0, min(xs) - PAD),
                    "y0": max(0, min(ys) - PAD),
                    "x1": min(w, max(xs) + PAD + 1),
                    "y1": min(h, max(ys) + PAD + 1),
                    "cx": cx,
                    "cy": sum(ys) / area,
                    "redRatio": rr,
                }
            )

    components.sort(key=lambda c: c["cx"])
    merged: list[dict] = []
    for comp in components:
        if not merged:
            merged.append(comp)
            continue
        prev = merged[-1]
        if abs(comp["cx"] - prev["cx"]) < 55 and abs(comp["cy"] - prev["cy"]) < 36:
            prev["x0"] = min(prev["x0"], comp["x0"])
            prev["y0"] = min(prev["y0"], comp["y0"])
            prev["x1"] = max(prev["x1"], comp["x1"])
            prev["y1"] = max(prev["y1"], comp["y1"])
            prev["area"] += comp["area"]
            prev["cx"] = (prev["cx"] + comp["cx"]) / 2
            prev["cy"] = (prev["cy"] + comp["cy"]) / 2
            prev["redRatio"] = max(prev["redRatio"], comp["redRatio"])
        else:
            merged.append(comp)

    deduped: list[dict] = []
    for comp in merged:
        if deduped and (comp["cx"] / w) - (deduped[-1]["cx"] / w) < 0.024:
            if comp["area"] > deduped[-1]["area"]:
                deduped[-1] = comp
            continue
        deduped.append(comp)
    merged = deduped

    clean = im.copy()
    cp = clean.load()
    manifest: list[dict] = []

    for i, comp in enumerate(merged):
        x0, y0b, x1, y1b = comp["x0"], comp["y0"], comp["x1"], comp["y1"]
        crop = im.crop((x0, y0b, x1, y1b))
        name = f"ground_prop_{i:02d}.png"
        crop.save(OUT_DIR / name)

        samples: list[tuple[int, int, int]] = []
        for y in range(max(0, y0b - 16), min(h, y1b + 16)):
            for x in range(max(0, x0 - 16), min(w, x1 + 16)):
                if x0 <= x < x1 and y0b <= y < y1b:
                    continue
                r, g, b = px[x, y][:3]
                if not is_red_stool(r, g, b) and not is_dark_table(r, g, b):
                    samples.append((r, g, b))
        if samples:
            mr = sum(s[0] for s in samples) // len(samples)
            mg = sum(s[1] for s in samples) // len(samples)
            mb = sum(s[2] for s in samples) // len(samples)
        else:
            mr, mg, mb = 18, 19, 20

        for y in range(y0b, y1b):
            for x in range(x0, x1):
                r, g, b, _a = px[x, y]
                if is_red_stool(r, g, b) or is_dark_table(r, g, b):
                    cp[x, y] = (mr, mg, mb, 255)

        manifest.append(
            {
                "id": f"prop-{i}",
                "image": f"/final_pic/hub_layers/{name}",
                "worldRatio": comp["cx"] / w,
                "floorRatio": y1b / h,
                "nativeWidth": x1 - x0,
                "nativeHeight": y1b - y0b,
            }
        )

    clean.save(OUT_DIR / "background_long_clean.png", optimize=True)
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"props: {len(manifest)}")
    print(f"clean bg: {OUT_DIR / 'background_long_clean.png'}")


if __name__ == "__main__":
    main()
