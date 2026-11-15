# Generated with AI assistance. See README, "Use of AI tools".
# The zoom out from the Mars base to the whole of Mars, rendered as one continuous 3D shot: the
# Mars version of make_flight.py (kept apart so the approved Moon film cannot change).
#
# One Mars in one scene, real size (km): a globe with NASA MOLA relief and Viking color, and,
# around the base in Jezero crater, nested patches laid on the sphere at their true place and
# curvature, each finer one covering the coarser ground under it:
#   the game map (64 x 64 tiles of 80 m, from make_terrain_marte.py, with its illustrated craters)
#   18 km of CTX at 80 m (Jezero's floor and delta)          USGS CTX DTM, 20 m
#   64 km of MOLA at 463 m (the whole crater and its rim)    MGS MOLA MEGDR 128 px/deg
#   800 km of MOLA at 1.9 km (Isidis basin, Syrtis)          same
#   the globe, MOLA 16 px/deg + Viking color, with a hole under the patches
# The camera starts exactly where the game's map view is (2:1 isometric, same scale) and pulls
# back to the globe exactly as MarteVista draws it live (planetaShader.ts: tilted view, Jezero
# turned toward the camera, light from the front left), so the game can swap the last frame for
# the live globe without a jump.
#
#   prime-run blender -b -P tools/lua3d/make_flight_marte.py -- [--frames 150] [--w 1280] [--h 720] [--so 0,75,149]
# Out: public/marte/voo/f<NN>.webp (transparent), src/dados/voo_marte.json
import bpy, bmesh, sys, os, json, math, subprocess
import numpy as np
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import comum as C
C.usar_corpo('marte')
from estilo_lua import PALETA, contornos_crateras

ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
TMP = os.path.join(C.CACHE, 'voo_marte_tmp')
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
import argparse
ap = argparse.ArgumentParser()
ap.add_argument('--frames', type=int, default=150)
ap.add_argument('--w', type=int, default=1280)
ap.add_argument('--h', type=int, default=720)
ap.add_argument('--so', default='', help='render only these frames, e.g. 0,45,89 (preview)')
ap.add_argument('--nome', default='voo', help='output: public/marte/<nome>/ and src/dados/<nome>_marte.json')
args = ap.parse_args(argv)
OUT = os.path.join(ROOT, 'public', 'marte', args.nome)

R = C.R_KM
FOV = math.radians(10)
S_INICIO = 530.33 * 0.32 * args.w / 1280          # px per km of the game map at its widest zoom (as the Moon)
DIAM_FIM = round(0.55 * min(args.w, args.h))      # MarteVista's globe at z = 1: 0.55 x the short side
MARGEM = 1.12

with open(os.path.join(ROOT, 'src', 'dados', 'terreno_marte.json')) as f:
    T = json.load(f)
LAT0, LON0 = T['centro']['lat'], T['centro']['lon']
COS0 = math.cos(math.radians(LAT0))
x0k, y0k = C.km_de_latlon(LAT0, LON0)
C.X0, C.Y0 = x0k * 1000, y0k * 1000               # the patches are cut around the map center

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'BLENDER_EEVEE'; sc.render.film_transparent = True
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'; sc.render.filter_size = 1.0


def malha(nome, verts, faces, mat, uv=False, uvs=None):
    me = bpy.data.meshes.new(nome); me.from_pydata(verts, [], faces)
    if uvs is not None:                      # one (u, v) per vertex
        vi = np.empty(len(me.loops), np.int32); me.loops.foreach_get('vertex_index', vi)
        me.uv_layers.new(name='UVMap').data.foreach_set('uv', np.asarray(uvs, np.float32)[vi].ravel())
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:
        if f.normal.dot(f.calc_center_median()) < 0: f.normal_flip()
    if uv:                                   # equirectangular UVs from each vertex direction
        uvl = bm.loops.layers.uv.new('UVMap')
        for fc in bm.faces:
            for lp in fc.loops:
                x, y, z = lp.vert.co.normalized()
                lp[uvl].uv = (0.5 + math.atan2(y, x) / (2 * math.pi), 0.5 + math.asin(max(-1, min(1, z))) / math.pi)
    bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    ob = bpy.data.objects.new(nome, me); sc.collection.objects.link(ob)
    me.materials.append(mat)
    return ob


