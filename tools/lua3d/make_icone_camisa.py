# Generated with AI assistance (Claude). See README, "Use of AI tools".
# The shirt icon of the start screen's suit button (Radar: the astronaut's skins), as a 3D toon
# model rendered in Blender, in the style of the lunar_icons_v6 pack (public/icons/lunar-v6): a
# white to lavender body, navy cuffs and hem, an orange collar, a little ringed planet on the chest,
# turned a little so it reads as 3D, and the pack's cream halo around the silhouette.
#
#   blender -b -P tools/lua3d/make_icone_camisa.py
#
# Out: public/icons/lunar-v6/shirt.png (512 x 512, transparent)
import bpy, bmesh, os, math, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'public', 'icons', 'lunar-v6', 'shirt.png')
TMP = os.path.join(HERE, '.cache', 'icone_camisa.png')
LADO = 512


def rgb(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return (*[v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c], 1.0)


bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'BLENDER_EEVEE'; sc.render.film_transparent = True
sc.render.resolution_x = sc.render.resolution_y = LADO
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'


# Toon material: a vertical gradient (the pack's two-stop gradients, top to bottom) times three
# soft light bands, as emission so the colors stay exactly the palette's.
def material(nome, topo, base, z0, z1):
    m = bpy.data.materials.new(nome); m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links; N.clear()
    geo = N.new('ShaderNodeNewGeometry'); sep = N.new('ShaderNodeSeparateXYZ'); L.new(geo.outputs['Position'], sep.inputs[0])
    mr = N.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = z0; mr.inputs['From Max'].default_value = z1
    L.new(sep.outputs['Z'], mr.inputs['Value'])
    grad = N.new('ShaderNodeMix'); grad.data_type = 'RGBA'
    grad.inputs[6].default_value = rgb(base); grad.inputs[7].default_value = rgb(topo)
    L.new(mr.outputs['Result'], grad.inputs['Factor'])
    dif = N.new('ShaderNodeBsdfDiffuse'); s2r = N.new('ShaderNodeShaderToRGB'); L.new(dif.outputs['BSDF'], s2r.inputs['Shader'])
    ramp = N.new('ShaderNodeValToRGB'); cr = ramp.color_ramp; cr.interpolation = 'CONSTANT'
    cr.elements[0].position = 0.0; cr.elements[0].color = (0.62, 0.64, 0.80, 1)
    cr.elements[1].position = 0.18; cr.elements[1].color = (0.86, 0.87, 0.95, 1)
    e = cr.elements.new(0.5); e.color = (1, 1, 1, 1)
    L.new(s2r.outputs['Color'], ramp.inputs['Fac'])
    mul = N.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs['Factor'].default_value = 1
    L.new(grad.outputs[2], mul.inputs[6]); L.new(ramp.outputs['Color'], mul.inputs[7])
    em = N.new('ShaderNodeEmission'); L.new(mul.outputs[2], em.inputs['Color'])
    out = N.new('ShaderNodeOutputMaterial'); L.new(em.outputs[0], out.inputs['Surface'])
    return m


contorno = bpy.data.materials.new('contorno'); contorno.use_nodes = True; contorno.use_backface_culling = True
cn = contorno.node_tree.nodes; cn.clear()
ce = cn.new('ShaderNodeEmission'); ce.inputs['Color'].default_value = rgb('#1a2a9c')
contorno.node_tree.links.new(ce.outputs[0], cn.new('ShaderNodeOutputMaterial').inputs['Surface'])

pecas = []


def placa(nome, pontos, z0, z1, mat, bevel=0.6, linha=0.35):
    """A flat shape (x, y in icon units, y up) extruded from depth z0 to z1, rounded, outlined."""
    me = bpy.data.meshes.new(nome); bm = bmesh.new()
    vs = [bm.verts.new((x, z0, y)) for x, y in pontos]
    f = bm.faces.new(vs)
    r = bmesh.ops.extrude_face_region(bm, geom=[f])
    for v in [g for g in r['geom'] if isinstance(g, bmesh.types.BMVert)]: v.co.y = z1
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(nome, me); sc.collection.objects.link(o)
    if bevel:
        b = o.modifiers.new('bevel', 'BEVEL'); b.width = bevel; b.segments = 5; b.limit_method = 'ANGLE'
    o.data.materials.append(mat)
    o.data.materials.append(contorno)
    s = o.modifiers.new('contorno', 'SOLIDIFY')
    s.thickness = linha; s.offset = 1; s.use_flip_normals = True; s.material_offset = 1; s.use_rim = False
    pecas.append(o)
    return o


def arco(cx, cy, rx, ry, a0, a1, n=24):
    return [(cx + rx * math.cos(a0 + (a1 - a0) * i / n), cy + ry * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]


Z0, Z1 = -40, 40                                            # height range of the body, for the gradients
corpo = material('corpo', '#ffffff', '#c3c1f0', Z0, Z1)
azul = material('azul', '#4a69f5', '#1a2a9c', Z0, Z1)
laranja = material('laranja', '#ffc94d', '#ff8200', Z0, Z1)

# The shirt (icon units, y up): shoulders, short sleeves angled out, a round neck.
gola = arco(0, 41, 13, 11, 0, -math.pi)                     # neck opening, right to left along the bottom
placa('camisa', [(-13, 41), (-30, 36), (-55, 18), (-44, 0), (-31, 9), (-31, -40), (31, -40), (31, 9), (44, 0), (55, 18), (30, 36), (13, 41)] + gola[1:-1], -6, 6, corpo, bevel=2.2, linha=0.9)
# Navy cuffs at the sleeve ends and a navy hem.
placa('punho_e', [(-55, 18), (-44, 0), (-40.5, 2.6), (-51, 20.8)], -7.2, 7.2, azul, bevel=1.0, linha=0.7)
placa('punho_d', [(55, 18), (44, 0), (40.5, 2.6), (51, 20.8)], -7.2, 7.2, azul, bevel=1.0, linha=0.7)
placa('barra', [(-31, -40), (31, -40), (31, -33), (-31, -33)], -7.2, 7.2, azul, bevel=1.0, linha=0.7)
# Orange collar around the neck.
externo = arco(0, 41, 16.5, 14.5, 0, -math.pi)
interno = arco(0, 41, 12, 10, 0, -math.pi)
placa('gola', externo + interno[::-1], -7.0, 7.0, laranja, bevel=1.0, linha=0.7)
# A little ringed planet on the chest (the game's own emblem in the backpack icon), on the front
# face (the camera looks from -y).
placa('planeta', arco(0, -8, 9, 9, 0, 2 * math.pi, 32)[:-1], -8.6, -6.4, laranja, bevel=0.8, linha=0.6)
anel_ext = arco(0, -8, 17, 5.2, -0.18, math.pi + 0.18, 28)
anel_int = arco(0, -8, 13.5, 3.0, math.pi + 0.18, -0.18, 28)
placa('anel', anel_ext + anel_int, -9.8, -8.6, azul, bevel=0.4, linha=0.5)

# Turned a little and tipped back, so the depth and the rounded edges show.
raiz = bpy.data.objects.new('raiz', None); sc.collection.objects.link(raiz)
for o in pecas: o.parent = raiz
raiz.rotation_euler = (math.radians(-8), 0, math.radians(-22))

cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'; cam.ortho_scale = 124
cam_o = bpy.data.objects.new('cam', cam); sc.collection.objects.link(cam_o); sc.camera = cam_o
cam_o.location = (0, -300, 0); cam_o.rotation_euler = (math.radians(90), 0, 0)
luz = bpy.data.lights.new('luz', 'SUN'); luz.energy = 3.0
luz_o = bpy.data.objects.new('luz', luz); sc.collection.objects.link(luz_o)
luz_o.rotation_euler = (math.radians(55), math.radians(-25), math.radians(-30))   # from the front, upper left

os.makedirs(os.path.dirname(TMP), exist_ok=True)
sc.render.filepath = TMP
bpy.ops.render.render(write_still=True)

# The pack's halo: a solid cream band and a wider faint glow around the silhouette (Pillow, outside
# Blender's Python if it has no Pillow).
halo = r'''
import sys
from PIL import Image, ImageFilter, ImageChops
ent, sai = sys.argv[1], sys.argv[2]
im = Image.open(ent).convert('RGBA')
a = im.getchannel('A').point(lambda v: 255 if v > 40 else 0)
def cresce(m, r):
    return m.filter(ImageFilter.MaxFilter(2 * r + 1))
creme = cresce(a, 13)
brilho = cresce(a, 26).filter(ImageFilter.GaussianBlur(5))
fundo = Image.new('RGBA', im.size, (0, 0, 0, 0))
fundo.paste(Image.new('RGBA', im.size, (255, 255, 255, 255)), (0, 0), brilho.point(lambda v: v * 0.42))
fundo.paste(Image.new('RGBA', im.size, (255, 243, 196, 255)), (0, 0), creme)
fundo.alpha_composite(im)
fundo.save(sai)
'''
subprocess.run(['python3', '-c', halo, TMP, OUT], check=True)
print('DONE', OUT)
