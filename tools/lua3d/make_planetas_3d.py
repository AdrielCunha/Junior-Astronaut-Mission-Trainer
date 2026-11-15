# Generated with AI assistance. See README, "Use of AI tools".
# The Sun, the inner planets and the Moon as 3D models for the solar system view (Espaco) and for
# the full-screen view of each body (Astro). Rendered in Blender, turning on their axes:
#   small sheet, solar system view: 16 turns x 16 Sun directions, 96 px frames (the game picks the
#     frame lit from where the Sun is on screen, and steps the turn so the body spins);
#     the Sun: 16 turns, it is its own light;
#   big sheet, full screen: one whole turn in 48 frames of 384 px, lit from the front left.
#
#   prime-run blender -b -P tools/lua3d/make_planetas_3d.py [-- --so terra,sol]
#
# Maps (tools/lua3d/nasa/):
#   planetas/mercury.jpg  NASA/JHU APL/Carnegie Institution, MESSENGER global mosaic (PIA15063)
#   planetas/earth.jpg    NASA Goddard "Blue Marble"
#   planetas/mars.jpg     NASA 3D Resources, Viking/USGS
#   lroc_color_poles_2k.tif  the Moon, NASA SVS CGI Moon Kit (LRO LROC)
#   Venus: from space it is only its clouds (pale yellow, faint bands), made here.
#   The Sun: made here: granulation, darker limb (limb darkening is real), a few sunspots.
# Out: public/lua/planetas/3d/<name>_p.png, <name>_g.png, src/dados/planetas3d.json
import os, sys, json, math, subprocess, urllib.request
import bpy
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
NASA = os.path.join(HERE, 'nasa')
SRC = os.path.join(NASA, 'planetas')
OUT = os.path.join(ROOT, 'public', 'lua', 'planetas', '3d')
MERCURIO = 'https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia15/pia15063/PIA15063.jpg'
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
SO = argv[argv.index('--so') + 1].split(',') if '--so' in argv else None

QP, QG = 96, 384                         # frame sizes: small (solar system), big (full screen)
DIRS, GIROS, GIROS_G = 16, 16, 48
RAIO = 0.80                              # body radius as a share of half the frame (room for the glow)
# name: (map, atmosphere color, atmosphere strength, axial tilt deg)
CORPOS = {
    'sol': (None, None, 0.0, 7.25),
    'mercurio': ('planetas/mercury.jpg', None, 0.0, 0.0),
    'venus': (None, (1.0, 0.86, 0.55), 0.9, 177.4),
    'terra': ('planetas/earth.jpg', (0.45, 0.7, 1.0), 0.8, 23.4),
    'lua': ('lroc_color_poles_2k.tif', None, 0.0, 6.7),
    'marte': ('planetas/mars.jpg', (1.0, 0.62, 0.4), 0.35, 25.2),
}

# The solar system view is tilted asin(0.6) above the ecliptic, looking from -Y (planetaShader.ts).
CAM = Vector((0, -0.8, 0.6)); CIMA = Vector((0, 0.6, 0.8)); DIREITA = CIMA.cross(CAM).normalized()


def mercurio():
    p = os.path.join(SRC, 'mercury.jpg')
    if not os.path.exists(p):
        tmp = p + '.orig'
        urllib.request.urlretrieve(MERCURIO, tmp)
        # 6132 x 3066 grayscale, lon 0 at the left: halve it and move lon 0 to the middle, like the others.
        subprocess.run(['magick', tmp, '-resize', '2048x1024', '-roll', '+1024+0', '-quality', '88', p], check=True)
        os.remove(tmp)
    return p


bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'BLENDER_EEVEE'; sc.render.film_transparent = True
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'None'
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
w = bpy.data.worlds.new('preto'); sc.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.01, 0.012, 0.03, 1)
cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'; cam.ortho_scale = 2 / RAIO
cam_o = bpy.data.objects.new('cam', cam); sc.collection.objects.link(cam_o); sc.camera = cam_o
cam_o.rotation_mode = 'QUATERNION'
cam_o.rotation_quaternion = Matrix((DIREITA, CIMA, CAM)).transposed().to_quaternion()
cam_o.location = CAM * 10
sol = bpy.data.lights.new('sol', 'SUN'); sol.energy = 4.5; sol.angle = math.radians(1)
sol_o = bpy.data.objects.new('sol', sol); sc.collection.objects.link(sol_o)


def apontar_luz(a):
    """The Sun at screen angle a (counterclockwise from the right), a little toward the viewer."""
    luz = (DIREITA * math.cos(a) + CIMA * math.sin(a) + CAM * 0.35).normalized()
    sol_o.rotation_euler = (-luz).to_track_quat('-Z', 'Y').to_euler()


