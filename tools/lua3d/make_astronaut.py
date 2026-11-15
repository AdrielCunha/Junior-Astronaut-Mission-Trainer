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
import bpy, os, json, math, sys
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
# SENTADO=1: the seated driver for the Apollo LRV (one column, 16 directions, like the rover's 16
# headings): the same model with its legs stretched straight forward, written next to the walk
# sheet as <name>_sentado.png. Row d faces map angle d * 22.5 deg.
SENTADO = os.environ.get('SENTADO') == '1'
PNG = os.path.join(ROOT, 'public', 'lua', 'astronaut.png' if os.environ.get('SKIN', 'comandante') == 'comandante' else 'astronaut_%s.png' % os.environ['SKIN'])
if SENTADO: PNG = PNG[:-4] + '_sentado.png'
if os.environ.get('ACESSORIO'): PNG = os.path.join(ROOT, 'public', 'lua', 'acessorio_%s.png' % os.environ['ACESSORIO'])
JSON = os.path.join(ROOT, 'src', 'dados', 'astronauta.json')
TMP = os.path.join(HERE, '.cache', 'astro_' + os.environ.get('SKIN', 'comandante') + ('_sentado' if SENTADO else '') + ('_acc_' + os.environ['ACESSORIO'] if os.environ.get('ACESSORIO') else ''))
LIVE = not bpy.app.background

T = 30                     # terrain px per tile step (render_terrain.py)
SUPER = 4                  # render bigger than the map, the game scales down: crisp edges
FRAME = 192                  # roomy: the chunky helmet and antenna need more than 160 px
WALK = 8                   # walk frames per direction
HEIGHT = 0.8               # tiles; drawn bigger than a real 1.8 m (= 0.5 tile), like map icons
# Same cartoon language as the modules (make_modules.py): pale blue-grey body, the workshop's
# orange as the accent, dark glass with a sky-blue glint, and the shared toon light ramp.
sys.path.insert(0, HERE)
from estilo_lua import PALETA
# Skins: same model, different colors. SKIN=<id> renders public/lua/astronaut_<id>.png; the default
# ('comandante') renders astronaut.png and writes the json. Keep ids in sync with src/dados/skins.ts.
SKINS = {
    'comandante': dict(suit='#e2e8f0', pack='#cbd5e1', accent='#f97316', glint='#38bdf8', boot='#334155'),
    'marte':      dict(suit='#fdba74', pack='#fb923c', accent='#b91c1c', glint='#fde68a', boot='#7c2d12'),
    'floresta':   dict(suit='#bbf7d0', pack='#86efac', accent='#16a34a', glint='#bef264', boot='#14532d'),
    'nebulosa':   dict(suit='#ddd6fe', pack='#c4b5fd', accent='#8b5cf6', glint='#f0abfc', boot='#4c1d95'),
    'solar':      dict(suit='#fef08a', pack='#fde047', accent='#d97706', glint='#ffffff', boot='#78350f'),
    'oceano':     dict(suit='#a5f3fc', pack='#67e8f9', accent='#0e7490', glint='#fef9c3', boot='#164e63'),
    # Different astronauts, prizes of side missions (skins.ts: premio). cw = chunkier torso; the extras
    # (ears, tails, horns...) are built by personagens_extra.py. Light colors only.
    'robo':       dict(suit='#cbd5e1', pack='#94a3b8', accent='#38bdf8', glint='#86efac', boot='#475569', cw=1.06),
    'alien':      dict(suit='#bbf7d0', pack='#86efac', accent='#a855f7', glint='#f0abfc', boot='#166534', cw=0.95),
    'gato':       dict(suit='#fed7aa', pack='#fdba74', accent='#ea580c', glint='#bef264', boot='#7c2d12'),
    'urso':       dict(suit='#d6b48a', pack='#c49a6c', accent='#92400e', glint='#fde68a', boot='#78350f', cw=1.12),
    'coelho':     dict(suit='#fce7f3', pack='#fbcfe8', accent='#ec4899', glint='#ffffff', boot='#9d174d', cw=0.95),
    'cachorro':   dict(suit='#fde68a', pack='#fcd34d', accent='#b45309', glint='#ffffff', boot='#78350f'),
    'pinguim':    dict(suit='#bfdbfe', pack='#93c5fd', accent='#f97316', glint='#ffffff', boot='#1e3a8a', cw=1.10),
    'dino':       dict(suit='#bbf7d0', pack='#4ade80', accent='#facc15', glint='#fef08a', boot='#14532d', cw=1.05),
    'raposa':     dict(suit='#fdba74', pack='#fb923c', accent='#ffffff', glint='#fef9c3', boot='#7c2d12'),
    'unicornio':  dict(suit='#f5d0fe', pack='#e879f9', accent='#38bdf8', glint='#fde047', boot='#6b21a8'),
    'panda':      dict(suit='#f1f5f9', pack='#e2e8f0', accent='#64748b', glint='#bae6fd', boot='#475569', cw=1.10),
}
SKIN = os.environ.get('SKIN', 'comandante')
K = SKINS[SKIN]
SUIT = K['suit']; TRIM = '#94a3b8'; BOOT = K['boot']; PACK = K['pack']; VISOR = '#1e293b'
ACCENT = K['accent']; GLINT = K['glint']; BEACON = '#ef4444'
LIGHT = PALETA['luzSolo']
OUTLINE = '#17130f'
# ESTILO=estacao (default): the solar station's look, like the modules (make_modules.py): soft clay shading,
# AgX, a soft area light and blue ambient. The outline stays, thinner and slate, so the commander still pops
# out of the ground. ESTILO=toon renders the old flat toon look.
ESTILO = os.environ.get('ESTILO', 'estacao')
NOVO = ESTILO != 'toon'
if NOVO: OUTLINE = '#1e293b'


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
sc.view_settings.view_transform = 'AgX' if NOVO else 'Standard'; sc.view_settings.look = 'None'
if NOVO:
    mundo = bpy.data.worlds.new('Astronauta | ambiente azul'); mundo.use_nodes = True
    fundo = mundo.node_tree.nodes['Background']
    fundo.inputs[0].default_value = (0.16, 0.21, 0.32, 1); fundo.inputs[1].default_value = 0.5
    sc.world = mundo
