# Generated with AI assistance (Claude). See README, "Use of AI tools".
# Shared by the Blender scripts: palette, toon materials, the outline shell, the cube-sphere and
# the NASA elevation readers. Import from a Blender script with:
#   import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import comum
#
# The Moon is the default. usar_corpo('marte') switches the body before anything is built: radius,
# map center, projection, elevation models and palette (see the Mars section at the end).
import math, os, urllib.request
from estilo_lua import PALETA
import numpy as np

R_KM = 1737.4
PDS = 'https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/'
CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.cache')

# Look shared by every render.
LIGHT = PALETA['luzSolo']
GROUND = PALETA['solo']
ROCK = PALETA['rocha']
OUTLINE = PALETA['contorno']

# Polar DEMs (PDS labels). The map center, as polar stereographic meters.
DEMS = {
    '80m': dict(arquivo='ldem_80s_80m.img', lado=7600, m=80.0, off=3799.5),
    '240m': dict(arquivo='ldem_75s_240m.img', lado=3812, m=240.0, off=1905.5),
}
X0 = (3752 - 1 - 3799.5) * 80.0
Y0 = -(3964 - 1 - 3799.5) * 80.0


def rgb(h, a=1.0):
    h = h.lstrip('#')
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return (*[c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb], a)


def janela(dem, meio_km, passo):
    """Heights (km) around the map center, block-averaged every `passo` pixels.
    Returns (heights[n, n], x_km[n], y_km[n]) with x, y absolute polar stereographic km."""
    c = DEMS[dem]
    cs = X0 / c['m'] + c['off']
    cl = -Y0 / c['m'] + c['off']
    half = int(meio_km * 1000 / c['m'])
    l0, l1 = int(cl) - half, int(cl) + half
    s0, s1 = int(cs) - half, int(cs) + half
    os.makedirs(CACHE, exist_ok=True)
    cache = os.path.join(CACHE, f'dem_{dem}_{meio_km:g}.npy')
    if os.path.exists(cache):
        a = np.load(cache)
    else:
        start = l0 * c['lado'] * 2
        req = urllib.request.Request(PDS + c['arquivo'], headers={'Range': f'bytes={start}-{(l1 + 1) * c["lado"] * 2 - 1}'})
        a = np.frombuffer(urllib.request.urlopen(req).read(), '<i2').reshape(-1, c['lado'])[:, s0:s1 + 1].astype(np.float32) * 0.5 / 1000
        np.save(cache, a)
    n = a.shape[0] // passo
    a = a[:n * passo, :n * passo].reshape(n, passo, n, passo).mean(axis=(1, 3))
    idx = np.arange(n) * passo + passo / 2 - 0.5
    xs = (s0 + idx - c['off']) * c['m'] / 1000
    ys = -(l0 + idx - c['off']) * c['m'] / 1000
    return a, xs, ys


def polar_para_3d(x_km, y_km, h_km):
    """South polar stereographic (km) + height -> moon-fixed xyz (km). Lon 0 = +X, east = +Y."""
    rho = math.hypot(x_km, y_km)
    lat = -math.pi / 2 + 2 * math.atan(rho / (2 * R_KM))
    lon = math.atan2(x_km, y_km)
    r = R_KM + h_km
    return (r * math.cos(lat) * math.cos(lon), r * math.cos(lat) * math.sin(lon), r * math.sin(lat))


def cube_sphere(n):
    verts, faces, base = [], [], 0
    t = np.linspace(-1, 1, n + 1)
    a, b = np.meshgrid(t, t, indexing='ij')
    one = np.ones_like(a)
    for axis, sign in [(0, 1), (0, -1), (1, 1), (1, -1), (2, 1), (2, -1)]:
        p = [None] * 3
        p[axis] = one * sign
        o = [i for i in range(3) if i != axis]
        p[o[0]], p[o[1]] = (a, b) if sign > 0 else (b, a)
        q = np.stack(p, -1).reshape(-1, 3)
        verts.append(q / np.linalg.norm(q, axis=1, keepdims=True))
        idx = np.arange((n + 1) ** 2).reshape(n + 1, n + 1) + base
        faces.append(np.stack([idx[:-1, :-1], idx[1:, :-1], idx[1:, 1:], idx[:-1, 1:]], -1).reshape(-1, 4))
        base += (n + 1) ** 2
    return np.concatenate(verts), np.concatenate(faces)


