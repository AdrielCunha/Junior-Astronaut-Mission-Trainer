# Generated with AI assistance. See README, "Use of AI tools".
# The Sun, the inner planets and the Moon as 3D models for the solar system view (Espaco) and for
# the full-screen view of each body (Astro). Rendered in Blender, turning on their axes:
#   small sheet, solar system view: 16 turns x 16 Sun directions, 96 px frames (the game picks the
#     frame lit from where the Sun is on screen, and steps the turn so the body spins);
#     the Sun: 16 turns, it is its own light;
#   full screen (Astro): the body's surface baked by Cycles into an equirectangular map, 2048 x 1024,
#     that astroShader.ts wraps on a sphere on the GPU, so it turns smoothly at any size (like the
#     live Moon). The Sun's map is its surface without the limb darkening, which the shader adds.
#
#   prime-run blender -b -P tools/lua3d/make_planetas_3d.py [-- --so terra,sol] [--so-pequeno | --so-mapas]
#
# Maps (tools/lua3d/nasa/):
#   planetas/mercury.jpg  NASA/JHU APL/Carnegie Institution, MESSENGER global mosaic (PIA15063)
#   planetas/earth.jpg    NASA Goddard "Blue Marble"
#   planetas/mars.jpg     NASA 3D Resources, Viking/USGS
#   lroc_color_poles_2k.tif  the Moon, NASA SVS CGI Moon Kit (LRO LROC)
#   Venus: from space it is only its clouds (pale yellow, faint bands), made here.
#   The Sun: made here: granulation, darker limb (limb darkening is real), a few sunspots.
# Out: public/lua/planetas/3d/<name>_p.png, public/lua/planetas/mapas/<name>.jpg, src/dados/planetas3d.json
import os, sys, json, math, subprocess, urllib.request
import bpy
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
NASA = os.path.join(HERE, 'nasa')
SRC = os.path.join(NASA, 'planetas')
OUT = os.path.join(ROOT, 'public', 'lua', 'planetas', '3d')
JUPITER = 'https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia07/pia07782/PIA07782.jpg'
MERCURIO = 'https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia15/pia15063/PIA15063.jpg'
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
SO = argv[argv.index('--so') + 1].split(',') if '--so' in argv else None
SO_PEQUENO = '--so-pequeno' in argv      # only the small sheets (the maps are kept)
SO_MAPAS = '--so-mapas' in argv          # only the maps (the small sheets are kept)
MAPA = (2048, 1024)

QP = 96                                  # frame size, solar system view
DIRS, GIROS = 16, 48
COLS_P = 32                              # small sheet: 32 frames a row keeps it under 4096 px (old GPUs)
RAIO = 0.80                              # body radius as a share of half the frame (room for the glow)
# name: (map, atmosphere color, atmosphere strength, axial tilt deg)
CORPOS = {
    'sol': (None, None, 0.0, 7.25),
    'mercurio': ('planetas/mercury.jpg', None, 0.0, 0.0),
    'venus': (None, (1.0, 0.86, 0.55), 0.9, 177.4),
    'terra': ('planetas/earth.jpg', (0.45, 0.7, 1.0), 0.8, 23.4),
    'lua': ('lroc_color_poles_2k.tif', None, 0.0, 6.7),
    'marte': ('planetas/mars.jpg', (1.0, 0.62, 0.4), 0.35, 25.2),
    'jupiter': ('planetas/jupiter.jpg', None, 0.0, 3.1),
    'saturno': (None, None, 0.0, 26.7),
    'urano': (None, (0.62, 0.88, 0.95), 0.3, 97.8),
    'netuno': (None, (0.4, 0.6, 1.0), 0.3, 28.3),
}
# The gas giants with no usable global map: cloud bands in their real colors (Voyager, Cassini),
# low contrast for Uranus, which looks almost plain from space.
BANDAS = {
    'saturno': [(0.0, (0.80, 0.68, 0.46)), (0.35, (0.93, 0.85, 0.64)), (0.55, (0.84, 0.73, 0.50)), (0.75, (0.96, 0.89, 0.70)), (1.0, (0.78, 0.66, 0.44))],
    'urano': [(0.0, (0.60, 0.84, 0.87)), (0.5, (0.67, 0.89, 0.91)), (1.0, (0.58, 0.82, 0.86))],
    'netuno': [(0.0, (0.18, 0.32, 0.78)), (0.4, (0.27, 0.46, 0.92)), (0.6, (0.20, 0.36, 0.84)), (1.0, (0.30, 0.50, 0.95))],
}
# Saturn's rings, in Saturn radii (NASA Saturnian rings fact sheet): C 1.24-1.53 (faint),
# B 1.53-1.95 (bright), the Cassini division, A 2.03-2.27. (radius, color, opacity)
ANEIS = [(1.24, (0.55, 0.50, 0.42), 0.25), (1.53, (0.88, 0.80, 0.64), 0.9), (1.95, (0.5, 0.45, 0.4), 0.06), (2.03, (0.76, 0.69, 0.55), 0.6), (2.27, (0, 0, 0), 0.0)]
RETROGRADOS = ('venus', 'urano')
# Half the frame, in body radii: room for the glow, and for Saturn's rings.
def meio_quadro(nome): return 2.35 if nome == 'saturno' else 1 / RAIO

