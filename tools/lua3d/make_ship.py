# Generated with AI assistance. See README, "Use of AI tools".
# The ship for the trip to Mars and the rocket that leaves the Moon base, as toon 3D models in the
# game's look (flat light bands, dark outline).
#
#   prime-run blender -b -P tools/lua3d/make_ship.py
#
# Out:
#   public/lua/viagem/nave_d<k>.png  the transfer ship pointing at heading k * 22.5 deg, seen from
#                                    the solar system view's tilted camera (16 pictures)
#   public/lua/viagem/foguete.png    the finished rocket alone, from the map's isometric camera
#   src/dados/viagem.json            sizes and anchor pixels for the game
import bpy, os, sys, json, math, subprocess
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import comum as C

ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'public', 'lua', 'viagem')
JSON = os.path.join(ROOT, 'src', 'dados', 'viagem.json')
LUZ = C.LIGHT                      # the shared light bands (src/dados/paleta_lua.json)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'BLENDER_EEVEE'; sc.render.film_transparent = True
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'; sc.render.filter_size = 1.0

_mats = {}
def toon(cor):
    if cor in _mats: return _mats[cor]
    def alb(N, L):
        rgb = N.new('ShaderNodeRGB'); rgb.outputs[0].default_value = C.rgb(cor)
        return rgb.outputs[0]
    _mats[cor] = C.toon(bpy, 'nave' + cor, alb, luz=LUZ)
    return _mats[cor]

contorno = bpy.data.materials.new('naveContorno'); contorno.use_nodes = True; contorno.use_backface_culling = True
cn = contorno.node_tree.nodes; cn.clear()
ce = cn.new('ShaderNodeEmission'); ce.inputs['Color'].default_value = C.rgb(C.OUTLINE)
co = cn.new('ShaderNodeOutputMaterial'); contorno.node_tree.links.new(ce.outputs[0], co.inputs['Surface'])

grupo = []
def fim(o, cor, linha=0.025, bevel=0.0):
    if o.users_collection and sc.collection not in o.users_collection:
        for c in o.users_collection: c.objects.unlink(o)
        sc.collection.objects.link(o)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        b = o.modifiers.new('bevel', 'BEVEL'); b.width = bevel; b.segments = 2; b.limit_method = 'ANGLE'
    o.data.materials.append(toon(cor)); o.data.materials.append(contorno)
    s = o.modifiers.new('contorno', 'SOLIDIFY')
    s.thickness = linha; s.offset = 1; s.use_flip_normals = True; s.material_offset = 1; s.use_rim = False
    grupo.append(o)
    return o

def cilindro_x(x0, x1, r, cor, y=0.0, z=0.0, v=24, linha=0.025):
    """Cylinder along X (the ship's long axis)."""
    bpy.ops.mesh.primitive_cylinder_add(vertices=v, radius=r, depth=x1 - x0)
    o = bpy.context.active_object
    o.rotation_euler = (0, math.radians(90), 0); o.location = ((x0 + x1) / 2, y, z)
    bpy.ops.object.shade_smooth()
    return fim(o, cor, linha)

def esfera(x, y, z, r, cor, linha=0.02):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=r)
    o = bpy.context.active_object; o.location = (x, y, z); bpy.ops.object.shade_smooth()
    return fim(o, cor, linha)

def caixa(cx, cy, cz, sx, sy, sz, cor, linha=0.02, bevel=0.01):
    bpy.ops.mesh.primitive_cube_add(size=1)
    o = bpy.context.active_object; o.scale = (sx, sy, sz); o.location = (cx, cy, cz)
    return fim(o, cor, linha, bevel)

def cone_x(x, r1, r2, comprimento, cor, sentido=1):
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=r1, radius2=r2, depth=comprimento)
    o = bpy.context.active_object
    o.rotation_euler = (0, math.radians(90 * sentido), 0); o.location = (x, 0, 0)
    bpy.ops.object.shade_smooth()
    return fim(o, cor)


