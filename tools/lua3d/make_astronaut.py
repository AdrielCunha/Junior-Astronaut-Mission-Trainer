# Generated with AI assistance (Claude). See README, "Use of AI tools".
# The commander: a chunky toon astronaut built from simple shapes, with a Moon "bunny hop" walk,
# rendered from the map's own isometric camera in 8 directions.
#
#   blender -b -P tools/lua3d/make_astronaut.py           (headless, ~1 min)
#   python3 tools/lua3d/bl.py --run tools/lua3d/make_astronaut.py   (live, scene "Astronauta")
#
# Out: public/lua/astronaut.png  grid: one row per direction (8), columns = idle + walk frames
#      src/dados/astronauta.json frame size, the pixel under the feet, and the scale that makes
#      one Blender unit (= one map tile) match terrain.png
import bpy, os, json, math
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
PNG = os.path.join(ROOT, 'public', 'lua', 'astronaut.png')
JSON = os.path.join(ROOT, 'src', 'dados', 'astronauta.json')
TMP = os.path.join(HERE, '.cache', 'astro')
LIVE = not bpy.app.background

T = 30                     # terrain px per tile step (render_terrain.py)
SUPER = 4                  # render bigger than the map, the game scales down: crisp edges
FRAME = 160
WALK = 8                   # walk frames per direction
HEIGHT = 0.8               # tiles; drawn bigger than a real 1.8 m (= 0.5 tile), like map icons
SUIT = '#eef2f6'; TRIM = '#94a3b8'; BOOT = '#475569'; PACK = '#cbd5e1'; VISOR = '#f59e0b'
ACCENT = '#ef4444'         # commander color, matches the crew colors in the game
LIGHT = [(0.0, '#3a3550'), (0.08, '#8a8fa6'), (0.35, '#d9dde6'), (0.62, '#ffffff')]
OUTLINE = '#17130f'


def rgb(h, a=1.0):
    h = h.lstrip('#')
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return (*[c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb], a)


if LIVE:
    old = bpy.data.scenes.get('Astronauta')
    if old:
        for o in list(old.objects): bpy.data.objects.remove(o)
        bpy.data.scenes.remove(old)
    sc = bpy.data.scenes.new('Astronauta'); bpy.context.window.scene = sc
else:
    bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
sc.render.engine = 'BLENDER_EEVEE'
sc.render.film_transparent = True
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
sc.render.filter_size = 1.0

# ---------- toon materials ----------
_mats = {}
def toon(cor):
    if cor in _mats: return _mats[cor]
    m = bpy.data.materials.new('astro' + cor); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links; N.clear()
    dif = N.new('ShaderNodeBsdfDiffuse'); s2r = N.new('ShaderNodeShaderToRGB')
    L.new(dif.outputs['BSDF'], s2r.inputs['Shader'])
    r = N.new('ShaderNodeValToRGB'); cr = r.color_ramp; cr.interpolation = 'CONSTANT'
    while len(cr.elements) < len(LIGHT): cr.elements.new(0.99)
    for e, (p, c) in zip(cr.elements, LIGHT): e.position = p; e.color = rgb(c)
    L.new(s2r.outputs['Color'], r.inputs['Fac'])
    mix = N.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'
    mix.inputs['Factor'].default_value = 1; mix.inputs[6].default_value = rgb(cor)
    L.new(r.outputs['Color'], mix.inputs[7])
    em = N.new('ShaderNodeEmission'); L.new(mix.outputs[2], em.inputs['Color'])
    out = N.new('ShaderNodeOutputMaterial'); L.new(em.outputs[0], out.inputs['Surface'])
    _mats[cor] = m
    return m

contorno = bpy.data.materials.new('astroContorno'); contorno.use_nodes = True; contorno.use_backface_culling = True
cn = contorno.node_tree.nodes; cn.clear()
ce = cn.new('ShaderNodeEmission'); ce.inputs['Color'].default_value = rgb(OUTLINE)
co = cn.new('ShaderNodeOutputMaterial'); contorno.node_tree.links.new(ce.outputs[0], co.inputs['Surface'])