# ---------- materials (need bpy) ----------
def _ramp(N, stops):
    r = N.new('ShaderNodeValToRGB'); cr = r.color_ramp; cr.interpolation = 'CONSTANT'
    while len(cr.elements) < len(stops): cr.elements.new(0.99)
    for e, (p, col) in zip(cr.elements, stops): e.position = p; e.color = rgb(col)
    return r


def toon(bpy, nome, albedo_fn, luz=LIGHT, borda=None):
    """Emission material: albedo (from albedo_fn(N, L) -> socket) x hard light bands.
    borda = (center xyz, r0, r1): fully opaque within r0 of center, fading out to r1, so a
    detailed patch melts into the coarser ground under it instead of showing an edge."""
    m = bpy.data.materials.new(nome); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links; N.clear()
    alb = albedo_fn(N, L)
    dif = N.new('ShaderNodeBsdfDiffuse'); s2r = N.new('ShaderNodeShaderToRGB'); L.new(dif.outputs['BSDF'], s2r.inputs['Shader'])
    rl = _ramp(N, luz); L.new(s2r.outputs['Color'], rl.inputs['Fac'])
    mul = N.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs['Factor'].default_value = 1
    L.new(alb, mul.inputs[6]); L.new(rl.outputs['Color'], mul.inputs[7])
    em = N.new('ShaderNodeEmission'); L.new(mul.outputs[2], em.inputs['Color'])
    out = N.new('ShaderNodeOutputMaterial')
    if not borda:
        L.new(em.outputs[0], out.inputs['Surface'])
        return m
    c, r0, r1 = borda
    geo = N.new('ShaderNodeNewGeometry')
    dv = N.new('ShaderNodeVectorMath'); dv.operation = 'DISTANCE'; dv.inputs[1].default_value = c
    L.new(geo.outputs['Position'], dv.inputs[0])
    mr = N.new('ShaderNodeMapRange'); mr.interpolation_type = 'SMOOTHSTEP'
    mr.inputs['From Min'].default_value = r0; mr.inputs['From Max'].default_value = r1
    mr.inputs['To Min'].default_value = 0; mr.inputs['To Max'].default_value = 1
    L.new(dv.outputs['Value'], mr.inputs['Value'])
    tr = N.new('ShaderNodeBsdfTransparent')
    mx = N.new('ShaderNodeMixShader'); L.new(mr.outputs['Result'], mx.inputs['Fac'])
    L.new(em.outputs[0], mx.inputs[1]); L.new(tr.outputs[0], mx.inputs[2])
    L.new(mx.outputs[0], out.inputs['Surface'])
    m.surface_render_method = 'BLENDED'
    return m


def albedo_chao(ruido_km, curva_km=None, raio_km=None):
    """Regolith: noise patches, darker rock on steep ground, optional contour lines on the height
    above the sphere (|p| - R, so it works on curved patches)."""
    def fn(N, L):
        tc = N.new('ShaderNodeTexCoord')
        nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 1 / ruido_km; nz.inputs['Detail'].default_value = 1
        L.new(tc.outputs['Object'], nz.inputs['Vector'])
        g = _ramp(N, GROUND); L.new(nz.outputs['Fac'], g.inputs['Fac'])
        geo = N.new('ShaderNodeNewGeometry')
        # steepness = angle between the surface normal and the radial direction
        rad_ = N.new('ShaderNodeVectorMath'); rad_.operation = 'NORMALIZE'; L.new(geo.outputs['Position'], rad_.inputs[0])
        d = N.new('ShaderNodeVectorMath'); d.operation = 'DOT_PRODUCT'
        L.new(geo.outputs['Normal'], d.inputs[0]); L.new(rad_.outputs['Vector'], d.inputs[1])
        st = N.new('ShaderNodeMath'); st.operation = 'LESS_THAN'; st.inputs[1].default_value = math.cos(math.radians(22))
        L.new(d.outputs['Value'], st.inputs[0])
        mx = N.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.inputs[7].default_value = rgb(ROCK)
        L.new(st.outputs[0], mx.inputs['Factor']); L.new(g.outputs['Color'], mx.inputs[6])
        if not curva_km: return mx.outputs[2]
        ln_ = N.new('ShaderNodeVectorMath'); ln_.operation = 'LENGTH'; L.new(geo.outputs['Position'], ln_.inputs[0])
        h = N.new('ShaderNodeMath'); h.operation = 'SUBTRACT'; h.inputs[1].default_value = raio_km
        L.new(ln_.outputs['Value'], h.inputs[0])
        dv = N.new('ShaderNodeMath'); dv.operation = 'DIVIDE'; dv.inputs[1].default_value = curva_km; L.new(h.outputs[0], dv.inputs[0])
        fr = N.new('ShaderNodeMath'); fr.operation = 'FRACT'; L.new(dv.outputs[0], fr.inputs[0])
        pp = N.new('ShaderNodeMath'); pp.operation = 'PINGPONG'; pp.inputs[1].default_value = 0.5; L.new(fr.outputs[0], pp.inputs[0])
        lt = N.new('ShaderNodeMath'); lt.operation = 'LESS_THAN'; lt.inputs[1].default_value = 0.035; L.new(pp.outputs[0], lt.inputs[0])
        lm = N.new('ShaderNodeMix'); lm.data_type = 'RGBA'; lm.inputs[7].default_value = rgb(PALETA['rocha'])
        L.new(lt.outputs[0], lm.inputs['Factor']); L.new(mx.outputs[2], lm.inputs[6])
        return lm.outputs[2]
    return fn


