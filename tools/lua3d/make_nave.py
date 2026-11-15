# Generated with AI assistance. See README, "Use of AI tools".
# Chapter 2: the inside of the ship to Mars, in the same toon style as the Moon and Mars maps,
# for the same 3D engine (Superficie): a flat metal deck the commander walks on, the hull around
# it (cut low in front, like the Moon map's diorama edges), and the chapter's props.
#
#   prime-run blender -b -P tools/lua3d/make_nave.py
#
# Uses the team's module helpers (make_modules.py: toon material, outline, the map's own camera,
# framing) without rendering any of its models, so every picture matches the modules exactly.
# Out:
#   src/dados/terreno_nave.json     the deck as a terrain: flat inside the hull, blocked outside,
#                                   and the picture's tile -> pixel mapping (like terreno.json)
#   public/nave/terrain.png         the deck, hull, engines, cockpit and solar wings
#   public/nave/props/<id>.png      the Engines room and the props of chapter 2
#   src/dados/nave_props.json       { id: { arquivo, w, h, ancora, escala } } like modulos.json
import os, sys, json, math, subprocess
import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
SRC = os.path.join(HERE, 'make_modules.py')
# Load the team's helpers: APENAS names no model, so it renders nothing (its JSON is kept).
g = {'__file__': SRC, '__name__': 'make_modules', 'APENAS': ['__nenhum__']}
exec(compile(open(SRC).read(), SRC, 'exec'), g)
caixa, cilindro, esfera, haste, emissivo, grupo, sc = g['caixa'], g['cilindro'], g['esfera'], g['haste'], g['emissivo'], g['grupo'], g['sc']
enquadrar, right, up, s, SUPER, T = g['enquadrar'], g['right'], g['up'], g['s'], g['SUPER'], g['T']
from mathutils import Vector

OUT = os.path.join(ROOT, 'public', 'nave')
N = 24                                   # tiles per side of the terrain grid
X0, X1, Y0, Y1 = 3, 21, 6, 18            # the deck inside the hull (18 x 12 tiles)
dentro = lambda x, y: X0 <= x <= X1 and Y0 <= y <= Y1

# Ship colors: cool metal inside, white hull with an orange mission band outside.
PLACA = ['#a3afc2', '#94a1b6']
FUNDO = '#3b4a63'
PAREDE = '#d8dfea'
NERVURA = '#8a97ad'
CASCO = '#eef2f7'
FAIXA = '#f97316'
ALERTA = '#facc15'
VIDRO = '#1e3a8a'


def limpar():
    for o in list(sc.objects):
        if o.type == 'MESH' or (o.type == 'LIGHT' and o.data.type != 'SUN'): bpy.data.objects.remove(o)
    grupo.clear()


def luz():
    """The team's key light (make_modules.luz_estacao: a big warm disk above the front left), scaled
    to the model: the same light on a prop, a proportionally bigger and stronger one on the ship."""
    if not g.get('NOVO'): return
    pts = [o.matrix_world @ Vector(c) for o in grupo for c in o.bound_box]
    if not pts: return
    lado = max((max(p[i] for p in pts) - min(p[i] for p in pts)) for i in range(3))
    k = max(1.0, lado / 6)                                 # the team's light is set for ~6-tile models
    centro = sum(pts, Vector()) / len(pts)
    l = bpy.data.lights.new('Sol de exportacao', 'AREA'); l.energy = 1500 * k * k; l.shape = 'DISK'; l.size = 7 * k
    o = bpy.data.objects.new('Sol de exportacao', l); sc.collection.objects.link(o)
    o.location = centro + Vector((2, -5, 9)) * k
    o.rotation_euler = (centro - o.location).to_track_quat('-Z', 'Y').to_euler()


_quadro = {}
def render(caminho, metade=False, mesmo_quadro=False):
    """Frames the current group (or keeps the last framing), renders, quantizes; returns
    (W, H, ancora of the map origin)."""
    luz()
    if mesmo_quadro:
        W, H, cx, cy = _quadro['q']
    else:
        W, H, cx, cy = enquadrar(); _quadro['q'] = (W, H, cx, cy)
    sc.render.filepath = caminho
    bpy.ops.render.render(write_still=True)
    o0 = Vector((0, 0, 0))
    ancora = [(o0.dot(right) - cx) * s + W / 2, H / 2 - (o0.dot(up) - cy) * s]
    if metade:   # the terrain is drawn at scale 1 (30 px per tile step): halve the 2x render
        subprocess.run(['magick', caminho, '-resize', '50%', caminho], check=True)
        W, H, ancora = math.ceil(W / 2), math.ceil(H / 2), [ancora[0] / 2, ancora[1] / 2]
    try:
        subprocess.run(['magick', caminho, '-dither', 'None', '-colors', '255', 'PNG8:' + caminho], check=True)
    except FileNotFoundError:   # no ImageMagick: quantize afterwards with Pillow (see the novo-item skill)
        print('no magick: quantize', caminho, 'to 255 colors by hand', flush=True)
    return W, H, [round(ancora[0], 2), round(ancora[1], 2)]


def lampada_ponto(x, y, z, cor='#7dd3fc'):
    emissivo(cilindro(x, y, 0.07, z, z + 0.02, cor, v=12, linha=0.004), cor, 2.2)


def escotilha(x, y, z, r=0.32, eixo='y'):
    """A round window in a far wall: white rim, deep blue glass, a few stars."""
    rot = (math.pi / 2, 0, 0) if eixo == 'y' else (0, math.pi / 2, 0)
    cilindro(x, y, r, z - 0.05, z + 0.05, '#e2e8f0', rot=rot, linha=0.01)
    emissivo(cilindro(x, y + (0.06 if eixo == 'y' else 0), r * 0.78, z - 0.06, z + 0.06, VIDRO, rot=rot, linha=0.004), VIDRO, 1.0)


# ---------- the hull and the deck ----------
# The hull is one smooth shell: an oval tube along the ship (gx), its nose tapering at +gx and
# a short rounded tail with the engines at -gx. Built as a parametric surface, so the same shell
# makes both pictures: closed (with its roof, seen from afar) and cut away (the roof and the
# side toward the camera removed above the deck, like the Moon map's diorama edges).
YC, ZC, A, B = (Y0 + Y1) / 2, 0.9, 6.9, 3.4     # tube axis (gy, z) and half width / half height
XC0, XC1 = X0 - 0.6, X1 + 0.4                   # straight body; tail and nose beyond
XT, XN = X0 - 2.2, X1 + 2.6                     # tail and nose domes