# ---------- body: units are tiles; the figure faces +X, feet at z = 0 ----------
root = bpy.data.objects.new('Astronauta', None); sc.collection.objects.link(root)
H = HEIGHT


def peca(nome, kind, size, loc, cor, pai=root, bevel=0.0, rot=(0, 0, 0)):
    if kind == 'box':
        bpy.ops.mesh.primitive_cube_add(size=1)
    elif kind == 'ball':
        bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.5)
    else:
        bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.5, depth=1)
    o = bpy.context.active_object
    if o.users_collection and sc.collection not in o.users_collection:
        for c in o.users_collection: c.objects.unlink(o)
        sc.collection.objects.link(o)
    o.name = nome
    o.scale = size; o.location = loc; o.rotation_euler = rot
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        b = o.modifiers.new('bevel', 'BEVEL'); b.width = bevel; b.segments = 3
    bpy.ops.object.shade_smooth()
    o.data.materials.append(toon(cor)); o.data.materials.append(contorno)
    s = o.modifiers.new('contorno', 'SOLIDIFY')
    s.thickness = 0.012; s.offset = 1; s.use_flip_normals = True; s.material_offset = 1; s.use_rim = False
    o.parent = pai
    return o


def pivo(nome, loc, pai=root):
    e = bpy.data.objects.new(nome, None); sc.collection.objects.link(e)
    e.location = loc; e.parent = pai
    return e

if LIVE:
    bpy.context.window.scene = sc
corpo = pivo('corpo', (0, 0, H * 0.36))                   # hips; bobs while walking
peca('tronco', 'box', (H * 0.24, H * 0.30, H * 0.28), (0, 0, H * 0.15), SUIT, corpo, bevel=0.03)
peca('faixa', 'box', (H * 0.245, H * 0.305, H * 0.04), (0, 0, H * 0.10), ACCENT, corpo, bevel=0.005)
peca('painel', 'box', (H * 0.03, H * 0.13, H * 0.08), (H * 0.125, 0, H * 0.18), TRIM, corpo, bevel=0.005)
peca('mochila', 'box', (H * 0.13, H * 0.26, H * 0.30), (-H * 0.18, 0, H * 0.17), PACK, corpo, bevel=0.025)
cabeca = pivo('cabeca', (0, 0, H * 0.30), corpo)
peca('capacete', 'ball', (H * 0.36, H * 0.36, H * 0.34), (0, 0, H * 0.16), SUIT, cabeca)
peca('viseira', 'ball', (H * 0.22, H * 0.28, H * 0.20), (H * 0.09, 0, H * 0.20), VISOR, cabeca)

pernas, bracos = [], []
for lado in (-1, 1):
    quadril = pivo(f'quadril{lado}', (0, lado * H * 0.075, 0), corpo)
    peca(f'perna{lado}', 'box', (H * 0.11, H * 0.11, H * 0.30), (0, 0, -H * 0.15), SUIT, quadril, bevel=0.02)
    peca(f'bota{lado}', 'box', (H * 0.17, H * 0.12, H * 0.08), (H * 0.025, 0, -H * 0.32), BOOT, quadril, bevel=0.02)
    pernas.append(quadril)
    ombro = pivo(f'ombro{lado}', (0, lado * H * 0.19, H * 0.26), corpo)
    peca(f'braco{lado}', 'box', (H * 0.09, H * 0.09, H * 0.24), (0, 0, -H * 0.11), SUIT, ombro, bevel=0.02)
    peca(f'luva{lado}', 'ball', (H * 0.10, H * 0.10, H * 0.10), (0, 0, -H * 0.25), TRIM, ombro)
    bracos.append(ombro)


def pose(fase):
    """fase None = idle; 0..1 = walk cycle. Moon walk: both feet push, short float, big swing."""
    if fase is None:
        corpo.location.z = H * 0.36; corpo.rotation_euler = (0, 0, 0)
        for p in pernas: p.rotation_euler = (0, 0, 0)
        for i, b in enumerate(bracos): b.rotation_euler = ((-1 if i else 1) * 0.12, 0, 0)
        return
    a = math.sin(fase * 2 * math.pi)
    corpo.location.z = H * 0.36 + H * 0.06 * abs(math.sin(fase * 2 * math.pi))
    corpo.rotation_euler = (0, math.radians(8), 0)            # lean into the step
    for i, p in enumerate(pernas): p.rotation_euler = (0, (1 if i else -1) * 0.55 * a, 0)
    for i, b in enumerate(bracos): b.rotation_euler = ((-1 if i else 1) * 0.12, (-1 if i else 1) * 0.6 * a, 0)


