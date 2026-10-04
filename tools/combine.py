# Puts screenshots side by side at half size for review: python tools/combine.py out.png a.png b.png ...
import sys
from PIL import Image

out, *files = sys.argv[1:]
ims = [Image.open(f) for f in files]
ims = [i.resize((i.width // 2, i.height // 2)) for i in ims]
w = sum(i.width for i in ims) + 12 * (len(ims) - 1)
h = max(i.height for i in ims)
canvas = Image.new("RGB", (w, h), (60, 60, 60))
x = 0
for i in ims:
    canvas.paste(i, (x, 0))
    x += i.width + 12
canvas.save(out)
print(canvas.size)