# The solar system view is tilted asin(0.6) above the ecliptic, looking from -Y (planetaShader.ts).
CAM = Vector((0, -0.8, 0.6)); CIMA = Vector((0, 0.6, 0.8)); DIREITA = CIMA.cross(CAM).normalized()


def jupiter():
    """Jupiter: Cassini's global color map, NASA/JPL/University of Arizona (PIA07782)."""
    p = os.path.join(SRC, 'jupiter.jpg')
    if not os.path.exists(p):
        tmp = p + '.orig'
        urllib.request.urlretrieve(JUPITER, tmp)
        subprocess.run(['magick', tmp, '-resize', '2048x1024!', '-quality', '90', p], check=True)
        os.remove(tmp)
    return p


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
    if nome in BANDAS: return material_bandas(nome)
    m = bpy.data.materials.new(nome); m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links
    bs = next(n for n in N if n.type == 'BSDF_PRINCIPLED')
    bs.inputs['Roughness'].default_value = 0.9
    if mapa:
        tex = N.new('ShaderNodeTexImage'); tex.image = bpy.data.images.load(mapa); tex.name = 'base'
        L.new(tex.outputs['Color'], bs.inputs['Base Color'])
    else:   # Venus's clouds: pale yellow, soft bands stretched along the equator, a little swirl
        tc = N.new('ShaderNodeTexCoord')
        esc = N.new('ShaderNodeMapping'); esc.inputs['Scale'].default_value = (1.2, 1.2, 5.0)
        nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 2.2; nz.inputs['Detail'].default_value = 4
        nz.inputs['Distortion'].default_value = 1.2
        L.new(tc.outputs['Object'], esc.inputs['Vector']); L.new(esc.outputs['Vector'], nz.inputs['Vector'])
        r = N.new('ShaderNodeValToRGB'); r.name = 'base'
        r.color_ramp.elements[0].color = (0.78, 0.62, 0.36, 1); r.color_ramp.elements[1].color = (0.98, 0.9, 0.7, 1)
        L.new(nz.outputs['Fac'], r.inputs['Fac']); L.new(r.outputs['Color'], bs.inputs['Base Color'])
    return m


def material_bandas(nome):
    """Cloud bands along the equator, a little wavy."""
    m = bpy.data.materials.new(nome); m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links
    bs = next(n for n in N if n.type == 'BSDF_PRINCIPLED'); bs.inputs['Roughness'].default_value = 0.85
    tc = N.new('ShaderNodeTexCoord')
    onda = N.new('ShaderNodeTexWave'); onda.wave_type = 'BANDS'; onda.bands_direction = 'Z'
    onda.inputs['Scale'].default_value = 2.2; onda.inputs['Distortion'].default_value = 3.0; onda.inputs['Detail'].default_value = 2.0
    L.new(tc.outputs['Object'], onda.inputs['Vector'])
    r = N.new('ShaderNodeValToRGB'); r.name = 'base'; cr = r.color_ramp
    pts = BANDAS[nome]
    while len(cr.elements) < len(pts): cr.elements.new(0.5)
    for el, (pos, c) in zip(cr.elements, pts): el.position = pos; el.color = (*c, 1)
    L.new(onda.outputs['Fac'], r.inputs['Fac']); L.new(r.outputs['Color'], bs.inputs['Base Color'])
    return m