sc.render.filter_size = 1.0

# ---------- toon materials ----------
_mats = {}
def toon(cor):
    if cor in _mats: return _mats[cor]
    if NOVO:
        m = bpy.data.materials.new('astro' + cor); m.use_nodes = True
        bs = m.node_tree.nodes.get('Principled BSDF')
        bs.inputs['Base Color'].default_value = rgb(cor); bs.inputs['Roughness'].default_value = 0.6
        bs.inputs['Metallic'].default_value = 0.0
        _mats[cor] = m
        return m
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
    elif kind == 'cone':
        bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=0.5, radius2=0, depth=1)
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
    s.thickness = 0.009 if NOVO else 0.016; s.offset = 1; s.use_flip_normals = True; s.material_offset = 1; s.use_rim = False
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
peca('listra', 'box', (H * 0.135, H * 0.20, H * 0.05), (-H * 0.18, 0, H * 0.22), ACCENT, corpo, bevel=0.005)
cabeca = pivo('cabeca', (0, 0, H * 0.30), corpo)
peca('capacete', 'ball', (H * 0.40, H * 0.40, H * 0.38), (0, 0, H * 0.18), SUIT, cabeca)
peca('viseira', 'ball', (H * 0.24, H * 0.31, H * 0.23), (H * 0.10, 0, H * 0.21), VISOR, cabeca)
peca('brilho', 'ball', (H * 0.05, H * 0.10, H * 0.06), (H * 0.205, H * 0.07, H * 0.265), GLINT, cabeca)
peca('antena', 'cyl', (H * 0.015, H * 0.015, H * 0.09), (-H * 0.05, -H * 0.12, H * 0.37), TRIM, cabeca)
peca('farol', 'ball', (H * 0.05, H * 0.05, H * 0.05), (-H * 0.05, -H * 0.12, H * 0.43), BEACON, cabeca)

