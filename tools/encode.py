"""Downsamples tools/out/<name>.png by 2x and writes public/renders/<name>.webp"""
import sys, os
from PIL import Image

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.makedirs(os.path.join(root, 'public', 'renders'), exist_ok=True)
for name in sys.argv[1:]:
    im = Image.open(os.path.join(root, 'tools', 'out', name + '.png')).convert('RGBA')
    im = im.resize((im.width // 2, im.height // 2), Image.LANCZOS)
    dst = os.path.join(root, 'public', 'renders', name + '.webp')
    im.save(dst, 'WEBP', quality=86, method=6)
    print(f'  {name}.webp  {im.width}x{im.height}  {os.path.getsize(dst) // 1024} KB')
