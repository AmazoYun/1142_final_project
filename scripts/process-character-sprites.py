#!/usr/bin/env python3
"""去背（僅白底 + 棋盤格灰底，邊緣連通）→ 裁切 → 縮放 → 統一畫布對齊 → 壓縮輸出。"""

from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT / "public" / "character" / "source"
OUT_DIR = ROOT / "public" / "character"
BASE_TARGET_H = 176
SIZE_SCALE = 5
TARGET_H = BASE_TARGET_H * SIZE_SCALE

CHECKER_SWATCHES = [
    (65, 60, 57),
    (66, 61, 58),
    (64, 59, 56),
    (63, 58, 55),
    (103, 95, 93),
    (104, 96, 94),
    (102, 94, 92),
    (105, 97, 95),
    (70, 70, 70),
    (68, 68, 68),
    (102, 102, 100),
    (70, 72, 71),
]

PAIRS = [
    ("character_standstill.png", "standstill"),
    ("character_stepout.png", "stepout"),
    ("character_stepout_2.png", "stepout_2"),
]


def is_white(r: int, g: int, b: int, threshold: int = 245) -> bool:
    return r >= threshold and g >= threshold and b >= threshold


def is_checker_gray(
    r: int,
    g: int,
    b: int,
    swatches: list[tuple[int, int, int]] | None = None,
    tol: int = 12,
) -> bool:
    for sr, sg, sb in swatches or CHECKER_SWATCHES:
        if abs(r - sr) <= tol and abs(g - sg) <= tol and abs(b - sb) <= tol:
            return True
    return False


def is_removable_bg(r: int, g: int, b: int) -> bool:
    """只移除白底與棋盤格灰底，不泛洪到角色內部。"""
    if is_white(r, g, b):
        return True
    return is_checker_gray(r, g, b)


def is_skin_like(r: int, g: int, b: int) -> bool:
    """角色高光／膚色（與棋盤格同色調，需靠種子還原）。"""
    if is_checker_gray(r, g, b):
        return False
    spread = max(r, g, b) - min(r, g, b)
    avg = (r + g + b) / 3
    return spread < 18 and 52 <= avg <= 110


def strip_rim_checker(im: Image.Image, thickness: int = 3) -> Image.Image:
    """僅清除畫布最外圈棋盤格殘點，不泛洪到角色。"""
    w, h = im.size
    px = im.load()
    out = im.copy()
    ou = out.load()
    for ring in range(thickness):
        for x in range(w):
            for y in (ring, h - 1 - ring):
                r, g, b, a = px[x, y]
                if a >= 128 and is_removable_bg(r, g, b):
                    ou[x, y] = (0, 0, 0, 0)
        for y in range(h):
            for x in (ring, w - 1 - ring):
                r, g, b, a = px[x, y]
                if a >= 128 and is_removable_bg(r, g, b):
                    ou[x, y] = (0, 0, 0, 0)
    return out


def remove_background(im: Image.Image) -> Image.Image:
    """邊緣泛洪去背，再從線稿種子還原膚色／高光。"""
    w, h = im.size
    px = im.load()
    remove: set[tuple[int, int]] = set()
    q: deque[tuple[int, int]] = deque()

    for x in range(w):
        for y in (0, h - 1):
            if is_removable_bg(*px[x, y][:3]):
                remove.add((x, y))
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if (x, y) not in remove and is_removable_bg(*px[x, y][:3]):
                remove.add((x, y))
                q.append((x, y))

    while q:
        x, y = q.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in remove:
                if is_removable_bg(*px[nx, ny][:3]):
                    remove.add((nx, ny))
                    q.append((nx, ny))

    keep: set[tuple[int, int]] = set()
    depth: dict[tuple[int, int], int] = {}
    max_depth = max(16, int(min(w, h) * 0.055))
    for y in range(h):
        for x in range(w):
            if px[x, y][3] >= 128 and (x, y) not in remove:
                keep.add((x, y))
                depth[(x, y)] = 0
                q.append((x, y))

    while q:
        x, y = q.popleft()
        d = depth[(x, y)]
        if d >= max_depth:
            continue
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if (nx, ny) in remove and (nx, ny) not in keep:
                r, g, b = px[nx, ny][:3]
                if is_skin_like(r, g, b):
                    keep.add((nx, ny))
                    depth[(nx, ny)] = d + 1
                    q.append((nx, ny))

    out = Image.new("RGBA", (w, h))
    op = out.load()
    for y in range(h):
        for x in range(w):
            if (x, y) in keep:
                r, g, b, a = px[x, y]
                op[x, y] = (r, g, b, 255)
            else:
                op[x, y] = (0, 0, 0, 0)
    return out


