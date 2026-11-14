# Generated with AI assistance (Claude). See README, "Use of AI tools".
# Textures for the live Moon (src/cenas/luaShader.ts), drawn by the GPU at any size and angle:
#   public/lua/moon_albedo.png  NASA LROC color reduced to the toon palette (same bands as the
#                               Blender renders), equirectangular, north up, lon 0 in the middle
#   public/lua/moon_height.png  NASA LOLA height, 8 bit, same layout; scale in src/dados/lua_tex.json
#
#   python3 tools/lua3d/make_moon_textures.py
import json, os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'public', 'lua')
# make_moon.py's albedo bands: linear luminance thresholds -> sRGB colors.
ALBEDO = [(0.00, '#5a5248'), (0.15, '#7a7060'), (0.22, '#9c917b'), (0.30, '#bdb196'), (0.40, '#dcd1b4')]


def main():
    cor = np.asarray(Image.open(os.path.join(HERE, 'nasa', 'lroc_color_poles_2k.tif')).convert('RGB'), np.float32) / 255
    lin = np.where(cor <= 0.04045, cor / 12.92, ((cor + 0.055) / 1.055) ** 2.4)
    lum = lin @ np.array([0.2126, 0.7152, 0.0722], np.float32)          # Blender's RGB to BW
    out = np.zeros(lum.shape + (3,), np.uint8)
    for limite, h in ALBEDO:
        out[lum >= limite] = [int(h[i:i + 2], 16) for i in (1, 3, 5)]
    Image.fromarray(out).save(os.path.join(OUT, 'moon_albedo.png'), optimize=True)

    v = np.asarray(Image.open(os.path.join(HERE, 'nasa', 'ldem_4_uint.tif')), np.float32)
    h_km = (v - 20000) * 0.0005                                       # LOLA kit: 0.5 m units, +20000
    lo, hi = float(h_km.min()), float(h_km.max())
    Image.fromarray(np.round((h_km - lo) / (hi - lo) * 255).astype(np.uint8)).save(os.path.join(OUT, 'moon_height.png'), optimize=True)
    with open(os.path.join(ROOT, 'src', 'dados', 'lua_tex.json'), 'w') as f:
        json.dump({'alturaMinKm': round(lo, 3), 'alturaMaxKm': round(hi, 3), 'raioKm': 1737.4,
                   'nota': 'moon_height.png: height = min + value/255 * (max - min) km. Both maps: equirectangular, top = north, x = 0.5 at lon 0.'}, f, indent=1)
    print('albedo', out.shape, 'height', v.shape, lo, hi)


main()
