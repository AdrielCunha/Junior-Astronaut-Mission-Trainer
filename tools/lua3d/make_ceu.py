# Generated with AI assistance. See README, "Use of AI tools".
# The space backgrounds: the real sky, from NASA's Deep Star Maps 2020 (SVS 4851) at 8K, as each
# view of the game sees it. The stars are so far away that the sky is the same seen from the
# Moon, Mars or the ship; what changes is where each camera looks:
#   public/lua/sky.jpg          the Moon views: the Moon camera's own direction (moon_view.json,
#                               the same view make_moon.py rendered at 4K), constellations included
#   public/lua/sky_sistema.jpg  the solar system, the ship and Mars from space: those cameras look
#                               down on the planets' plane, tilted asin(0.6) (planetaShader.ts), so
#                               behind them is the sky around the south ecliptic pole (with the Large
#                               Magellanic Cloud)
#   src/dados/ceu_estrelas.json the brightest stars of each, for the game to twinkle
#   tools/lua3d/.cache/constellations.png  figures for the Moon view (make_constellations.py)
#
#   prime-run blender -b -P tools/lua3d/make_ceu.py && python3 tools/lua3d/make_constellations.py
#
# In (downloaded once to tools/lua3d/nasa/, not in git; ~190 MB): milkyway_2020_8k.exr (the Milky
# Way alone), hiptyc_2020_8k.exr (the bright stars alone), constellation_figures_4k.tif.
# Credit: NASA/Goddard Space Flight Center Scientific Visualization Studio; Gaia DR2: ESA/Gaia/DPAC.
import os, json, math, subprocess, urllib.request
import numpy as np
import bpy
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
NASA = os.path.join(HERE, 'nasa')
SVS = 'https://svs.gsfc.nasa.gov/vis/a000000/a004800/a004851/'
W, H = 2560, 1440
LUZ_VIA = 2.2                      # the Milky Way lifted, so the band reads even on a small screen
N_ESTRELAS = 160


def baixar(nome):
    p = os.path.join(NASA, nome)
    if not os.path.exists(p):
        print('downloading', nome, flush=True)
        urllib.request.urlretrieve(SVS + nome, p + '.part'); os.replace(p + '.part', p)
    return p


def direcao(u, v):
    """World direction of the equirectangular pixel (u, v in 0..1, v up) as Blender's environment
    texture reads it with no mapping: u = -atan2(d.y, d.x) / 2pi + 0.5, v = asin(d.z) / pi + 0.5."""
    phi, lat = (0.5 - u) * 2 * math.pi, (v - 0.5) * math.pi
    return np.stack([np.cos(lat) * np.cos(phi), np.cos(lat) * np.sin(phi), np.sin(lat)], -1)


# ---------- the views ----------
# Environment lookup with no mapping: a world direction is a J2000 equatorial direction (checked:
# the galaxy's bulge lands at RA 266.4, Dec -28.9). make_moon.py works in an ecliptic frame and
# looks the map up through Rz(180) Rx(obliquity): the same turn takes its directions here.
OBLIQUIDADE = math.radians(23.439)
DE_ECLIPTICA = Matrix.Rotation(math.pi, 3, 'Z') @ Matrix.Rotation(OBLIQUIDADE, 3, 'X')
with open(os.path.join(ROOT, 'src', 'dados', 'moon_view.json')) as f:
    V = json.load(f)
VISTAS = {
    'lua': (-Vector(V['toCamera']), Vector(V['up']), V.get('skyFov', 70), 'sky.jpg'),
    'sistema': (Vector((0, 0.8, -0.6)), Vector((0, 0.6, 0.8)), 70, 'sky_sistema.jpg'),
}

sc = bpy.context.scene
for o in list(sc.objects): bpy.data.objects.remove(o)
sc.render.engine = 'BLENDER_EEVEE'
sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
sc.render.resolution_x, sc.render.resolution_y = W, H
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGB'
cam = bpy.data.cameras.new('ceu'); cam.type = 'PERSP'; cam.sensor_fit = 'HORIZONTAL'
cam_o = bpy.data.objects.new('ceu', cam); sc.collection.objects.link(cam_o); sc.camera = cam_o
cam_o.rotation_mode = 'QUATERNION'; cam_o.location = (0, 0, 0)