# ---------- the transfer ship: nose toward +X ----------
def nave():
    # Crew habitat: a white cylinder with a window band and the mission stripe.
    cilindro_x(0.0, 1.6, 0.42, '#e2e8f0')
    cilindro_x(0.55, 0.75, 0.43, '#f97316', linha=0.012)
    for i in range(6):
        a = math.radians(-30 + i * 12)
        esfera(1.2, math.sin(a) * 0.42, math.cos(a) * 0.42, 0.06, '#38bdf8', linha=0.01)
    # Nose: docking cone and hatch.
    cone_x(1.85, 0.42, 0.18, 0.5, '#cbd5e1')
    cilindro_x(2.1, 2.25, 0.16, '#64748b', linha=0.015)
    # Truss to the propulsion stage.
    caixa(-0.55, 0, 0, 1.1, 0.16, 0.16, '#94a3b8', linha=0.012)
    # Propellant tanks and the engine.
    esfera(-1.25, 0.3, 0, 0.3, '#f8fafc')
    esfera(-1.25, -0.3, 0, 0.3, '#f8fafc')
    cilindro_x(-1.75, -1.45, 0.34, '#475569')
    cone_x(-2.05, 0.32, 0.12, 0.45, '#334155', sentido=-1)
    # Solar wings on each side of the truss (long, dark blue, with cell lines).
    for lado in (1, -1):
        caixa(-0.55, lado * 0.55, 0, 0.08, 0.9, 0.04, '#94a3b8', linha=0.01)
        caixa(-0.55, lado * 1.75, 0, 0.75, 1.6, 0.03, '#1e3a8a', linha=0.015)
        for k in range(1, 4):
            caixa(-0.55, lado * (0.95 + k * 0.4), 0.018, 0.74, 0.012, 0.012, '#60a5fa', linha=0.003, bevel=0)
    # Radiators: white fins above and below the habitat end.
    for lado in (1, -1):
        caixa(0.25, 0, lado * 0.75, 0.5, 0.03, 0.55, '#f1f5f9', linha=0.012)


# ---------- the rocket alone, standing on +Z, base at the origin (map axes) ----------
def foguete():
    alt = 2.9
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.42, depth=alt)
    o = bpy.context.active_object; o.location = (0, 0, alt / 2); bpy.ops.object.shade_smooth(); fim(o, '#f8fafc', bevel=0.02)
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.425, depth=alt * 0.07)
    o = bpy.context.active_object; o.location = (0, 0, alt * 0.585); bpy.ops.object.shade_smooth(); fim(o, '#ef4444')
    for a in (45, 135, 225, 315):
        r = math.radians(a)
        caixa(math.cos(r) * 0.42, -math.sin(r) * 0.42, 0.25, 0.14, 0.14, 0.5, '#ef4444', bevel=0.01, linha=0.015)
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=0.42, depth=0.8)
    o = bpy.context.active_object; o.location = (0, 0, alt + 0.4); bpy.ops.object.shade_smooth(); fim(o, '#ef4444')
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=0.3, radius2=0.18, depth=0.25)
    o = bpy.context.active_object; o.location = (0, 0, -0.1); bpy.ops.object.shade_smooth(); fim(o, '#334155')


def camera(elev_graus, az_vec, escala_px):
    """Orthographic camera looking at the origin from elevation, returns (cam object, s px/unit)."""
    e = math.radians(elev_graus)
    to_cam = Vector((az_vec[0] * math.cos(e), az_vec[1] * math.cos(e), math.sin(e))).normalized()
    q = (-to_cam).to_track_quat('-Z', 'Y')
    cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'; cam.clip_end = 100
    o = bpy.data.objects.new('cam', cam); sc.collection.objects.link(o); sc.camera = o
    o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = q
    m3 = q.to_matrix()
    return o, cam, to_cam, m3.col[0], m3.col[1]