def fator(x):
    """How much of the full oval the shell has at x (1 in the body, tapering at both ends)."""
    if x > XC1: return max(0.0, 1 - ((x - XC1) / (XN - XC1)) ** 2) ** 0.5
    if x < XC0: return max(0.32, (1 - ((XC0 - x) / (XC0 - XT)) ** 2) ** 0.5)
    return 1.0


def ponto(x, t):
    f = fator(x)
    return (x, YC + A * f * math.cos(t), ZC + B * f * math.sin(t))


def casco(com_teto):
    import bmesh
    xs = [XT + (XN - XT) * k / 200 for k in range(201)]           # fine, so the cut edge is smooth
    ts = [2 * math.pi * k / 160 for k in range(161)]
    bm = bmesh.new()
    vs = [[bm.verts.new((x, -y, z)) for (x, y, z) in (ponto(x, t) for t in ts)] for x in xs]
    for a in range(len(xs) - 1):
        for b in range(len(ts) - 1):
            q = [vs[a][b], vs[a + 1][b], vs[a + 1][b + 1], vs[a][b + 1]]
            cx = sum(v.co.x for v in q) / 4; cy = -sum(v.co.y for v in q) / 4; cz = sum(v.co.z for v in q) / 4
            if not com_teto:
                # Cutaway: keep the belly, and the far side (low gy) and the tail up to the wall
                # height; drop the roof, the near side and the nose above the deck.
                perto = cy > YC or cx > XC1
                if cz > 0.35 and (perto or cz > 2.3): continue
            f = bm.faces.new(q)
            # Mission band low on the sides; the windshield on the nose.
            sn = (cz - ZC) / (B * max(fator(cx), 0.2))
            if com_teto and -0.62 < sn < -0.48 and XC0 < cx < XC1: f.material_index = 1
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:                                   # outward, away from the tube's axis
        c = f.calc_center_median()
        if f.normal.dot(Vector((0, c.y + YC, c.z - ZC))) < 0: f.normal_flip()
    me = bpy.data.meshes.new('casco'); bm.to_mesh(me); bm.free()
    for pl in me.polygons: pl.use_smooth = True
    o = bpy.data.objects.new('casco', me); sc.collection.objects.link(o)
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    if not com_teto:                                     # a wall thickness shows on the cut edges
        sd = o.modifiers.new('espessura', 'SOLIDIFY'); sd.thickness = 0.16; sd.offset = -1
    g['_fim'](o, CASCO, 0, 0.03)
    # Faces use 0 = hull, 1 = band, 2 = glass. The team's current look (make_modules.py NOVO, the
    # solar station's clay style) has no outline material: [hull, band, glass]. The old toon look
    # adds an outline shell (material index + offset), so there the outline goes last.
    mats = o.data.materials
    if g.get('NOVO'):
        mats.append(g['toon'](FAIXA)); mats.append(g['toon'](VIDRO))
    else:
        mats[1] = g['toon'](FAIXA)
        mats.append(g['toon'](VIDRO))
        mats.append(g['contorno'])
        for m in o.modifiers:
            if m.name == 'contorno': m.material_offset = 3
    return o


def escotilha_casco(x, lado, z=1.3, r=0.42):
    """A porthole on the shell: white rim and deep blue glass, facing out from the tube."""
    sn = (z - ZC) / B
    cs = math.sqrt(max(0.0, 1 - sn * sn)) * lado          # lado -1 far side (low gy), +1 near side
    y = YC + A * cs
    n = Vector((0, -(cs / A), sn / B)).normalized()       # Blender Y is -gy
    # Deep enough to show through the wall's thickness from inside too.
    for rr, dz, cor, em in ((r, 0.2, '#e2e8f0', False), (r * 0.76, 0.24, VIDRO, True)):
        bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=rr, depth=dz * 2)
        o = bpy.context.active_object
        o.location = Vector((x, -y, z)) + n * 0.02
        o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = n.to_track_quat('Z', 'Y')
        g['_fim'](o, cor, 0, 0.01)
        if em: emissivo(o, cor, 1.0)


def piso():
    """One continuous deck: a single plate with thin seams, no gaps between tiles."""
    caixa(XC0, YC - 6.5, XC1, YC + 6.5, -0.14, 0, PLACA[0], bevel=0, linha=0.012)
    for x in range(X0, X1 + 1, 2):
        caixa(x - 0.012, YC - 6.4, x + 0.012, YC + 6.4, 0, 0.004, NERVURA, bevel=0, linha=0.0005)
    for y in range(Y0, Y1 + 1, 2):
        caixa(XC0 + 0.1, y - 0.012, XC1 - 0.1, y + 0.012, 0, 0.004, NERVURA, bevel=0, linha=0.0005)
    caixa(X0 + 0.3, YC - 0.7, X1 - 0.3, YC + 0.7, 0.004, 0.012, '#7c8aa3', bevel=0, linha=0.002)    # corridor
    for yy in (YC - 0.72, YC + 0.62):
        for k, x in enumerate(range(X0, X1 - 1)):
            caixa(x + 0.35, yy, x + 0.85, yy + 0.1, 0.012, 0.018, ALERTA if k % 2 == 0 else '#1f2937', bevel=0, linha=0.001)
    for x in range(X0 + 1, X1, 2):
        lampada_ponto(x + 0.5, YC - 0.85, 0.012)
        lampada_ponto(x + 0.5, YC + 0.85, 0.012)


# ---------- outside: after NASA's Mars Transit Habitat concept ----------
# NASA Marshall's Mars Transit Habitat study (Gateway-derived, 2020): one large habitat module with
# an airlock and docking port on its forward dome, micrometeoroid shielding and radiator panels on
# its skin, two windows, an aft skirt with small thrusters, and behind it a hybrid propulsion
# stage: storable propellant tanks, deployable radiators and large solar arrays feeding solar
# electric propulsion (Hall thrusters, firing for months with a faint blue glow).
XS = XT - 1.2                                   # aft skirt
XP0, XP1 = XS - 0.4, XS - 13.0                  # propulsion stage truss, from the skirt back
XH = XP1 - 0.6                                  # Hall thrusters' exit plane
HALL = [(YC + 1.5 * math.cos(a), ZC + 1.5 * math.sin(a)) for a in (math.radians(30 + 60 * k) for k in range(6))]