def material(nome, mapa):
    m = bpy.data.materials.new(nome); m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links
    bs = next(n for n in N if n.type == 'BSDF_PRINCIPLED')
    bs.inputs['Roughness'].default_value = 0.9
    if mapa:
        tex = N.new('ShaderNodeTexImage'); tex.image = bpy.data.images.load(mapa)
        L.new(tex.outputs['Color'], bs.inputs['Base Color'])
    else:   # Venus's clouds: pale yellow, soft bands stretched along the equator, a little swirl
        tc = N.new('ShaderNodeTexCoord')
        esc = N.new('ShaderNodeMapping'); esc.inputs['Scale'].default_value = (1.2, 1.2, 5.0)
        nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 2.2; nz.inputs['Detail'].default_value = 4
        nz.inputs['Distortion'].default_value = 1.2
        L.new(tc.outputs['Object'], esc.inputs['Vector']); L.new(esc.outputs['Vector'], nz.inputs['Vector'])
        r = N.new('ShaderNodeValToRGB')
        r.color_ramp.elements[0].color = (0.78, 0.62, 0.36, 1); r.color_ramp.elements[1].color = (0.98, 0.9, 0.7, 1)
        L.new(nz.outputs['Fac'], r.inputs['Fac']); L.new(r.outputs['Color'], bs.inputs['Base Color'])
    return m


def material_sol():
    """The Sun's surface: bright granulation, a few dark sunspots, and a darker, redder limb
    (the real Sun's limb darkening). Pure emission: it is the light."""
    m = bpy.data.materials.new('sol'); m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links; N.clear()
    tc = N.new('ShaderNodeTexCoord')
    gr = N.new('ShaderNodeTexVoronoi'); gr.inputs['Scale'].default_value = 38.0
    L.new(tc.outputs['Object'], gr.inputs['Vector'])
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 3.0; nz.inputs['Detail'].default_value = 6
    L.new(tc.outputs['Object'], nz.inputs['Vector'])
    manchas = N.new('ShaderNodeTexNoise'); manchas.inputs['Scale'].default_value = 1.6; manchas.inputs['Detail'].default_value = 2
    L.new(tc.outputs['Object'], manchas.inputs['Vector'])
    mx = N.new('ShaderNodeMath'); mx.operation = 'MULTIPLY'
    L.new(gr.outputs['Distance'], mx.inputs[0]); L.new(nz.outputs['Fac'], mx.inputs[1])
    cor = N.new('ShaderNodeValToRGB'); cr = cor.color_ramp
    cr.elements[0].position = 0.0; cr.elements[0].color = (0.95, 0.38, 0.03, 1)
    cr.elements[1].position = 0.35; cr.elements[1].color = (1.0, 0.86, 0.32, 1)
    L.new(mx.outputs[0], cor.inputs['Fac'])
    # Sunspots: where the slow noise dips, darken.
    sp = N.new('ShaderNodeMapRange'); sp.inputs['From Min'].default_value = 0.28; sp.inputs['From Max'].default_value = 0.33
    L.new(manchas.outputs['Fac'], sp.inputs['Value'])
    # (Mix node, RGBA: inputs 6 and 7 are the colors A and B, output 2 the result.)
    escuro = N.new('ShaderNodeMix'); escuro.data_type = 'RGBA'; escuro.inputs[6].default_value = (0.35, 0.12, 0.02, 1)
    L.new(sp.outputs['Result'], escuro.inputs['Factor']); L.new(cor.outputs['Color'], escuro.inputs[7])
    # Limb darkening: dimmer and redder toward the edge.
    lw = N.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.5
    limbo = N.new('ShaderNodeMix'); limbo.data_type = 'RGBA'; limbo.inputs[7].default_value = (0.75, 0.16, 0.0, 1)
    L.new(lw.outputs['Facing'], limbo.inputs['Factor']); L.new(escuro.outputs[2], limbo.inputs[6])
    em = N.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = 1.15
    L.new(limbo.outputs[2], em.inputs['Color'])
    out = N.new('ShaderNodeOutputMaterial'); L.new(em.outputs[0], out.inputs['Surface'])
    return m


