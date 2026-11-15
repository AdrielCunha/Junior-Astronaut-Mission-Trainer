# Generated with AI assistance (Claude). See README, "Use of AI tools".
# The crew's rocket on its own, for the launch film and the landing (src/cenas/Chegada.ts and
# Superficie.ts). It is cut from the finished rocket on the pad (foguete4.png, from make_modules.py)
# by removing every pixel that is the same in the empty pad picture (plataforma.png): what is left
# is the rocket, fins and engine skirt included. Run it again after make_modules.py.
#
#   python3 tools/lua3d/make_flying_rocket.py
#
# Writes public/lua/modulos/foguete_voo.png and its entry in src/dados/foguete_voo.json:
#   w, h       picture size
#   pe         [x, y] of the rocket's base (bottom center), in the picture
#   peNoPad    [x, y] of that same point in foguete4.png, to land it exactly where it stands
import json, os
from collections import deque
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
MOD = os.path.join(ROOT, 'public', 'lua', 'modulos')
DADOS = os.path.join(ROOT, 'src', 'dados')


def main():
    modelos = json.load(open(os.path.join(DADOS, 'modulos.json'), encoding='utf8'))
    f = Image.open(os.path.join(MOD, 'foguete4.png')).convert('RGBA')
    p = Image.open(os.path.join(MOD, 'plataforma.png')).convert('RGBA')
    W, H = f.size
    # Both pictures share the pad's anchor; the full rocket is taller, so the pad sits lower in it.
    dy = round(modelos['foguete4']['ancora'][1] - modelos['plataforma']['ancora'][1])
    pad = Image.new('RGBA', f.size)
    pad.paste(p, (0, dy))
    fp, pp = f.load(), pad.load()

    m = Image.new('L', f.size)
    mp = m.load()
    for y in range(H):
        for x in range(W):
            a, b = fp[x, y], pp[x, y]
            if a[3] and sum(abs(a[i] - b[i]) for i in range(4)) > 60:
                mp[x, y] = 255
    # Close the thin seams left by antialiased edges, then drop specks.
    m = m.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))
    m = m.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
    mp = m.load()

    # Keep the biggest piece (the rocket).
    vis = set()
    melhor = []
    for y0 in range(H):
        for x0 in range(W):
            if not mp[x0, y0] or not fp[x0, y0][3] or (x0, y0) in vis:
                continue
            fila, peca = deque([(x0, y0)]), []
            vis.add((x0, y0))
            while fila:
                x, y = fila.popleft()
                peca.append((x, y))
                for xx, yy in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= xx < W and 0 <= yy < H and (xx, yy) not in vis and mp[xx, yy] and fp[xx, yy][3]:
                        vis.add((xx, yy))
                        fila.append((xx, yy))
            if len(peca) > len(melhor):
                melhor = peca

    # Fill holes: anything the outside cannot reach without crossing the rocket is the rocket too.
    dentro = set(melhor)
    fora = set()
    fila = deque((x, y) for x in range(W) for y in (0, H - 1)) + deque((x, y) for y in range(H) for x in (0, W - 1))
    for q in fila:
        fora.add(q)
    while fila:
        x, y = fila.popleft()
        for xx, yy in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= xx < W and 0 <= yy < H and (xx, yy) not in fora and (xx, yy) not in dentro:
                fora.add((xx, yy))
                fila.append((xx, yy))

    out = Image.new('RGBA', f.size)
    op = out.load()
    for y in range(H):
        for x in range(W):
            if (x, y) not in fora:
                op[x, y] = fp[x, y]
    x0, y0, x1, y1 = out.getbbox()
    out.crop((x0, y0, x1, y1)).save(os.path.join(MOD, 'foguete_voo.png'), optimize=True)
    # The base: bottom center of the piece.
    cx = (x0 + x1) / 2
    info = {'w': x1 - x0, 'h': y1 - y0, 'pe': [round(cx - x0, 2), y1 - y0], 'peNoPad': [round(cx, 2), y1]}
    json.dump(info, open(os.path.join(DADOS, 'foguete_voo.json'), 'w', encoding='utf8'), indent=1)
    print('foguete_voo.png', info)


if __name__ == '__main__':
    main()