def aneis(eixo):
    """Saturn's rings: a flat disc, see-through where there is no ring."""
    bpy.ops.mesh.primitive_circle_add(vertices=192, radius=2.3, fill_type='NGON')
    o = bpy.context.active_object; o.matrix_world = eixo
    m = bpy.data.materials.new('aneis'); m.use_nodes = True; m.surface_render_method = 'BLENDED'
    N, L = m.node_tree.nodes, m.node_tree.links; N.clear()
    tc = N.new('ShaderNodeTexCoord')
    raio = N.new('ShaderNodeVectorMath'); raio.operation = 'LENGTH'; L.new(tc.outputs['Object'], raio.inputs[0])
    esc = N.new('ShaderNodeMath'); esc.operation = 'DIVIDE'; esc.inputs[1].default_value = 2.3
    L.new(raio.outputs['Value'], esc.inputs[0])
    r = N.new('ShaderNodeValToRGB'); cr = r.color_ramp; cr.interpolation = 'CONSTANT'
    cr.elements[0].position = 0.0; cr.elements[0].color = (0, 0, 0, 0)
    cr.elements[1].position = ANEIS[0][0] / 2.3; cr.elements[1].color = (*ANEIS[0][1], ANEIS[0][2])
    for raio_a, c, a in ANEIS[1:]: e = cr.elements.new(raio_a / 2.3); e.color = (*c, a)
    L.new(esc.outputs[0], r.inputs['Fac'])
    dif = N.new('ShaderNodeBsdfDiffuse'); L.new(r.outputs['Color'], dif.inputs['Color'])
    tr = N.new('ShaderNodeBsdfTransparent'); mx = N.new('ShaderNodeMixShader')
    L.new(r.outputs['Alpha'], mx.inputs['Fac']); L.new(tr.outputs[0], mx.inputs[1]); L.new(dif.outputs[0], mx.inputs[2])
    out = N.new('ShaderNodeOutputMaterial'); L.new(mx.outputs[0], out.inputs['Surface'])
    o.data.materials.append(m)
    return o


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
    escuro = N.new('ShaderNodeMix'); escuro.name = 'base'; escuro.data_type = 'RGBA'; escuro.inputs[6].default_value = (0.35, 0.12, 0.02, 1)
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