def treliça(x0, x1, meio=0.9):
    """A square truss along -gx: four longerons and diagonal braces."""
    cantos = [(YC - meio, ZC - meio), (YC + meio, ZC - meio), (YC + meio, ZC + meio), (YC - meio, ZC + meio)]
    for y, z in cantos:
        haste((x0, y, z), (x1, y, z), 0.09, '#94a3b8')
    passo = (x1 - x0) / 8
    for k in range(8):
        xa, xb = x0 + passo * k, x0 + passo * (k + 1)
        for i in range(4):
            (ya, za), (yb, zb) = cantos[i], cantos[(i + 1) % 4]
            haste((xa, ya, za), (xb, yb, zb), 0.05, '#cbd5e1')


def painel_solar(xc, lado):
    """A roll-out solar array (like ROSA): a long blanket of cells between two booms."""
    y0, y1 = YC + lado * 1.2, YC + lado * 12.5
    ya, yb = min(y0, y1), max(y0, y1)
    caixa(xc - 1.9, ya, xc + 1.9, yb, ZC - 0.03, ZC + 0.03, '#1e3a8a', bevel=0.01, linha=0.012)
    for k in range(1, 10):                                  # cell rows
        yk = ya + (yb - ya) * k / 10
        caixa(xc - 1.9, yk - 0.03, xc + 1.9, yk + 0.03, ZC + 0.03, ZC + 0.045, '#60a5fa', bevel=0, linha=0.002)
    for xx in (xc - 1.95, xc + 1.95):                       # booms
        haste((xx, y0, ZC), (xx, y1, ZC), 0.06, '#e5c07b')
    haste((xc, YC, ZC), (xc, y0, ZC), 0.1, '#94a3b8')       # the mast to the truss


def estagio_propulsao(lados):
    cilindro((XS + XT + 0.4) / 2, YC, 2.4, ZC - (XT + 0.4 - XS) / 2, ZC + (XT + 0.4 - XS) / 2, '#cbd5e1',
             rot=(0, math.pi / 2, 0), linha=0.02, bevel=0.15)                                # aft skirt, round
    for y, z in ((YC - 2.45, ZC + 0.6), (YC + 2.45, ZC + 0.6), (YC - 2.45, ZC - 0.6), (YC + 2.45, ZC - 0.6)):
        cilindro(XS + 0.4, y, 0.16, z - 0.12, z + 0.12, '#475569', linha=0.006)             # small docking thrusters
    treliça(XP0, XP1)
    for y, z in ((YC - 1.7, ZC - 1.7), (YC + 1.7, ZC - 1.7), (YC - 1.7, ZC + 1.7), (YC + 1.7, ZC + 1.7)):
        esfera(XP0 - 2.6, y, z, 1.25, 1.25, 1.25, '#f1f5f9', linha=0.02)                        # propellant tanks
    for sentido in (1, -1):                                 # deployable radiators, up and down
        for k in range(3):
            xr = XP0 - 5.0 - k * 1.35
            caixa(xr - 0.55, YC - 0.05, xr + 0.55, YC + 0.05, ZC + sentido * 1.0, ZC + sentido * 5.0, '#e2e8f0', bevel=0.02, linha=0.01)
    for lado in lados:
        painel_solar(XP0 - 9.0, lado)
    # Hall thrusters in a ring around the main engine's bell, at the very back.
    caixa(XH + 0.35, YC - 2.2, XH + 0.75, YC + 2.2, ZC - 2.2, ZC + 2.2, '#64748b', bevel=0.1, linha=0.015)
    for y, z in HALL:
        cilindro(XH + 0.35, y, 0.42, z - 0.3, z + 0.3, '#334155', rot=(0, math.pi / 2, 0), linha=0.012)
        emissivo(cilindro(XH, y, 0.32, z - 0.03, z + 0.03, '#7dd3fc', rot=(0, math.pi / 2, 0), linha=0.003), '#7dd3fc', 2.4)
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=0.75, radius2=0.35, depth=1.0)
    o = bpy.context.active_object; o.location = (XH, -YC, ZC); o.rotation_euler = (0, math.pi / 2, 0)
    g['_fim'](o, '#475569', 0, 0.015)


def proa():
    """The forward dome's airlock and docking port (where the crew vehicles dock)."""
    cilindro(XN + 0.8, YC, 1.4, ZC - 1.3, ZC + 1.3, '#e2e8f0', rot=(0, math.pi / 2, 0), linha=0.02, bevel=0.06)
    cilindro(XN + 2.15, YC, 1.65, ZC - 0.08, ZC + 0.08, '#94a3b8', rot=(0, math.pi / 2, 0), linha=0.012)
    cilindro(XN + 2.4, YC, 0.9, ZC - 0.25, ZC + 0.25, '#64748b', rot=(0, math.pi / 2, 0), linha=0.012)


def braco_robotico():
    """The robotic arm that walks the length of the vehicle, folded on the roof."""
    topo = ZC + B + 0.15
    pts = [(X0 + 3, YC + 1.5, topo), (X0 + 7, YC + 2.2, topo + 1.1), (X0 + 11, YC + 1.2, topo + 0.2)]
    for a, b in zip(pts, pts[1:]):
        haste(a, b, 0.14, '#f8fafc')
    for p in pts:
        esfera(p[0], p[1], p[2], 0.22, 0.22, 0.22, '#64748b', linha=0.008)


def nave(com_teto):
    casco(com_teto)
    estagio_propulsao((-1, 1))
    proa()
    for x in range(X0 + 2, X1, 5):                                           # portholes on the far wall
        escotilha_casco(x + 0.5, -1)
    if com_teto:
        escotilha_casco(X1 - 3, 1, r=0.55); escotilha_casco(X1 - 6, 1, r=0.55)   # the habitat's two windows
        # Radiator panels on the skin and the robotic arm on the roof.
        for x in range(X0 + 1, X1 - 1, 4):
            caixa(x, YC - 1.4, x + 3.2, YC + 1.4, ZC + B + 0.02, ZC + B + 0.08, '#e2e8f0', bevel=0.02, linha=0.01)
            for k in range(1, 4):
                caixa(x + 0.8 * k - 0.02, YC - 1.4, x + 0.8 * k + 0.02, YC + 1.4, ZC + B + 0.08, ZC + B + 0.1, '#94a3b8', bevel=0, linha=0.002)
        braco_robotico()
    else:
        piso()


