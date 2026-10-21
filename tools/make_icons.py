#!/usr/bin/env python3
"""Draw the launcher icon set (field-gold winged cross on gunmetal) with PIL."""
from PIL import Image, ImageDraw
import os

SIZES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

GOLD = (201, 180, 122)
GOLD_LIGHT = (240, 222, 170)
DARK = (24, 20, 16)
DARK2 = (38, 31, 24)


def draw(size: int) -> Image.Image:
    scale = 4
    s = size * scale
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Rounded dark plate.
    r = int(s * 0.2)
    d.rounded_rectangle([0, 0, s - 1, s - 1], radius=r, fill=DARK)
    d.rounded_rectangle([s * 0.03, s * 0.03, s * 0.97, s * 0.97], radius=int(r * 0.9),
                        outline=(58, 48, 36, 255), width=max(1, s // 90))

    # Faint horizon band.
    d.rectangle([0, int(s * 0.62), s, int(s * 0.72)], fill=(30, 25, 19, 255))

    cx, cy = s / 2, s / 2
    # Gold ring.
    ring = s * 0.33
    d.ellipse([cx - ring, cy - ring, cx + ring, cy + ring], outline=GOLD, width=max(2, int(s * 0.022)))
    d.ellipse([cx - ring * 0.9, cy - ring * 0.9, cx + ring * 0.9, cy + ring * 0.9],
              outline=(140, 120, 78, 120), width=max(1, int(s * 0.008)))

    # Cross (steel-gold).
    arm = s * 0.075
    length = s * 0.24
    d.rectangle([cx - arm, cy - length, cx + arm, cy + length], fill=GOLD_LIGHT)
    d.rectangle([cx - length, cy - arm, cx + length, cy + arm], fill=GOLD_LIGHT)
    inner = s * 0.032
    d.rectangle([cx - inner, cy - length, cx + inner, cy + length], fill=GOLD)
    d.rectangle([cx - length, cy - inner, cx + length, cy + inner], fill=GOLD)

    # Wings: three chevrons each side.
    for i, off in enumerate((-0.02, 0.05, 0.12)):
        y = cy + s * off
        w = s * (0.20 - i * 0.03)
        h = s * 0.035
        d.polygon([(cx - s * 0.10, y), (cx - s * 0.10 - w, y - h), (cx - s * 0.10 - w * 0.8, y + h * 0.2)],
                  fill=GOLD)
        d.polygon([(cx + s * 0.10, y), (cx + s * 0.10 + w, y - h), (cx + s * 0.10 + w * 0.8, y + h * 0.2)],
                  fill=GOLD)

    # Muzzle flare diamonds at the cross tips.
    for dx, dy in ((0, -1), (0, 1), (-1, 0), (1, 0)):
        x = cx + dx * length
        y = cy + dy * length
        k = s * 0.028
        d.polygon([(x, y - k), (x + k, y), (x, y + k), (x - k, y)], fill=GOLD_LIGHT)

    # Plate edge highlight.
    d.arc([2, 2, s - 3, s - 3], 200, 340, fill=(90, 78, 58, 160), width=max(1, s // 100))
    return img.resize((size, size), Image.LANCZOS)


root = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "android", "res")
for folder, size in SIZES.items():
    os.makedirs(os.path.join(root, folder), exist_ok=True)
    icon = draw(size)
    icon.save(os.path.join(root, folder, "ic_launcher.png"))
    print("wrote", os.path.join(folder, "ic_launcher.png"), size)