def chao_km(x, y):
    """Ground km from the map center (east, north) for equirectangular map km (x = R lon)."""
    return (x - x0k) * COS0, y - y0k


disco = lambda r: (lambda x, y: math.hypot(*chao_km(x, y)) < r)
quad = lambda m: (lambda x, y: max(abs(v) for v in chao_km(x, y)) < m)


def remendo(a, xs, ys, dentro, sobe=0.0):
    """Heights grid (rows = ys, cols = xs, km) -> verts on the sphere, faces where dentro(x, y)."""
    n0, n1 = a.shape
    verts = [C.polar_para_3d(xs[i], ys[j], a[j, i] + sobe) for j in range(n0) for i in range(n1)]
    faces = []
    for j in range(n0 - 1):
        for i in range(n1 - 1):
            cx, cy = (xs[i] + xs[i + 1]) / 2, (ys[j] + ys[j + 1]) / 2
            if dentro(cx, cy): faces.append((j * n1 + i, (j + 1) * n1 + i, (j + 1) * n1 + i + 1, j * n1 + i + 1))
    return verts, faces


# ---------- the game map, corner for corner (gx east, gy south, 80 m tiles) ----------
n = T['n']
MT = T['metrosPorTile'] / 1000
crateras = [(c['x'], c['y'], c['raio'], c['profundidade']) for c in T.get('relevo', {}).get('crateras', [])]
def altura_mapa(x, y):
    ix, iy = min(n - 1, int(x)), min(n - 1, int(y)); fx, fy = x - ix, y - iy
    h = T['alturas']
    z = (h[iy][ix] * (1 - fx) + h[iy][ix + 1] * fx) * (1 - fy) + (h[iy + 1][ix] * (1 - fx) + h[iy + 1][ix + 1] * fx) * fy
    for a, b, r, depth in crateras:
        t = math.hypot(x - a, y - b) / r
        if t < .86: z -= depth * (1 - (t / .86) ** 2) ** 1.3
        if .68 < t < 1.25: z += depth * .32 * math.sin(math.pi * (t - .68) / .57) ** 2
    return z
def ponto_mapa(x, y, extra=0):
    leste, norte = (x - n / 2) * MT, -(y - n / 2) * MT
    return C.polar_para_3d(x0k + leste / COS0, y0k + norte, altura_mapa(x, y) * MT + T['alturaBaseM'] / 1000 + .40 + extra)
RUIDO = 0.08 / 0.075
sub = 4; grid = n * sub
v = [ponto_mapa(i / sub, j / sub) for j in range(grid + 1) for i in range(grid + 1)]
f = [(j * (grid + 1) + i, (j + 1) * (grid + 1) + i, (j + 1) * (grid + 1) + i + 1, j * (grid + 1) + i + 1) for j in range(grid) for i in range(grid)]
# Detail smaller than a few pixels crawls and flickers from one frame to the next as the camera
# backs away (it made players queasy). The regolith's patches (1 km, and 0.5 km in its finer
# octave) fade to the middle tone between 16 and 5 px wide, and the illustrated crater rims (about 8 m wide lines) fade out
# from the first frame on, before they are thinner than a pixel. Distances from the frame's
# width and the lens, so the light set (half the pixels) fades sooner.
PX_POR_KM_A_1KM = round(args.w * 1.12) / (2 * math.tan(math.radians(10) / 2))   # px per km at 1 km away
# The noise has a second octave half the size (Detail 1): the limits are set on that one.
LOD_CHAO = (RUIDO / 2 * PX_POR_KM_A_1KM / 16, RUIDO / 2 * PX_POR_KM_A_1KM / 5)
def sumir_aros(perto, longe):
    for nome in ('Crater illustrated outline', 'Crater chalk edge'):
        m = bpy.data.materials.get(nome)
        if not m: continue
        N, L = m.node_tree.nodes, m.node_tree.links
        em = next(n for n in N if n.type == 'EMISSION'); out = next(n for n in N if n.type == 'OUTPUT_MATERIAL')
        tr = N.new('ShaderNodeBsdfTransparent'); mx = N.new('ShaderNodeMixShader')
        L.new(C.sumir_longe(N, L, perto, longe), mx.inputs['Fac'])
        L.new(em.outputs[0], mx.inputs[1]); L.new(tr.outputs[0], mx.inputs[2]); L.new(mx.outputs[0], out.inputs['Surface'])
        m.surface_render_method = 'BLENDED'