# ---------- the Engines room and the props of chapter 2 (footprint X 0..w, gy 0..h) ----------
def motores():                               # 3 x 3: engine control with the reactor core
    caixa(0.15, 0.15, 2.85, 2.85, 0, 0.1, '#64748b', bevel=0.03, linha=0.01)
    cilindro(1.5, 1.5, 0.8, 0.1, 1.9, '#cbd5e1', linha=0.02, bevel=0.04)
    for z in (0.5, 1.0, 1.5):
        emissivo(cilindro(1.5, 1.5, 0.83, z, z + 0.1, '#22d3ee', linha=0.004), '#22d3ee', 2.2)
    cilindro(1.5, 1.5, 0.55, 1.9, 2.2, '#475569', linha=0.02)
    for a in range(4):
        r = math.radians(45 + a * 90)
        haste((1.5 + math.cos(r) * 0.8, 1.5 + math.sin(r) * 0.8, 1.6), (1.5 + math.cos(r) * 1.25, 1.5 + math.sin(r) * 1.25, 0.1), 0.07, '#f97316')
    caixa(0.2, 2.2, 1.0, 2.8, 0.1, 0.95, '#334155', bevel=0.03, linha=0.01)                     # console
    emissivo(caixa(0.28, 2.18, 0.92, 2.24, 0.55, 0.9, '#38bdf8', bevel=0, linha=0.003), '#38bdf8', 1.6)


def beliche():                               # 2 x 1: crew bunks, two levels, a little "bedroom" wall behind
    caixa(0.05, 0.05, 1.95, 0.16, 0, 1.5, '#dbeafe', bevel=0.03, linha=0.01)                   # back wall
    for k, (x, z, c) in enumerate(((0.3, 1.25, '#f472b6'), (0.55, 1.18, '#facc15'), (1.6, 0.55, '#4ade80'), (1.35, 0.5, '#38bdf8'))):
        caixa(x, 0.16, x + 0.16, 0.175, z, z + 0.12, c, bevel=0, linha=0.003)                   # photos stuck on the wall
    for z, saco, faixa in ((0.12, '#3b82f6', '#93c5fd'), (0.8, '#f97316', '#fed7aa')):
        caixa(0.1, 0.16, 1.9, 0.92, z, z + 0.1, '#e2e8f0', bevel=0.03, linha=0.01)              # bunk tray
        caixa(0.08, 0.86, 1.92, 0.94, z + 0.1, z + 0.2, '#94a3b8', bevel=0.02, linha=0.006)    # safety rail
        caixa(0.22, 0.24, 1.55, 0.82, z + 0.1, z + 0.32, saco, bevel=0.08, linha=0.01)          # sleeping bag
        for x in (0.6, 1.1):                                                                  # straps that hold you in
            caixa(x, 0.22, x + 0.07, 0.84, z + 0.3, z + 0.335, '#1e293b', bevel=0, linha=0.003)
        caixa(0.25, 0.3, 0.6, 0.8, z + 0.31, z + 0.33, faixa, bevel=0.01, linha=0.003)           # fold of the bag
        caixa(1.52, 0.26, 1.82, 0.78, z + 0.1, z + 0.28, '#f8fafc', bevel=0.06, linha=0.008)    # pillow
        emissivo(esfera(1.7, 0.2, z + 0.5, 0.05, 0.03, 0.05, '#fde68a', linha=0.004), '#fef3c7', 2.2)   # reading lamp
    for x in (0.08, 1.86):
        for y in (0.08, 0.86):
            caixa(x, y, x + 0.07, y + 0.07, 0, 1.5, '#64748b', bevel=0, linha=0.006)            # posts
    for z in (0.3, 0.5, 0.7):                                                                 # ladder at the nose end
        haste((1.93, 0.25, z), (1.93, 0.75, z), 0.02, '#facc15', linha=0.005)
    caixa(0.05, 0.05, 1.95, 0.95, 1.5, 1.56, '#cbd5e1', bevel=0.02, linha=0.008)               # roof


def mesa():                                  # 2 x 2: galley table with handrails, food pouches and a floating drink
    cilindro(1.0, 1.0, 0.1, 0, 0.68, '#64748b', linha=0.01)
    cilindro(1.0, 1.0, 0.3, 0, 0.04, '#94a3b8', linha=0.008)
    caixa(0.35, 0.35, 1.65, 1.65, 0.68, 0.78, '#f1f5f9', bevel=0.06, linha=0.012)
    for (a, b) in (((0.3, 0.3), (1.7, 0.3)), ((1.7, 0.3), (1.7, 1.7)), ((1.7, 1.7), (0.3, 1.7)), ((0.3, 1.7), (0.3, 0.3))):
        haste((a[0], a[1], 0.82), (b[0], b[1], 0.82), 0.022, '#f97316', linha=0.006)           # handrail around the edge
    for (x, y) in ((0.3, 0.3), (1.7, 0.3), (1.7, 1.7), (0.3, 1.7)):
        haste((x, y, 0.78), (x, y, 0.82), 0.02, '#f97316', linha=0.005)
    for x, y in ((0.1, 1.0), (1.9, 1.0), (1.0, 0.1), (1.0, 1.9)):                              # stools with foot bars
        cilindro(x, y, 0.16, 0, 0.42, '#38bdf8', linha=0.01, bevel=0.03)
        cilindro(x, y, 0.17, 0.36, 0.44, '#e0f2fe', linha=0.006)
    for x, y, c in ((0.6, 0.65, '#facc15'), (0.95, 1.25, '#4ade80'), (1.3, 0.65, '#f87171'), (1.35, 1.2, '#a78bfa')):
        caixa(x - 0.11, y - 0.08, x + 0.11, y + 0.08, 0.78, 0.84, c, bevel=0.025, linha=0.005)   # food pouches
        caixa(x - 0.11, y - 0.08, x - 0.06, y + 0.08, 0.84, 0.845, '#334155', bevel=0, linha=0.002)  # velcro
    caixa(0.85, 0.55, 1.05, 0.85, 0.78, 0.8, '#94a3b8', bevel=0.01, linha=0.004)               # tray
    cilindro(1.0, 1.4, 0.06, 0.78, 0.96, '#e0f2fe', v=14, linha=0.005)                         # drink bag
    haste((1.0, 1.4, 0.96), (1.05, 1.42, 1.08), 0.008, '#ef4444', linha=0.002)                 # straw
    emissivo(esfera(1.25, 1.5, 1.1, 0.045, 0.045, 0.045, '#7dd3fc', linha=0.004), '#bae6fd', 1.4)  # floating drop of juice
    emissivo(esfera(0.62, 1.42, 1.02, 0.06, 0.06, 0.06, '#ef4444', linha=0.005), '#f87171', 0.9)   # a floating apple
    haste((0.62, 1.42, 1.08), (0.63, 1.42, 1.12), 0.008, '#65a30d', linha=0.002)