def apontar(frente_ecl, cima_ecl, fov):
    frente = (DE_ECLIPTICA @ frente_ecl).normalized(); cima = DE_ECLIPTICA @ cima_ecl
    cima = (cima - frente * cima.dot(frente)).normalized()
    z = -frente; x = cima.cross(z).normalized(); y = z.cross(x)
    cam_o.rotation_quaternion = Matrix((x, y, z)).transposed().to_quaternion()
    cam.angle = math.radians(fov)


def mundo(camadas):
    """World = sum of equirect images, each with its strength."""
    w = bpy.data.worlds.new('ceu'); sc.world = w; w.use_nodes = True
    N, L = w.node_tree.nodes, w.node_tree.links; N.clear()
    tc = N.new('ShaderNodeTexCoord'); out = N.new('ShaderNodeOutputWorld')
    soma = None
    for img, forca in camadas:
        env = N.new('ShaderNodeTexEnvironment'); env.image = img
        L.new(tc.outputs['Generated'], env.inputs['Vector'])
        bg = N.new('ShaderNodeBackground'); bg.inputs['Strength'].default_value = forca
        L.new(env.outputs['Color'], bg.inputs['Color'])
        if soma is None: soma = bg.outputs['Background']
        else:
            add = N.new('ShaderNodeAddShader'); L.new(soma, add.inputs[0]); L.new(bg.outputs['Background'], add.inputs[1])
            soma = add.outputs[0]
    L.new(soma, out.inputs['Surface'])


def render(caminho):
    sc.render.filepath = caminho
    bpy.ops.render.render(write_still=True)


def carregar(nome, cor='Linear Rec.709'):
    im = bpy.data.images.load(baixar(nome)); im.colorspace_settings.name = cor
    return im


mw = carregar('milkyway_2020_8k.exr'); st = carregar('hiptyc_2020_8k.exr')
figs = carregar('constellation_figures_4k.tif', 'sRGB')
cache = os.path.join(HERE, '.cache'); os.makedirs(cache, exist_ok=True)
saida = os.path.join(ROOT, 'public', 'lua')


def brilhantes(caminho):
    """The brightest stars of a stars-only render: local maxima, brightest first, (x, y, b)."""
    im = bpy.data.images.load(caminho)
    a = np.empty(W * H * 4, np.float32); im.pixels.foreach_get(a)
    b = a.reshape(H, W, 4)[::-1, :, :3].mean(-1)          # rows from the top, like the jpg
    viz = np.ones_like(b, bool)
    for dy in range(-3, 4):
        for dx in range(-3, 4):
            if dy or dx: viz &= b >= np.roll(np.roll(b, dy, 0), dx, 1)
    ys, xs = np.nonzero(viz & (b > 0.25))
    ordem = np.argsort(-b[ys, xs])[:N_ESTRELAS]
    return [[int(xs[i]), int(ys[i]), round(float(b[ys[i], xs[i]]), 3)] for i in ordem]


estrelas = {}
for nome, (frente, cima, fov, arquivo) in VISTAS.items():
    apontar(frente, cima, fov)
    mundo([(mw, LUZ_VIA), (st, 1.0)])
    png = os.path.join(cache, f'ceu_{nome}.png'); render(png)
    subprocess.run(['magick', png, '-quality', '86', os.path.join(saida, arquivo)], check=True)
    mundo([(st, 1.0)])
    render(os.path.join(cache, f'ceu_{nome}_estrelas.png'))
    estrelas[nome] = brilhantes(os.path.join(cache, f'ceu_{nome}_estrelas.png'))
    if nome == 'lua':
        mundo([(figs, 1.0)])
        render(os.path.join(cache, 'constellations.png'))
    print('view', nome, len(estrelas[nome]), 'stars', flush=True)

with open(os.path.join(ROOT, 'src', 'dados', 'ceu_estrelas.json'), 'w') as f:
    json.dump({'w': W, 'h': H, 'nota': 'Brightest stars of each sky picture (x, y, brightness 0..1), for the twinkle (tools/lua3d/make_ceu.py).', **estrelas}, f)
print('DONE', flush=True)
