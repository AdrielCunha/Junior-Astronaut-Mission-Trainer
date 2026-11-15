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


_quadro = {}
def render(caminho, metade=False, mesmo_quadro=False):
    """Frames the current group (or keeps the last framing), renders, quantizes; returns
    (W, H, ancora of the map origin)."""
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
    subprocess.run(['magick', caminho, '-dither', 'None', '-colors', '255', 'PNG8:' + caminho], check=True)
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
XT, XN = X0 - 2.4, X1 + 4.6                     # tail and nose tips


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
            elif cx > XN - 2.6 and cz > 1.1 and cy > YC - 3.5: f.material_index = 2
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
    # _fim gave [hull, outline]. Faces use 0 = hull, 1 = band, 2 = glass, so the materials go
    # [hull, band, glass, outline], and the outline shell (material index + offset) lands on the
    # outline material for every face (indices past the end clamp to the last one).
    mats = o.data.materials
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


def motores_externos():
    for y in (YC - 2.4, YC, YC + 2.4):
        bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=0.95, radius2=0.5, depth=1.3)
        o = bpy.context.active_object; o.location = (XT - 0.4, -y, ZC - 0.3); o.rotation_euler = (0, math.pi / 2, 0)
        g['_fim'](o, '#475569', 0, 0.02)
        emissivo(cilindro(XT - 1.06, y, 0.66, ZC - 0.32, ZC - 0.28, '#38bdf8', rot=(0, math.pi / 2, 0), linha=0.004), '#38bdf8', 2.0)


def asas(lados):
    for lado in lados:                                   # -1 far side, +1 near side
        y0 = YC + lado * (A - 0.3)
        for xc in (X0 + 4, X1 - 4):
            haste((xc, y0, ZC), (xc, y0 + lado * 5.2, ZC), 0.07, '#94a3b8')
            for k in range(3):
                ya = y0 + lado * (1.0 + k * 1.35)
                caixa(xc - 2.6, min(ya, ya + lado * 1.2), xc + 2.6, max(ya, ya + lado * 1.2), ZC - 0.03, ZC + 0.03, '#1e3a8a', bevel=0.01, linha=0.01)
                for xx in range(-2, 3):
                    caixa(xc + xx - 0.02, min(ya, ya + lado * 1.2), xc + xx + 0.02, max(ya, ya + lado * 1.2), ZC + 0.03, ZC + 0.04, '#60a5fa', bevel=0, linha=0.002)


def nave(com_teto):
    casco(com_teto)
    motores_externos()
    asas((-1, 1) if com_teto else (-1,))
    for x in range(X0 + 1, X1, 3):
        escotilha_casco(x + 0.5, -1)
        if com_teto: escotilha_casco(x + 0.5, 1)
    if com_teto:
        # Roof details: radiator panels and a hatch along the top.
        for x in range(X0 + 2, X1 - 1, 4):
            caixa(x, YC - 1.2, x + 2.4, YC + 1.2, ZC + B + 0.02, ZC + B + 0.1, '#cbd5e1', bevel=0.02, linha=0.01)
        cilindro(XC1 - 2, YC, 0.6, ZC + B - 0.05, ZC + B + 0.2, '#94a3b8', linha=0.015)
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


def beliche():                               # 2 x 1: crew bunks, two levels
    for z in (0.15, 0.85):
        caixa(0.1, 0.1, 1.9, 0.9, z, z + 0.12, '#cbd5e1', bevel=0.03, linha=0.01)
        caixa(0.2, 0.18, 1.8, 0.82, z + 0.12, z + 0.3, '#3b82f6', bevel=0.08, linha=0.01)        # sleeping bag
        caixa(1.45, 0.22, 1.78, 0.78, z + 0.3, z + 0.42, '#f8fafc', bevel=0.06, linha=0.008)     # pillow
    for x in (0.12, 1.84):
        for y in (0.12, 0.84):
            caixa(x, y, x + 0.06, y + 0.06, 0, 1.4, '#64748b', bevel=0, linha=0.006)


def mesa():                                  # 2 x 2: galley table with seats and food packs
    cilindro(1.0, 1.0, 0.12, 0, 0.7, '#64748b', linha=0.01)
    caixa(0.35, 0.35, 1.65, 1.65, 0.7, 0.8, '#e2e8f0', bevel=0.06, linha=0.012)
    for x, y in ((0.15, 1.0), (1.85, 1.0), (1.0, 0.15), (1.0, 1.85)):
        cilindro(x, y, 0.16, 0, 0.42, '#f97316', linha=0.01, bevel=0.03)
    for x, y, c in ((0.75, 0.8, '#facc15'), (1.15, 1.2, '#4ade80'), (1.25, 0.75, '#f87171')):
        caixa(x - 0.1, y - 0.07, x + 0.1, y + 0.07, 0.8, 0.86, c, bevel=0.02, linha=0.005)


