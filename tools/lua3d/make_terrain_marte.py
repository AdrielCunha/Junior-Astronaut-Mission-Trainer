# Generated with AI assistance. See README, "Use of AI tools".
# Cuts the playable Mars map out of the USGS CTX elevation model of Jezero crater, like
# make_terrain.py does for the Moon (same json fields, same tiles: 64 x 64 at 80 m).
#
#   python3 tools/lua3d/make_terrain_marte.py [--janela pouso|relevo]
#
# Source: USGS Astrogeology, Mars 2020 Terrain Relative Navigation: CTX DTM of Jezero crater
# (JEZ_ctx_B_soc_008, 20 m, heights above the MOLA areoid, NASA PDS). 9.7 MB, cached in
# tools/lua3d/.cache/marte/.
# The DTM grid is equirectangular: at 18 deg N one pixel is 20 m north-south but 19 m east-west,
# so the map is resampled on true ground meters (square 80 m tiles).
# Two windows are searched near Perseverance's landing site (18.4447 N, 77.4508 E):
#   pouso   the flattest one (as on the Moon: most tiles under 10 deg, none over 25)
#   relevo  the one with the most relief that is still at least half buildable
# Out: src/dados/terreno_marte.json, and a slope preview per window in tools/lua3d/.cache/marte/
import argparse, json, math, os, sys
import numpy as np
from scipy.interpolate import RegularGridInterpolator

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import comum as C
C.usar_corpo('marte')

ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'src', 'dados', 'terreno_marte.json')
N = 64                       # tiles per side, as on the Moon
TILE_M = 80.0
WALK_MAX_SLOPE = 20
BUILD_MAX_SLOPE = 10
POUSO = (18.4447, 77.4508)   # Octavia E. Butler Landing, Perseverance, 18 Feb 2021
BUSCA_KM = 4.0               # search window centers this far from the landing site

ap = argparse.ArgumentParser()
ap.add_argument('--janela', choices=['pouso', 'relevo'], default='pouso')
args = ap.parse_args()


def chao_metros():
    """The whole DTM on a true-ground grid: heights (m) every 20 m, east and north meters from the
    landing site."""
    c = C.DEMS_MARTE['ctx20']
    a, l0, s0 = C.ler_dem('ctx20', POUSO[0], POUSO[1], 40)        # 40 km: the whole DTM
    lats = c['lat0'] - (l0 + np.arange(a.shape[0])) / c['res']
    lons = c['lon0'] + (s0 + np.arange(a.shape[1])) / c['res']
    R = C.R_KM * 1000
    norte = R * np.radians(lats - POUSO[0])
    leste = R * np.cos(np.radians(POUSO[0])) * np.radians(lons - POUSO[1])
    f = RegularGridInterpolator((norte[::-1], leste), a[::-1], bounds_error=False)
    e = np.arange(leste.min() + 40, leste.max() - 40, 20.0)
    nn = np.arange(norte.max() - 40, norte.min() + 40, -20.0)          # rows run south, like the image
    E, Nn = np.meshgrid(e, nn)
    return f(np.stack([Nn, E], -1)), e, nn


def inclinacao(h):
    """Slope (deg) of each tile from its four corners, h = (n+1) x (n+1) corner heights (m)."""
    dx = ((h[:-1, 1:] + h[1:, 1:]) - (h[:-1, :-1] + h[1:, :-1])) / (2 * TILE_M)
    dy = ((h[1:, :-1] + h[1:, 1:]) - (h[:-1, :-1] + h[:-1, 1:])) / (2 * TILE_M)
    return np.degrees(np.arctan(np.hypot(dx, dy)))