malha('mapa', v, f, C.toon(bpy, 'mapa', C.albedo_chao(RUIDO, lod=LOD_CHAO)))
contornos_crateras(bpy, sc, crateras, lambda x, y: ponto_mapa(x, y, .022 * .08))
sumir_aros(0.0084 * PX_POR_KM_A_1KM / 1.6, 0.0084 * PX_POR_KM_A_1KM / 0.5)
CENTRO = Vector(ponto_mapa(n / 2, n / 2))


# ---------- the globe: MOLA 16 px/deg relief + Viking color, hole under the 800 km patch ----------
mola = os.path.join(C.CACHE, 'marte', 'mola16.npy')
if not os.path.exists(mola):
    arq = C._baixar(C.DEMS_MARTE['mola16']['url'], os.path.join(C.CACHE, 'marte', 'megt90n000eb.img'))
    np.save(mola, np.fromfile(arq, '>i2').reshape(2880, 5760))
alt16 = np.roll(np.load(mola).astype(np.float32), 2880, axis=1)   # lon 0 in the middle, like mars.jpg
# Under the patches the globe sinks 3 km (back to its true height by 480 km out), so its coarse
# mesh never pokes through their finer ground where the two overlap.
_la = np.radians(90 - (np.arange(2880) + 0.5) / 16)[:, None]
_lo = np.radians((np.arange(5760) + 0.5) / 16 - 180)[None, :]
_cj = math.cos(math.radians(LAT0))
_d = R * np.arccos(np.clip(np.sin(_la) * math.sin(math.radians(LAT0)) + np.cos(_la) * _cj * np.cos(_lo - math.radians(LON0)), -1, 1))
_k = np.clip((_d - 400) / 80, 0, 1)
alt16 -= 3000 * (1 - _k * _k * (3 - 2 * _k))
NLON, NLAT = 720, 360
lats = np.radians(np.linspace(-89.9, 89.9, NLAT))
lons = np.radians(np.linspace(-180, 180, NLON + 1))
LA, LO = np.meshgrid(lats, lons, indexing='ij')
co = np.stack([np.cos(LA) * np.cos(LO), np.cos(LA) * np.sin(LO), np.sin(LA)], -1).reshape(-1, 3)
uv_v = np.stack([0.5 + LO / (2 * np.pi), 0.5 + LA / np.pi], -1).reshape(-1, 2)
idx = np.arange(NLAT * (NLON + 1)).reshape(NLAT, NLON + 1)
quads = np.stack([idx[:-1, :-1], idx[:-1, 1:], idx[1:, 1:], idx[1:, :-1]], -1).reshape(-1, 4)
centro_dir = CENTRO.normalized()
dentro_buraco = (co[quads].mean(1) @ np.array(centro_dir)) > math.cos(330 / R)
quads = quads[~dentro_buraco]
me = bpy.data.meshes.new('globo')
me.vertices.add(len(co)); me.vertices.foreach_set('co', co.astype(np.float32).ravel())
me.loops.add(quads.size); me.loops.foreach_set('vertex_index', quads.ravel().astype(np.int32))
me.polygons.add(len(quads)); me.polygons.foreach_set('loop_start', (np.arange(len(quads)) * 4).astype(np.int32))
me.update(calc_edges=True)
uvl = me.uv_layers.new(name='UVMap'); uvl.data.foreach_set('uv', uv_v[quads.ravel()].astype(np.float32).ravel())
me.polygons.foreach_set('use_smooth', np.ones(len(quads), bool))
me.validate()
globo = bpy.data.objects.new('globo', me); sc.collection.objects.link(globo)
globo.scale = (R, R, R)
# Relief as a float image in object units (height / R), so the modifier needs no scaling.
dem = bpy.data.images.new('mola16', 5760, 2880, float_buffer=True, alpha=False)
px = np.repeat((alt16[::-1] / 1000 / R)[..., None], 4, -1); px[..., 3] = 1
dem.colorspace_settings.name = 'Non-Color'          # before the pixels: changing it clears them
dem.pixels.foreach_set(px.astype(np.float32).ravel())
tex = bpy.data.textures.new('dem', 'IMAGE'); tex.image = dem; tex.extension = 'REPEAT'
d = globo.modifiers.new('relevo', 'DISPLACE'); d.texture = tex; d.texture_coords = 'UV'; d.direction = 'NORMAL'
d.mid_level = 0; d.strength = 1
# The live globe's own map and light bands (planetaShader.ts reads public/lua/planetas/marte.png
# and the bands of paleta_lua.json), so the last frame and the live globe are the same picture.
cor = bpy.data.images.load(os.path.join(ROOT, 'public', 'lua', 'planetas', 'marte.png'))
with open(os.path.join(ROOT, 'src', 'dados', 'paleta_lua.json')) as fp:
    LUZ_GLOBO = json.load(fp)['luzLua']
