#!/usr/bin/env python3
"""產生夜市前景模糊黑攤位配置（依桌椅密度聚類）。"""

from __future__ import annotations

import json
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "hub-foreground-stalls.json"
PROPS_PATH = ROOT / "data" / "hub-ground-props.json"

STALL_IMAGES = [
    "/final_pic/random/stinky_tofu.png",
    "/final_pic/random/ice_cream.png",
    "/final_pic/random/foods.png",
    "/final_pic/random/sausage.png",
    "/final_pic/random/sweet_potato_ball.png",
    "/final_pic/random/big_sausage_and_riceroll.png",
]

SEED = 1142
CLUSTER_GAP = 0.09


def load_prop_ratios() -> list[float]:
    if not PROPS_PATH.exists():
        return []
    props = json.loads(PROPS_PATH.read_text(encoding="utf-8"))
    return [float(p["worldRatio"]) for p in props]


def cluster_centers(ratios: list[float]) -> list[tuple[float, int]]:
    if not ratios:
        return [(0.2, 1), (0.45, 1), (0.7, 1)]
    sorted_ratios = sorted(ratios)
    clusters: list[list[float]] = [[sorted_ratios[0]]]
    for ratio in sorted_ratios[1:]:
        if ratio - clusters[-1][-1] <= CLUSTER_GAP:
            clusters[-1].append(ratio)
        else:
            clusters.append([ratio])

    centers: list[tuple[float, int]] = []
    for group in clusters:
        center = sum(group) / len(group)
        weight = min(5, max(1, len(group)))
        centers.append((center, weight))
    return centers


def sparse_anchors(centers: list[tuple[float, int]], rng: random.Random) -> list[float]:
    anchors: list[float] = []
    cursor = 0.06
    while cursor < 0.94:
        near_cluster = any(abs(cursor - c) < 0.07 for c, _ in centers)
        if not near_cluster:
            anchors.append(cursor)
        cursor += rng.uniform(0.14, 0.22)
    return anchors


def main() -> None:
    rng = random.Random(SEED)
    centers = cluster_centers(load_prop_ratios())
    stalls: list[dict] = []
    idx = 0

    for center, weight in centers:
        count = max(2, weight * 2) + rng.randint(0, 2)
        for _ in range(count):
            world_ratio = center + rng.uniform(-0.022, 0.022)
            world_ratio = max(0.05, min(0.95, world_ratio))
            stalls.append(
                {
                    "id": f"fg-{idx}",
                    "image": rng.choice(STALL_IMAGES),
                    "worldRatio": world_ratio,
                    "floorRatio": rng.uniform(0.97, 1.06),
                    "scale": rng.uniform(1.35, 1.75),
                    "blurPx": rng.randint(3, 6),
                    "opacity": rng.uniform(0.9, 1.0),
                }
            )
            idx += 1

    for anchor in sparse_anchors(centers, rng):
        if rng.random() < 0.72:
            continue
        stalls.append(
            {
                "id": f"fg-{idx}",
                "image": rng.choice(STALL_IMAGES),
                "worldRatio": anchor + rng.uniform(-0.02, 0.02),
                "floorRatio": rng.uniform(0.96, 1.04),
                "scale": rng.uniform(1.2, 1.55),
                "blurPx": rng.randint(4, 7),
                "opacity": rng.uniform(0.88, 0.98),
            }
        )
        idx += 1

    stalls.sort(key=lambda s: s["worldRatio"])
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(stalls, indent=2), encoding="utf-8")
    print(f"wrote {len(stalls)} foreground stalls -> {OUT}")


if __name__ == "__main__":
    main()