# ---------- camera: the map's 2:1 isometric camera (render_terrain.py), map X = gx, Y = -gy ----------
elev = math.radians(30)
to_cam = Vector((math.cos(elev) * math.sqrt(0.5), -math.cos(elev) * math.sqrt(0.5), math.sin(elev)))
q = (-to_cam).to_track_quat('-Z', 'Y'); m3 = q.to_matrix()
right, up = m3.col[0], m3.col[1]
s = SUPER * T / math.sqrt(0.5)                   # px per tile in the frames
centro = Vector((0, 0, H * 0.5))
cam = bpy.data.cameras.new('AstroCam'); cam.type = 'ORTHO'; cam.ortho_scale = FRAME / s
cam_o = bpy.data.objects.new('AstroCam', cam); sc.collection.objects.link(cam_o); sc.camera = cam_o
cam_o.location = centro + to_cam * 20; cam_o.rotation_mode = 'QUATERNION'; cam_o.rotation_quaternion = q
sun = bpy.data.lights.new('Sol', 'SUN'); sun.energy = 4.0; sun.use_shadow = False
sun_o = bpy.data.objects.new('Sol', sun); sc.collection.objects.link(sun_o)
to_sun = (to_cam * 0.5 - right * 1.0 + Vector((0, 0, 0.45))).normalized()   # same as the terrain
sun_o.rotation_euler = (-to_sun).to_track_quat('-Z', 'Y').to_euler()
sc.render.resolution_x = sc.render.resolution_y = FRAME

# Pixel under the feet (origin) in a frame.
pe = Vector((0, 0, 0)) - centro
anchor = [FRAME / 2 + pe.dot(right) * s, FRAME / 2 - pe.dot(up) * s]

if LIVE:
    pose(0.25)
    root.rotation_euler = (0, 0, math.radians(-45))
    print('scene "Astronauta" ready')
else:
    import numpy as np, subprocess
    os.makedirs(TMP, exist_ok=True)
    cols = 1 + WALK
    sheet = np.zeros((8 * FRAME, cols * FRAME, 4), np.float32)
    for d in range(8):
        # Direction d faces map angle d * 45 deg, measured in Blender's XY (map gx, -gy).
        root.rotation_euler = (0, 0, math.radians(d * 45))
        for c in range(cols):
            pose(None if c == 0 else (c - 1) / WALK)
            bpy.context.view_layer.update()
            p = os.path.join(TMP, f'd{d}_{c}.png')
            sc.render.filepath = p
            bpy.ops.render.render(write_still=True)
            im = bpy.data.images.load(p)
            px = np.array(im.pixels[:], np.float32).reshape(FRAME, FRAME, 4)
            r = 8 - 1 - d                                  # Blender rows start at the bottom
            sheet[r * FRAME:(r + 1) * FRAME, c * FRAME:(c + 1) * FRAME] = px
            bpy.data.images.remove(im)
    img = bpy.data.images.new('astro', cols * FRAME, 8 * FRAME, alpha=True)
    img.pixels = sheet.ravel(); img.filepath_raw = PNG; img.file_format = 'PNG'; img.save()
    subprocess.run(['magick', PNG, '-dither', 'None', '-colors', '255', 'PNG8:' + PNG], check=True)
    with open(JSON, 'w') as f:
        json.dump({'frame': FRAME, 'colunas': cols, 'andar': WALK, 'escala': 1 / SUPER,
                   'pe': [round(anchor[0], 2), round(anchor[1], 2)],
                   'nota': 'Row d faces map angle d*45 deg, where angle = atan2(-dy, dx) for a move (dx, dy) in tiles. Column 0 idle, 1.. walk.'}, f, indent=1)
    print('DONE', PNG, anchor)