# ---------- accessories (hats etc.): ACESSORIO=<id> renders ONLY these, as an overlay sheet ----------
# Same frame, camera, 8 directions and head motion as the astronaut, so the game draws the sheet on top of
# the suit sprite (any skin, walking, carrying or seated). Parts hang from the `cabeca` pivot; the
# helmet top is at z = 0.37 H. Light colors only (see the novo-item skill). Keep ids in sync with
# src/dados/acessorios.ts.
ACESSORIO = os.environ.get('ACESSORIO')
def acessorio_festa():
    peca('acc_cone', 'cone', (H * 0.20, H * 0.20, H * 0.34), (0, 0, H * 0.51), '#f472b6', cabeca, rot=(0, 0.12, 0))
    peca('acc_faixa1', 'cyl', (H * 0.155, H * 0.155, H * 0.035), (H * 0.006, 0, H * 0.45), '#fde047', cabeca, rot=(0, 0.12, 0))
    peca('acc_faixa2', 'cyl', (H * 0.105, H * 0.105, H * 0.03), (H * 0.012, 0, H * 0.55), '#fde047', cabeca, rot=(0, 0.12, 0))
    peca('acc_pompom', 'ball', (H * 0.07, H * 0.07, H * 0.07), (H * 0.025, 0, H * 0.69), '#ffffff', cabeca)
def acessorio_coroa():
    peca('acc_aro', 'cyl', (H * 0.31, H * 0.31, H * 0.07), (0, 0, H * 0.355), '#fde047', cabeca)
    for k in range(5):
        a = k * 2 * math.pi / 5
        peca(f'acc_ponta{k}', 'cone', (H * 0.075, H * 0.075, H * 0.13), (math.cos(a) * H * 0.125, math.sin(a) * H * 0.125, H * 0.45), '#fde047', cabeca)
        peca(f'acc_gema{k}', 'ball', (H * 0.04, H * 0.04, H * 0.04), (math.cos(a) * H * 0.125, math.sin(a) * H * 0.125, H * 0.525), '#fb7185', cabeca)
    peca('acc_joia', 'ball', (H * 0.07, H * 0.07, H * 0.07), (H * 0.15, 0, H * 0.355), '#38bdf8', cabeca)
def acessorio_cowboy():
    peca('acc_aba', 'cyl', (H * 0.56, H * 0.50, H * 0.03), (0, 0, H * 0.335), '#fcd9a8', cabeca, bevel=0.0)
    peca('acc_copa', 'cyl', (H * 0.27, H * 0.27, H * 0.15), (0, 0, H * 0.42), '#fbbf77', cabeca)
    peca('acc_fita', 'cyl', (H * 0.28, H * 0.28, H * 0.035), (0, 0, H * 0.375), '#f97316', cabeca)
def acessorio_orelhas():
    for lado in (-1, 1):
        peca(f'acc_orelha{lado}', 'cone', (H * 0.16, H * 0.12, H * 0.20), (-H * 0.01, lado * H * 0.12, H * 0.43), '#fbcfe8', cabeca, rot=(-lado * 0.32, 0, 0))
        peca(f'acc_dentro{lado}', 'cone', (H * 0.09, H * 0.06, H * 0.12), (H * 0.03, lado * H * 0.118, H * 0.42), '#f472b6', cabeca, rot=(-lado * 0.32, 0, 0))
def acessorio_gorro():
    peca('acc_gorro', 'ball', (H * 0.43, H * 0.43, H * 0.30), (-H * 0.005, 0, H * 0.335), '#fb923c', cabeca)
    peca('acc_barra', 'cyl', (H * 0.405, H * 0.405, H * 0.05), (-H * 0.005, 0, H * 0.275), '#ffffff', cabeca)
    peca('acc_pompom2', 'ball', (H * 0.09, H * 0.09, H * 0.09), (-H * 0.005, 0, H * 0.505), '#ffffff', cabeca)
def acessorio_laco():
    peca('acc_no', 'ball', (H * 0.07, H * 0.07, H * 0.07), (-H * 0.01, 0, H * 0.405), '#f472b6', cabeca)
    for lado in (-1, 1):
        peca(f'acc_asa{lado}', 'cone', (H * 0.13, H * 0.13, H * 0.16), (-H * 0.01, lado * H * 0.115, H * 0.405), '#f9a8d4', cabeca, rot=(lado * math.pi / 2, 0, 0))