# ---------- Mars (usar_corpo('marte')) ----------
# The Moon's map sits on LOLA's south polar stereographic grid. Mars's sits in Jezero crater,
# 18 deg N, on equirectangular (simple cylindrical) grids. Map km there are x = R * lon,
# y = R * lat (radians), so every source is placed through lat/lon with ONE radius: the CTX and
# MOLA products use 3396.19 and 3396.0 km, which would put them ~250 m apart if mixed in km.
CORPO = 'lua'
R_MARTE_KM = 3396.19
# The playable map: Jezero crater, next to where Perseverance landed (18.4447 N, 77.4508 E).
# make_terrain_marte.py picks the window; this is its center (lat, lon in degrees).
CENTRO_MARTE = (18.4447, 77.4508)
S3 = 'https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/CTX/'
MEGDR = 'https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/'
# Equirectangular DEMs: pixel (line l, sample s, 0-based) -> lat = lat0 - l / res, lon = lon0 + s / res.
DEMS_MARTE = {
    # USGS, Mars 2020 Terrain Relative Navigation: CTX DTM of Jezero, 20 m, float32 meters (areoid).
    # Label: LINE_PROJECTION_OFFSET 55484.157, SAMPLE_PROJECTION_OFFSET -228683.663, 2963.7349 px/deg.
    'ctx20': dict(url=S3 + 'JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif',
                  tipo='geotiff', res=2963.734876165311, lat0=55484.1570094 / 2963.734876165311,
                  lon0=(1 + 228683.66254265) / 2963.734876165311, m=20.0),
    # MGS MOLA MEGDR, 128 px/deg (463 m), tile 0-44 N, 0-90 E, 16-bit big-endian meters (areoid).
    'mola128': dict(url=MEGDR + 'meg128/megt44n000hb.img', tipo='megdr', res=128.0, lat0=44 - 0.5 / 128,
                    lon0=0.5 / 128, linhas=5632, amostras=11520, m=463.0),
    # The same, global at 16 px/deg (3.7 km), for the globe.
    'mola16': dict(url=MEGDR + 'meg016/megt90n000eb.img', tipo='megdr', res=16.0, lat0=90 - 0.5 / 16,
                   lon0=0.5 / 16, linhas=2880, amostras=5760, m=3705.0),
}


def usar_corpo(nome):
    """Switch every shared value to another body. Call right after `import comum`."""
    global CORPO, R_KM, X0, Y0, DEMS, polar_para_3d, janela, LIGHT, GROUND, ROCK, OUTLINE
    if nome == 'lua':
        return
    if nome != 'marte':
        raise ValueError(nome)
    CORPO = 'marte'
    R_KM = R_MARTE_KM
    X0 = R_KM * math.radians(CENTRO_MARTE[1]) * 1000      # map center, meters (like the Moon's X0, Y0)
    Y0 = R_KM * math.radians(CENTRO_MARTE[0]) * 1000
    DEMS = DEMS_MARTE
    polar_para_3d = equi_para_3d
    janela = janela_equi
    # The palette dict is shared by reference (estilo_lua.PALETA): change it in place.
    import json
    from estilo_lua import ROOT
    with open(os.path.join(ROOT, 'src', 'dados', 'paleta_marte.json')) as f:
        nova = json.load(f)
    PALETA.clear(); PALETA.update(nova)
    LIGHT, GROUND, ROCK, OUTLINE = PALETA['luzSolo'], PALETA['solo'], PALETA['rocha'], PALETA['contorno']


