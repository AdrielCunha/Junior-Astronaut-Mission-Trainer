# Generated with AI assistance (Claude). See README, "Use of AI tools".
# Splits the constellation-figure render (NASA SVS, same view as sky.jpg) into one picture per
# figure, so the game can draw a single constellation now and then with a thin line.
#
#   python3 tools/lua3d/make_constellations.py      (after make_moon.py)
#
# In:  tools/lua3d/.cache/constellations.png   (written by make_moon.py)
# Figures cut by the frame edge are kept only when a good part of them is visible.
# Out: public/lua/constelacoes/c<i>.png  and  src/dados/constelacoes.json  [{arquivo, x, y, w, h}]
#      x, y, w, h are pixels of sky.jpg.
import json, os, sys
from collections import deque
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
SRC = os.path.join(HERE, '.cache', 'constellations.png')
OUT_DIR = os.path.join(ROOT, 'public', 'lua', 'constelacoes')
OUT_JSON = os.path.join(ROOT, 'src', 'dados', 'constelacoes.json')
MIN_PIXELS = 400          # ignore bits of figures cut by the frame edge


def main():
    im = Image.open(SRC).convert('L')
    a = np.asarray(im)
    on = a > 70
    # Join the gaps the figures leave around each star (dilate by 4 px) before labeling.
    big = on.copy()
    for dy in range(-4, 5):
        for dx in range(-4, 5):
            big |= np.roll(np.roll(on, dy, 0), dx, 1)
    lab = np.zeros(a.shape, np.int32)
    h, w = a.shape
    n = 0
    comps = []
    for y0, x0 in zip(*np.nonzero(big)):
        if lab[y0, x0]: continue
        n += 1; lab[y0, x0] = n
        q = deque([(y0, x0)]); pts = []
        while q:
            y, x = q.popleft(); pts.append((y, x))
            for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= ny < h and 0 <= nx < w and big[ny, nx] and not lab[ny, nx]:
                    lab[ny, nx] = n; q.append((ny, nx))
        ys, xs = zip(*pts)
        y1, y2, x1, x2 = min(ys), max(ys), min(xs), max(xs)
        touches = y1 == 0 or x1 == 0 or y2 == h - 1 or x2 == w - 1
        mask = (lab[y1:y2 + 1, x1:x2 + 1] == n) & on[y1:y2 + 1, x1:x2 + 1]
        if mask.sum() >= MIN_PIXELS and (not touches or mask.sum() >= 3 * MIN_PIXELS):
            comps.append((x1, y1, x2, y2, mask))
    os.makedirs(OUT_DIR, exist_ok=True)
    for f in os.listdir(OUT_DIR): os.remove(os.path.join(OUT_DIR, f))
    lista = []
    for i, (x1, y1, x2, y2, mask) in enumerate(comps):
        rgba = np.zeros(mask.shape + (4,), np.uint8)
        rgba[..., :3] = 255; rgba[..., 3] = (mask * 255).astype(np.uint8)
        nome = f'c{i}.png'
        Image.fromarray(rgba).save(os.path.join(OUT_DIR, nome), optimize=True)
        lista.append({'arquivo': f'lua/constelacoes/{nome}', 'x': int(x1), 'y': int(y1), 'w': int(x2 - x1 + 1), 'h': int(y2 - y1 + 1)})
    with open(OUT_JSON, 'w') as f:
        json.dump(lista, f, indent=1)
    print(f'{len(lista)} constellations ->', OUT_JSON)


if __name__ == '__main__':
    sys.exit(main())