def esteira():                               # 2 x 1: treadmill with the bungee harness
    caixa(0.15, 0.2, 1.85, 0.8, 0, 0.18, '#475569', bevel=0.04, linha=0.01)
    caixa(0.25, 0.28, 1.6, 0.72, 0.18, 0.2, '#111827', bevel=0, linha=0.004)                  # belt
    for k in range(6):
        caixa(0.32 + k * 0.21, 0.29, 0.36 + k * 0.21, 0.71, 0.2, 0.205, '#334155', bevel=0, linha=0.001)
    caixa(0.15, 0.18, 1.85, 0.22, 0.08, 0.16, '#f97316', bevel=0, linha=0.003)                 # orange trim
    caixa(0.15, 0.78, 1.85, 0.82, 0.08, 0.16, '#f97316', bevel=0, linha=0.003)
    for y in (0.22, 0.78):
        haste((1.65, y, 0.18), (1.75, y, 1.0), 0.04, '#94a3b8')                                # uprights
        haste((0.6, y, 0.85), (1.72, y, 0.85), 0.03, '#facc15', linha=0.006)                   # handrails
        haste((0.6, y, 0.85), (0.6, y, 0.18), 0.025, '#94a3b8', linha=0.006)
        haste((0.9, y, 0.2), (0.9, 0.5, 0.95), 0.012, '#22c55e', linha=0.003)                   # green bungee cords
    caixa(0.82, 0.42, 0.98, 0.58, 0.9, 1.0, '#22c55e', bevel=0.02, linha=0.004)                # harness clip
    caixa(1.6, 0.2, 1.85, 0.8, 0.95, 1.15, '#334155', bevel=0.03, linha=0.008)                 # console
    emissivo(caixa(1.58, 0.3, 1.6, 0.7, 1.0, 1.1, '#4ade80', bevel=0, linha=0.002), '#4ade80', 1.4)
    for k, c in enumerate(('#ef4444', '#facc15', '#38bdf8')):
        emissivo(esfera(1.59, 0.35 + k * 0.15, 0.97, 0.02, 0.012, 0.02, c, linha=0.002), c, 2.0)
    caixa(1.2, 0.33, 1.42, 0.47, 0.2, 0.28, '#f8fafc', bevel=0.03, linha=0.004)                # a pair of sneakers
    caixa(1.2, 0.53, 1.42, 0.67, 0.2, 0.28, '#f8fafc', bevel=0.03, linha=0.004)


def plantas():                               # 1 x 1: Veggie garden: lettuce and red zinnias under pink lights
    caixa(0.1, 0.1, 0.9, 0.9, 0, 0.4, '#e2e8f0', bevel=0.04, linha=0.01)
    caixa(0.08, 0.88, 0.92, 0.91, 0.08, 0.3, '#22c55e', bevel=0, linha=0.003)                 # green label stripe
    caixa(0.14, 0.14, 0.86, 0.86, 0.4, 0.46, '#a16207', bevel=0.01, linha=0.004)              # soil pillows
    for (x, y, c) in ((0.3, 0.3, '#22c55e'), (0.7, 0.3, '#4ade80'), (0.3, 0.7, '#16a34a'), (0.7, 0.7, '#86efac')):
        esfera(x, y, 0.55, 0.14, 0.14, 0.11, c, linha=0.008)                                   # lettuce heads
        esfera(x + 0.04, y + 0.05, 0.63, 0.08, 0.08, 0.06, '#bbf7d0', linha=0.004)
    for (x, y) in ((0.5, 0.5), (0.5, 0.82)):                                                  # red zinnia flowers
        haste((x, y, 0.46), (x, y, 0.78), 0.01, '#15803d', linha=0.003)
        esfera(x, y, 0.8, 0.06, 0.06, 0.03, '#ef4444', linha=0.004)
        esfera(x, y, 0.82, 0.025, 0.025, 0.02, '#facc15', linha=0.002)
    for x in (0.12, 0.82):
        caixa(x, 0.12, x + 0.06, 0.88, 0.4, 1.05, '#94a3b8', bevel=0, linha=0.005)
    caixa(0.12, 0.12, 0.88, 0.88, 1.04, 1.1, '#cbd5e1', bevel=0.01, linha=0.006)
    emissivo(caixa(0.16, 0.16, 0.84, 0.84, 1.01, 1.04, '#f472b6', bevel=0.005, linha=0.003), '#f9a8d4', 2.0)   # pink grow lights


def bolsas():                                # 1 x 1: soft cargo bags in bright colors, held by a net
    for k, (z, c, tira) in enumerate(((0, '#f1f5f9', '#3b82f6'), (0.3, '#fde68a', '#f97316'), (0.6, '#e0f2fe', '#22c55e'))):
        d = 0.05 * (k % 2)
        caixa(0.12 + d, 0.15, 0.88 + d * 0.4, 0.85, z, z + 0.29, c, bevel=0.08, linha=0.01)
        caixa(0.4 + d, 0.14, 0.52 + d, 0.86, z + 0.02, z + 0.28, tira, bevel=0, linha=0.003)   # colored strap
        caixa(0.62 + d, 0.86, 0.8 + d, 0.87, z + 0.08, z + 0.2, '#ffffff', bevel=0, linha=0.002)  # label
    for x in (0.2, 0.45, 0.7):                                                                # cargo net
        haste((x, 0.88, 0.0), (x + 0.15, 0.88, 0.9), 0.008, '#facc15', linha=0.002)
    haste((0.12, 0.88, 0.45), (0.92, 0.88, 0.45), 0.008, '#facc15', linha=0.002)


def agua():                                  # 1 x 1: water tanks (water also blocks radiation)
    caixa(0.05, 0.1, 0.95, 0.9, 0, 0.08, '#64748b', bevel=0.02, linha=0.008)
    for x in (0.28, 0.72):
        cilindro(x, 0.5, 0.2, 0.08, 1.0, '#60a5fa', linha=0.012, bevel=0.04)
        cilindro(x, 0.5, 0.21, 0.4, 0.46, '#e0f2fe', linha=0.004)                              # white bands
        cilindro(x, 0.5, 0.21, 0.75, 0.8, '#e0f2fe', linha=0.004)
        cilindro(x, 0.5, 0.12, 1.0, 1.06, '#94a3b8', linha=0.006)                              # cap
        emissivo(caixa(x - 0.05, 0.69, x + 0.05, 0.71, 0.15, 0.38, '#bae6fd', bevel=0, linha=0.002), '#e0f2fe', 1.2)  # level window
    haste((0.28, 0.5, 1.06), (0.28, 0.5, 1.15), 0.02, '#94a3b8')                               # pipe between them
    haste((0.28, 0.5, 1.15), (0.72, 0.5, 1.15), 0.02, '#94a3b8')
    haste((0.72, 0.5, 1.15), (0.72, 0.5, 1.06), 0.02, '#94a3b8')
    cilindro(0.5, 0.5, 0.05, 1.12, 1.18, '#facc15', v=12, linha=0.004)                         # valve wheel


