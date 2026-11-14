# Generated with AI assistance (Claude). See README, "Use of AI tools".
# The base modules as toon 3D models, rendered from the map's own isometric camera, one picture
# each, plus the rocket in 5 build stages. Same light, palette and outline as the terrain.
#
#   blender -b -P tools/lua3d/make_modules.py            (headless, ~1 min)
#   python3 tools/lua3d/bl.py --run tools/lua3d/make_modules.py   (live, scene "Modulos")
#
# Out: public/lua/modulos/<id>.png, src/dados/modulos.json
#      { id: { arquivo, w, h, ancora: [x, y], escala } }: ancora = pixel of the footprint's
#      corner (gx, gy) at floor height; draw the picture there at `escala`.
import bpy, bmesh, os, json, math, subprocess
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'public', 'lua', 'modulos')
JSON = os.path.join(ROOT, 'src', 'dados', 'modulos.json')
LIVE = not bpy.app.background
T = 30; SUPER = 2; PAD = 18
FASE = 0
ANIMADOS = {'suporte': 3, 'oficina': 3}
LIGHT = [(0.0, '#3a3550'), (0.10, '#8a7f92'), (0.35, '#c9c0c4'), (0.55, '#ece5df'), (0.75, '#fffaf0')]
OUTLINE = '#17130f'
# Footprints in tiles, as in src/engine/construcao.ts.
TIPOS = {
    'habitat': (3, 3), 'suporte': (3, 2), 'blindagem': (2, 2),
    'oficina': (3, 3), 'painel': (2, 1), 'plataforma': (3, 3),
    'antena': (2, 2), 'estufa': (3, 2), 'perfuratriz': (2, 2), 'rover': (2, 1),
    'pouso': (2, 2),   # the cargo lander (footprint of its legs)
}


def rgb(h, a=1.0):
    h = h.lstrip('#')
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return (*[c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb], a)


if LIVE:
    old = bpy.data.scenes.get('Modulos')
    if old:
        for o in list(old.objects): bpy.data.objects.remove(o)
        bpy.data.scenes.remove(old)
    sc = bpy.data.scenes.new('Modulos'); bpy.context.window.scene = sc
else:
    bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
sc.render.engine = 'BLENDER_EEVEE'; sc.render.film_transparent = True
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'; sc.render.filter_size = 1.0

_mats = {}
def toon(cor):
    if cor in _mats: return _mats[cor]
    m = bpy.data.materials.new('mod' + cor); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links; N.clear()
    dif = N.new('ShaderNodeBsdfDiffuse'); s2r = N.new('ShaderNodeShaderToRGB'); L.new(dif.outputs['BSDF'], s2r.inputs['Shader'])
    r = N.new('ShaderNodeValToRGB'); cr = r.color_ramp; cr.interpolation = 'CONSTANT'
    while len(cr.elements) < len(LIGHT): cr.elements.new(0.99)
    for e, (p, c) in zip(cr.elements, LIGHT): e.position = p; e.color = rgb(c)
    L.new(s2r.outputs['Color'], r.inputs['Fac'])
    mix = N.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'
    mix.inputs['Factor'].default_value = 1; mix.inputs[6].default_value = rgb(cor); L.new(r.outputs['Color'], mix.inputs[7])
    em = N.new('ShaderNodeEmission'); L.new(mix.outputs[2], em.inputs['Color'])
    out = N.new('ShaderNodeOutputMaterial'); L.new(em.outputs[0], out.inputs['Surface'])
    _mats[cor] = m
    return m

contorno = bpy.data.materials.new('modContorno'); contorno.use_nodes = True; contorno.use_backface_culling = True
cn = contorno.node_tree.nodes; cn.clear()
ce = cn.new('ShaderNodeEmission'); ce.inputs['Color'].default_value = rgb(OUTLINE)
co = cn.new('ShaderNodeOutputMaterial'); contorno.node_tree.links.new(ce.outputs[0], co.inputs['Surface'])

grupo = []   # objects of the model being built