def acessorio_fones():
    for lado in (-1, 1):
        peca(f'acc_concha{lado}', 'cyl', (H * 0.13, H * 0.13, H * 0.06), (0, lado * H * 0.215, H * 0.18), '#f472b6', cabeca, rot=(math.pi / 2, 0, 0))
        peca(f'acc_almofada{lado}', 'cyl', (H * 0.10, H * 0.10, H * 0.065), (0, lado * H * 0.225, H * 0.18), '#fde047', cabeca, rot=(math.pi / 2, 0, 0))
    for k in range(9):
        a = math.pi * (k / 8)           # over the top of the helmet, ear to ear
        peca(f'acc_arco{k}', 'box', (H * 0.04, H * 0.05, H * 0.04), (0, -math.cos(a) * H * 0.215, H * 0.18 + math.sin(a) * H * 0.215), '#cbd5e1', cabeca, rot=(-(a - math.pi / 2), 0, 0), bevel=0.003)
def acessorio_oculos():          # round yellow shades on the visor
    for lado in (-1, 1):
        peca(f'acc_aro{lado}', 'cyl', (H * 0.17, H * 0.17, H * 0.02), (H * 0.222, lado * H * 0.085, H * 0.215), '#ffffff', cabeca, rot=(0, math.pi / 2, 0))
        peca(f'acc_lente{lado}', 'cyl', (H * 0.14, H * 0.14, H * 0.024), (H * 0.228, lado * H * 0.085, H * 0.215), '#fde047', cabeca, rot=(0, math.pi / 2, 0))
    peca('acc_ponte', 'box', (H * 0.02, H * 0.05, H * 0.02), (H * 0.226, 0, H * 0.225), '#ffffff', cabeca)
def acessorio_oculos_quadrado():  # square cool frames, sky-blue lenses
    for lado in (-1, 1):
        peca(f'acc_moldura{lado}', 'box', (H * 0.02, H * 0.17, H * 0.12), (H * 0.222, lado * H * 0.088, H * 0.215), '#f472b6', cabeca, bevel=0.004)
        peca(f'acc_vidro{lado}', 'box', (H * 0.024, H * 0.13, H * 0.085), (H * 0.23, lado * H * 0.088, H * 0.215), '#7dd3fc', cabeca, bevel=0.003)
    peca('acc_ponte2', 'box', (H * 0.02, H * 0.05, H * 0.02), (H * 0.226, 0, H * 0.235), '#f472b6', cabeca)
def acessorio_bigode():
    for lado in (-1, 1):
        peca(f'acc_bigode{lado}', 'ball', (H * 0.035, H * 0.11, H * 0.04), (H * 0.222, lado * H * 0.06, H * 0.155), '#fbbf77', cabeca, rot=(lado * 0.45, 0, 0))
ACESSORIOS = {'festa': acessorio_festa, 'coroa': acessorio_coroa, 'cowboy': acessorio_cowboy, 'orelhas': acessorio_orelhas,
              'gorro': acessorio_gorro, 'laco': acessorio_laco, 'fones': acessorio_fones,
              'oculos': acessorio_oculos, 'oculos_quadrado': acessorio_oculos_quadrado, 'bigode': acessorio_bigode}
exec(compile(open(os.path.join(HERE, 'acessorios_extra.py'), encoding='utf8').read(), 'acessorios_extra.py', 'exec'), globals())
ACESSORIOS.update(ACESSORIOS_EXTRA)
if ACESSORIO: ACESSORIOS[ACESSORIO]()

pernas, bracos = [], []
for lado in (-1, 1):
    quadril = pivo(f'quadril{lado}', (0, lado * H * 0.075, 0), corpo)
    peca(f'perna{lado}', 'box', (H * 0.11, H * 0.11, H * 0.30), (0, 0, -H * 0.15), SUIT, quadril, bevel=0.02)
    peca(f'bota{lado}', 'box', (H * 0.17, H * 0.12, H * 0.08), (H * 0.025, 0, -H * 0.32), BOOT, quadril, bevel=0.02)
    peca(f'canela{lado}', 'box', (H * 0.118, H * 0.118, H * 0.035), (0, 0, -H * 0.27), ACCENT, quadril, bevel=0.005)
    pernas.append(quadril)
    ombro = pivo(f'ombro{lado}', (0, lado * H * 0.19, H * 0.26), corpo)
    peca(f'braco{lado}', 'box', (H * 0.09, H * 0.09, H * 0.24), (0, 0, -H * 0.11), SUIT, ombro, bevel=0.02)
    peca(f'manga{lado}', 'box', (H * 0.098, H * 0.098, H * 0.04), (0, 0, -H * 0.03), ACCENT, ombro, bevel=0.005)
    peca(f'luva{lado}', 'ball', (H * 0.10, H * 0.10, H * 0.10), (0, 0, -H * 0.25), TRIM, ombro)
    bracos.append(ombro)