def medico():                                # 1 x 1: medical cabinet with a heart monitor
    caixa(0.1, 0.15, 0.9, 0.85, 0, 1.1, '#f8fafc', bevel=0.04, linha=0.012)
    caixa(0.08, 0.13, 0.92, 0.87, 1.1, 1.15, '#ef4444', bevel=0.02, linha=0.006)              # red top band
    caixa(0.42, 0.84, 0.58, 0.87, 0.6, 0.95, '#ef4444', bevel=0, linha=0.003)                 # red cross
    caixa(0.3, 0.84, 0.7, 0.87, 0.71, 0.84, '#ef4444', bevel=0, linha=0.003)
    for z in (0.12, 0.33):                                                                    # drawers with handles
        caixa(0.16, 0.84, 0.84, 0.86, z, z + 0.17, '#e2e8f0', bevel=0.005, linha=0.003)
        caixa(0.42, 0.86, 0.58, 0.88, z + 0.07, z + 0.1, '#94a3b8', bevel=0, linha=0.002)
    caixa(0.89, 0.25, 0.91, 0.75, 0.6, 0.95, '#0f172a', bevel=0, linha=0.003)                 # heart monitor (side)
    for k in range(5):
        hh = (0.02, 0.02, 0.12, 0.02, 0.02)[k]
        emissivo(caixa(0.91, 0.3 + k * 0.09, 0.915, 0.37 + k * 0.09, 0.77 - hh / 2, 0.77 + hh / 2, '#4ade80', bevel=0, linha=0.001), '#86efac', 2.0)
    caixa(0.28, 0.6, 0.6, 0.86, 1.15, 1.27, '#f97316', bevel=0.04, linha=0.005)               # first-aid bag on top
    caixa(0.4, 0.86, 0.48, 0.87, 1.18, 1.24, '#ffffff', bevel=0, linha=0.001)


def cockpit():                               # 2 x 1: piloting console with screens, a joystick and two seats
    caixa(0.1, 0.05, 1.9, 0.4, 0, 0.9, '#334155', bevel=0.04, linha=0.012)
    caixa(0.08, 0.03, 1.92, 0.42, 0.9, 0.96, '#f97316', bevel=0.02, linha=0.006)
    for x, c, luz in ((0.2, '#38bdf8', '#7dd3fc'), (0.8, '#1e3a8a', '#3b82f6'), (1.4, '#22c55e', '#4ade80')):
        caixa(x - 0.02, 0.39, x + 0.44, 0.41, 0.48, 0.86, '#0f172a', bevel=0, linha=0.003)
        emissivo(caixa(x, 0.41, x + 0.42, 0.42, 0.5, 0.84, c, bevel=0, linha=0.002), luz, 1.4)
    emissivo(esfera(1.02, 0.425, 0.7, 0.07, 0.01, 0.07, '#f97316', linha=0.002), '#fb923c', 1.8)    # Mars on the map screen
    for k in range(4):                                                                        # trajectory dots
        emissivo(esfera(0.86 + k * 0.04, 0.425, 0.58 + k * 0.03, 0.012, 0.005, 0.012, '#ffffff', linha=0.001), '#ffffff', 2.4)
    caixa(0.1, 0.4, 1.9, 0.6, 0.38, 0.45, '#475569', bevel=0.02, linha=0.006)                  # desk shelf
    for k, c in enumerate(('#ef4444', '#facc15', '#4ade80', '#38bdf8', '#f472b6', '#facc15')):
        cilindro(0.3 + k * 0.25, 0.5, 0.03, 0.45, 0.48, c, v=10, linha=0.003)                   # buttons
    for x in (0.55, 1.45):
        haste((x, 0.52, 0.45), (x, 0.52, 0.6), 0.015, '#1f2937', linha=0.004)                  # joysticks
        esfera(x, 0.52, 0.62, 0.035, 0.035, 0.035, '#ef4444', linha=0.004)
        cilindro(x, 0.78, 0.07, 0, 0.3, '#64748b', linha=0.006)                                 # seat post
        caixa(x - 0.2, 0.62, x + 0.2, 0.95, 0.3, 0.4, '#f97316', bevel=0.04, linha=0.008)       # seat
        caixa(x - 0.2, 0.88, x + 0.2, 0.98, 0.4, 0.95, '#f97316', bevel=0.04, linha=0.008)      # back rest
        caixa(x - 0.12, 0.9, x + 0.12, 0.99, 0.95, 1.08, '#fed7aa', bevel=0.03, linha=0.006)    # head rest
        for dx in (-0.1, 0.1):
            caixa(x + dx - 0.02, 0.86, x + dx + 0.02, 0.88, 0.45, 0.9, '#1e293b', bevel=0, linha=0.002)   # harness straps


# ---------- fun-fact props: each one tells kids a real fact about the trip ----------
def janela():                                # 1 x 1: a big porthole with Mars far away, and a toy car
    caixa(0.08, 0.62, 0.92, 0.8, 0, 1.35, PAREDE, bevel=0.04, linha=0.012)                     # wall panel
    caixa(0.06, 0.6, 0.94, 0.82, 0, 0.1, '#64748b', bevel=0.02, linha=0.008)
    rot = (math.pi / 2, 0, 0)
    o = cilindro(0.5, 0.82, 0.3, 0.8, 0.86, '#e2e8f0', rot=rot, linha=0.008)
    o.location = (0.5, -0.83, 0.82)
    o = cilindro(0.5, 0.82, 0.25, 0.81, 0.88, '#1e1b4b', rot=rot, linha=0.004)                  # deep space glass
    o.location = (0.5, -0.845, 0.82); emissivo(o, '#1e3a8a', 0.9)
    emissivo(esfera(0.6, 0.875, 0.9, 0.075, 0.03, 0.075, '#f97316', linha=0.003), '#fb923c', 1.6)   # Mars, far away
    emissivo(esfera(0.37, 0.875, 0.72, 0.035, 0.015, 0.035, '#38bdf8', linha=0.002), '#7dd3fc', 1.6)  # Earth, tiny
    for (x, z) in ((0.42, 0.95), (0.66, 0.68), (0.33, 0.86), (0.55, 0.62), (0.7, 0.98), (0.47, 0.78)):
        emissivo(esfera(x, 0.875, z, 0.012, 0.006, 0.012, '#ffffff', linha=0.001), '#ffffff', 2.4)   # stars
    o = cilindro(0.5, 0.82, 0.34, 0.78, 0.84, FAIXA, rot=rot, linha=0.01)
    o.location = (0.5, -0.82, 0.82)
    for x in (0.12, 0.88):
        haste((x, 0.86, 0.35), (x, 0.86, 1.15), 0.025, ALERTA, linha=0.006)                    # yellow handrails
    caixa(0.18, 0.8, 0.82, 0.98, 0.3, 0.35, FAIXA, bevel=0.01, linha=0.008)                     # shelf
    caixa(0.36, 0.84, 0.64, 0.94, 0.38, 0.45, '#ef4444', bevel=0.015, linha=0.006)             # toy car body
    caixa(0.42, 0.85, 0.58, 0.93, 0.45, 0.5, '#fecaca', bevel=0.01, linha=0.004)               # its windows
    for x in (0.41, 0.59):
        for y in (0.84, 0.94):
            o = cilindro(x, y, 0.028, -0.0275, 0.0275, '#1f2937', v=10, rot=(math.pi / 2, 0, 0), linha=0.003)
            o.location = (x, -y, 0.38)