def albedo_globo(N, L):
    tc = N.new('ShaderNodeTexCoord'); im = N.new('ShaderNodeTexImage'); im.image = cor; im.extension = 'REPEAT'
    L.new(tc.outputs['UV'], im.inputs['Vector'])
    return im.outputs['Color']
mat_globo = C.toon(bpy, 'globo', albedo_globo, luz=LUZ_GLOBO)
globo.data.materials.append(mat_globo)

# ---------- camera path ----------
def em(x, y):
    return Vector(C.polar_para_3d(x, y, altura_mapa(n / 2, n / 2) * MT + T['alturaBaseM'] / 1000))
B = em(x0k, y0k)
nrm = B.normalized()
gx = (em(x0k + 0.01 / COS0, y0k) - B).normalized()        # map +gx = east
gyb = (em(x0k, y0k + 0.01) - B).normalized()              # map Blender +Y (= -gy) = north
e30 = math.radians(30)
to_cam0 = (gx * math.cos(e30) * math.sqrt(0.5) - gyb * math.cos(e30) * math.sqrt(0.5) + nrm * math.sin(e30)).normalized()
def olhar(frente, cima):
    z = -frente.normalized(); x = cima.cross(z).normalized(); y = z.cross(x)
    return Matrix((x, y, z)).transposed().to_quaternion()
q0 = olhar(-to_cam0, nrm)
right0 = q0 @ Vector((1, 0, 0))
sol0 = (to_cam0 * 0.5 - right0 * 1.0 + nrm * 0.45).normalized()   # the map's stylized light

# ---------- CTX 18 km, MOLA 64 km and 800 km, each with a hole where the finer one sits ----------
# The relief at these scales is gentle (Jezero's rim rises a few degrees over 45 km), so the hard
# light bands alone left it one flat color. Each patch wears a baked shaded relief instead: the
# NASA heights, exaggerated, lit from the map's light, a few soft-edged tones (the flat style),
# tinted by height (Isidis's floor darker, the highlands lighter). It is a texture, so it never
# swims or crawls as the camera moves (the GPU's mipmaps keep it calm as it shrinks). It
# multiplies the regolith of the map, so every patch meets the next one in the same colors; the
# outer ring of the 800 km patch melts into the globe's map, and the CTX patch into the game map.
from scipy.ndimage import zoom as ampliar, map_coordinates


def lin(h):
    c = np.array([int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)])
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