exec(compile(open(os.path.join(HERE, 'personagens_extra.py'), encoding='utf8').read(), 'personagens_extra.py', 'exec'), globals())
if SKIN in PERSONAGENS_EXTRA and not ACESSORIO: PERSONAGENS_EXTRA[SKIN]()
for _n in ('tronco', 'faixa', 'painel', 'mochila', 'listra'):   # chunkier (or slimmer) torso: leaf parts only, no shear
    _o = bpy.data.objects.get(_n)
    if _o and K.get('cw'): _o.scale.x *= K['cw']; _o.scale.y *= K['cw']
if ACESSORIO:   # overlay only: hide the whole suit (the pieces above are all created by now)
    for o in sc.objects:
        if o.type == 'MESH' and not o.name.startswith('acc_'): o.hide_render = True


def pose(fase):
    """fase None = idle; 0..1 = walk cycle; 'sentado' = seated on the rover. Moon walk: both feet
    push, short float, big swing."""
    if fase == 'sentado':
        # Hips at the standing height (the game puts them on the seat), legs straight forward, no
        # bent knees, arms reaching forward to the hand controller.
        corpo.location.z = H * 0.36; corpo.rotation_euler = (0, 0, 0)
        for p in pernas: p.rotation_euler = (0, -math.pi / 2, 0)
        for i, b in enumerate(bracos): b.rotation_euler = ((-1 if i else 1) * 0.08, -0.9, 0)
        return
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
centro = Vector((0, 0, H * 0.58))                 # a bit high: room for the helmet antenna
cam = bpy.data.cameras.new('AstroCam'); cam.type = 'ORTHO'; cam.ortho_scale = FRAME / s
cam_o = bpy.data.objects.new('AstroCam', cam); sc.collection.objects.link(cam_o); sc.camera = cam_o
cam_o.location = centro + to_cam * 20; cam_o.rotation_mode = 'QUATERNION'; cam_o.rotation_quaternion = q
sun = bpy.data.lights.new('Sol', 'SUN'); sun.energy = 0.0 if NOVO else 4.0; sun.use_shadow = False
if NOVO:
    # The solar station's key light: a big warm disk above the front-left, soft shadows.
    luz = bpy.data.lights.new('Luz da estacao', 'AREA'); luz.energy = 1500; luz.shape = 'DISK'; luz.size = 7
    luz_o = bpy.data.objects.new('Luz da estacao', luz); sc.collection.objects.link(luz_o)
    luz_o.location = Vector((2, -5, 9))
    luz_o.rotation_euler = (Vector((0, 0, 0.3)) - luz_o.location).to_track_quat('-Z', 'Y').to_euler()
    luz.energy = 2200
    # Cool fill from the right, as in the station's presentation render: keeps the white suit white.
    fill = bpy.data.lights.new('Preenchimento', 'AREA'); fill.energy = 1400; fill.shape = 'DISK'; fill.size = 7
    fill.color = (0.65, 0.81, 1)
    fill_o = bpy.data.objects.new('Preenchimento', fill); sc.collection.objects.link(fill_o)
    fill_o.location = Vector((7, 1, 7))
    fill_o.rotation_euler = (Vector((0, 0, 0.3)) - fill_o.location).to_track_quat('-Z', 'Y').to_euler()
    sc.eevee.taa_render_samples = 128
sun_o = bpy.data.objects.new('Sol', sun); sc.collection.objects.link(sun_o)
to_sun = (to_cam * 0.5 - right * 1.0 + Vector((0, 0, 0.45))).normalized()   # same as the terrain
sun_o.rotation_euler = (-to_sun).to_track_quat('-Z', 'Y').to_euler()
sc.render.resolution_x = sc.render.resolution_y = FRAME