def _fim(o, cor, bevel, linha):
    if o.users_collection and sc.collection not in o.users_collection:
        for c in o.users_collection: c.objects.unlink(o)
        sc.collection.objects.link(o)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        b = o.modifiers.new('bevel', 'BEVEL'); b.width = bevel; b.segments = 3; b.limit_method = 'ANGLE'
    o.data.materials.append(toon(cor)); o.data.materials.append(contorno)
    s = o.modifiers.new('contorno', 'SOLIDIFY')
    s.thickness = linha; s.offset = 1; s.use_flip_normals = True; s.material_offset = 1; s.use_rim = False
    grupo.append(o)
    return o


# Map axes: X = gx, Y = -gy. A footprint of w x h tiles spans X 0..w, Y -h..0.
def caixa(x0, y0, x1, y1, z0, z1, cor, bevel=0.03, linha=0.03):
    bpy.ops.mesh.primitive_cube_add(size=1)
    o = bpy.context.active_object
    o.scale = (x1 - x0, y1 - y0, z1 - z0); o.location = ((x0 + x1) / 2, -(y0 + y1) / 2, (z0 + z1) / 2)
    return _fim(o, cor, bevel, linha)


def cilindro(cx, cy, r, z0, z1, cor, v=24, rot=None, linha=0.03, bevel=0.0):
    bpy.ops.mesh.primitive_cylinder_add(vertices=v, radius=r, depth=z1 - z0)
    o = bpy.context.active_object
    o.location = (cx, -cy, (z0 + z1) / 2)
    if rot: o.rotation_euler = rot
    bpy.ops.object.shade_smooth()
    return _fim(o, cor, bevel, linha)


def esfera(cx, cy, cz, rx, ry, rz, cor, linha=0.03, metade=False):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=1)
    o = bpy.context.active_object
    if metade:
        bm = bmesh.new(); bm.from_mesh(o.data)
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -1e-4], context='VERTS')
        bm.to_mesh(o.data); bm.free()
    o.scale = (rx, ry, rz); o.location = (cx, -cy, cz)
    bpy.ops.object.shade_smooth()
    return _fim(o, cor, 0, linha)


def haste(a, b, r, cor, linha=0.012):
    """A strut from map point a to b, each (gx, gy, z)."""
    pa, pb = Vector((a[0], -a[1], a[2])), Vector((b[0], -b[1], b[2]))
    d = pb - pa
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=r, depth=d.length)
    o = bpy.context.active_object
    o.location = (pa + pb) / 2
    o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = d.to_track_quat('Z', 'Y')
    return _fim(o, cor, 0, linha)


def piso(w, h, cor='#8f8571', z=0.12):
    caixa(0.04, 0.04, w - 0.04, h - 0.04, 0, z, cor, bevel=0.045, linha=0.018)
    deck=grupo[-1]
    mat=bpy.data.materials.get('Regolith landing deck')
    if mat is None:
        mat=bpy.data.materials.new('Regolith landing deck');mat.use_nodes=True
        bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=rgb('#8f8571');bs.inputs['Roughness'].default_value=0.85
    deck.data.materials[0]=mat
    # A warm regolith skirt meets the runtime terrain-following foundation.
    caixa(0.13, h-0.15, w-0.13, h-0.06, z*0.4, z, '#b6ab92', bevel=0.015, linha=0.006)


# Emissive lenses are part of the actual 3D fixture; area lights illuminate the platform.
def emissivo(o, cor, strength=1.8):
    key=f'emission:{cor}:{strength}'
    if key not in _mats:
        mat=bpy.data.materials.new(key);mat.use_nodes=True
        nodes=mat.node_tree.nodes;nodes.clear()
        em=nodes.new('ShaderNodeEmission');em.inputs['Color'].default_value=rgb(cor);em.inputs['Strength'].default_value=strength
        out=nodes.new('ShaderNodeOutputMaterial');mat.node_tree.links.new(em.outputs[0],out.inputs['Surface'])
        _mats[key]=mat
    o.data.materials[0]=_mats[key]
    return o

def lampada(x,y,z,largura=0.52,cor='#ffe2a6'):
    # Recessed downward-facing strip with metal hood, not a floating point or an atmospheric cone.
    caixa(x-largura/2-0.045,y-0.1,x+largura/2+0.045,y+0.09,z,z+0.12,'#334155',bevel=0.025,linha=0.012)
    emissivo(caixa(x-largura/2,y-0.065,x+largura/2,y+0.065,z-0.012,z,cor,bevel=0.012,linha=0.004),cor,2.4)
    light=bpy.data.lights.new('Recessed area lamp','AREA');light.energy=30;light.color=rgb(cor)[:3];light.shape='RECTANGLE';light.size=largura;light.size_y=0.14
    obj=bpy.data.objects.new('Recessed area lamp',light);sc.collection.objects.link(obj)
    obj.location=(x,-y,z-0.025)
    direction=Vector((0,-0.25,-0.8));obj.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()

