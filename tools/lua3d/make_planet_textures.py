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
import math, os, sys
import numpy as np
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


# Mars wears its relief too (NASA MGS MOLA MEGDR, 16 px/deg, cached by comum): a shaded relief
# in a few soft tones, lit from the same side as the zoom film's ground (make_flight_marte.py,
# east/north/up below), so the film's detailed patches melt into the globe around them and the
# live globe (planetaShader.ts) shows Olympus Mons, Valles Marineris and the big basins.
LUZ_MARTE = np.array([-0.307, -0.785, 0.542])      # east, north, up
EXAGERO_MARTE = 10


def lin(c): return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def srgb(c): return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(np.clip(c, 0, None), 1 / 2.4) - 0.055)


def suave(a, b, x):
    k = np.clip((x - a) / (b - a), 0, 1)
    return k * k * (3 - 2 * k)


def relevo_marte(img):
    sys.path.insert(0, HERE)
    import comum as C
    C.usar_corpo('marte')
    mola = os.path.join(C.CACHE, 'marte', 'mola16.npy')
    if not os.path.exists(mola):
        arq = C._baixar(C.DEMS_MARTE['mola16']['url'], os.path.join(C.CACHE, 'marte', 'megt90n000eb.img'))
        np.save(mola, np.fromfile(arq, '>i2').reshape(2880, 5760))
    alt = np.roll(np.load(mola).astype(np.float32), 2880, axis=1)          # lon 0 in the middle
    alt = np.asarray(Image.fromarray(alt, 'F').resize((W, H), Image.BOX)) / 1000   # km, the map's grid
    lat = np.radians(90 - (np.arange(H) + 0.5) * 180 / H)[:, None]
    R = C.R_KM
    dy = -R * math.pi / H                                                 # rows go south
    dn = np.gradient(alt, axis=0) / dy
    de = (np.roll(alt, -1, 1) - np.roll(alt, 1, 1)) / (2 * R * 2 * math.pi / W * np.maximum(np.cos(lat), 0.05))
    n = np.stack([-de * EXAGERO_MARTE, -dn * EXAGERO_MARTE, np.ones_like(alt)], -1)
    l = LUZ_MARTE / np.linalg.norm(LUZ_MARTE)
    luz = np.clip((n @ l) / np.linalg.norm(n, axis=-1) / l[2], 0, 1.5)
    k = luz / 0.22; b = np.floor(k)
    luz = ((b + suave(0.32, 0.68, k - b)) * 0.22)[..., None]              # soft-edged tones
    c = lin(np.asarray(img, np.float32) / 255)
    sombra = lin(np.array([0x5a, 0x34, 0x28]) / 255); realce = lin(np.array([0xf8, 0xe2, 0xc8]) / 255)
    c = np.where(luz <= 1, sombra * (1 - luz) + c * luz, c * (1 - (luz - 1) * 0.9) + realce * (luz - 1) * 0.9)
    return Image.fromarray((np.clip(srgb(c), 0, 1) * 255 + 0.5).astype(np.uint8))


def main():
    os.makedirs(OUT, exist_ok=True)
    for nome, (arq, cores, raio, sat) in MAPAS.items():
        p = os.path.join(SRC, arq)
        if not os.path.exists(p):
            print('missing', p); continue
        img = toon(Image.open(p), cores, raio, sat)
        if nome == 'marte': img = relevo_marte(img)
        img.save(os.path.join(OUT, f'{nome}.png'), optimize=True)
        print(nome, 'ok')
    # Mercury: no small public global map at hand, and it looks much like the Moon (grey, cratered).
    # Stylized: the Moon's toon map, a little darker and warmer. Say so if asked: it is not Mercury's map.
    lua = Image.open(os.path.join(ROOT, 'public', 'lua', 'moon_albedo.png')).convert('RGB').resize((W, H), Image.NEAREST)
    r, g, b = lua.split()
    merc = Image.merge('RGB', (r.point(lambda v: int(v * 0.86)), g.point(lambda v: int(v * 0.80)), b.point(lambda v: int(v * 0.74))))
    merc.save(os.path.join(OUT, 'mercurio.png'), optimize=True)
    print('mercurio ok (stylized from the Moon map)')


main()
