#!/usr/bin/env python3
"""
Génère icon.png (1024x1024) et splash.png (2732x2732) pour Sara AI.
Couleur : vert Sara #118c44 (theme-button-primary).
Lancer : python3 generate-assets.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
SARA_GREEN = (17, 140, 68)
WHITE = (255, 255, 255)

FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
]

def find_font(size):
    for path in FONT_CANDIDATES:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()

def draw_centered_S(img, fill, size_ratio=0.6):
    w, h = img.size
    font_size = int(min(w, h) * size_ratio)
    font = find_font(font_size)
    draw = ImageDraw.Draw(img)
    text = "S"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    x = (w - text_w) / 2 - bbox[0]
    y = (h - text_h) / 2 - bbox[1]
    draw.text((x, y), text, fill=fill, font=font)

def make_icon():
    """1024x1024 — fond vert Sara, S blanc gras centré."""
    img = Image.new("RGB", (1024, 1024), SARA_GREEN)
    draw_centered_S(img, fill=WHITE, size_ratio=0.7)
    out = os.path.join(HERE, "icon.png")
    img.save(out, "PNG", optimize=True)
    print(f"OK: {out}")

def make_icon_foreground():
    """1024x1024 transparent — uniquement le S blanc, pour adaptive icons Android."""
    img = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    draw_centered_S(img, fill=WHITE, size_ratio=0.55)
    out = os.path.join(HERE, "icon-foreground.png")
    img.save(out, "PNG", optimize=True)
    print(f"OK: {out}")

def make_icon_background():
    """1024x1024 — uniquement le fond vert Sara, pour adaptive icons Android."""
    img = Image.new("RGB", (1024, 1024), SARA_GREEN)
    out = os.path.join(HERE, "icon-background.png")
    img.save(out, "PNG", optimize=True)
    print(f"OK: {out}")

def make_splash():
    """2732x2732 — fond vert Sara, S blanc plus petit (safe area)."""
    img = Image.new("RGB", (2732, 2732), SARA_GREEN)
    draw_centered_S(img, fill=WHITE, size_ratio=0.25)
    out = os.path.join(HERE, "splash.png")
    img.save(out, "PNG", optimize=True)
    print(f"OK: {out}")

def make_splash_dark():
    """Variante dark (identique pour Sara — vert reste vert sur dark mode)."""
    img = Image.new("RGB", (2732, 2732), SARA_GREEN)
    draw_centered_S(img, fill=WHITE, size_ratio=0.25)
    out = os.path.join(HERE, "splash-dark.png")
    img.save(out, "PNG", optimize=True)
    print(f"OK: {out}")

if __name__ == "__main__":
    make_icon()
    make_icon_foreground()
    make_icon_background()
    make_splash()
    make_splash_dark()
    print("Tous les assets générés dans mobile/resources/")