def visor(x0,y0,x1,y1,z0,z1,cor):
    return emissivo(caixa(x0,y0,x1,y1,z0,z1,cor,bevel=0.008,linha=0.004),cor,1.4)

# ---------- models ----------
def habitat():
    w, h = TIPOS['habitat']; piso(w, h)
    cilindro(1.5, 1.5, 1.25, 0.12, 0.62, '#94a3b8', v=8, bevel=0.03)          # octagonal ring
    esfera(1.5, 1.5, 0.62, 1.12, 1.12, 0.78, '#cbd5e1', metade=True)          # dome
    # Structural seams follow the dome instead of appearing as disconnected cubes.
    for angle in range(0,360,60):
        az=math.radians(angle)
        for segment in range(8):
            def pt(k):
                phi=math.pi*0.5*k/8
                return (1.5+1.13*math.cos(phi)*math.cos(az),1.5+1.13*math.cos(phi)*math.sin(az),0.62+0.79*math.sin(phi))
            haste(pt(segment),pt(segment+1),0.018,'#94a3b8',linha=0.004)
    esfera(1.95, 2.15, 1.05, 0.32, 0.32, 0.16, '#38bdf8', linha=0.02)          # skylight
    caixa(1.15, 2.55, 1.85, 3.0, 0.12, 0.62, '#e2e8f0')                       # airlock
    caixa(1.3, 2.97, 1.7, 3.01, 0.15, 0.52, '#1e293b', bevel=0.005, linha=0.01)
    for x in (0.72,2.28):
        esfera(x,2.43,0.48,0.20,0.08,0.15,'#334155',linha=0.012)
        emissivo(esfera(x,2.49,0.49,0.14,0.035,0.10,'#ffe1a3',linha=0.004),'#ffe1a3',1.6)
    caixa(1.19,2.72,1.81,2.96,0.13,0.18,'#94a3b8',linha=0.01)
    visor(1.26,3.0,1.74,3.02,0.55,0.60,'#8ae8ff')
    lampada(1.5,2.84,0.66,0.56)
    visor(1.35,3.012,1.65,3.026,0.27,0.45,'#ffd89a')
    caixa(2.62, 1.1, 2.98, 1.9, 0.3, 0.45, '#f59e0b', bevel=0.01, linha=0.015)  # window strip


def suporte():
    w, h = TIPOS['suporte']; piso(w, h)
    caixa(0.2, 0.25, 1.6, 1.75, 0.12, 0.9, '#3b82f6')                         # machine room
    caixa(0.25, 1.7, 1.55, 1.78, 0.25, 0.75, '#1e3a8a', bevel=0.005, linha=0.01)
    for cx in (2.05, 2.6):                                                    # O2 tanks
        cilindro(cx, 0.65, 0.24, 0.12, 1.25, '#e2e8f0', bevel=0.02)
        esfera(cx, 0.65, 1.25, 0.24, 0.24, 0.14, '#e2e8f0', metade=True)
        caixa(cx - 0.25, 0.6, cx + 0.25, 0.7, 0.8, 0.86, '#3b82f6', bevel=0.005, linha=0.01)
    cilindro(1.8, 1.35, 0.06, 0.12, 0.9, '#94a3b8', v=12, linha=0.015)       # pipes
    caixa(1.55, 1.3, 2.65, 1.4, 0.82, 0.9, '#94a3b8', bevel=0.005, linha=0.015)
    # Vacuum thermal management: sealed coolant loop and radiator fins, no exposed air fan.
    caixa(0.57,0.38,1.44,1.58,0.90,0.97,'#334155',bevel=0.02,linha=0.012)
    for x in (0.64,0.80,0.96,1.12,1.28):
        caixa(x,0.43,x+0.055,1.52,0.97,1.12,'#cbd5e1',bevel=0.01,linha=0.004)
    haste((0.58,0.48,1.02),(0.58,1.46,1.02),0.035,'#60a5fa',linha=0.006)
    for x in (2.05,2.6):
        for z in (0.32,0.98): cilindro(x,0.65,0.25,z,z+0.07,'#60a5fa',linha=0.008)
        cilindro(x,0.65,0.06,1.38,1.44,'#ef4444',v=16,linha=0.008)
    for y in (0.42,0.66,0.90,1.14,1.38):
        caixa(0.24,y,0.45,y+0.08,0.92,1.04,'#cbd5e1',linha=0.006)
    caixa(0.32,1.78,1.46,1.83,0.36,0.76,'#0f172a',linha=0.008)
    visor(0.39,1.835,1.39,1.85,0.42,0.70,'#60cce2')
    for i in range(4):
        x=0.46+i*0.22
        visor(x,1.855,x+0.13,1.866,0.46,0.50+0.045*((i+FASE)%3),'#e0ffe9')
    lampada(0.9,1.69,0.96,0.76,'#b9eeff')


