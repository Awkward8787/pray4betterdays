#!/usr/bin/env python3
"""Remove the white studio field from the supplied hoodie photo.

Near-white pixels connected to the canvas edge become transparent.
Clouds and rhinestones inside the garment are not connected to that edge, so they stay.
"""

from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "source" / "hoodie-praying-hands-black.png"
OUT = ROOT / "public" / "media" / "first-design" / "zoom.png"


def near_white(r: int, g: int, b: int) -> bool:
    return r >= 246 and g >= 246 and b >= 246


def main() -> None:
    image = Image.open(SRC).convert("RGBA")
    width, height = image.size
    pixels = image.load()
    seen = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    def push(x: int, y: int) -> None:
        if x < 0 or y < 0 or x >= width or y >= height:
            return
        index = y * width + x
        if seen[index]:
            return
        seen[index] = 1
        red, green, blue, alpha = pixels[x, y]
        if alpha and near_white(red, green, blue):
            pixels[x, y] = (red, green, blue, 0)
            queue.append((x, y))

    for x in range(width):
        push(x, 0)
        push(x, height - 1)
    for y in range(height):
        push(0, y)
        push(width - 1, y)

    while queue:
        x, y = queue.popleft()
        push(x + 1, y)
        push(x - 1, y)
        push(x, y + 1)
        push(x, y - 1)

    # Drop a chalk-white rim left against the cut, one pixel deep.
    for y in range(height):
        for x in range(width):
            red, green, blue, alpha = pixels[x, y]
            if alpha == 0 or not near_white(red, green, blue):
                continue
            rim = False
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if nx < 0 or ny < 0 or nx >= width or ny >= height or pixels[nx, ny][3] == 0:
                    rim = True
                    break
            if rim:
                pixels[x, y] = (red, green, blue, 0)

    box = image.getbbox()
    if box:
        pad = 16
        image = image.crop(
            (
                max(0, box[0] - pad),
                max(0, box[1] - pad),
                min(width, box[2] + pad),
                min(height, box[3] + pad),
            )
        )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    image.save(OUT, optimize=True)
    print(f"{OUT} {image.size[0]}x{image.size[1]}")


if __name__ == "__main__":
    main()
