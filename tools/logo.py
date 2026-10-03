"""Builds transparent logo assets from rawlogo.png (white + purple art on black).
Black is keyed out by un-premultiplying: alpha = max channel, colour = rgb / alpha."""
from PIL import Image, ImageDraw, ImageFilter
import numpy as np, os

src = Image.open('rawlogo.png').convert('RGB')
a = np.asarray(src).astype(np.float32) / 255.0

def unmultiply(arr):
    alpha = arr.max(axis=2)
    alpha = np.clip((alpha - 0.035) / 0.965, 0, 1)          # kill jpeg noise in the black
    safe = np.maximum(alpha, 1e-4)[..., None]
    rgb = np.clip(arr / safe, 0, 1)
    out = np.dstack([rgb, alpha])
    return Image.fromarray((out * 255).astype(np.uint8), 'RGBA')

full = unmultiply(a)
os.makedirs('public/brand', exist_ok=True)
full.save('public/brand/logo-full.png', optimize=True)

# Crown wordmark only: mask away the octopus head under the crown.
W, H = src.size
mask = Image.new('L', (W, H), 255)
d = ImageDraw.Draw(mask)
d.ellipse((360 - 156, 522 - 156, 360 + 156, 522 + 156), fill=0)
d.rectangle((0, 514, W, H), fill=0)
mask = mask.filter(ImageFilter.GaussianBlur(1.2))
crown = full.copy()
crown.putalpha(Image.fromarray((np.asarray(full.split()[3]) * (np.asarray(mask) / 255.0)).astype(np.uint8)))
crown = crown.crop(crown.getbbox())
crown.save('public/brand/logo-crown.png', optimize=True)

# Octopus mark (for favicon / small marks): keep the opaque black head so it reads.
octo = src.crop((40, 360, W - 40, H))
side = max(octo.size)
sq = Image.new('RGB', (side, side), (7, 6, 8))
sq.paste(octo, ((side - octo.size[0]) // 2, (side - octo.size[1]) // 2))
sq.resize((512, 512), Image.LANCZOS).save('app/icon.png')
sq.resize((180, 180), Image.LANCZOS).save('app/apple-icon.png')
print('full', full.size, 'crown', crown.size)
