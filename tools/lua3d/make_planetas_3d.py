# Generated with AI assistance. See README, "Use of AI tools".
# The inner planets as 3D models for the solar system view (Espaco): each planet is a sphere with
# its NASA map, lit by a Sun from 16 directions around the screen, rendered from the tilted
# solar-system camera into one sprite sheet. The game picks the frame whose light comes from where
# the Sun is on screen, so every planet is lit from the right side.
#
#   prime-run blender -b -P tools/lua3d/make_planetas_3d.py
#
# Maps (tools/lua3d/nasa/planetas/):
#   mercury.jpg  NASA/JHU APL/Carnegie Institution, MESSENGER global mosaic (PIA15063), grayscale
#   earth.jpg    NASA Goddard "Blue Marble"
#   mars.jpg     NASA 3D Resources, Viking/USGS
#   Venus: seen from space it is only its clouds (sulfuric acid, pale yellow, faint bands), so it is
#   made here; radar maps (Magellan) show the ground under the clouds, which nobody would see.
# Out: public/lua/planetas/3d/<name>.png (4 x 4 frames, 192 px), src/dados/planetas3d.json
import os, json, math, subprocess, urllib.request
import bpy
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
SRC = os.path.join(HERE, 'nasa', 'planetas')
OUT = os.path.join(ROOT, 'public', 'lua', 'planetas', '3d')
Q = 192                                  # frame size, px
RAIO = 0.80                              # the planet's radius in the frame, as a share of half the frame
DIRS = 16
MERCURIO = 'https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia15/pia15063/PIA15063.jpg'

# name: (map file or None, atmosphere color, atmosphere strength)
PLANETAS = {
    'mercurio': ('mercury.jpg', None, 0.0),
    'venus': (None, (1.0, 0.86, 0.55), 0.9),
    'terra': ('earth.jpg', (0.45, 0.7, 1.0), 0.8),
    'marte': ('mars.jpg', (1.0, 0.62, 0.4), 0.35),
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
sc.render.resolution_x = sc.render.resolution_y = Q
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


def atmosfera(cor, forca):
    """A thin glowing shell, brighter at the rim and only on the lit side."""
    bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=32, radius=1.045)
    o = bpy.context.active_object; bpy.ops.object.shade_smooth()
    m = bpy.data.materials.new('atmosfera'); m.use_nodes = True; m.surface_render_method = 'BLENDED'
    N, L = m.node_tree.nodes, m.node_tree.links; N.clear()
    lw = N.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.2
    em = N.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (*cor, 1); em.inputs['Strength'].default_value = 2.5 * forca
    tr = N.new('ShaderNodeBsdfTransparent'); mx = N.new('ShaderNodeMixShader')
    L.new(lw.outputs['Facing'], mx.inputs['Fac']); L.new(tr.outputs[0], mx.inputs[1]); L.new(em.outputs[0], mx.inputs[2])
    # Only where the Sun shines: multiply by a diffuse-lit mask through Shader to RGB.
    dif = N.new('ShaderNodeBsdfDiffuse'); s2r = N.new('ShaderNodeShaderToRGB'); L.new(dif.outputs[0], s2r.inputs[0])
    borda = N.new('ShaderNodeMath'); borda.operation = 'POWER'; borda.inputs[1].default_value = 3.0   # only a thin rim
    L.new(lw.outputs['Facing'], borda.inputs[0])
    mul = N.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'
    L.new(borda.outputs[0], mul.inputs[0]); L.new(s2r.outputs['Alpha'] if 'Alpha' in s2r.outputs else s2r.outputs[0], mul.inputs[1])
    L.new(mul.outputs[0], mx.inputs['Fac'])
    out = N.new('ShaderNodeOutputMaterial'); L.new(mx.outputs[0], out.inputs['Surface'])
    o.data.materials.append(m)
    o.visible_shadow = False          # the shell must not shade the planet inside it
    return o


os.makedirs(OUT, exist_ok=True)
tmp = os.path.join(HERE, '.cache', 'planetas3d'); os.makedirs(tmp, exist_ok=True)
saida = {}
for nome, (arq, cor, forca) in PLANETAS.items():
    for o in [o for o in sc.objects if o.type == 'MESH']: bpy.data.objects.remove(o)
    mapa = mercurio() if nome == 'mercurio' else (os.path.join(SRC, arq) if arq else None)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=128, ring_count=64, radius=1.0)
    p = bpy.context.active_object; bpy.ops.object.shade_smooth()
    p.data.materials.append(material(nome, mapa))
    p.rotation_euler = (0, 0, math.radians(200))            # turn an interesting face to the camera
    if cor: atmosfera(cor, forca)
    quadros = []
    for k in range(DIRS):
        a = 2 * math.pi * k / DIRS                          # where the Sun is on screen, counterclockwise from the right
        luz = (DIREITA * math.cos(a) + CIMA * math.sin(a) + CAM * 0.35).normalized()
        sol_o.rotation_euler = (-luz).to_track_quat('-Z', 'Y').to_euler()
        f = os.path.join(tmp, f'{nome}_{k:02d}.png'); sc.render.filepath = f
        bpy.ops.render.render(write_still=True)
        quadros.append(f)
    folha = os.path.join(OUT, f'{nome}.png')
    subprocess.run(['magick', 'montage', *quadros, '-tile', '4x4', '-geometry', f'{Q}x{Q}+0+0', '-background', 'none', folha], check=True)
    subprocess.run(['magick', folha, '-dither', 'None', '-colors', '255', 'PNG8:' + folha], check=True)
    saida[nome] = {'arquivo': f'lua/planetas/3d/{nome}.png', 'quadro': Q, 'direcoes': DIRS, 'raio': round(Q / 2 * RAIO, 1)}
    print('planet', nome, flush=True)
with open(os.path.join(ROOT, 'src', 'dados', 'planetas3d.json'), 'w') as f:
    json.dump({'nota': 'Frame k is lit by a Sun at angle k * 360 / direcoes, counterclockwise from screen right (y up). raio = the planet disc radius in px within a frame.', **saida}, f, indent=1)
print('DONE')