def esteira():                               # 2 x 1: treadmill (on the ISS it is the T2)
    caixa(0.15, 0.2, 1.85, 0.8, 0, 0.18, '#334155', bevel=0.04, linha=0.01)
    caixa(0.25, 0.28, 1.6, 0.72, 0.18, 0.2, '#111827', bevel=0, linha=0.004)
    for y in (0.22, 0.78):
        haste((1.65, y, 0.18), (1.75, y, 1.0), 0.04, '#94a3b8')
    caixa(1.6, 0.2, 1.85, 0.8, 0.95, 1.12, '#475569', bevel=0.03, linha=0.008)
    emissivo(caixa(1.62, 0.3, 1.66, 0.7, 1.0, 1.1, '#4ade80', bevel=0, linha=0.002), '#4ade80', 1.4)


def plantas():                               # 1 x 1: plant rack under pink grow lights (Veggie)
    caixa(0.1, 0.1, 0.9, 0.9, 0, 0.5, '#e2e8f0', bevel=0.04, linha=0.01)
    for x in (0.3, 0.7):
        for y in (0.3, 0.7):
            esfera(x, y, 0.62, 0.17, 0.17, 0.14, '#22c55e', linha=0.008)
    for x in (0.12, 0.82):
        caixa(x, 0.12, x + 0.06, 0.88, 0.5, 1.05, '#94a3b8', bevel=0, linha=0.005)
    emissivo(caixa(0.12, 0.12, 0.88, 0.88, 1.0, 1.06, '#f472b6', bevel=0.01, linha=0.004), '#f472b6', 1.8)


def bolsas():                                # 1 x 1: soft cargo bags, stacked
    for k, (z, c) in enumerate(((0, '#f1f5f9'), (0.32, '#e2e8f0'), (0.64, '#f8fafc'))):
        d = 0.06 * (k % 2)
        caixa(0.12 + d, 0.15, 0.88 + d * 0.5, 0.85, z, z + 0.3, c, bevel=0.08, linha=0.01)
        caixa(0.4 + d, 0.14, 0.6 + d, 0.86, z + 0.1, z + 0.2, '#93c5fd', bevel=0, linha=0.003)


def agua():                                  # 1 x 1: water tanks (water also blocks radiation)
    for x in (0.3, 0.7):
        cilindro(x, 0.5, 0.2, 0, 1.0, '#60a5fa', linha=0.012, bevel=0.04)
        caixa(x - 0.21, 0.29, x + 0.21, 0.71, 0.45, 0.55, '#1e3a8a', bevel=0, linha=0.004)


def medico():                                # 1 x 1: medical cabinet
    caixa(0.1, 0.15, 0.9, 0.85, 0, 1.1, '#f8fafc', bevel=0.04, linha=0.012)
    # The red cross on the face toward the camera (+gy).
    caixa(0.42, 0.84, 0.58, 0.87, 0.45, 0.85, '#ef4444', bevel=0, linha=0.003)
    caixa(0.3, 0.84, 0.7, 0.87, 0.57, 0.73, '#ef4444', bevel=0, linha=0.003)


def cockpit():                               # 2 x 1: piloting console and two seats
    caixa(0.1, 0.05, 1.9, 0.4, 0, 0.9, '#334155', bevel=0.04, linha=0.012)
    for x in (0.3, 1.1):
        emissivo(caixa(x, 0.38, x + 0.6, 0.42, 0.5, 0.85, '#38bdf8', bevel=0, linha=0.003), '#38bdf8', 1.6)
    for x in (0.55, 1.45):
        cilindro(x, 0.75, 0.22, 0, 0.45, '#f97316', linha=0.01, bevel=0.04)
        caixa(x - 0.22, 0.88, x + 0.22, 0.98, 0.45, 1.0, '#f97316', bevel=0.04, linha=0.008)


PROPS = {'nave_motores': (motores, 3, 3), 'nave_beliche': (beliche, 2, 1), 'nave_mesa': (mesa, 2, 2),
         'nave_esteira': (esteira, 2, 1), 'nave_plantas': (plantas, 1, 1), 'nave_bolsas': (bolsas, 1, 1),
         'nave_agua': (agua, 1, 1), 'nave_medico': (medico, 1, 1), 'nave_cockpit': (cockpit, 2, 1)}


def main():
    os.makedirs(os.path.join(OUT, 'props'), exist_ok=True)
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