def remove_corner_marks(
    im: Image.Image,
    *,
    region: float = 0.72,
    max_area: int = 6000,
) -> Image.Image:
    """移除右下角小圖標／浮水印（不影響主體）。"""
    w, h = im.size
    px = im.load()
    visited: set[tuple[int, int]] = set()
    to_clear: set[tuple[int, int]] = set()
    x_min = int(w * region)
    y_min = int(h * region)

    for sy in range(h):
        for sx in range(w):
            if px[sx, sy][3] < 128 or (sx, sy) in visited:
                continue
            q: deque[tuple[int, int]] = deque([(sx, sy)])
            comp: list[tuple[int, int]] = []
            visited.add((sx, sy))
            while q:
                x, y = q.popleft()
                comp.append((x, y))
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if (
                        0 <= nx < w
                        and 0 <= ny < h
                        and (nx, ny) not in visited
                        and px[nx, ny][3] >= 128
                    ):
                        visited.add((nx, ny))
                        q.append((nx, ny))

            xs = [p[0] for p in comp]
            ys = [p[1] for p in comp]
            if (
                len(comp) <= max_area
                and min(xs) >= x_min
                and min(ys) >= y_min
            ):
                to_clear.update(comp)

    if not to_clear:
        return im

    out = im.copy()
    op = out.load()
    for x, y in to_clear:
        op[x, y] = (0, 0, 0, 0)
    return out


def remove_small_specks(im: Image.Image, min_area: int = 320) -> Image.Image:
    """移除與主體分離的小雜點／殘塊。"""
    w, h = im.size
    px = im.load()
    visited: set[tuple[int, int]] = set()
    components: list[list[tuple[int, int]]] = []

    for sy in range(h):
        for sx in range(w):
            if px[sx, sy][3] < 64 or (sx, sy) in visited:
                continue
            q: deque[tuple[int, int]] = deque([(sx, sy)])
            comp: list[tuple[int, int]] = []
            visited.add((sx, sy))
            while q:
                x, y = q.popleft()
                comp.append((x, y))
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if (
                        0 <= nx < w
                        and 0 <= ny < h
                        and (nx, ny) not in visited
                        and px[nx, ny][3] >= 64
                    ):
                        visited.add((nx, ny))
                        q.append((nx, ny))
            components.append(comp)

    if len(components) <= 1:
        return im

    components.sort(key=len, reverse=True)
    clear: set[tuple[int, int]] = set()
    for i, comp in enumerate(components):
        if i == 0:
            continue
        if len(comp) < min_area:
            clear.update(comp)

    if not clear:
        return im

    out = im.copy()
    op = out.load()
    for x, y in clear:
        op[x, y] = (0, 0, 0, 0)
    return out


def defringe_alpha(im: Image.Image, alpha_cutoff: int = 36) -> Image.Image:
    """清除半透明邊緣與低 alpha 殘點。"""
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a <= alpha_cutoff:
                px[x, y] = (0, 0, 0, 0)
                continue
            spread = max(r, g, b) - min(r, g, b)
            avg = (r + g + b) / 3
            if a < 210 and spread < 28 and 52 <= avg <= 175:
                px[x, y] = (0, 0, 0, 0)
    return im


def remove_foot_gap_checkerboard(im: Image.Image) -> Image.Image:
    """僅清除 standstill 兩腳之間的棋盤格殘留，不影響臉部／手部。"""
    w, h = im.size
    px = im.load()
    x0, x1 = int(w * 0.44), int(w * 0.56)
    y0, y1 = int(h * 0.58), int(h * 0.92)
    for y in range(y0, y1):
        for x in range(x0, x1):
            r, g, b, a = px[x, y]
            if a < 128:
                continue
            if is_white(r, g, b) or is_checker_gray(r, g, b, tol=15):
                px[x, y] = (0, 0, 0, 0)
    return im


