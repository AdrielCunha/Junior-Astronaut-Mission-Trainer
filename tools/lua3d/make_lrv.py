# Generated with AI assistance (Claude). See README, "Use of AI tools".
# The Apollo LRV (the Moon's driveable rover) as a 3D model in the props' cartoon style, rendered
# from the map's own isometric camera in 16 headings. Each heading has two pictures: the body
# (chassis, wheels, seats: drawn behind the seated astronaut) and the front (hand controller,
# dish antenna, TV camera, rear antenna: drawn in front of the astronaut).
#
#   ESTILO=cartoon blender -b -P tools/lua3d/make_lrv.py
#   LRV_BLEND=tools/lua3d/.cache/lrv_oclusor.blend blender -b -P tools/lua3d/make_lrv.py   (the rover
#     alone in a .blend, for the seated driver's holdout: make_astronaut.py SENTADO=1)
#
# Sizes match the rover's physics and seat (src/engine/rover.ts, Superficie): 1 unit = 1 tile,
# local +x = forward, local y = to the right of the heading, origin = ground under the centre.
# Out: public/lua/rover/lrv_<k>.png, lrv_frente_<k>.png and src/dados/rover_lrv.json
#      { escala, direcoes, corpo: [{arquivo, w, h, ancora}], frente: [...] } (k = heading, 0 = +gx,
#      counter-clockwise in grid angle like Rover.angulo).
# The wheels turn: the body is also rendered with the treads and spokes rolled by 15, 30 ... 75
# degrees (the wheel's pattern repeats every 90: 12 treads, 4 spokes), lrv_<k>_g<f>.png, listed
# in the json as giro[f - 1][k]; the game steps through them as the rover rolls (desenharRover.ts).
import os, sys, json, math, subprocess
import bpy
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
SRC = os.path.join(HERE, 'make_modules.py')
g = {'__file__': SRC, '__name__': 'make_modules', 'APENAS': ['__nenhum__']}
exec(compile(open(SRC, encoding='utf8').read(), SRC, 'exec'), g)
caixa, cilindro, esfera, haste, emissivo, visor, grupo, sc = g['caixa'], g['cilindro'], g['esfera'], g['haste'], g['emissivo'], g['visor'], g['grupo'], g['sc']
enquadrar, right, up, s, SUPER = g['enquadrar'], g['right'], g['up'], g['s'], g['SUPER']

OUT = os.path.join(ROOT, 'public', 'lua', 'rover')
DIRECOES = 16
FASES = 6                                   # wheel phases, 15 degrees apart (pattern period 90)
GIRO = [0.0]                                # the wheels' roll for the body being built (radians)
ALU, ALU2, OURO, OURO2 = '#e2e8f0', '#cbd5e1', '#fcd34d', '#fde68a'
LARANJA, AZUL, ESCURO = '#f97316', '#60a5fa', '#334155'


def limpar():
    for o in list(sc.objects):
        if o.type == 'MESH' or (o.type == 'LIGHT' and o.data.type != 'SUN'): bpy.data.objects.remove(o)
    grupo.clear()


def roda(x, y):
    # Wire-mesh wheel: light rim, chevron treads, orange hub, and an orange fender arching over it.
    rot = (math.pi / 2, 0, 0)
    o = cilindro(x, y, 0.25, -0.06, 0.06, ALU2, v=28, rot=rot, linha=0.02); o.location = (x, -y, 0.25)
    # Rolling forward (+x) turns the wheel so its top moves forward: the angle decreases.
    for k in range(12):                                                    # chevron treads
        a = k * math.pi / 6 - GIRO[0]
        t = caixa(-0.025, -0.06, 0.025, 0.06, -0.008, 0.008, '#94a3b8', bevel=0.003, linha=0.004)
        t.location = (x + 0.25 * math.cos(a), -y, 0.25 + 0.25 * math.sin(a)); t.rotation_euler = (0, -a + math.pi / 2, 0)
    o = cilindro(x, y, 0.17, -0.065, 0.065, '#f1f5f9', v=20, rot=rot, linha=0.008); o.location = (x, -y, 0.25)   # mesh face
    for k in range(4):                                                     # spokes
        a = k * math.pi / 4 - GIRO[0]
        haste((x + 0.16 * math.cos(a), y + (0.07 if y > 0 else -0.07), 0.25 + 0.16 * math.sin(a)),
              (x - 0.16 * math.cos(a), y + (0.07 if y > 0 else -0.07), 0.25 - 0.16 * math.sin(a)), 0.008, '#94a3b8', linha=0.003)
    o = cilindro(x, y, 0.06, -0.08, 0.08, LARANJA, v=14, rot=rot, linha=0.006); o.location = (x, -y, 0.25)       # hub
    for k in range(9):                                                     # fender, a thin arch of plates
        a = math.radians(20 + k * 17.5)
        f = caixa(-0.05, -0.08, 0.05, 0.08, -0.006, 0.006, '#fb923c', bevel=0.003, linha=0.005)
        f.location = (x + 0.31 * math.cos(a), -y, 0.25 + 0.31 * math.sin(a)); f.rotation_euler = (0, -a + math.pi / 2, 0)