def main():
    H, e, nn = chao_metros()
    # Tile corners every 80 m = every 4 grid points.
    cantos = H[::4, ::4]
    ce, cn = e[::4], nn[::4]
    k = int(BUSCA_KM * 1000 / TILE_M)
    i0 = int(np.argmin(abs(cn))); j0 = int(np.argmin(abs(ce)))
    cands = []
    for i in range(max(0, i0 - k - N // 2), min(cantos.shape[0] - N - 1, i0 + k - N // 2)):
        for j in range(max(0, j0 - k - N // 2), min(cantos.shape[1] - N - 1, j0 + k - N // 2)):
            w = cantos[i:i + N + 1, j:j + N + 1]
            if np.isnan(w).any(): continue
            s = inclinacao(w)
            cands.append((i, j, (s < BUILD_MAX_SLOPE).mean(), s.max(), float(np.nanstd(w)), float(np.ptp(w))))
    if not cands:
        raise SystemExit('no window inside the DTM')
    planas = [c for c in cands if c[3] <= 25] or cands
    pouso = max(planas, key=lambda c: (c[2], -c[3]))
    relevo = max([c for c in cands if c[2] >= 0.5] or cands, key=lambda c: c[4])
    escolhas = {'pouso': pouso, 'relevo': relevo}
    for nome, (i, j, frac, smax, desv, amp) in escolhas.items():
        w = cantos[i:i + N + 1, j:j + N + 1]; s = inclinacao(w)
        mn, me = cn[i + N // 2], ce[j + N // 2]
        lat = POUSO[0] + math.degrees(mn / (C.R_KM * 1000))
        lon = POUSO[1] + math.degrees(me / (C.R_KM * 1000 * math.cos(math.radians(POUSO[0]))))
        print(f'{nome}: centro {lat:.4f} N {lon:.4f} E, {math.hypot(mn, me) / 1000:.1f} km do pouso, '
              f'{frac:.0%} construivel, inclinacao max {smax:.0f} graus, desnivel {amp:.0f} m')
        salvar_previa(nome, w, s)
    i, j, *_ = escolhas[args.janela]
    w = cantos[i:i + N + 1, j:j + N + 1]
    s = inclinacao(w)
    base = float(np.median(w))
    mn, me = cn[i + N // 2], ce[j + N // 2]
    lat = POUSO[0] + math.degrees(mn / (C.R_KM * 1000))
    lon = POUSO[1] + math.degrees(me / (C.R_KM * 1000 * math.cos(math.radians(POUSO[0]))))
    data = {}
    if os.path.exists(OUT):
        with open(OUT) as f:
            data = json.load(f)                      # keep the image block from render_terrain.py
    data.update({
        'nota': 'Real terrain in Jezero crater, Mars, near where NASA\'s Perseverance landed. Heights 1:1 with the ground.',
        'fonte': {'nome': 'USGS Astrogeology, Mars 2020 TRN: CTX DTM of Jezero (JEZ_ctx_B_soc_008, 20 m), NASA PDS',
                  'url': C.DEMS_MARTE['ctx20']['url']},
        'corpo': 'marte',
        'janelaNome': args.janela,
        # Map center; gx runs east and gy south, 80 m per tile on true ground.
        'centro': {'lat': round(lat, 5), 'lon': round(lon, 5)},
        'pouso': {'lat': POUSO[0], 'lon': POUSO[1], 'nome': 'Octavia E. Butler Landing (Perseverance)'},
        'n': N,
        'metrosPorTile': TILE_M,
        'alturaBaseM': round(base, 1),
        'inclinacaoMaxAndar': WALK_MAX_SLOPE,
        'inclinacaoMaxConstruir': BUILD_MAX_SLOPE,
        'alturas': [[round(float(v - base) / TILE_M, 3) for v in row] for row in w],
        'inclinacao': [[round(float(v), 1) for v in row] for row in s],
    })
    with open(OUT, 'w') as f:
        json.dump(data, f, separators=(',', ':'))
    print(f'{OUT}: janela {args.janela}, {N}x{N} tiles, {(s < BUILD_MAX_SLOPE).mean():.0%} construivel')


def salvar_previa(nome, w, s):
    """Height (gray) with slope classes on top: green buildable, yellow walkable, red too steep."""
    from PIL import Image
    h = (w[:-1, :-1] - w.min()) / max(1e-6, np.ptp(w))
    rgb = np.stack([h, h, h], -1) * 200 + 30
    rgb[s < BUILD_MAX_SLOPE] = rgb[s < BUILD_MAX_SLOPE] * 0.6 + np.array([40, 160, 70]) * 0.4
    m = (s >= BUILD_MAX_SLOPE) & (s < WALK_MAX_SLOPE)
    rgb[m] = rgb[m] * 0.6 + np.array([220, 180, 40]) * 0.4
    rgb[s >= WALK_MAX_SLOPE] = rgb[s >= WALK_MAX_SLOPE] * 0.5 + np.array([220, 50, 40]) * 0.5
    p = os.path.join(C.CACHE, 'marte', f'previa_{nome}.png')
    Image.fromarray(rgb.clip(0, 255).astype(np.uint8)).resize((512, 512), Image.NEAREST).save(p)


main()