def atmosfera(cor, forca):
    """A thin glowing shell, at the rim and only on the lit side."""
    bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=32, radius=1.045)
    o = bpy.context.active_object; bpy.ops.object.shade_smooth()
    m = bpy.data.materials.new('atmosfera'); m.use_nodes = True; m.surface_render_method = 'BLENDED'
    N, L = m.node_tree.nodes, m.node_tree.links; N.clear()
    lw = N.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.2
    em = N.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (*cor, 1); em.inputs['Strength'].default_value = 2.5 * forca
    tr = N.new('ShaderNodeBsdfTransparent'); mx = N.new('ShaderNodeMixShader')
    dif = N.new('ShaderNodeBsdfDiffuse'); s2r = N.new('ShaderNodeShaderToRGB'); L.new(dif.outputs[0], s2r.inputs[0])
    borda = N.new('ShaderNodeMath'); borda.operation = 'POWER'; borda.inputs[1].default_value = 3.0
    L.new(lw.outputs['Facing'], borda.inputs[0])
    mul = N.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'
    L.new(borda.outputs[0], mul.inputs[0]); L.new(s2r.outputs[0], mul.inputs[1])
    L.new(mul.outputs[0], mx.inputs['Fac']); L.new(tr.outputs[0], mx.inputs[1]); L.new(em.outputs[0], mx.inputs[2])
    out = N.new('ShaderNodeOutputMaterial'); L.new(mx.outputs[0], out.inputs['Surface'])
    o.data.materials.append(m)
    o.visible_shadow = False          # the shell must not shade the body inside it
    return o


def folha(quadros, colunas, q, destino):
    subprocess.run(['magick', 'montage', *quadros, '-tile', f'{colunas}x', '-geometry', f'{q}x{q}+0+0', '-background', 'none', destino], check=True)
    subprocess.run(['magick', destino, '-dither', 'None', '-colors', '255', 'PNG8:' + destino], check=True)


def render(q, f):
    sc.render.resolution_x = sc.render.resolution_y = q
    sc.render.filepath = f
    bpy.ops.render.render(write_still=True)


os.makedirs(OUT, exist_ok=True)
tmp = os.path.join(HERE, '.cache', 'planetas3d'); os.makedirs(tmp, exist_ok=True)
JSON = os.path.join(ROOT, 'src', 'dados', 'planetas3d.json')
saida = json.load(open(JSON)) if SO and os.path.exists(JSON) else {}
for nome, (arq, cor, forca, incl) in CORPOS.items():
    if SO and nome not in SO: continue
    for o in [o for o in sc.objects if o.type == 'MESH']: bpy.data.objects.remove(o)
    eh_sol = nome == 'sol'
    sol.energy = 0.0 if eh_sol else 4.5
    # AgX washes a bright emission out to pastel; the Sun keeps its colors with Standard.
    sc.view_settings.view_transform = 'Standard' if eh_sol else 'AgX'
    bpy.ops.mesh.primitive_uv_sphere_add(segments=128, ring_count=64, radius=1.0)
    p = bpy.context.active_object; bpy.ops.object.shade_smooth()
    mapa = mercurio() if nome == 'mercurio' else (os.path.join(NASA, arq) if arq else None)
    p.data.materials.append(material_sol() if eh_sol else material(nome, mapa))
    if cor: atmosfera(cor, forca)
    # Spin about the body's own axis, tilted like the real one (Venus turns backward: 177 deg).
    eixo = Matrix.Rotation(math.radians(incl), 4, 'X')
    sentido = -1 if nome == 'venus' else 1

    def girar(fr):
        p.matrix_world = eixo @ Matrix.Rotation(math.radians(200) + sentido * 2 * math.pi * fr, 4, 'Z')

    peq = []
    for j in range(GIROS):
        girar(j / GIROS)
        for k in range(1 if eh_sol else DIRS):
            if not eh_sol: apontar_luz(2 * math.pi * k / DIRS)
            f = os.path.join(tmp, f'{nome}_p{j:02d}_{k:02d}.png'); render(QP, f); peq.append(f)
    folha(peq, 1 if eh_sol else DIRS, QP, os.path.join(OUT, f'{nome}_p.png'))
    apontar_luz(math.radians(150))                      # the full-screen view: lit from the front left
    grd = []
    for j in range(GIROS_G):
        girar(j / GIROS_G)
        f = os.path.join(tmp, f'{nome}_g{j:02d}.png'); render(QG, f); grd.append(f)
    folha(grd, 8, QG, os.path.join(OUT, f'{nome}_g.png'))
    saida[nome] = {'pequeno': {'arquivo': f'lua/planetas/3d/{nome}_p.png', 'quadro': QP, 'giros': GIROS, 'direcoes': 1 if eh_sol else DIRS, 'raio': round(QP / 2 * RAIO, 1)},
                   'grande': {'arquivo': f'lua/planetas/3d/{nome}_g.png', 'quadro': QG, 'quadros': GIROS_G, 'raio': round(QG / 2 * RAIO, 1)}}
    print('body', nome, flush=True)
with open(JSON, 'w') as f:
    json.dump(saida, f, indent=1)
print('DONE')