def corpo():
    # Chassis: a thin aluminium deck with tube rails, on four wire wheels.
    caixa(-0.82, -0.36, 0.82, 0.36, 0.22, 0.3, ALU, bevel=0.02, linha=0.02)
    for y in (-0.37, 0.37):
        haste((-0.84, y, 0.3), (0.84, y, 0.3), 0.018, '#94a3b8', linha=0.006)
    for x in (-0.6, 0.6):
        haste((x, -0.5, 0.25), (x, 0.5, 0.25), 0.02, '#94a3b8', linha=0.006)       # axles
        for y in (-0.5, 0.5): roda(x, y)
    # Front: gold thermal blankets over the batteries and electronics (the game draws the status light).
    caixa(0.36, -0.34, 0.79, 0.34, 0.3, 0.43, OURO, bevel=0.03, linha=0.015)
    caixa(0.35, -0.35, 0.8, 0.35, 0.3, 0.33, LARANJA, bevel=0.01, linha=0.008)
    for k in range(3):
        caixa(0.42 + k * 0.12, -0.3, 0.46 + k * 0.12, 0.3, 0.43, 0.44, OURO2, bevel=0, linha=0.003)
    # Rear: the tool and sample rack.
    caixa(-0.79, -0.34, -0.48, 0.34, 0.3, 0.47, '#fde68a', bevel=0.02, linha=0.015)
    caixa(-0.8, -0.35, -0.47, 0.35, 0.44, 0.48, LARANJA, bevel=0.01, linha=0.008)
    haste((-0.72, -0.28, 0.48), (-0.55, -0.1, 0.74), 0.014, '#94a3b8', linha=0.004)    # shovel handle
    caixa(-0.6, 0.05, -0.5, 0.25, 0.48, 0.58, '#f1f5f9', bevel=0.01, linha=0.006)      # sample bag
    # Two seats of light fabric on aluminium frames, with orange belts and footrests.
    for lado in (-0.19, 0.19):
        caixa(-0.35, lado - 0.14, 0.11, lado + 0.14, 0.3, 0.38, AZUL, bevel=0.03, linha=0.012)
        o = caixa(-0.04, -0.14, 0.04, 0.14, 0.0, 0.42, AZUL, bevel=0.03, linha=0.012)    # seat back
        o.location = (-0.41, -lado, 0.6); o.rotation_euler = (0, -0.2, 0)
        for b in (-0.15, 0.15):
            haste((-0.36, lado + b, 0.32), (-0.46, lado + b, 0.83), 0.012, '#94a3b8', linha=0.004)
        haste((-0.46, lado - 0.15, 0.83), (-0.46, lado + 0.15, 0.83), 0.012, '#94a3b8', linha=0.004)
        caixa(-0.3, lado - 0.02, -0.05, lado + 0.02, 0.38, 0.39, LARANJA, bevel=0, linha=0.003)   # belt
        for b in (-0.11, 0.11):
            haste((0.12, lado + b, 0.33), (0.35, lado + b, 0.27), 0.012, '#94a3b8', linha=0.004)  # footrest


def frente():
    # Central T-shaped hand controller (the LRV had no steering wheel) and its little console.
    haste((0.0, 0.0, 0.38), (0.1, 0.0, 0.64), 0.018, '#475569', linha=0.006)
    haste((0.1, -0.09, 0.64), (0.1, 0.09, 0.64), 0.018, '#475569', linha=0.006)
    caixa(0.2, -0.12, 0.34, 0.12, 0.45, 0.62, '#475569', bevel=0.02, linha=0.01)
    visor(0.335, -0.09, 0.345, 0.09, 0.5, 0.59, '#8ae8ff')
    for k, c in enumerate(('#ef4444', '#facc15', '#4ade80')):
        esfera(0.27, -0.06 + k * 0.06, 0.625, 0.016, 0.016, 0.012, c, linha=0.002)
    # High-gain mesh dish on its mast, tilted up toward Earth, with a gold feed.
    haste((0.64, 0.0, 0.43), (0.64, 0.0, 1.12), 0.016, '#94a3b8', linha=0.006)
    o = esfera(0.0, 0.0, 0.0, 0.22, 0.22, 0.07, ALU, linha=0.012, metade=True)
    o.location = (0.64, 0.0, 1.16); o.rotation_euler = (0, math.radians(-35), 0)
    haste((0.64, 0.0, 1.16), (0.72, 0.0, 1.27), 0.008, '#94a3b8', linha=0.003)
    esfera(0.72, 0.0, 1.28, 0.025, 0.025, 0.025, OURO, linha=0.004)
    # TV camera on the right front, lens forward.
    haste((0.66, 0.3, 0.43), (0.66, 0.3, 0.74), 0.012, '#94a3b8', linha=0.004)
    caixa(0.56, 0.25, 0.77, 0.35, 0.73, 0.85, '#f1f5f9', bevel=0.015, linha=0.008)
    o = cilindro(0.78, 0.3, 0.035, -0.02, 0.02, ESCURO, v=12, rot=(0, math.pi / 2, 0), linha=0.004); o.location = (0.785, -0.3, 0.79)
    # Slim low-gain antenna at the rear left, with a red tip.
    haste((-0.68, -0.32, 0.48), (-0.68, -0.32, 1.1), 0.012, ESCURO, linha=0.004)
    esfera(-0.68, -0.32, 1.12, 0.03, 0.03, 0.03, '#ef4444', linha=0.004)