def luz(to_cam, right):
    sun = bpy.data.lights.new('sol', 'SUN'); sun.energy = 4.0; sun.use_shadow = False
    so = bpy.data.objects.new('sol', sun); sc.collection.objects.link(so)
    to_sun = (to_cam * 0.5 - right * 1.0 + Vector((0, 0, 0.6))).normalized()
    so.rotation_euler = (-to_sun).to_track_quat('-Z', 'Y').to_euler()


def enquadrar(cam_o, cam, right, up, to_cam, s, pad=10):
    pts = []
    for o in grupo:
        for c in o.bound_box: pts.append(o.matrix_world @ Vector(c))
    xs = [p.dot(right) for p in pts]; ys = [p.dot(up) for p in pts]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    W = math.ceil((x1 - x0) * s) + 2 * pad; H = math.ceil((y1 - y0) * s) + 2 * pad
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    cam.ortho_scale = max(W, H) / s
    cam_o.location = right * cx + up * cy + to_cam * 40
    sc.render.resolution_x, sc.render.resolution_y = W, H
    o = Vector((0, 0, 0))
    return W, H, [round((o.dot(right) - cx) * s + W / 2, 2), round(H / 2 - (o.dot(up) - cy) * s, 2)]


def render(path):
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    subprocess.run(['magick', path, '-dither', 'None', '-colors', '255', 'PNG8:' + path], check=True)


os.makedirs(OUT, exist_ok=True)
saida = {}

# Ship: the solar system view is drawn tilted (screen y squashed to 0.6), i.e. seen from
# asin(0.6) = 36.87 deg above the ecliptic, looking from -Y.
nave()
pai = bpy.data.objects.new('nave', None); sc.collection.objects.link(pai)
for o in grupo: o.parent = pai
cam_o, cam, to_cam, right, up = camera(math.degrees(math.asin(0.6)), (0, -1), 1)
luz(to_cam, right)
S_NAVE = 56                                    # px per unit: the ship is about 240 px long
direcoes = []
for k in range(16):
    pai.rotation_euler = (0, 0, math.radians(k * 22.5))
    bpy.context.view_layer.update()
    W, H, ancora = enquadrar(cam_o, cam, right, up, to_cam, S_NAVE)
    render(os.path.join(OUT, f'nave_d{k}.png'))
    direcoes.append({'arquivo': f'lua/viagem/nave_d{k}.png', 'w': W, 'h': H, 'centro': ancora})
saida['nave'] = {'direcoes': direcoes, 'passoGraus': 22.5, 'motorUnidades': 2.3, 'pxPorUnidade': S_NAVE,
                 'nota': 'Picture k points at heading k * passoGraus, counterclockwise from screen right, in the tilted solar view. centro = pixel of the ship center; the engine is motorUnidades behind it.'}

# Rocket: same camera as the map (render_terrain.py), 2x like the modules.
for o in list(sc.objects):
    if o.type in ('MESH', 'EMPTY', 'CAMERA', 'LIGHT'): bpy.data.objects.remove(o)
grupo.clear()
foguete()
s = 2 * 30 / math.sqrt(0.5)
cam_o, cam, to_cam, right, up = camera(30, (math.sqrt(0.5), -math.sqrt(0.5)), s)
luz(to_cam, right)
W, H, ancora = enquadrar(cam_o, cam, right, up, to_cam, s)
render(os.path.join(OUT, 'foguete.png'))
saida['foguete'] = {'arquivo': 'lua/viagem/foguete.png', 'w': W, 'h': H, 'ancora': ancora, 'escala': 0.5, 'alturaTiles': 3.7,
                    'nota': 'ancora = pixel of the rocket base center; draw at escala on the map (tiles: 30 px per step).'}

with open(JSON, 'w') as f:
    json.dump(saida, f, indent=1)
print('DONE')
