# Generated with AI assistance (Claude). See README, "Use of AI tools".
# The flight from the base to the whole Moon, rendered as one continuous 3D shot.
#
# One Moon in one scene, real size (km): a sphere with NASA's global relief and color, and, around
# the base, nested patches of NASA's polar relief laid on the sphere at their true place and
# curvature (the 64 x 64 game map at 80 m, 64 km at 320 m, 800 km at 3.8 km). Each finer patch
# replaces the coarser ground under it. A camera starts exactly where the game's map view is
# (2:1 isometric, same scale) and pulls back along a smooth path to the Moon view of chapter
# day 1, turning to it as it goes. The game plays the frames (src/cenas/Espaco.ts).
#
#   blender -b -P tools/lua3d/make_flight.py -- [--frames 72] [--w 1600] [--h 900]
# Out: public/lua/voo/f<NN>.webp (transparent), src/dados/voo.json
import bpy, bmesh, sys, os, json, math, subprocess
import numpy as np
from mathutils import Vector, Quaternion, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import comum as C
from estilo_lua import PALETA, contornos_crateras

ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
TMP = os.path.join(C.CACHE, 'voo_tmp')
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
import argparse
ap = argparse.ArgumentParser()
ap.add_argument('--frames', type=int, default=120)
ap.add_argument('--w', type=int, default=1280)
ap.add_argument('--h', type=int, default=720)
ap.add_argument('--so', default='', help='render only these frames, e.g. 0,30,71 (preview)')
ap.add_argument('--so-json', action='store_true', help='only recompute voo.json (camera path), no pictures')
ap.add_argument('--destino', default='', help='optional staging root; contains public/ and src/dados/')
ap.add_argument('--nome', default='voo', help="output name: public/lua/<nome>/ and src/dados/<nome>.json (voo_leve = light set for phones)")
args = ap.parse_args(argv)
DESTINO = args.destino or ROOT
OUT = os.path.join(DESTINO, 'public', 'lua', args.nome)

R = C.R_KM
FOV = math.radians(10)               # narrow lens: near-isometric at both ends, like the game
S_INICIO_HD = 530.33 * 0.32          # px per km of the game's map at its widest ground zoom (1280 wide)
DIAM_FIM_HD = 448                    # px: globe diameter in the last frame at 1280 x 720 (62% of the height)
# Same framing at any frame size: both scale with it (the light set for phones is 640 x 360).
S_INICIO = S_INICIO_HD * args.w / 1280
DIAM_FIM = round(DIAM_FIM_HD * args.h / 720)
MAPA_PAD = 1.0                       # km around the map that the 64 km patch leaves in place

with open(os.path.join(ROOT, 'src', 'dados', 'terreno.json')) as f:
    T = json.load(f)
with open(os.path.join(ROOT, 'src', 'dados', 'moon_view.json')) as f:
    V = json.load(f)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'BLENDER_EEVEE'; sc.render.film_transparent = True
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'; sc.render.filter_size = 1.0
sc.render.resolution_x, sc.render.resolution_y = args.w, args.h


def uv_latlon(bm):
    """Equirectangular UVs from each vertex direction (the NASA color map's layout)."""
    uvl = bm.loops.layers.uv.new('UVMap')
    for fc in bm.faces:
        uvs = []
        for lp in fc.loops:
            x, y, z = lp.vert.co.normalized()
            uvs.append([0.5 + math.atan2(y, x) / (2 * math.pi), 0.5 + math.asin(max(-1, min(1, z))) / math.pi])
        us = [q[0] for q in uvs]
        if max(us) - min(us) > 0.5:
            for q in uvs:
                if q[0] < 0.5: q[0] += 1
        for lp, q in zip(fc.loops, uvs): lp[uvl].uv = q


def malha(nome, verts, faces, mat, uv=False):
    me = bpy.data.meshes.new(nome); me.from_pydata(verts, [], faces)
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:                                    # outward
        if f.normal.dot(f.calc_center_median()) < 0: f.normal_flip()
    if uv: uv_latlon(bm)
    bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    ob = bpy.data.objects.new(nome, me); sc.collection.objects.link(ob)
    me.materials.append(mat)
    return ob


def grade_polar(a, xs, ys, dentro, sobe=0.0):
    """Heights grid on polar stereographic km -> verts on the sphere, faces where dentro(x, y).
    `sobe` lifts the patch a little (km) so it always covers the coarser ground under it."""
    n = a.shape[0]
    verts = [C.polar_para_3d(xs[i], ys[j], a[j, i] + sobe) for j in range(n) for i in range(n)]
    faces = []
    for j in range(n - 1):
        for i in range(n - 1):
            cx, cy = (xs[i] + xs[i + 1]) / 2, (ys[j] + ys[j + 1]) / 2
            if dentro(cx, cy): faces.append((j * n + i, (j + 1) * n + i, (j + 1) * n + i + 1, j * n + i + 1))
    return verts, faces


