"""Builds public/brand/raw-logo-plate.jpg (feature block) and public/og.jpg (social share)."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np

def glow(w, h, cx, cy, r, color=(118, 26, 198), strength=0.55, base=(7, 6, 8)):
    y, x = np.mgrid[0:h, 0:w]
    d = np.sqrt(((x - cx) / r) ** 2 + ((y - cy) / r) ** 2)
    a = np.clip(1 - d, 0, 1) ** 2 * strength
    img = np.zeros((h, w, 3))
    for i in range(3):
        img[..., i] = base[i] * (1 - a) + color[i] * a
    return Image.fromarray(img.astype(np.uint8), 'RGB')

logo = Image.open('public/brand/logo-full.png').convert('RGBA')

# plate (9:10) for the lilac feature block
W, H = 900, 1000
plate = glow(W, H, W / 2, H * 0.46, 620).convert('RGBA')
lh = 880
lw = int(logo.width * lh / logo.height)
plate.alpha_composite(logo.resize((lw, lh), Image.LANCZOS), ((W - lw) // 2, (H - lh) // 2 + 10))
plate.convert('RGB').save('public/brand/raw-logo-plate.jpg', quality=88, optimize=True, progressive=True)

# open-graph card 1200x630
W, H = 1200, 630
og = glow(W, H, 860, 300, 560, strength=0.6).convert('RGBA')
art = Image.open('public/renders/art.webp').convert('RGBA').resize((640, 640), Image.LANCZOS)
og.alpha_composite(art, (560, -10))
crown = Image.open('public/brand/logo-crown.png').convert('RGBA')
cw = 470; ch = int(crown.height * cw / crown.width)
og.alpha_composite(crown.resize((cw, ch), Image.LANCZOS), (60, 70))
d = ImageDraw.Draw(og)
f1 = ImageFont.truetype('tools/studio/fonts/CaesarDressing-Regular.ttf', 64)
f2 = ImageFont.truetype('tools/studio/fonts/CaesarDressing-Regular.ttf', 30)
d.text((64, 430), 'STYLED LIKE ROYALTY', font=f1, fill=(237, 232, 224))
d.text((66, 515), 'BRAIDS · TWISTS · BARREL TWISTS · ART', font=f2, fill=(205, 184, 247))
og.convert('RGB').save('public/og.jpg', quality=88, optimize=True)
print('ok')