def blindagem():
    w, h = TIPOS['blindagem']
    # Regolith berm: the shield is Moon dust piled on a bunker, as real designs plan.
    esfera(1.0, 1.0, 0.0, 0.98, 0.98, 0.95, '#a39882', metade=True)
    caixa(0.55, 1.55, 1.45, 2.0, 0.0, 0.7, '#eab308')                        # entrance
    caixa(0.55, 1.62, 1.45, 1.72, 0.48, 0.56, '#1c1917', bevel=0.005, linha=0.01)
    caixa(0.75, 1.97, 1.25, 2.01, 0.05, 0.45, '#1c1917', bevel=0.005, linha=0.01)
    cilindro(1.0, 1.0, 0.07, 0.9, 1.35, '#94a3b8', v=12, linha=0.015)       # sensor mast
    esfera(1.0, 1.0, 1.38, 0.1, 0.1, 0.1, '#ef4444', linha=0.015)
    for x in (0.62,1.28):
        caixa(x,1.985,x+0.10,2.02,0.18,0.38,'#fde047',linha=0.005)
    visor(0.78,2.015,1.22,2.025,0.48,0.54,'#ccf9b9')
    lampada(1,1.84,0.72,0.60)


def oficina():
    w, h = TIPOS['oficina']; piso(w, h)
    caixa(0.2, 0.2, 2.8, 2.8, 0.12, 0.7, '#f97316')
    # half-cylinder hangar roof along gy
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=1.3, depth=2.6)
    o = bpy.context.active_object
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.x < -1e-4], context='VERTS')
    bm.to_mesh(o.data); bm.free()
    o.rotation_euler = (math.radians(90), math.radians(-90), 0); o.location = (1.5, -1.5, 0.7)
    o.scale = (1, 1, 1)
    bpy.ops.object.shade_smooth()
    _fim(o, '#fdba74', 0, 0.03)
    caixa(0.8, 2.78, 2.2, 2.84, 0.12, 1.3, '#292524', bevel=0.005, linha=0.015)   # big door
    for x in (0.95, 1.3, 1.65, 2.0):
        caixa(x, 2.84, x + 0.05, 2.86, 0.12, 1.3, '#57534e', bevel=0, linha=0.005)
    # Light arch ribs and door surround make the hangar readable at gameplay scale.
    for y in (0.30,1.5,2.72):
        for k in range(16):
            a,b=math.pi*k/16,math.pi*(k+1)/16
            haste((1.5+1.32*math.cos(a),y,0.7+1.32*math.sin(a)),(1.5+1.32*math.cos(b),y,0.7+1.32*math.sin(b)),0.025,'#e2e8f0',linha=0.005)
    caixa(0.65,2.83,0.78,2.9,0.12,1.38,'#fed7aa',linha=0.008)
    caixa(2.22,2.83,2.35,2.9,0.12,1.38,'#fed7aa',linha=0.008)
    caixa(0.65,2.83,2.35,2.9,1.3,1.4,'#fed7aa',linha=0.008)
    visor(1.12,2.92,1.88,2.96,1.43,1.55,'#7dd3fc')
    for i in range(3):
        visor(0.91+i*0.44,2.87,1.22+i*0.44,2.885,0.36,0.62,'#ffda91')
    visor(1.18+FASE*0.18,2.965,1.34+FASE*0.18,2.975,1.46,1.52,'#e1ffff')
    lampada(1.5,2.76,1.38,1.35)
    caixa(2.3, 2.3, 2.75, 2.75, 0.12, 0.45, '#facc15', bevel=0.02)              # crate