BASE = lin('#c26a3b')                       # the regolith's middle tone (solo at 0.5), as far away
TONS = [(0.0, lin('#a9552f')), (0.36, BASE), (0.65, lin('#d98a57')), (1.0, lin('#eab07e'))]
SOMBRA, REALCE = lin('#5a3428'), lin('#f8e2c8')
ALT = (-4.6, 1.2)                           # km above the areoid: Isidis floor .. Syrtis highlands
LUZ_CHAO = np.array([sol0.dot(gx), sol0.dot(gyb), sol0.dot(nrm)])
LUZ_CHAO /= np.linalg.norm(LUZ_CHAO)
cor_globo = np.asarray(cor.pixels[:], np.float32).reshape(cor.size[1], cor.size[0], 4)[..., :3]
cor_globo = np.where(cor_globo <= 0.04045, cor_globo / 12.92, ((cor_globo + 0.055) / 1.055) ** 2.4)   # sRGB -> linear
from scipy.ndimage import gaussian_filter
cor_globo_suave = np.stack([gaussian_filter(cor_globo[..., i], 5, mode='wrap') for i in range(3)], -1)


def suave_np(a, b, x):
    k = np.clip((x - a) / (b - a), 0, 1)
    return k * k * (3 - 2 * k)


def tons(v, passo=0.22, macio=0.18):
    """A few flat tones with soft edges (no stair steps when a texel grows to many pixels)."""
    k = v / passo; b = np.floor(k)
    return (b + suave_np(0.5 - macio, 0.5 + macio, k - b)) * passo


def relevo(nome, a, xs, ys, amplia, exagero, borda_fora=None, miolo=None, luz_toon=None, suaviza=0):
    """Shaded relief of heights a (km, rows ys falling, cols xs) as a multiply-by image over the
    regolith (BASE -> the wanted color). borda_fora = (r0, r1) km: blend to the globe's map;
    miolo = (r0, r1) km, square: blend to plain regolith (the game map)."""
    A = np.nan_to_num(a, nan=float(np.nanmean(a)))
    if amplia != 1: A = ampliar(A, amplia, order=3)
    # Fine relief right under the camera rushes past during the zoom: smoothed (sigma in texels),
    # small bumps would only sparkle.
    if suaviza: A = gaussian_filter(A, suaviza)
    nl, nc = A.shape
    X = np.linspace(xs[0], xs[-1], nc)[None, :].repeat(nl, 0)
    Y = np.linspace(ys[0], ys[-1], nl)[:, None].repeat(nc, 1)
    dx = (xs[-1] - xs[0]) / (nc - 1) * COS0
    dy = (ys[-1] - ys[0]) / (nl - 1)
    dn, de = np.gradient(A, dy, dx)                   # dh/dnorth, dh/deast
    n = np.stack([-de * exagero, -dn * exagero, np.ones_like(A)], -1)
    luz = (n @ LUZ_CHAO) / np.linalg.norm(n, axis=-1) / LUZ_CHAO[2]   # 1 = flat ground
    luz = tons(np.clip(luz, 0, 1.5))
    t = np.clip((A - ALT[0]) / (ALT[1] - ALT[0]), 0, 1)
    base = np.zeros(A.shape + (3,))
    for (p0, c0), (p1, c1) in zip(TONS, TONS[1:]):
        k = np.clip((t - p0) / (p1 - p0), 0, 1)[..., None]
        base = np.where((t >= p0)[..., None], c0 * (1 - k) + c1 * k, base)
    leste, norte = (X - x0k) * COS0, Y - y0k
    dist = np.hypot(leste, norte)
    lat, lon = Y / R, X / R                           # the globe's map: lon 0 in the middle, top north
    # Read the globe's map the way the GPU does (bilinear), or its texels show as steps.
    gi = (0.5 - lat / math.pi) * cor.size[1] - 0.5
    gj = (0.5 + lon / (2 * math.pi)) * cor.size[0] - 0.5
    ler = lambda m: np.stack([map_coordinates(m[::-1, :, i], [gi, gj], order=1, mode='grid-wrap') for i in range(3)], -1)
    # Far from the base the tint turns into the globe's own colors (softened), so the patch and
    # the globe around it are the same Mars; near the base it stays the regolith's.
    g = suave_np(8, 150, dist)[..., None]
    base = base * (1 - g) + ler(cor_globo_suave) * g
    l = luz[..., None]
    col = np.where(l <= 1, SOMBRA * (1 - np.clip(l, 0, 1)) + base * np.clip(l, 0, 1),
                   base * (1 - (l - 1) * 0.6) + REALCE * (l - 1) * 0.6)
    if borda_fora:
        k = suave_np(*borda_fora, dist)[..., None]
        col = col * (1 - k) + ler(cor_globo) * k
    if miolo:
        k = suave_np(*miolo, np.maximum(abs(leste), abs(norte)))[..., None]
        col = BASE * (1 - k) + col * k
    T = col / BASE
    img = bpy.data.images.new(nome, nc, nl, float_buffer=True, alpha=False)
    px = np.concatenate([T, np.ones(T.shape[:2] + (1,))], -1)[::-1]   # Blender's row 0 is the bottom
    img.colorspace_settings.name = 'Non-Color'          # before the pixels: changing it clears them
    img.pixels.foreach_set(px.astype(np.float32).ravel())
    def uv(x, y):
        u = (x - xs[0]) / (xs[-1] - xs[0]); w = (y - ys[-1]) / (ys[0] - ys[-1])
        return (0.5 + u * (nc - 1)) / nc, (0.5 + w * (nl - 1)) / nl
    def albedo(N, L):
        chao = C.albedo_chao(RUIDO, lod=LOD_CHAO)(N, L)
        tc = N.new('ShaderNodeTexCoord'); im = N.new('ShaderNodeTexImage'); im.image = img
        im.extension = 'EXTEND'; im.interpolation = 'Cubic'
        L.new(tc.outputs['UV'], im.inputs['Vector'])
        mul = N.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs['Factor'].default_value = 1
        L.new(chao, mul.inputs[6]); L.new(im.outputs['Color'], mul.inputs[7])
        return mul.outputs[2]
    return (C.toon(bpy, nome, albedo, luz=luz_toon) if luz_toon else C.toon(bpy, nome, albedo)), uv


