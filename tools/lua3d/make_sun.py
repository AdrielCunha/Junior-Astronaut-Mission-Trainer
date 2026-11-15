# Generated with AI assistance (Claude). See README, "Use of AI tools".
# The Sun for the solar system view: a glowing toon ball (granulation in flat bands, darker limb,
# like the real Sun's limb darkening) with a ring of soft rays, in the game's outline style.
#
#   blender -b -P tools/lua3d/make_sun.py        (live: python3 tools/lua3d/bl.py --run ...)
# Out: public/lua/planetas/sol.png  (the ball fills the middle 50%: radius = 0.25 * width)
import bpy, os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import comum as C

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
PNG = os.path.join(ROOT, 'public', 'lua', 'planetas', 'sol.png')
LIVE = not bpy.app.background
TAM = 512

if LIVE:
    old = bpy.data.scenes.get('Sol')
    if old:
        for o in list(old.objects): bpy.data.objects.remove(o)
        bpy.data.scenes.remove(old)
    sc = bpy.data.scenes.new('Sol'); bpy.context.window.scene = sc
else:
    bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
sc.render.engine = 'BLENDER_EEVEE'; sc.render.film_transparent = True
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
sc.render.resolution_x = sc.render.resolution_y = TAM


def emissao(nome, construir):
    m = bpy.data.materials.new(nome); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links; N.clear()
    cor, alfa = construir(N, L)
    em = N.new('ShaderNodeEmission'); L.new(cor, em.inputs['Color'])
    out = N.new('ShaderNodeOutputMaterial')
    if alfa is None:
        L.new(em.outputs[0], out.inputs['Surface'])
    else:
        tr = N.new('ShaderNodeBsdfTransparent'); mx = N.new('ShaderNodeMixShader')
        L.new(alfa, mx.inputs['Fac']); L.new(tr.outputs[0], mx.inputs[1]); L.new(em.outputs[0], mx.inputs[2])
        L.new(mx.outputs[0], out.inputs['Surface'])
        m.surface_render_method = 'BLENDED'
    return m


def bola(N, L):
    # Granulation: noise in flat bands; limb darkening: darker toward the edge (facing ratio).
    tc = N.new('ShaderNodeTexCoord')
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 7.0; nz.inputs['Detail'].default_value = 4
    L.new(tc.outputs['Object'], nz.inputs['Vector'])
    lw = N.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.5
    mx = N.new('ShaderNodeMath'); mx.operation = 'MULTIPLY_ADD'
    L.new(nz.outputs['Fac'], mx.inputs[0]); mx.inputs[1].default_value = 0.5
    inv = N.new('ShaderNodeMath'); inv.operation = 'SUBTRACT'; inv.inputs[0].default_value = 0.75
    L.new(lw.outputs['Facing'], inv.inputs[1]); L.new(inv.outputs[0], mx.inputs[2])
    r = C._ramp(N, [(0.0, '#d9480f'), (0.42, '#f76707'), (0.55, '#fd9e2a'), (0.66, '#ffc94d'), (0.78, '#fff1a8')])
    L.new(mx.outputs[0], r.inputs['Fac'])
    return r.outputs['Color'], None


def raios(N, L):
    # Soft rays fading out from the ball (alpha from the distance to the center).
    tc = N.new('ShaderNodeTexCoord')
    ln = N.new('ShaderNodeVectorMath'); ln.operation = 'LENGTH'; L.new(tc.outputs['Object'], ln.inputs[0])
    mr = N.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = 1.0; mr.inputs['From Max'].default_value = 1.9
    mr.inputs['To Min'].default_value = 0.85; mr.inputs['To Max'].default_value = 0.0
    L.new(ln.outputs['Value'], mr.inputs['Value'])
    rr = C._ramp(N, [(0.0, '#fd9e2a'), (0.5, '#ffd43b')])
    L.new(mr.outputs['Result'], rr.inputs['Fac'])
    return rr.outputs['Color'], mr.outputs['Result']


bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=32, radius=1.0)
sol = bpy.context.active_object; bpy.ops.object.shade_smooth()
sol.data.materials.append(emissao('sol', bola))
contorno = bpy.data.materials.new('solContorno'); contorno.use_nodes = True; contorno.use_backface_culling = True
cn = contorno.node_tree.nodes; cn.clear()
ce = cn.new('ShaderNodeEmission'); ce.inputs['Color'].default_value = C.rgb('#7c2d12')
co = cn.new('ShaderNodeOutputMaterial'); contorno.node_tree.links.new(ce.outputs[0], co.inputs['Surface'])
sol.data.materials.append(contorno)
s = sol.modifiers.new('contorno', 'SOLIDIFY'); s.thickness = 0.03; s.offset = 1; s.use_flip_normals = True; s.material_offset = 1; s.use_rim = False

# Ring of rays: flat triangles around the ball, facing the camera, alternating long and short.
import bmesh
bm = bmesh.new()
n = 24
for i in range(n):
    a = 2 * math.pi * i / n
    L_ = 1.85 if i % 2 == 0 else 1.45
    w = math.pi / n * 0.8
    p0 = bm.verts.new((math.cos(a - w) * 0.98, math.sin(a - w) * 0.98, -0.2))
    p1 = bm.verts.new((math.cos(a + w) * 0.98, math.sin(a + w) * 0.98, -0.2))
    p2 = bm.verts.new((math.cos(a) * L_, math.sin(a) * L_, -0.2))
    bm.faces.new((p0, p1, p2))
me = bpy.data.meshes.new('raios'); bm.to_mesh(me); bm.free()
raio = bpy.data.objects.new('raios', me); sc.collection.objects.link(raio)
raio.data.materials.append(emissao('raios', raios))

cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'; cam.ortho_scale = 4.0
cam_o = bpy.data.objects.new('cam', cam); sc.collection.objects.link(cam_o); sc.camera = cam_o
cam_o.location = (0, 0, 10)

if LIVE:
    print('scene "Sol" ready')
else:
    os.makedirs(os.path.dirname(PNG), exist_ok=True)
    sc.render.filepath = PNG
    bpy.ops.render.render(write_still=True)
    print('DONE', PNG)