def painel():
    caixa(0.3,0.22,1.7,0.78,0,0.10,'#8f8571',bevel=0.04,linha=0.012)
    for x in (0.55,1.45):
        haste((x,0.5,0.1),(x,0.5,1.13),0.035,'#94a3b8',linha=0.007)
        haste((x,0.25,0.1),(x,0.5,0.65),0.025,'#64748b',linha=0.005)
    def panel_piece(x,z,w,h,cor,thick=0.035):
        bpy.ops.mesh.primitive_cube_add(size=1)
        o=bpy.context.active_object
        angle=math.radians(-18)
        o.scale=(w,thick,h)
        o.location=(x,-0.54-math.sin(angle)*z,1.15+math.cos(angle)*z)
        o.rotation_euler=(angle,0,0)
        _fim(o,cor,0.008,0.005)
    panel_piece(1,0,1.96,0.96,'#cbd5e1',0.075)
    panel_piece(1,0,1.84,0.84,'#172554',0.09)
    for col in range(6):
        for row in range(3):
            panel_piece(0.25+col*0.30,-0.27+row*0.27,0.27,0.23,'#2563a0',0.105)


def plataforma():
    w, h = TIPOS['plataforma']
    caixa(0.1, 0.1, 2.9, 2.9, 0.0, 0.2, '#64748b', bevel=0.03)
    cilindro(1.5, 1.5, 1.05, 0.2, 0.23, '#facc15', v=32, linha=0.015)
    cilindro(1.5, 1.5, 0.92, 0.2, 0.25, '#475569', v=32, linha=0.015)
    for x in (0.22,2.62):
        for y in (0.22,2.62):
            caixa(x,y,x+0.16,y+0.16,0.20,0.30,'#475569',linha=0.008)
            visor(x+0.025,y+0.025,x+0.135,y+0.135,0.30,0.32,'#ffe6a0')
    for x in (0.7,1.1,1.5,1.9,2.3):
        caixa(x,2.82,x+0.2,2.91,0.20,0.22,'#fbbf24',linha=0.003)
    caixa(0.15, 0.15, 0.55, 0.55, 0.2, 2.6, '#94a3b8', bevel=0.02)             # service tower
    for z in (0.8, 1.4, 2.0):
        caixa(0.55, 0.3, 1.1, 0.4, z, z + 0.08, '#94a3b8', bevel=0.005, linha=0.015)


def foguete(etapa):
    # etapa 0..4: 0 = base ring only, 4 = finished with nose and red band.
    plataforma()
    alt = [0.35, 1.0, 1.7, 2.4, 2.9][etapa]
    cilindro(1.5, 1.5, 0.42, 0.25, 0.25 + alt, '#f8fafc', bevel=0.02)
    if etapa >= 2: cilindro(1.5, 1.5, 0.425, 0.25 + alt * 0.55, 0.25 + alt * 0.62, '#ef4444')
    for a in (45, 135, 225, 315):                                              # fins
        r = math.radians(a)
        caixa(1.5 + math.cos(r) * 0.42 - 0.07, 1.5 + math.sin(r) * 0.42 - 0.07, 1.5 + math.cos(r) * 0.42 + 0.07, 1.5 + math.sin(r) * 0.42 + 0.07, 0.25, 0.75, '#ef4444', bevel=0.01, linha=0.015)
    if etapa == 4:
        bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=0.42, depth=0.8)
        o = bpy.context.active_object; o.location = (1.5, -1.5, 0.25 + alt + 0.4)
        bpy.ops.object.shade_smooth(); _fim(o, '#ef4444', 0, 0.03)
    else:                                                                      # scaffold
        for z in [0.25 + i * 0.45 for i in range(int(alt / 0.45) + 2)]:
            caixa(0.95, 0.95, 2.05, 2.05, z, z + 0.04, '#94a3b8', bevel=0, linha=0.01)