def girar_grupo(a):
    # Rover.angulo a is a grid angle (gx toward gy); Blender's Y is -gy, so the turn is -a about Z.
    R = Matrix.Rotation(-a, 4, 'Z')
    bpy.context.view_layer.update()
    for o in grupo: o.matrix_world = R @ o.matrix_world


def render(caminho):
    W, H, cx, cy = enquadrar()
    sc.render.filepath = caminho
    bpy.ops.render.render(write_still=True)
    o0 = Vector((0, 0, 0))
    try:
        subprocess.run(['magick', caminho, '-dither', 'None', '-colors', '255', 'PNG8:' + caminho], check=True)
    except FileNotFoundError:
        print('no magick: quantize', caminho, 'by hand', flush=True)
    return {'w': W, 'h': H, 'ancora': [round((o0.dot(right) - cx) * s + W / 2, 2), round(H / 2 - (o0.dot(up) - cy) * s, 2)]}


def salvar_oclusor(caminho):
    # The whole rover at heading 0, saved alone in a .blend: make_astronaut.py (SENTADO=1) loads it
    # as a holdout around the seated driver, so the driver's frames come out cut wherever the rover
    # is in front of it (seat back, wheels, fenders, hand controller, antennas).
    limpar(); corpo(); frente()
    bpy.context.view_layer.update()
    os.makedirs(os.path.dirname(caminho), exist_ok=True)
    bpy.data.libraries.write(caminho, set(grupo), fake_user=True)
    print('oclusor', caminho, len(grupo), flush=True)


def main():
    if os.environ.get('LRV_BLEND'):
        salvar_oclusor(os.environ['LRV_BLEND']); print('DONE'); return
    os.makedirs(OUT, exist_ok=True)
    so = [int(k) for k in os.environ.get('LRV_DIRECOES', '').split(',') if k]
    # LRV_PARTES=pernas renders only those layers and keeps the others in the json.
    partes = [p for p in os.environ.get('LRV_PARTES', '').split(',') if p] or ['corpo', 'frente']
    caminho = os.path.join(ROOT, 'src', 'dados', 'rover_lrv.json')
    saida = json.load(open(caminho)) if os.path.exists(caminho) else {}
    saida.update({'escala': 1 / SUPER, 'direcoes': DIRECOES})
    for parte in partes: saida.setdefault(parte, [None] * DIRECOES)
    if 'corpo' in partes:
        saida['fases'] = FASES
        saida.setdefault('giro', [[None] * DIRECOES for _ in range(FASES - 1)])
    for k in range(DIRECOES):
        if so and k not in so: continue
        a = k * 2 * math.pi / DIRECOES
        for parte, fn in (('corpo', corpo), ('frente', frente)):
            if parte not in partes: continue
            limpar(); fn(); girar_grupo(a)
            nome = f'lrv_{k}.png' if parte == 'corpo' else f'lrv_{parte}_{k}.png'
            q = render(os.path.join(OUT, nome))
            saida[parte][k] = {'arquivo': f'lua/rover/{nome}', **q}
            print('lrv', parte, k, q['w'], q['h'], flush=True)
            if parte != 'corpo': continue
            for f in range(1, FASES):                                      # the wheels rolled on
                GIRO[0] = f * (math.pi / 2) / FASES
                limpar(); fn(); girar_grupo(a)
                nome = f'lrv_{k}_g{f}.png'
                q = render(os.path.join(OUT, nome))
                saida['giro'][f - 1][k] = {'arquivo': f'lua/rover/{nome}', **q}
            GIRO[0] = 0.0
    if not so:
        with open(caminho, 'w') as f: json.dump(saida, f, indent=1)
    print('DONE')


main()
