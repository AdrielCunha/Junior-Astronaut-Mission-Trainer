# Generated with AI assistance. See README, "Use of AI tools".
# Toon color maps for the planets drawn live in the solar system view (src/cenas/planetaShader.ts).
# Each NASA map is smoothed and reduced to a handful of flat colors taken from the map itself,
# so Earth keeps its blues, greens and sands and Mars its rusts, in the same flat style as the Moon.
#
#   python3 tools/lua3d/make_planet_textures.py
#
# In:  tools/lua3d/nasa/planetas/   (NASA 3D Resources: mars.jpg, Viking/USGS; venus.jpg, Magellan;
#      earth.jpg, NASA Goddard "Blue Marble", public domain, via Wikimedia Commons)
# Out: public/lua/planetas/<name>.png, equirectangular, top = north, lon 0 in the middle
import os
from PIL import Image, ImageEnhance, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
SRC = os.path.join(HERE, 'nasa', 'planetas')
OUT = os.path.join(ROOT, 'public', 'lua', 'planetas')
W, H = 1024, 512

# name: (source file, number of flat colors, blur radius in px, saturation boost)
MAPAS = {
    'terra': ('earth.jpg', 7, 2, 1.15),
    'marte': ('mars.jpg', 6, 2, 1.6),     # the Viking mosaic is pale: push it toward Mars's rust
    'venus': ('venus.jpg', 5, 3, 1.0),
}


def toon(img, cores, raio, sat=1.0):
    img = img.convert('RGB').resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(raio))
    if sat != 1.0: img = ImageEnhance.Color(img).enhance(sat)
    return img.quantize(colors=cores, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')


def main():
    os.makedirs(OUT, exist_ok=True)
    for nome, (arq, cores, raio, sat) in MAPAS.items():
        p = os.path.join(SRC, arq)
        if not os.path.exists(p):
            print('missing', p); continue
        toon(Image.open(p), cores, raio, sat).save(os.path.join(OUT, f'{nome}.png'), optimize=True)
        print(nome, 'ok')
    # Mercury: no small public global map at hand, and it looks much like the Moon (grey, cratered).
    # Stylized: the Moon's toon map, a little darker and warmer. Say so if asked: it is not Mercury's map.
    lua = Image.open(os.path.join(ROOT, 'public', 'lua', 'moon_albedo.png')).convert('RGB').resize((W, H), Image.NEAREST)
    r, g, b = lua.split()
    merc = Image.merge('RGB', (r.point(lambda v: int(v * 0.86)), g.point(lambda v: int(v * 0.80)), b.point(lambda v: int(v * 0.74))))
    merc.save(os.path.join(OUT, 'mercurio.png'), optimize=True)
    print('mercurio ok (stylized from the Moon map)')


main()