def antena():
    # Dish antenna to talk to Earth, on a tripod. At the pole Earth sits near the horizon, so the
    # dish looks almost sideways.
    caixa(0.3, 0.3, 1.7, 1.7, 0.0, 0.12, '#57534e', bevel=0.02)
    topo = (1.0, 1.0, 1.05)
    for a in (90, 210, 330):
        r = math.radians(a)
        haste((1 + math.cos(r) * 0.6, 1 + math.sin(r) * 0.6, 0.12), topo, 0.04, '#94a3b8')
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=1)
    o = bpy.context.active_object
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z > -0.45], context='VERTS')
    bm.to_mesh(o.data); bm.free()
    o.scale = (0.8, 0.8, 0.8); o.location = (1.0, -1.0, 1.45)
    o.rotation_euler = (math.radians(-55), 0, math.radians(35))       # bowl opens up and toward the viewer
    bpy.ops.object.shade_smooth(); _fim(o, '#f1f5f9', 0, 0.025)
    haste(topo, (1.0, 1.0, 1.75), 0.04, '#64748b')
    esfera(1.0, 1.0, 1.78, 0.08, 0.08, 0.08, '#ef4444', linha=0.012)


def estufa():
    # Greenhouse: a glass half-tube over rows of green plants.
    w, h = TIPOS['estufa']; piso(w, h)
    for y in (0.55, 1.0, 1.45):
        caixa(0.35, y - 0.12, 2.65, y + 0.12, 0.12, 0.3, '#78350f', bevel=0.01, linha=0.012)
        for x in (0.6, 1.1, 1.6, 2.1, 2.5):
            esfera(x, y, 0.38, 0.13, 0.13, 0.12, '#22c55e', linha=0.012)
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.95, depth=2.8)
    o = bpy.context.active_object
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.x < -1e-4], context='VERTS')
    bm.to_mesh(o.data); bm.free()
    o.rotation_euler = (0, math.radians(-90), 0); o.location = (1.5, -1.0, 0.12)
    o.rotation_euler = (math.radians(90), math.radians(-90), math.radians(90))
    bpy.ops.object.shade_smooth()
    m = toon('#bae6fd'); m2 = m.copy(); m2.name = 'vidro'
    m2.surface_render_method = 'BLENDED'
    nt = m2.node_tree; N = nt.nodes
    tr = N.new('ShaderNodeBsdfTransparent'); mx = N.new('ShaderNodeMixShader'); mx.inputs['Fac'].default_value = 0.55
    out = [n for n in N if n.type == 'OUTPUT_MATERIAL'][0]; em = [n for n in N if n.type == 'EMISSION'][0]
    nt.links.new(em.outputs[0], mx.inputs[1]); nt.links.new(tr.outputs[0], mx.inputs[2]); nt.links.new(mx.outputs[0], out.inputs['Surface'])
    if o.users_collection and sc.collection not in o.users_collection:
        for c in o.users_collection: c.objects.unlink(o)
        sc.collection.objects.link(o)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(m2); o.data.materials.append(contorno)
    sl = o.modifiers.new('contorno', 'SOLIDIFY'); sl.thickness = 0.02; sl.offset = 1; sl.use_flip_normals = True; sl.material_offset = 1; sl.use_rim = False
    grupo.append(o)
    for x in (0.4, 1.5, 2.6):                                                 # ribs: arches over the tube
        for k in range(12):
            a0, a1 = math.pi * k / 12, math.pi * (k + 1) / 12
            haste((x, 1.0 - 0.95 * math.cos(a0), 0.12 + 0.95 * math.sin(a0)),
                  (x, 1.0 - 0.95 * math.cos(a1), 0.12 + 0.95 * math.sin(a1)), 0.03, '#e2e8f0', linha=0.008)


    for x in (0.45,2.55):
        visor(x,0.64,x+0.06,1.36,0.58,0.63,'#fff0bd')