# Pixel under the feet (origin) in a frame.
pe = Vector((0, 0, 0)) - centro
anchor = [FRAME / 2 + pe.dot(right) * s, FRAME / 2 - pe.dot(up) * s]

# The seated driver sits in the Apollo LRV: the rover itself (make_lrv.py LRV_BLEND) is loaded as a
# holdout, placed exactly where the game seats the driver (Superficie: the frame's row 128, the
# hip line, on the seat 0.21 tile behind the rover's centre, 0.19 to its side, 0.47 up), turning
# with the figure. Each frame then comes out cut wherever the rover is in front of the driver, and
# the game draws the driver over the whole rover. Without the .blend the frames stay uncut.
OCLUSOR = os.path.join(HERE, '.cache', 'lrv_oclusor.blend')
if SENTADO and os.path.exists(OCLUSOR):
    recorte = bpy.data.materials.new('Recorte do LRV'); recorte.use_nodes = True
    rn = recorte.node_tree.nodes; rn.clear()
    recorte.node_tree.links.new(rn.new('ShaderNodeHoldout').outputs[0], rn.new('ShaderNodeOutputMaterial').inputs['Surface'])
    quadril = (anchor[1] - 128) / (s * up.z)                     # hip height above the feet, tiles
    lrv = bpy.data.objects.new('LRV (recorte)', None); sc.collection.objects.link(lrv)
    lrv.parent = root; lrv.location = (0.21, -0.19, quadril - 0.47)
    with bpy.data.libraries.load(OCLUSOR) as (de, para):
        para.objects = list(de.objects)
    for o in para.objects:
        if o is None: continue
        sc.collection.objects.link(o)
        o.parent = lrv
        o.visible_shadow = False
        for slot in o.material_slots: slot.material = recorte
    print('LRV holdout', len(para.objects), 'pieces, hip', round(quadril, 3), flush=True)

if LIVE:
    pose(0.25)
    root.rotation_euler = (0, 0, math.radians(-45))
    print('scene "Astronauta" ready')
else:
    import numpy as np, subprocess
    os.makedirs(TMP, exist_ok=True)
    cols = 1 if SENTADO else 1 + WALK
    dirs = 16 if SENTADO else 8
    sheet = np.zeros((dirs * FRAME, cols * FRAME, 4), np.float32)
    for d in range(dirs):
        # Direction d faces map angle d * 360 / dirs deg, measured in Blender's XY (map gx, -gy).
        root.rotation_euler = (0, 0, math.radians(d * 360 / dirs))
        for c in range(cols):
            pose('sentado' if SENTADO else None if c == 0 else (c - 1) / WALK)
            bpy.context.view_layer.update()
            p = os.path.join(TMP, f'd{d}_{c}.png')
            sc.render.filepath = p
            bpy.ops.render.render(write_still=True)
            im = bpy.data.images.load(p)
            px = np.array(im.pixels[:], np.float32).reshape(FRAME, FRAME, 4)
            r = dirs - 1 - d                               # Blender rows start at the bottom
            sheet[r * FRAME:(r + 1) * FRAME, c * FRAME:(c + 1) * FRAME] = px
            bpy.data.images.remove(im)
    img = bpy.data.images.new('astro', cols * FRAME, dirs * FRAME, alpha=True)
    img.pixels = sheet.ravel(); img.filepath_raw = PNG; img.file_format = 'PNG'; img.save()
    try:
        subprocess.run(['magick', PNG, '-dither', 'None', '-colors', '255', 'PNG8:' + PNG], check=True)
    except FileNotFoundError:
        print('no magick: quantize', PNG, 'to 255 colors afterwards (Pillow, FASTOCTREE, no dither)')
    if SKIN == 'comandante' and not SENTADO and not ACESSORIO: f = open(JSON, 'w')
    else: f = open(os.devnull, 'w')
    with f:
        json.dump({'frame': FRAME, 'colunas': cols, 'andar': WALK, 'escala': 1 / SUPER,
                   'pe': [round(anchor[0], 2), round(anchor[1], 2)],
                   'nota': 'Row d faces map angle d*45 deg, where angle = atan2(-dy, dx) for a move (dx, dy) in tiles. Column 0 idle, 1.. walk.'}, f, indent=1)
    print('DONE', PNG, anchor)