def radio():                                 # 1 x 1: the radio desk to talk with Earth
    caixa(0.1, 0.25, 0.9, 0.9, 0, 0.55, '#cbd5e1', bevel=0.04, linha=0.012)                    # desk
    caixa(0.08, 0.23, 0.92, 0.92, 0.55, 0.6, FAIXA, bevel=0.02, linha=0.008)
    caixa(0.15, 0.3, 0.85, 0.62, 0.6, 1.0, '#475569', bevel=0.04, linha=0.012)                 # radio box
    caixa(0.2, 0.6, 0.62, 0.63, 0.72, 0.94, '#0f172a', bevel=0, linha=0.004)                   # screen
    emissivo(caixa(0.22, 0.625, 0.6, 0.635, 0.74, 0.92, '#22c55e', bevel=0, linha=0.002), '#4ade80', 1.0)
    for k in range(6):                                                                         # sound wave bars
        hh = (0.04, 0.09, 0.14, 0.07, 0.12, 0.05)[k]
        emissivo(caixa(0.26 + k * 0.055, 0.636, 0.29 + k * 0.055, 0.642, 0.83 - hh / 2, 0.83 + hh / 2, '#dcfce7', bevel=0, linha=0.001), '#f0fdf4', 2.0)
    for (z, c) in ((0.9, '#facc15'), (0.76, '#38bdf8')):                                      # big knobs
        o = cilindro(0.73, 0.64, 0.055, -0.03, 0.03, c, v=14, rot=(math.pi / 2, 0, 0), linha=0.006)
        o.location = (0.73, -0.64, z)
    for k, c in enumerate(('#ef4444', '#facc15', '#4ade80')):                                  # buttons on the desk
        cilindro(0.25 + k * 0.12, 0.78, 0.035, 0.6, 0.63, c, v=12, linha=0.004)
    haste((0.72, 0.75, 0.6), (0.72, 0.75, 0.82), 0.012, '#94a3b8', linha=0.004)                # microphone stalk
    esfera(0.72, 0.75, 0.86, 0.045, 0.045, 0.06, '#1f2937', linha=0.006)
    emissivo(esfera(0.72, 0.75, 0.93, 0.015, 0.015, 0.015, '#ef4444', linha=0.002), '#f87171', 2.0)
    haste((0.8, 0.4, 1.0), (0.8, 0.4, 1.4), 0.012, '#94a3b8', linha=0.004)                     # antenna
    emissivo(esfera(0.8, 0.4, 1.42, 0.03, 0.03, 0.03, '#ef4444', linha=0.003), '#f87171', 2.0)
    esfera(0.35, 0.82, 0.68, 0.08, 0.04, 0.08, '#f97316', linha=0.006)                         # headset ear cups
    esfera(0.5, 0.82, 0.68, 0.08, 0.04, 0.08, '#f97316', linha=0.006)
    haste((0.35, 0.82, 0.76), (0.5, 0.82, 0.76), 0.012, '#334155', linha=0.003)


def reciclador():                            # 1 x 1: pee in, clean water out
    caixa(0.08, 0.1, 0.92, 0.9, 0, 0.12, '#64748b', bevel=0.02, linha=0.008)                   # base
    for (x, cor, luz) in ((0.3, '#fde047', '#fef08a'), (0.7, '#38bdf8', '#7dd3fc')):          # yellow tank -> blue tank
        cilindro(x, 0.5, 0.17, 0.12, 0.95, '#e2e8f0', linha=0.012, bevel=0.03)
        emissivo(cilindro(x, 0.5, 0.175, 0.2, 0.75, cor, linha=0.004), luz, 0.9)               # the liquid shows
        cilindro(x, 0.5, 0.19, 0.95, 1.02, FAIXA, linha=0.008)
    haste((0.3, 0.5, 1.02), (0.3, 0.5, 1.15), 0.03, '#94a3b8')                                 # pipe over the top
    haste((0.3, 0.5, 1.15), (0.7, 0.5, 1.15), 0.03, '#94a3b8')
    haste((0.7, 0.5, 1.15), (0.7, 0.5, 1.02), 0.03, '#94a3b8')
    caixa(0.42, 0.42, 0.58, 0.58, 1.08, 1.22, '#a78bfa', bevel=0.02, linha=0.006)             # cleaning filter
    haste((0.7, 0.68, 0.35), (0.7, 0.86, 0.35), 0.025, '#94a3b8')                              # tap
    cilindro(0.7, 0.88, 0.03, 0.28, 0.36, '#94a3b8', v=10, linha=0.004)
    cilindro(0.7, 0.88, 0.06, 0.12, 0.24, '#f8fafc', v=14, linha=0.006)                        # cup
    emissivo(esfera(0.7, 0.88, 0.26, 0.03, 0.03, 0.04, '#38bdf8', linha=0.003), '#7dd3fc', 1.6)  # floating drop
    emissivo(esfera(0.5, 0.88, 0.3, 0.03, 0.02, 0.03, '#4ade80', linha=0.003), '#86efac', 2.4)   # OK light