def remendo_uv(nome, a, xs, ys, dentro, sobe, mat, uv):
    v, f = remendo(a, xs, ys, dentro, sobe)
    uvs = [uv(xs[i], ys[j]) for j in range(len(ys)) for i in range(len(xs))]
    return malha(nome, v, f, mat, uvs=uvs)


a, xa, ya = C.janela('ctx20', 9, 4)                        # 80 m mesh
at, xat, yat = C.janela('ctx20', 9, 1)                     # 20 m relief
mat, uv = relevo('r18', at, xat, yat, 1, 2.5, miolo=(2.45, 3.6), suaviza=3)
remendo_uv('regiao18', a, xa, ya, lambda x, y: disco(8.6)(x, y) and not quad(2.45)(x, y), 0.35, mat, uv)
b, xb, yb = C.janela('mola128', 32, 1)                     # 463 m
mat, uv = relevo('r64', b, xb, yb, 6, 5, luz_toon=LUZ_GLOBO, suaviza=3)
remendo_uv('regiao64', b, xb, yb, lambda x, y: disco(31.5)(x, y) and not disco(8.2)(x, y), 0.32, mat, uv)
c_, xc, yc = C.janela('mola128', 400, 4)                   # 1.85 km mesh
ct, xct, yct = C.janela('mola128', 400, 1)                 # 463 m relief
mat, uv = relevo('r800', ct, xct, yct, 1, 4, borda_fora=(300, 390), luz_toon=LUZ_GLOBO)
remendo_uv('regiao800', c_, xc, yc, lambda x, y: disco(398)(x, y) and not disco(29)(x, y), 0.25, mat, uv)

# The last frame = MarteVista's live globe: tilted view (planetaShader VISTA_INCLINADA) with the
# planet turned by giroOlhando(JEZERO.lon) - 12 deg. The shader reads the map at m = R(-giro) n,
# so a view-frame vector n is the planet-fixed vector R(-giro) n.
JEZERO_LON = 77.58
L_ = math.radians(JEZERO_LON)
giro = math.atan2(-math.cos(L_), -math.sin(L_)) - math.radians(12)
cg, sg = math.cos(giro), math.sin(giro)
fixo = lambda v: Vector((cg * v[0] + sg * v[1], -sg * v[0] + cg * v[1], v[2]))
to_cam1 = fixo((0, -0.8, 0.6)).normalized()
q1 = olhar(-to_cam1, fixo((0, 0.6, 0.8)))
ex, ey = -1.0, -0.5 / 0.6                                  # setSolTela(-1, 0.5), undoing the 0.6 squash
l = math.hypot(ex, ey)
sol1 = fixo((ex / l, ey / l, 0)).normalized()

