# Generated with AI assistance (Claude). See README, "Use of AI tools".
# Cuts the playable map out of NASA's LOLA south-pole elevation model and writes it for the game.
#
#   python3 tools/lua3d/make_terrain.py
#
# Source: LRO / LOLA gridded DEM LDEM_80S_80M (polar stereographic, 80 m per pixel), NASA PDS
# Geosciences Node. Only the rows we need are downloaded (HTTP range request, ~0.5 MB).
# Output: src/dados/terreno.json  (heights at tile corners, real slopes, where the map is)
# The Blender step (render_terrain.py) adds the picture and the pixel mapping to the same file.
import json, math, os, urllib.request
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'src', 'dados', 'terreno.json')

URL = 'https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/ldem_80s_80m.img'
SIZE = 7600                 # LINES = LINE_SAMPLES (from the .lbl)
OFFSET_PX = 3799.5          # LINE/SAMPLE_PROJECTION_OFFSET
SCALE_M = 80.0              # MAP_SCALE, m per pixel
DN_TO_M = 0.5               # SCALING_FACTOR: height above the 1737.4 km sphere
R = 1737400.0

N = 64                      # map is N x N tiles, one DEM pixel per tile
# Site: the flattest 64 x 64 window on the Shackleton rim (searched over the slope map:
# 62% of it under 10 deg, none over 25 deg). 1-based line / sample of the window center.
CENTER_LINE, CENTER_SAMPLE = 3964, 3752
WALK_MAX_SLOPE = 20         # deg: steeper tiles cannot be walked up
BUILD_MAX_SLOPE = 10        # deg: steeper tiles cannot hold a module


def pixel_to_latlon(line, sample):
    # PDS south polar stereographic (checked: Shackleton's floor falls where this predicts).
    x = (sample - 1 - OFFSET_PX) * SCALE_M
    y = -(line - 1 - OFFSET_PX) * SCALE_M
    r = math.hypot(x, y)
    lat = -90 + math.degrees(2 * math.atan(r / (2 * R)))
    return lat, math.degrees(math.atan2(x, y))


def fetch_window():
    l0 = CENTER_LINE - N // 2          # 1-based first line; we need N + 1 corner rows
    s0 = CENTER_SAMPLE - N // 2
    rows = N + 1
    start = (l0 - 1) * SIZE * 2
    req = urllib.request.Request(URL, headers={'Range': f'bytes={start}-{start + rows * SIZE * 2 - 1}'})
    with urllib.request.urlopen(req) as r:
        raw = r.read()
    a = np.frombuffer(raw, '<i2').reshape(rows, SIZE)[:, s0 - 1:s0 - 1 + N + 1]
    return a.astype(np.float64) * DN_TO_M, l0, s0


def main():
    h, l0, s0 = fetch_window()                       # (N+1) x (N+1) corner heights, meters
    base = float(np.median(h))
    tiles = (h - base) / SCALE_M                     # heights in tile units, 1:1 with the ground
    # Real slope of each tile, from its four corners.
    c = h
    dx = ((c[:-1, 1:] + c[1:, 1:]) - (c[:-1, :-1] + c[1:, :-1])) / (2 * SCALE_M)
    dy = ((c[1:, :-1] + c[1:, 1:]) - (c[:-1, :-1] + c[:-1, 1:])) / (2 * SCALE_M)
    slope = np.degrees(np.arctan(np.hypot(dx, dy)))
    lat, lon = pixel_to_latlon(CENTER_LINE, CENTER_SAMPLE)
    data = {}
    if os.path.exists(OUT):
        with open(OUT) as f:
            data = json.load(f)                      # keep the image block from render_terrain.py
    data.update({
        'nota': 'Real terrain on the rim of Shackleton crater, Moon south pole. Heights 1:1 with the ground.',
        'fonte': {'nome': 'LRO / LOLA LDEM_80S_80M, NASA PDS Geosciences Node', 'url': URL},
        'centro': {'lat': round(lat, 4), 'lon': round(lon, 2)},
        'janela': {'linha': l0, 'amostra': s0},
        'n': N,
        'metrosPorTile': SCALE_M,
        'alturaBaseM': round(base, 1),
        'inclinacaoMaxAndar': WALK_MAX_SLOPE,
        'inclinacaoMaxConstruir': BUILD_MAX_SLOPE,
        # alturas[gy][gx], (N+1) x (N+1) tile corners, in tiles
        'alturas': [[round(float(v), 3) for v in row] for row in tiles],
        # inclinacao[gy][gx], N x N tiles, degrees
        'inclinacao': [[round(float(v), 1) for v in row] for row in slope],
    })
    with open(OUT, 'w') as f:
        json.dump(data, f, separators=(',', ':'))
    print(f'terrain: {N}x{N} tiles, relief {h.min() - base:.0f}..{h.max() - base:.0f} m, '
          f'{(slope < BUILD_MAX_SLOPE).mean():.0%} buildable, center {lat:.3f}, {lon:.1f}')


if __name__ == '__main__':
    main()