def perfuratriz():
    # Ice drill: a derrick over a bore hole, with a tank for the water it melts.
    caixa(0.1, 0.1, 1.9, 1.9, 0.0, 0.15, '#57534e', bevel=0.02)
    for (x, y) in ((0.35, 0.35), (1.65, 0.35), (0.35, 1.65), (1.65, 1.65)):
        haste((x, y, 0.15), (1.0 + (x - 1.0) * 0.2, 1.0 + (y - 1.0) * 0.2, 1.9), 0.05, '#f59e0b')
    haste((0.35, 1.65, 0.6), (1.65, 1.65, 1.2), 0.03, '#f59e0b')                   # cross braces
    haste((1.65, 0.35, 0.6), (1.65, 1.65, 1.2), 0.03, '#f59e0b')
    cilindro(1.0, 1.0, 0.06, 0.0, 1.95, '#475569', v=12, linha=0.012)        # drill string
    caixa(0.8, 0.8, 1.2, 1.2, 1.85, 2.05, '#f59e0b', bevel=0.01, linha=0.015)
    cilindro(1.0, 1.0, 0.22, 0.15, 0.3, '#1c1917', v=16, linha=0.012)        # hole
    cilindro(1.55, 0.45, 0.25, 0.15, 0.85, '#38bdf8', v=16, bevel=0.02)
    lampada(1,1.45,1.55,0.42,'#e0f3ff')       # water tank


def rover():
    # Lunar Terrain Vehicle style: open frame, two seats, four big wheels, antenna.
    caixa(0.15, 0.2, 1.85, 0.8, 0.28, 0.42, '#cbd5e1', bevel=0.03)
    for x in (0.55, 1.15):
        caixa(x, 0.3, x + 0.35, 0.7, 0.42, 0.62, '#334155', bevel=0.03, linha=0.015)
    caixa(1.55, 0.3, 1.85, 0.7, 0.42, 0.55, '#f59e0b', bevel=0.02, linha=0.015)
    for (x, y) in ((0.35, 0.12), (1.65, 0.12), (0.35, 0.88), (1.65, 0.88)):
        bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.2, depth=0.14)
        o = bpy.context.active_object; o.location = (x, -y, 0.2); o.rotation_euler = (math.radians(90), 0, 0)
        bpy.ops.object.shade_smooth(); _fim(o, '#1f2937', 0, 0.015)
    cilindro(0.25, 0.5, 0.025, 0.42, 1.1, '#94a3b8', v=8, linha=0.008)
    esfera(0.25, 0.5, 1.12, 0.12, 0.12, 0.04, '#e2e8f0', linha=0.01)
    for y in (0.3,0.62):
        visor(1.84,y,1.87,y+0.08,0.43,0.52,'#ffedbc')


def pouso():
    # Cargo lander: gold-foil body, four legs, engine bell, the crate on top.
    cilindro(1.0, 1.0, 0.62, 0.55, 1.25, '#d4a017', v=8, bevel=0.02)
    caixa(0.65, 0.65, 1.35, 1.35, 1.25, 1.75, '#a16207', bevel=0.02)
    caixa(0.65, 0.98, 1.35, 1.02, 1.25, 1.75, '#713f12', bevel=0, linha=0.008)
    bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=0.3, radius2=0.14, depth=0.35)
    o = bpy.context.active_object; o.location = (1.0, -1.0, 0.38); bpy.ops.object.shade_smooth(); _fim(o, '#475569', 0, 0.015)
    for (x, y) in ((0.15, 0.15), (1.85, 0.15), (0.15, 1.85), (1.85, 1.85)):
        haste((1.0 + (x - 1.0) * 0.45, 1.0 + (y - 1.0) * 0.45, 0.9), (x, y, 0.05), 0.045, '#94a3b8')
        cilindro(x, y, 0.13, 0.0, 0.06, '#64748b', v=12, linha=0.01)


def chama():
    # Rocket exhaust: a bright cone, drawn under the lander and flickered by the game.
    bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=0.05, radius2=0.28, depth=1.2)
    o = bpy.context.active_object; o.location = (1.0, -1.0, -0.4)
    m = bpy.data.materials.new('chama'); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links; N.clear()
    em = N.new('ShaderNodeEmission'); em.inputs['Color'].default_value = rgb('#fde68a'); em.inputs['Strength'].default_value = 1.0
    out = N.new('ShaderNodeOutputMaterial'); L.new(em.outputs[0], out.inputs['Surface'])
    o.data.materials.append(m)
    if o.users_collection and sc.collection not in o.users_collection:
        for c in o.users_collection: c.objects.unlink(o)
        sc.collection.objects.link(o)
    grupo.append(o)
    bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=0.02, radius2=0.14, depth=0.7)
    o = bpy.context.active_object; o.location = (1.0, -1.0, -0.2)
    m2 = m.copy(); m2.node_tree.nodes['Emission'].inputs['Color'].default_value = rgb('#ffffff'); o.data.materials.append(m2)
    if o.users_collection and sc.collection not in o.users_collection:
        for c in o.users_collection: c.objects.unlink(o)
        sc.collection.objects.link(o)
    grupo.append(o)