def crop_pad(im: Image.Image, pad: int = 12) -> Image.Image:
    bb = im.getbbox()
    if not bb:
        return im
    x0, y0, x1, y1 = bb
    return im.crop(
        (
            max(0, x0 - pad),
            max(0, y0 - pad),
            min(im.width, x1 + pad),
            min(im.height, y1 + pad),
        )
    )


def resize_height(im: Image.Image, height: int) -> Image.Image:
    scale = height / im.height
    width = max(1, int(im.width * scale))
    return im.resize((width, height), Image.Resampling.LANCZOS)


def align_bottom_center(im: Image.Image, canvas_w: int, canvas_h: int) -> Image.Image:
    """將角色貼到統一畫布，腳底置底、水平置中。"""
    out = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    x = (canvas_w - im.width) // 2
    y = canvas_h - im.height
    out.paste(im, (x, y), im)
    return out


def process_frame(src: Path, *, key: str) -> Image.Image:
    im = remove_corner_marks(Image.open(src).convert("RGBA"))
    im = remove_background(im)
    im = crop_pad(im)
    im = strip_rim_checker(im)
    im = remove_small_specks(im)
    im = resize_height(im, TARGET_H)
    if key == "standstill":
        im = remove_foot_gap_checkerboard(im)
    return im


def export(im: Image.Image, key: str) -> tuple[int, int]:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    webp = OUT_DIR / f"character_{key}.webp"
    png = OUT_DIR / f"character_{key}.png"
    im.save(webp, "WEBP", quality=82, method=6)
    im.save(png, "PNG", optimize=True, compress_level=9)
    return im.width, im.height


def export_from_cleaned_png() -> None:
    """從已手動清理的 PNG 輸出 webp（standstill 僅補清腳間）。"""
    for key in ("standstill", "stepout", "stepout_2"):
        png = OUT_DIR / f"character_{key}.png"
        if not png.exists():
            raise FileNotFoundError(f"缺少 PNG：{png}")

        im = Image.open(png).convert("RGBA")
        if key == "standstill":
            im = strip_rim_checker(im)
            im = remove_foot_gap_checkerboard(im)
            im.save(png, "PNG", optimize=True, compress_level=9)

        webp = OUT_DIR / f"character_{key}.webp"
        im.save(webp, "WEBP", quality=82, method=6)
        print(f"{key}: {im.width}x{im.height}, png={png.stat().st_size/1024:.1f} KB, webp={webp.stat().st_size/1024:.1f} KB")


def main() -> None:
    SRC_DIR.mkdir(parents=True, exist_ok=True)
    frames: dict[str, Image.Image] = {}

    for src_name, key in PAIRS:
        src = SRC_DIR / src_name
        if not src.exists():
            raise FileNotFoundError(f"缺少原始檔：{src}")
        frames[key] = process_frame(src, key=key)
        print(f"{key} (cropped): {frames[key].width}x{frames[key].height}")

    canvas_w = max(im.width for im in frames.values())
    canvas_h = max(im.height for im in frames.values())
    sizes: dict[str, tuple[int, int]] = {}

    for key, im in frames.items():
        aligned = align_bottom_center(im, canvas_w, canvas_h)
        sizes[key] = export(aligned, key)
        print(f"{key} (aligned): {sizes[key][0]}x{sizes[key][1]}")

    print(
        "\nHubPlayer 尺寸："
        f"\n  VIEW_W={canvas_w}, VIEW_H={canvas_h}"
        f"\n  STANDSTILL={sizes['standstill'][0]}x{sizes['standstill'][1]}"
        f"\n  STEPOUT={sizes['stepout'][0]}x{sizes['stepout'][1]}"
        f"\n  STEPOUT_2={sizes['stepout_2'][0]}x{sizes['stepout_2'][1]}"
    )


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "--from-cleaned":
        export_from_cleaned_png()
    else:
        main()