def chama():                                 # 1 x 1: the flame experiment box: fire burns as a round ball
    caixa(0.08, 0.1, 0.92, 0.9, 0, 0.45, '#cbd5e1', bevel=0.04, linha=0.012)                   # cabinet
    for k in range(4):                                                                         # warning stripes
        caixa(0.12 + k * 0.2, 0.895, 0.22 + k * 0.2, 0.91, 0.05, 0.12, ALERTA, bevel=0, linha=0.002)
    for x in (0.3, 0.7):                                                                       # glove ports
        o = cilindro(x, 0.91, 0.09, -0.015, 0.015, '#1f2937', v=16, rot=(math.pi / 2, 0, 0), linha=0.005)
        o.location = (x, -0.91, 0.25)
        o = cilindro(x, 0.92, 0.06, -0.01, 0.01, '#f97316', v=16, rot=(math.pi / 2, 0, 0), linha=0.003)
        o.location = (x, -0.925, 0.25)
    for x in (0.12, 0.88):                                                                     # orange frame posts
        for y in (0.14, 0.86):
            haste((x, y, 0.45), (x, y, 1.4), 0.025, FAIXA, linha=0.006)
    caixa(0.1, 0.12, 0.9, 0.88, 1.4, 1.47, FAIXA, bevel=0.02, linha=0.008)                     # lid
    cilindro(0.5, 0.5, 0.02, 0.45, 0.62, '#94a3b8', v=8, linha=0.003)                          # the wick holder
    emissivo(esfera(0.5, 0.5, 0.8, 0.22, 0.22, 0.22, '#1d4ed8', linha=0.008), '#2563eb', 1.3)  # round blue flame
    emissivo(esfera(0.52, 0.6, 0.8, 0.13, 0.13, 0.13, '#60a5fa', linha=0.004), '#60a5fa', 1.8)  # inner glow
    emissivo(esfera(0.54, 0.68, 0.8, 0.06, 0.06, 0.06, '#ffffff', linha=0.002), '#ffffff', 2.4)  # bright core
    caixa(0.6, 0.88, 0.85, 0.9, 0.3, 0.42, '#1e293b', bevel=0, linha=0.003)                    # little label
    emissivo(caixa(0.62, 0.895, 0.83, 0.905, 0.32, 0.4, '#fde047', bevel=0, linha=0.001), '#fef08a', 1.2)


PROPS = {'nave_motores': (motores, 3, 3), 'nave_beliche': (beliche, 2, 1), 'nave_mesa': (mesa, 2, 2),
         'nave_esteira': (esteira, 2, 1), 'nave_plantas': (plantas, 1, 1), 'nave_bolsas': (bolsas, 1, 1),
         'nave_agua': (agua, 1, 1), 'nave_medico': (medico, 1, 1), 'nave_cockpit': (cockpit, 2, 1),
         'nave_janela': (janela, 1, 1), 'nave_radio': (radio, 1, 1), 'nave_reciclador': (reciclador, 1, 1), 'nave_chama': (chama, 1, 1)}


def main():
    os.makedirs(os.path.join(OUT, 'props'), exist_ok=True)
    # NAVE_PROPS=nave_radio,nave_janela renders only those props and keeps the deck and the other entries.
    so = [n for n in os.environ.get('NAVE_PROPS', '').split(',') if n]
    if so:
        caminho = os.path.join(ROOT, 'src', 'dados', 'nave_props.json')
        saida = json.load(open(caminho))
        for nome in so:
            fn, w, h = PROPS[nome]
            limpar(); fn()
            Wp, Hp, a = render(os.path.join(OUT, 'props', f'{nome}.png'))
            saida[nome] = {'arquivo': f'nave/props/{nome}.png', 'w': Wp, 'h': Hp, 'escala': 1 / SUPER, 'ancora': a, 'pegada': [w, h]}
            print('prop', nome, Wp, Hp, flush=True)
        with open(caminho, 'w') as f: json.dump(saida, f, indent=1)
        print('DONE')
        return
    # The terrain: flat inside the hull; outside it is a wall the engine will not walk or build on.
    alturas = [[0.0 if dentro(i, j) else 3.0 for i in range(N + 1)] for j in range(N + 1)]
    incl = [[0.0 if dentro(i + 0.5, j + 0.5) and dentro(i, j) and dentro(i + 1, j + 1) else 90.0 for i in range(N)] for j in range(N)]
    limpar(); nave(True)
    Wt, Ht, ancora_t = render(os.path.join(OUT, 'terrain_teto.png'), metade=True)
    limpar(); nave(False)
    W, H, ancora = render(os.path.join(OUT, 'terrain.png'), metade=True, mesmo_quadro=True)
    assert (W, H, ancora) == (Wt, Ht, ancora_t)
    terreno = {
        'nota': 'The deck of the ship to Mars (chapter 2): flat metal inside the hull, blocked outside.',
        'fonte': {'nome': 'Game model (tools/lua3d/make_nave.py)', 'url': ''},
        'corpo': 'nave', 'centro': {'lat': 0, 'lon': 0}, 'n': N, 'metrosPorTile': 2.0, 'alturaBaseM': 0,
        'inclinacaoMaxAndar': 20, 'inclinacaoMaxConstruir': 10, 'alturas': alturas, 'inclinacao': incl,
        'convés': {'x0': X0, 'x1': X1, 'y0': Y0, 'y1': Y1},
        # Exits of the Hall thrusters (tiles; the plume points to -gx): the game draws their glow.
        'propulsores': [{'x': round(XH, 3), 'y': round(y, 3), 'z': round(z, 3), 'r': 0.32} for y, z in HALL],
        # The closed ship (roof on), same size and origin: shown when zoomed out.
        'imagemTeto': 'nave/terrain_teto.png',
        'imagem': {'arquivo': 'nave/terrain.png', 'w': W, 'h': H, 'origem': ancora,
                   'ex': [T, T / 2], 'ey': [-T, T / 2], 'ez': [0, -round(T * math.sqrt(1.5), 4)]},
    }
    with open(os.path.join(ROOT, 'src', 'dados', 'terreno_nave.json'), 'w') as f:
        json.dump(terreno, f, separators=(',', ':'))
    saida = {}
    for nome, (fn, w, h) in PROPS.items():
        limpar(); fn()
        Wp, Hp, a = render(os.path.join(OUT, 'props', f'{nome}.png'))
        saida[nome] = {'arquivo': f'nave/props/{nome}.png', 'w': Wp, 'h': Hp, 'escala': 1 / SUPER, 'ancora': a, 'pegada': [w, h]}
        print('prop', nome, Wp, Hp, flush=True)
    with open(os.path.join(ROOT, 'src', 'dados', 'nave_props.json'), 'w') as f:
        json.dump(saida, f, indent=1)
    print('DONE')


main()