MODELOS = {'habitat': habitat, 'suporte': suporte, 'blindagem': blindagem, 'oficina': oficina,
           'painel': painel, 'plataforma': plataforma,
           'antena': antena, 'estufa': estufa, 'perfuratriz': perfuratriz, 'rover': rover,
           'pouso': pouso, 'chama': chama}
for i in range(5): MODELOS[f'foguete{i}'] = (lambda i=i: foguete(i))

def animado(fn,frame):
    def build():
        global FASE
        FASE=frame
        fn()
        FASE=0
    return build

for nome,count in ANIMADOS.items():
    for frame in range(1,count): MODELOS[f'{nome}_anim{frame}']=animado(MODELOS[nome],frame)

# ---------- camera: render_terrain.py's 2:1 isometric camera ----------
elev = math.radians(30)
to_cam = Vector((math.cos(elev) * math.sqrt(0.5), -math.cos(elev) * math.sqrt(0.5), math.sin(elev)))
q = (-to_cam).to_track_quat('-Z', 'Y'); m3 = q.to_matrix(); right, up = m3.col[0], m3.col[1]
s = SUPER * T / math.sqrt(0.5)
cam = bpy.data.cameras.new('ModCam'); cam.type = 'ORTHO'; cam.clip_end = 200
cam_o = bpy.data.objects.new('ModCam', cam); sc.collection.objects.link(cam_o); sc.camera = cam_o
cam_o.rotation_mode = 'QUATERNION'; cam_o.rotation_quaternion = q
sun = bpy.data.lights.new('Sol', 'SUN'); sun.energy = 4.0; sun.use_shadow = False
sun_o = bpy.data.objects.new('Sol', sun); sc.collection.objects.link(sun_o)
to_sun = (to_cam * 0.5 - right * 1.0 + Vector((0, 0, 0.45))).normalized()
sun_o.rotation_euler = (-to_sun).to_track_quat('-Z', 'Y').to_euler()

if LIVE and not globals().get('EXPORTAR_MODULOS',False):
    x = 0
    for nome in ('habitat', 'suporte', 'blindagem', 'oficina', 'painel', 'plataforma', 'foguete4'):
        grupo.clear(); MODELOS[nome]()
        for o in grupo: o.location.x += x
        x += 4
    print('scene "Modulos" ready')
else:
    os.makedirs(OUT, exist_ok=True)
    saida = {}
    for nome, fn in MODELOS.items():
        for o in list(sc.objects):
            if o.type == 'MESH' or (o.type == 'LIGHT' and o.data.type != 'SUN'): bpy.data.objects.remove(o)
        grupo.clear(); fn()
        bpy.context.view_layer.update()
        pts = []
        for o in grupo:
            for c in o.bound_box: pts.append(o.matrix_world @ Vector(c))
        xs = [p.dot(right) for p in pts]; ys = [p.dot(up) for p in pts]
        x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
        W = math.ceil((x1 - x0) * s) + 2 * PAD; H = math.ceil((y1 - y0) * s) + 2 * PAD
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        cam.ortho_scale = max(W, H) / s
        cam_o.location = right * cx + up * cy + to_cam * 50
        sc.render.resolution_x, sc.render.resolution_y = W, H
        png = os.path.join(OUT, f'{nome}.png')
        sc.render.filepath = png
        bpy.ops.render.render(write_still=True)
        subprocess.run(['magick', png, '-dither', 'None', '-colors', '255', 'PNG8:' + png], check=True)
        o0 = Vector((0, 0, 0))
        saida[nome] = {'arquivo': f'lua/modulos/{nome}.png', 'w': W, 'h': H, 'escala': 1 / SUPER,
                       'ancora': [round((o0.dot(right) - cx) * s + W / 2, 2), round(H / 2 - (o0.dot(up) - cy) * s, 2)]}
        print('module', nome, W, H)
    with open(JSON, 'w') as f:
        json.dump(saida, f, indent=1)
    print('DONE')
