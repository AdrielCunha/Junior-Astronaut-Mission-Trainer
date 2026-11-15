# Generated with AI assistance (Claude). See README, "Use of AI tools".
# The crew's rocket on its own, for the launch film and the landing (src/cenas/Chegada.ts and
# Superficie.ts). make_modules.py renders the finished rocket alone (MODELOS['foguete_voo'],
# no pad) into foguete_voo.png and writes the rocket-base anchor peNoPad into foguete_voo.json;
# this script only crops the padded picture tight around the rocket and refreshes w/h/pe.
# Run it again after make_modules.py.
#
#   python3 tools/lua3d/make_flying_rocket.py
#
# foguete_voo.json:
#   w, h       picture size
#   pe         [x, y] of the rocket's base (bottom center), in the picture
#   peNoPad    [x, y] of that same point in foguete4.png, to land it exactly where it stands
import json, os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
MOD = os.path.join(ROOT, 'public', 'lua', 'modulos')
DADOS = os.path.join(ROOT, 'src', 'dados')


def main():
    png = os.path.join(MOD, 'foguete_voo.png')
    info = json.load(open(os.path.join(DADOS, 'foguete_voo.json'), encoding='utf8'))
    f = Image.open(png).convert('RGBA')
    x0, y0, x1, y1 = f.getbbox()
    out = f.crop((x0, y0, x1, y1))
    out.save(png, optimize=True)
    W, H = out.size
    info.update({'w': W, 'h': H, 'pe': [round(W / 2, 2), round(H, 2)]})
    json.dump(info, open(os.path.join(DADOS, 'foguete_voo.json'), 'w', encoding='utf8'), indent=1)
    print('foguete_voo.png', info)


if __name__ == '__main__':
    main()