def cozinhar(p, destino):
    """Bakes the body's surface color (no light, no limb) into an equirectangular map: the UV
    sphere's UVs are longitude and latitude."""
    m = p.data.materials[0]; N, L = m.node_tree.nodes, m.node_tree.links
    base = N['base']; cor = base.outputs[2] if base.type == 'MIX' else base.outputs['Color']
    out = next(n for n in N if n.type == 'OUTPUT_MATERIAL')
    em = N.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = 1.0
    L.new(cor, em.inputs['Color']); L.new(em.outputs[0], out.inputs['Surface'])
    img = bpy.data.images.new('mapa', *MAPA, alpha=False)
    alvo = N.new('ShaderNodeTexImage'); alvo.image = img; N.active = alvo
    motor = sc.render.engine
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 8
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences
        prefs.compute_device_type = 'OPTIX'; prefs.get_devices()
        for d in prefs.devices: d.use = True
        sc.cycles.device = 'GPU'
    except Exception:
        sc.cycles.device = 'CPU'
    for o in sc.objects: o.select_set(o == p)
    bpy.context.view_layer.objects.active = p
    bpy.ops.object.bake(type='EMIT', margin=4)
    # The UV seam (the map's left and right edges) bakes a bright column: rebuild both edge
    # columns from their neighbors, so the map wraps without a line.
    import numpy as np
    w, h = MAPA
    px = np.empty(w * h * 4, np.float32); img.pixels.foreach_get(px); a = px.reshape(h, w, 4)
    a[:, 0] = a[:, 1]; a[:, w - 1] = (a[:, w - 2] + a[:, 0]) / 2
    img.pixels.foreach_set(a.ravel())
    img.filepath_raw = destino; img.file_format = 'JPEG'
    sc.render.image_settings.quality = 88
    img.save()
    sc.render.engine = motor
    N.remove(alvo); N.remove(em)


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
saida = json.load(open(JSON)) if (SO or SO_PEQUENO or SO_MAPAS) and os.path.exists(JSON) else {}
os.makedirs(os.path.join(OUT, '..', 'mapas'), exist_ok=True)
for nome, (arq, cor, forca, incl) in CORPOS.items():
    if SO and nome not in SO: continue
    for o in [o for o in sc.objects if o.type == 'MESH']: bpy.data.objects.remove(o)
    eh_sol = nome == 'sol'
    sol.energy = 0.0 if eh_sol else 4.5
    # AgX washes a bright emission out to pastel; the Sun keeps its colors with Standard.
    sc.view_settings.view_transform = 'Standard' if eh_sol else 'AgX'
    bpy.ops.mesh.primitive_uv_sphere_add(segments=128, ring_count=64, radius=1.0)
    p = bpy.context.active_object; bpy.ops.object.shade_smooth()
    mapa = mercurio() if nome == 'mercurio' else jupiter() if nome == 'jupiter' else (os.path.join(NASA, arq) if arq else None)
    p.data.materials.append(material_sol() if eh_sol else material(nome, mapa))
    if cor: atmosfera(cor, forca)
    # Spin about the body's own axis, tilted like the real one (Venus turns backward: 177 deg).
    # Saturn leans sideways: tilted toward the camera, the rings would look almost face-on.
    eixo = Matrix.Rotation(math.radians(incl), 4, 'Y' if nome == 'saturno' else 'X')
    sentido = -1 if nome in RETROGRADOS else 1
    cam.ortho_scale = 2 * meio_quadro(nome)
    anel = aneis(eixo) if nome == 'saturno' else None

    def girar(fr):
        p.matrix_world = eixo @ Matrix.Rotation(math.radians(200) + sentido * 2 * math.pi * fr, 4, 'Z')

    item = saida.get(nome, {})
    if not SO_MAPAS:
        peq = []
        for j in range(GIROS):
            girar(j / GIROS)
            for k in range(1 if eh_sol else DIRS):
                if not eh_sol: apontar_luz(2 * math.pi * k / DIRS)
                f = os.path.join(tmp, f'{nome}_p{j:02d}_{k:02d}.png'); render(QP, f); peq.append(f)
        folha(peq, 8 if eh_sol else COLS_P, QP, os.path.join(OUT, f'{nome}_p.png'))   # frame j * direcoes + k, row by row
    # (Always written: runs in parallel, one body each, can drop each other's entries.)
    item['pequeno'] = {'arquivo': f'lua/planetas/3d/{nome}_p.png', 'quadro': QP, 'giros': GIROS, 'direcoes': 1 if eh_sol else DIRS, 'raio': round(QP / 2 / meio_quadro(nome), 1)}
    if not SO_PEQUENO:
        p.matrix_world = Matrix.Identity(4)
        if anel: bpy.data.objects.remove(anel)
        cozinhar(p, os.path.abspath(os.path.join(OUT, '..', 'mapas', f'{nome}.jpg')))
        item['grande'] = {'mapa': f'lua/planetas/mapas/{nome}.jpg', 'inclinacao': incl, 'sentido': sentido,
                          'atmos': [round(c, 3) for c in cor] if cor else None, 'atmosForca': forca, 'sol': eh_sol, 'aneis': nome == 'saturno'}
    saida[nome] = item
    print('body', nome, flush=True)
with open(JSON, 'w') as f:
    json.dump(saida, f, indent=1)
print('DONE')