def equi_para_3d(x_km, y_km, h_km):
    """Equirectangular map km (x = R lon, y = R lat) + height -> body-fixed xyz (km)."""
    lat, lon = y_km / R_KM, x_km / R_KM
    r = R_KM + h_km
    return (r * math.cos(lat) * math.cos(lon), r * math.cos(lat) * math.sin(lon), r * math.sin(lat))


def km_de_latlon(lat, lon):
    return R_KM * math.radians(lon), R_KM * math.radians(lat)


def _baixar(url, destino):
    if not os.path.exists(destino):
        os.makedirs(os.path.dirname(destino), exist_ok=True)
        tmp = destino + '.part'
        with urllib.request.urlopen(url) as r, open(tmp, 'wb') as f:
            while True:
                b = r.read(1 << 20)
                if not b: break
                f.write(b)
        os.replace(tmp, destino)
    return destino


def ler_dem(dem, lat_c, lon_c, meio_km):
    """Raw heights (m) of an equirectangular DEM around (lat_c, lon_c), half side meio_km,
    with the line and sample of the first pixel. MEGDR files are read by HTTP range (only the
    rows needed, like LOLA); the CTX GeoTIFF is small and read whole."""
    c = DEMS_MARTE[dem]
    dlat = math.degrees(meio_km / R_MARTE_KM)
    dlon = dlat / math.cos(math.radians(lat_c))
    l0 = max(0, int((c['lat0'] - (lat_c + dlat)) * c['res']))
    l1 = int(math.ceil((c['lat0'] - (lat_c - dlat)) * c['res']))
    s0 = max(0, int((lon_c - dlon - c['lon0']) * c['res']))
    s1 = int(math.ceil((lon_c + dlon - c['lon0']) * c['res']))
    os.makedirs(CACHE, exist_ok=True)
    if c['tipo'] == 'geotiff':
        from PIL import Image
        arq = _baixar(c['url'], os.path.join(CACHE, 'marte', os.path.basename(c['url'])))
        a = np.array(Image.open(arq), dtype=np.float32)
        l1, s1 = min(l1, a.shape[0] - 1), min(s1, a.shape[1] - 1)
        return a[l0:l1 + 1, s0:s1 + 1], l0, s0
    cache = os.path.join(CACHE, 'marte', f'{dem}_{l0}_{l1}.npy')
    if os.path.exists(cache):
        linhas = np.load(cache)
    else:
        os.makedirs(os.path.dirname(cache), exist_ok=True)
        lado = c['amostras'] * 2
        req = urllib.request.Request(c['url'], headers={'Range': f'bytes={l0 * lado}-{(l1 + 1) * lado - 1}'})
        linhas = np.frombuffer(urllib.request.urlopen(req).read(), '>i2').reshape(-1, c['amostras']).astype(np.float32)
        np.save(cache, linhas)
    return linhas[:, s0:s1 + 1], l0, s0


def janela_equi(dem, meio_km, passo):
    """Like janela() for the Moon: heights (km) around the map center, block-averaged every
    `passo` pixels, with x_km, y_km of each block center (x = R lon, y = R lat; y falls with
    the row, as on the Moon). Cropped square in km (the grid is narrower in lon by cos(lat))."""
    lat_c, lon_c = math.degrees(Y0 / 1000 / R_KM), math.degrees(X0 / 1000 / R_KM)
    c = DEMS_MARTE[dem]
    a, l0, s0 = ler_dem(dem, lat_c, lon_c, meio_km)
    n0, n1 = a.shape[0] // passo, a.shape[1] // passo
    a = a[:n0 * passo, :n1 * passo].reshape(n0, passo, n1, passo).mean(axis=(1, 3)) / 1000
    idx_l = np.arange(n0) * passo + passo / 2 - 0.5
    idx_s = np.arange(n1) * passo + passo / 2 - 0.5
    ys = R_KM * np.radians(c['lat0'] - (l0 + idx_l) / c['res'])
    xs = R_KM * np.radians(c['lon0'] + (s0 + idx_s) / c['res'])
    return a, xs, ys