x0k, y0k = C.X0 / 1000, C.Y0 / 1000
CENTRO = None   # set after the map heights are read (base point, moon-fixed km)
disco = lambda r: (lambda x, y: (x - x0k) ** 2 + (y - y0k) ** 2 < r * r)
quad = lambda m: (lambda x, y: abs(x - x0k) < m and abs(y - y0k) < m)

# ---------- the game map, corner for corner ----------
n = T['n']
alt = np.array(T['alturas']) * T['metrosPorTile'] / 1000 + T['alturaBaseM'] / 1000
l0, s0 = T['janela']['linha'], T['janela']['amostra']
xs = np.array([(s0 + i - 1 - 3799.5) * 0.08 for i in range(n + 1)])
ys = np.array([-(l0 + j - 1 - 3799.5) * 0.08 for j in range(n + 1)])
# One regolith look for the map and the 64 km patch (same noise, same scale), so they read as one
# ground; the map adds its 80 m contour lines, as in the game picture.
RUIDO = 0.08 / 0.075                  # the noise scale of terrain.png (0.22 per 80 m tile)
CENTRO = tuple(C.polar_para_3d(x0k, y0k, alt[n // 2, n // 2]))
# The map and the 64 km patch are opaque and share one regolith pattern (same noise, in moon
# coordinates), so the pattern runs on across their edge; the finer one sits a few meters higher
# and wins the depth test. Only the 800 km patch fades (into the globe): blended surfaces are not
# sorted against each other, so there is just one.
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
mat_mapa = C.toon(bpy, 'mapa', C.albedo_chao(RUIDO, lod=LOD_CHAO))
# The playable patch shares its bowl heights and illustrated rim geometry with terrain.png.
crateras=[(c['x'],c['y'],c['raio'],c['profundidade']) for c in T.get('relevo',{}).get('crateras',[])]
def altura_mapa(x,y):
    ix,iy=min(n-1,int(x)),min(n-1,int(y));fx,fy=x-ix,y-iy
    h=T['alturas']
    z=(h[iy][ix]*(1-fx)+h[iy][ix+1]*fx)*(1-fy)+(h[iy+1][ix]*(1-fx)+h[iy+1][ix+1]*fx)*fy
    for a,b,r,depth in crateras:
        t=math.hypot(x-a,y-b)/r
        if t<.86:z-=depth*(1-(t/.86)**2)**1.3
        if .68<t<1.25:z+=depth*.32*math.sin(math.pi*(t-.68)/.57)**2
    return z
def ponto_mapa(x,y,extra=0):
    return C.polar_para_3d(xs[0]+x*.08,ys[0]-y*.08,altura_mapa(x,y)*.08+T['alturaBaseM']/1000+.40+extra)
sub=4;grid=n*sub
v=[ponto_mapa(i/sub,j/sub) for j in range(grid+1) for i in range(grid+1)]
f=[(j*(grid+1)+i,(j+1)*(grid+1)+i,(j+1)*(grid+1)+i+1,j*(grid+1)+i+1) for j in range(grid) for i in range(grid)]
malha('mapa',v,f,mat_mapa)
contornos_crateras(bpy,sc,crateras,lambda x,y:ponto_mapa(x,y,.022*.08))
sumir_aros(0.0084 * PX_POR_KM_A_1KM / 1.6, 0.0084 * PX_POR_KM_A_1KM / 0.5)

# ---------- 64 km and 800 km patches, each with a hole where the finer one sits ----------
a, xa, ya = C.janela('80m', 32, 4)
v, f = grade_polar(a, xa, ya, lambda x, y: disco(31.5)(x, y) and not quad(2.45)(x, y), sobe=0.35)
malha('regiao64', v, f, C.toon(bpy, 'r64', C.albedo_chao(RUIDO, lod=LOD_CHAO)))
b, xb, yb = C.janela('240m', 400, 16)
v, f = grade_polar(b, xb, yb, lambda x, y: disco(398)(x, y) and not disco(29)(x, y), sobe=0.30)
malha('regiao800', v, f, C.toon(bpy, 'r800', C.albedo_chao(RUIDO, lod=LOD_CHAO), borda=(CENTRO, 300, 395)))

# ---------- the globe: NASA CGI Moon Kit color + relief (real height), hole over the pole patch ----------
# UV sphere built with numpy (fast): rows of latitude from the hole edge to the north pole,
# equirectangular UVs straight from lat/lon. No cube-face seams (they showed as hairline cracks).
lat_buraco = -90 + math.degrees(330 / R)              # well inside the 800 km patch
NLON, NLAT = 720, 340
lats = np.radians(np.linspace(lat_buraco, 89.9, NLAT))
lons = np.radians(np.linspace(-180, 180, NLON + 1))
LA, LO = np.meshgrid(lats, lons, indexing='ij')
co = np.stack([np.cos(LA) * np.cos(LO), np.cos(LA) * np.sin(LO), np.sin(LA)], -1).reshape(-1, 3)
uv_v = np.stack([0.5 + LO / (2 * np.pi), 0.5 + LA / np.pi], -1).reshape(-1, 2)
idx = np.arange(NLAT * (NLON + 1)).reshape(NLAT, NLON + 1)
quads = np.stack([idx[:-1, :-1], idx[:-1, 1:], idx[1:, 1:], idx[1:, :-1]], -1).reshape(-1, 4)
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
dem = bpy.data.images.load(os.path.join(HERE, 'nasa', 'ldem_4_uint.tif')); dem.colorspace_settings.name = 'Non-Color'
tex = bpy.data.textures.new('dem', 'IMAGE'); tex.image = dem; tex.extension = 'REPEAT'
d = globo.modifiers.new('relevo', 'DISPLACE'); d.texture = tex; d.texture_coords = 'UV'; d.direction = 'NORMAL'
# ldem_4_uint: height = (value - 20000) * 0.5 m; Blender reads value / 65535. In object units (x R).
d.mid_level = 20000 / 65535; d.strength = 65535 * 0.0005 / R
cor = bpy.data.images.load(os.path.join(HERE, 'nasa', 'lroc_color_poles_2k.tif'))
ALBEDO = PALETA['albedoLua']
def albedo_globo(N, L):
    tc = N.new('ShaderNodeTexCoord'); im = N.new('ShaderNodeTexImage'); im.image = cor; im.extension = 'REPEAT'
    L.new(tc.outputs['UV'], im.inputs['Vector'])
    bw = N.new('ShaderNodeRGBToBW'); L.new(im.outputs['Color'], bw.inputs['Color'])
    r = C._ramp(N, ALBEDO); L.new(bw.outputs['Val'], r.inputs['Fac'])
    return r.outputs['Color']
mat_globo = C.toon(bpy, 'globo', albedo_globo, luz=PALETA['luzLua'])
globo.data.materials.append(mat_globo)

# ---------- camera path ----------
def em(x, y):
    h = alt[n // 2, n // 2]
    return Vector(C.polar_para_3d(x, y, h))
B = em(x0k, y0k)
nrm = B.normalized()
gx = (em(x0k + 0.01, y0k) - B).normalized()                 # map +gx on the Moon
gyb = (em(x0k, y0k + 0.01) - B).normalized()                # map Blender +Y (= -gy)
e30 = math.radians(30)
to_cam0 = (gx * math.cos(e30) * math.sqrt(0.5) - gyb * math.cos(e30) * math.sqrt(0.5) + nrm * math.sin(e30)).normalized()
q0 = (-to_cam0).to_track_quat('-Z', 'Y')
# make "up" the local outward normal (the map's up), like render_terrain.py's world Z
def olhar(frente, cima):
    z = -frente.normalized(); x = cima.cross(z).normalized(); y = z.cross(x)
    return Matrix((x, y, z)).transposed().to_quaternion()
q0 = olhar(-to_cam0, nrm)

# Day 1 at noon, the Moon view of the game: the camera is fixed in space and the Moon turned by
# `giro`; in moon-fixed coordinates the camera turns by -giro instead.
from datetime import datetime
t = datetime.fromisoformat('2024-05-05T12:00:00+00:00'); t0 = datetime.fromisoformat(V['newMoon'].replace('Z', '+00:00'))
giro = V['sunLon'] - (180 - 360 * ((t - t0).total_seconds() / 86400) / V['synodicDays'])
Rz = Matrix.Rotation(math.radians(-giro), 3, 'Z')
to_cam1 = (Rz @ Vector(V['toCamera'])).normalized()
q1 = olhar(-to_cam1, Rz @ Vector((0, 0, 1)))
sol1 = (Rz @ Vector(V['toSun'])).normalized()
right0 = q0 @ Vector((1, 0, 0))
sol0 = (to_cam0 * 0.5 - right0 * 1.0 + nrm * 0.45).normalized()   # the map's stylized light

# Frames are rendered MARGEM larger than the 'core' w x h at the same px/km: the game shrinks
# each frame toward the next one's scale between frames, and the margin keeps the screen covered.
MARGEM = 1.12
RW, RH = round(args.w * MARGEM), round(args.h * MARGEM)
sc.render.resolution_x, sc.render.resolution_y = RW, RH
largura0 = RW / S_INICIO                                      # km across the first frame
d0 = largura0 / (2 * math.tan(FOV / 2))
largura1 = RW / DIAM_FIM * 2 * R
d1 = largura1 / (2 * math.tan(FOV / 2))

cam = bpy.data.cameras.new('voo'); cam.type = 'PERSP'; cam.sensor_fit = 'HORIZONTAL'; cam.angle = FOV
cam_o = bpy.data.objects.new('voo', cam); sc.collection.objects.link(cam_o); sc.camera = cam_o
cam_o.rotation_mode = 'QUATERNION'
sun = bpy.data.lights.new('sol', 'SUN'); sun.energy = 4.0; sun.use_shadow = False
sun_o = bpy.data.objects.new('sol', sun); sc.collection.objects.link(sun_o)


def suave(a, b, x):
    k = min(1, max(0, (x - a) / (b - a)))
    return k * k * (3 - 2 * k)


def quadro(p):
    """p 0..1 along the flight: distance grows evenly in log scale (the game eases the timing)."""
    dist = math.exp(math.log(d0) + (math.log(d1) - math.log(d0)) * p)
    wr = suave(0.3, 0.97, p)
    q = q0.slerp(q1, wr)
    alvo = B.lerp(Vector((0, 0, 0)), suave(0.45, 0.99, p))
    to_cam = q @ Vector((0, 0, 1))
    cam_o.location = alvo + to_cam * dist
    cam_o.rotation_quaternion = q
    cam.clip_start = max(0.01, dist * 0.2); cam.clip_end = dist + 3 * R
    # The map's light stays until the globe shows, then turns to the real Sun of the day.
    ws = suave(0.72, 1.0, p)
    s = (sol0 * (1 - ws) + sol1 * ws).normalized()
    sun_o.rotation_euler = (-s.normalized()).to_track_quat('-Z', 'Y').to_euler()


os.makedirs(OUT, exist_ok=True); os.makedirs(TMP, exist_ok=True)
# Where each frame sits along the flight (p = log distance, 0..1). Between frames the game only
# rescales, which is exact while the camera just backs away (p < 0.3). Once it also turns and
# slides toward the globe center, frames must be close together, so most of them go there.
n0 = max(2, round(args.frames * 0.13))
PS = [0.3 * k / n0 for k in range(n0)] + [0.3 + 0.7 * k / (args.frames - n0 - 1) for k in range(args.frames - n0)]
# Where the base is in every frame (px), so the game can pin the colony on the moving planet.
from bpy_extras.object_utils import world_to_camera_view
base_px = []
for p in PS:
    quadro(p); bpy.context.view_layer.update()
    v = world_to_camera_view(sc, cam_o, B)
    base_px.append([round(v.x * RW, 1), round((1 - v.y) * RH, 1)])
lista = [] if args.so_json else [int(k) for k in args.so.split(',')] if args.so else range(args.frames)
for i in lista:
    quadro(PS[i])
    png = os.path.join(TMP, f'f{i:02d}.png')
    sc.render.filepath = png
    bpy.ops.render.render(write_still=True)
    subprocess.run(['magick', png, '-quality', '72', '-define', 'webp:alpha-quality=90', os.path.join(OUT, f'f{i:02d}.webp')], check=True)
    print('frame', i, flush=True)
if not args.so:
    os.makedirs(os.path.join(DESTINO,'src','dados'),exist_ok=True)
    with open(os.path.join(DESTINO, 'src', 'dados', f'{args.nome}.json'), 'w') as f:
        json.dump({'quadros': args.frames, 'w': args.w, 'h': args.h, 'margem': MARGEM, 'sInicio': S_INICIO, 'diametroFim': DIAM_FIM,
                   'p': [round(p, 5) for p in PS], 'razao': round(d1 / d0, 3), 'base': base_px,
                   'dia': 1, 'nota': 'Frame 0 = the map at sInicio px/km, centered on the map center. Last frame = the Moon view of day 1, globe diameter diametroFim px, centered. Frame i was rendered at camera distance d0 * razao ** p[i]; frames are w*margem x h*margem.'}, f, indent=1)
print('DONE')
