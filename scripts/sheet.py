"""Contact sheet: downscale every QA shot of one viewport into a grid so continuity can be judged at a glance.
Usage: python scripts/sheet.py qa/desktop [columns]"""
import glob
import sys

from PIL import Image

d = sys.argv[1]
cols = int(sys.argv[2]) if len(sys.argv) > 2 else 5
files = sorted(f for f in glob.glob(f'{d}/*.png') if 'sheet' not in f)
ims = [Image.open(f) for f in files]
scale = 4 if ims[0].width > ims[0].height else 6
th = [i.resize((i.width // scale, i.height // scale)) for i in ims]
w, h = th[0].size
rows = (len(th) + cols - 1) // cols
sheet = Image.new('RGB', (w * cols, h * rows), (40, 40, 40))
for k, t in enumerate(th):
    sheet.paste(t, ((k % cols) * w, (k // cols) * h))
sheet.save(f'{d}/sheet.png')
print('sheet', sheet.size, len(th), 'shots')