RW, RH = round(args.w * MARGEM), round(args.h * MARGEM)
sc.render.resolution_x, sc.render.resolution_y = RW, RH
d0 = (RW / S_INICIO) / (2 * math.tan(FOV / 2))
d1 = (RW / DIAM_FIM * 2 * R) / (2 * math.tan(FOV / 2))

cam = bpy.data.cameras.new('voo'); cam.type = 'PERSP'; cam.sensor_fit = 'HORIZONTAL'; cam.angle = FOV
cam_o = bpy.data.objects.new('voo', cam); sc.collection.objects.link(cam_o); sc.camera = cam_o
cam_o.rotation_mode = 'QUATERNION'
sun = bpy.data.lights.new('sol', 'SUN'); sun.energy = 4.0; sun.use_shadow = False
sun_o = bpy.data.objects.new('sol', sun); sc.collection.objects.link(sun_o)


def suave(a, b, x):
    k = min(1, max(0, (x - a) / (b - a)))
    return k * k * (3 - 2 * k)


def quadro(p):
    dist = math.exp(math.log(d0) + (math.log(d1) - math.log(d0)) * p)
    q = q0.slerp(q1, suave(0.3, 0.97, p))
    alvo = B.lerp(Vector((0, 0, 0)), suave(0.45, 0.99, p))
    to_cam = q @ Vector((0, 0, 1))
    cam_o.location = alvo + to_cam * dist
    cam_o.rotation_quaternion = q
    cam.clip_start = max(0.01, dist * 0.2); cam.clip_end = dist + 3 * R
    ws = suave(0.72, 1.0, p)
    s = (sol0 * (1 - ws) + sol1 * ws).normalized()
    sun_o.rotation_euler = (-s).to_track_quat('-Z', 'Y').to_euler()


os.makedirs(OUT, exist_ok=True); os.makedirs(TMP, exist_ok=True)
n0 = max(2, round(args.frames * 0.13))
PS = [0.3 * k / n0 for k in range(n0)] + [0.3 + 0.7 * k / (args.frames - n0 - 1) for k in range(args.frames - n0)]
from bpy_extras.object_utils import world_to_camera_view
base_px = []
for p in PS:
    quadro(p); bpy.context.view_layer.update()
    vv = world_to_camera_view(sc, cam_o, B)
    base_px.append([round(vv.x * RW, 1), round((1 - vv.y) * RH, 1)])
lista = [int(k) for k in args.so.split(',')] if args.so else range(args.frames)
for i in lista:
    quadro(PS[i])
    png = os.path.join(TMP, f'f{i:02d}.png')
    sc.render.filepath = png
    bpy.ops.render.render(write_still=True)
    subprocess.run(['magick', png, '-quality', '72', '-define', 'webp:alpha-quality=90', os.path.join(OUT, f'f{i:02d}.webp')], check=True)
    print('frame', i, flush=True)
if not args.so:
    with open(os.path.join(ROOT, 'src', 'dados', f'{args.nome}_marte.json'), 'w') as f:
        json.dump({'quadros': args.frames, 'w': args.w, 'h': args.h, 'margem': MARGEM, 'sInicio': S_INICIO, 'diametroFim': DIAM_FIM,
                   'p': [round(p, 5) for p in PS], 'razao': round(d1 / d0, 3), 'base': base_px,
                   'arquivos': f'marte/{args.nome}/f<NN>.webp',
                   'nota': 'Frame 0 = the Mars map at sInicio px/km, centered on the map center. Last frame = MarteVista\'s live globe at z = 1 (diameter diametroFim px, centered, Jezero toward the camera). Frame i was rendered at camera distance d0 * razao ** p[i]; frames are w*margem x h*margem.'}, f, indent=1)
print('DONE')
