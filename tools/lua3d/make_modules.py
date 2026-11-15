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
import bpy, bmesh, os, json, math, shutil, subprocess, sys
from mathutils import Vector, Euler

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0,HERE)
from estilo_lua import PALETA
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'public', 'lua', 'modulos')
JSON = os.path.join(ROOT, 'src', 'dados', 'modulos.json')
LIVE = not bpy.app.background
T = 30; SUPER = 2; PAD = 18
FASE = 0
ANIMADOS = {'suporte': 3, 'oficina': 3}
LIGHT = PALETA['luzSolo']
OUTLINE = '#17130f'
# ESTILO=estacao (default): the look of the solar station (tools/lua3d/make_solar_station.py, export_solar_station.py):
# soft clay shading (Principled BSDF, AgX), a soft area light with real shadows, blue ambient, round bevels,
# no black outline, and decks on an orange plinth. ESTILO=toon renders the old flat toon look with outlines.
# ESTILO=cartoon is the exported solar station's own toon look (the approved panel/battery sprites):
# the station's geometry and palette with a toon light ramp and the dark inverted-hull outline,
# drawn with the same recipe as export_solar_station.py's cartoon().
ESTILO = os.environ.get('ESTILO', 'estacao')
NOVO = ESTILO != 'toon'
CARTOON = ESTILO == 'cartoon'
# Footprints in tiles, as in src/engine/construcao.ts.
TIPOS = {
    'habitat': (3, 3), 'suporte': (3, 2), 'blindagem': (2, 2),
    'oficina': (3, 3), 'painel': (2, 1), 'plataforma': (3, 3),
    'antena': (2, 2), 'estufa': (3, 2), 'perfuratriz': (2, 2), 'rover': (2, 1),
    'usina': (3, 2), 'reciclador': (2, 2), 'eclusa': (2, 1), 'bateria': (2, 2),
    'impressora': (3, 2), 'radiotelescopio': (3, 3),
    'deco_rover_velho': (2, 1), 'deco_modulo_descida': (2, 2), 'deco_sonda': (1, 1), 'deco_caixas': (1, 1),
    'deco_sismografo': (1, 1), 'deco_refletor': (1, 1), 'deco_baliza': (1, 1), 'deco_barris': (1, 1),
    'deco_bandeira': (1, 1), 'deco_pedras': (1, 1), 'deco_camera': (1, 1), 'deco_amostras': (1, 1), 'deco_lanterna': (1, 1), 'deco_ferramentas': (1, 1), 'deco_carretel': (1, 1), 'deco_mochila': (1, 1),
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
sc.view_settings.view_transform = 'AgX' if (NOVO and not CARTOON) else 'Standard'; sc.view_settings.look = 'None'; sc.render.filter_size = 1.0
if NOVO:
    # Same blue night ambient as the solar station scene.
    mundo = bpy.data.worlds.new('Modulos | ambiente azul'); mundo.use_nodes = True
    fundo = mundo.node_tree.nodes['Background']
    fundo.inputs[0].default_value = (0.16, 0.21, 0.32, 1); fundo.inputs[1].default_value = 0.5
    sc.world = mundo

_mats = {}
def viva(cor, k=1.7):
    """Cartoon: push the pastel palette out to the vivid flat colors of the battery/panel sprites."""
    r, g, b = rgb(cor)[:3]
    l = 0.2126 * r + 0.7152 * g + 0.0722 * b
    return (*[min(1.0, l + (c - l) * k) for c in (r, g, b)], 1.0)

def toon(cor):
    if cor in _mats: return _mats[cor]
    if NOVO and not CARTOON:
        # Clay look of the solar station: soft Principled surface, a hint of metal.
        m = bpy.data.materials.new('mod' + cor); m.use_nodes = True
        bs = m.node_tree.nodes.get('Principled BSDF')
        bs.inputs['Base Color'].default_value = rgb(cor); bs.inputs['Roughness'].default_value = 0.5
        bs.inputs['Metallic'].default_value = 0.12
        _mats[cor] = m
        return m
    m = bpy.data.materials.new('mod' + cor); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links; N.clear()
    dif = N.new('ShaderNodeBsdfDiffuse'); s2r = N.new('ShaderNodeShaderToRGB'); L.new(dif.outputs['BSDF'], s2r.inputs['Shader'])
    r = N.new('ShaderNodeValToRGB'); cr = r.color_ramp; cr.interpolation = 'CONSTANT'
    while len(cr.elements) < len(LIGHT): cr.elements.new(0.99)
    for e, (p, c) in zip(cr.elements, LIGHT): e.position = p; e.color = rgb(c)
    L.new(s2r.outputs['Color'], r.inputs['Fac'])
    mix = N.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'
    mix.inputs['Factor'].default_value = 1; mix.inputs[6].default_value = viva(cor) if CARTOON else rgb(cor); L.new(r.outputs['Color'], mix.inputs[7])
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
    if NOVO and bevel:
        bevel = max(bevel, 0.025) * 1.4      # rounder edges catch the light like the station's parts
    if bevel:
        b = o.modifiers.new('bevel', 'BEVEL'); b.width = bevel; b.segments = 4 if NOVO else 3; b.limit_method = 'ANGLE'
    if NOVO:
        for p in o.data.polygons: p.use_smooth = True
        o.data.shade_smooth() if hasattr(o.data, 'shade_smooth') else None
        mod = o.modifiers.new('suave', 'WEIGHTED_NORMAL') if hasattr(bpy.types, 'WeightedNormalModifier') else None
        if mod: mod.keep_sharp = True
    o.data.materials.append(toon(cor))
    if NOVO and not CARTOON:
        grupo.append(o)
        return o
    if CARTOON:
        # The exported station's adaptive line (export_solar_station.py cartoon()): thin parts
        # (cells, cables, decals) get a thinner hull so the detail grid does not turn black.
        menor = min(o.dimensions)
        if menor < 0.005:                    # flat decals: a hull would cover them
            grupo.append(o)
            return o
        linha = min(0.05, 0.3 * menor)       # stronger line than the station export: reads at game scale
    o.data.materials.append(contorno)
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


def piso(w, h, cor=PALETA['fundacao'][2], z=0.12):
    if NOVO:
        # The solar station's base: a rounded orange plinth under a light deck.
        caixa(0.02, 0.02, w - 0.02, h - 0.02, 0, z * 0.55, '#e8894a', bevel=0.05)
        caixa(0.1, 0.1, w - 0.1, h - 0.1, z * 0.4, z, '#d9dee6', bevel=0.04)
        return
    caixa(0.04, 0.04, w - 0.04, h - 0.04, 0, z, cor, bevel=0.045, linha=0.018)
    deck=grupo[-1]
    mat=bpy.data.materials.get('Regolith landing deck')
    if mat is None:
        mat=bpy.data.materials.new('Regolith landing deck');mat.use_nodes=True
        bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=rgb(PALETA['fundacao'][2]);bs.inputs['Roughness'].default_value=0.85
    deck.data.materials[0]=mat
    # A warm regolith skirt meets the runtime terrain-following foundation.
    caixa(0.13, h-0.15, w-0.13, h-0.06, z*0.4, z, PALETA['solo'][2][1], bevel=0.015, linha=0.006)


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
    # The crew's home: a wide smooth cream dome on a cylindrical base wall with an orange trim
    # ring, a glazed skylight over the sleeping deck (a warm night lamp shows through), a big
    # double-glazed bubble window with a small companion, a boxy airlock with an orange lintel,
    # two roof vents and a beacon antenna.
    w, h = TIPOS['habitat']; piso(w, h)
    cilindro(1.5, 1.5, 1.32, 0.12, 0.66, '#eef2f7', v=32, linha=0.028)           # base wall
    cilindro(1.5, 1.5, 1.37, 0.52, 0.66, '#f97316', v=32, linha=0.02)            # orange trim ring
    esfera(1.5, 1.5, 0.62, 1.30, 1.30, 1.02, '#f8fafc', metade=True, linha=0.03)  # the dome
    cilindro(1.5, 1.5, 0.56, 1.5, 1.66, '#f97316', v=32, linha=0.018)             # skylight collar
    vidro_metade(1.5, 1.5, 1.62, 0.52, 0.52, 0.4, 'vidro claraboia')              # the glass top:
    for angle in range(0, 360, 90):                                              # four slim ribs
        az = math.radians(angle + 45)
        for segment in range(4):
            def pt(k):
                phi = math.pi * 0.5 * k / 4
                return (1.5 + 0.54 * math.cos(phi) * math.cos(az), 1.5 + 0.54 * math.cos(phi) * math.sin(az), 1.64 + 0.42 * math.sin(phi))
            haste(pt(segment), pt(segment + 1), 0.016, '#f97316', linha=0.005)
    esfera(1.5, 1.5, 2.06, 0.07, 0.07, 0.07, '#f97316', linha=0.008)               # hub cap
    haste((1.5, 1.5, 1.58), (1.5, 1.5, 1.74), 0.012, '#94a3b8', linha=0.006)       # a night lamp inside
    emissivo(esfera(1.5, 1.5, 1.78, 0.1, 0.1, 0.1, '#ffe2a6', linha=0.008), '#ffe2a6', 2.0)
    def domo(t, a):                                                              # a point on the shell
        return (1.5 + 1.30 * math.cos(t) * math.cos(a), 1.5 + 1.30 * math.cos(t) * math.sin(a),
                0.62 + 1.02 * math.sin(t))
    def olho(t, a, rim, vidro):                                                  # rim + glass porthole
        px, py, pz = domo(t, a)
        dx, dy, dz = math.cos(t) * math.cos(a), math.cos(t) * math.sin(a), math.sin(t)
        esfera(px, py, pz, rim, rim, rim, '#1e293b', linha=0.022)
        emissivo(esfera(px + 0.45 * rim * dx, py + 0.45 * rim * dy, pz + 0.45 * rim * dz,
                        0.72 * rim, 0.72 * rim, 0.72 * rim, vidro, linha=0.012), vidro, 1.5)
        esfera(px + 0.9 * rim * dx, py + 0.9 * rim * dy, pz + 0.9 * rim * dz + 0.1 * rim,
               0.2 * rim, 0.2 * rim, 0.2 * rim, '#ffffff', linha=0.004)          # the shine
    olho(math.radians(22), math.radians(38), 0.30, '#7dd3fc')                    # the bubble window
    olho(math.radians(14), math.radians(118), 0.15, '#7dd3fc')                   # small companion
    caixa(1.18, 2.2, 1.82, 2.95, 0.12, 0.84, '#eef2f7', bevel=0.03)              # airlock tower, centered
    caixa(1.3, 2.93, 1.7, 3.0, 0.18, 0.7, '#1e293b', bevel=0.01, linha=0.014)    # dark door
    caixa(1.24, 2.93, 1.76, 3.0, 0.7, 0.8, '#f97316', bevel=0.012, linha=0.01)   # orange lintel
    visor(1.41, 3.0, 1.59, 3.02, 0.5, 0.62, '#8ae8ff')                           # cyan status strip
    for (vx, vy) in ((0.95, 1.85), (2.1, 1.1)):                                  # two roof vents
        rv = math.hypot(vx - 1.5, vy - 1.5)
        zv = 0.62 + 1.02 * math.sqrt(1 - (rv / 1.30) ** 2)
        cilindro(vx, vy, 0.09, zv - 0.02, zv + 0.13, '#94a3b8', v=12, linha=0.012)
        cilindro(vx, vy, 0.10, zv + 0.13, zv + 0.17, '#334155', v=12, linha=0.01)
    ax, ay = 2.35, 0.95                                                          # beacon antenna
    ra = math.hypot(ax - 1.5, ay - 1.5)
    za = 0.62 + 1.02 * math.sqrt(1 - (ra / 1.30) ** 2)
    haste((ax, ay, za - 0.05), (ax, ay, za + 0.72), 0.026, '#94a3b8', linha=0.008)
    haste((ax - 0.08, ay, za + 0.62), (ax + 0.08, ay, za + 0.62), 0.014, '#f97316', linha=0.006)
    esfera(ax, ay, za + 0.75, 0.07, 0.07, 0.07, '#ef4444', linha=0.01)


def vidro_metade(x, y, z, rx, ry, rz, nome='vidro'):
    """A glassy upper half-sphere (the greenhouse's toon glass), for skylights and atriums."""
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=1)
    o = bpy.context.active_object
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -1e-4], context='VERTS')
    bm.to_mesh(o.data); bm.free()
    o.scale = (rx, ry, rz); o.location = (x, -y, z)
    bpy.ops.object.shade_smooth()
    m = toon('#bae6fd'); m2 = m.copy(); m2.name = nome
    m2.surface_render_method = 'BLENDED'
    nt = m2.node_tree; N = nt.nodes
    tr = N.new('ShaderNodeBsdfTransparent'); mx = N.new('ShaderNodeMixShader'); mx.inputs['Fac'].default_value = 0.5
    out = [n for n in N if n.type == 'OUTPUT_MATERIAL'][0]
    em = [n for n in N if n.type in ('EMISSION', 'BSDF_PRINCIPLED')][0]
    nt.links.new(em.outputs[0], mx.inputs[1]); nt.links.new(tr.outputs[0], mx.inputs[2]); nt.links.new(mx.outputs[0], out.inputs['Surface'])
    if o.users_collection and sc.collection not in o.users_collection:
        for c in o.users_collection: c.objects.unlink(o)
        sc.collection.objects.link(o)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(m2)
    if not NOVO or CARTOON:
        o.data.materials.append(contorno)
        sl = o.modifiers.new('contorno', 'SOLIDIFY')
        sl.thickness = min(0.05, 0.3 * min(o.dimensions)) if CARTOON else 0.02
        sl.offset = 1; sl.use_flip_normals = True; sl.material_offset = 1; sl.use_rim = False
    grupo.append(o)
    return o


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


def bloco(cx, cy, cz, sx, sy, sz, cor, rot=0.0, bevel=0.012, linha=0.01):
    """A box centered on map point (cx, cy, cz), turned `rot` radians around Z (map angle)."""
    bpy.ops.mesh.primitive_cube_add(size=1)
    o = bpy.context.active_object
    o.scale = (sx, sy, sz); o.location = (cx, -cy, cz); o.rotation_euler = (0, 0, -rot)
    return _fim(o, cor, bevel, linha)


def placa(pontos, y, espessura, cor, linha=0.006):
    """A flat shape facing the camera's +gy side: pontos are (gx, z) in a plane at map gy = y."""
    n = len(pontos)
    verts = [(px, -y, pz) for px, pz in pontos] + [(px, -(y + espessura), pz) for px, pz in pontos]
    faces = [list(range(n))[::-1], list(range(n, 2 * n))] + [[k, (k + 1) % n, n + (k + 1) % n, n + k] for k in range(n)]
    me = bpy.data.meshes.new('placa'); me.from_pydata(verts, [], faces); me.update()
    o = bpy.data.objects.new('placa', me); sc.collection.objects.link(o)
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    return _fim(o, cor, 0, linha)


def raio(x, y, z, alt, cor='#fde047'):
    """A lightning bolt (the battery sign) standing on map plane gy = y, centered on (x, z)."""
    a = alt
    pts = [(0.10, 0.50), (-0.22, -0.02), (0.0, -0.02), (-0.12, -0.50), (0.22, 0.06), (0.0, 0.06)]
    return placa([(x + px * a, z + pz * a) for px, pz in pts], y, 0.012, cor, linha=0.004)


def entrada_blindada(y1=2.0, y0=1.42):
    """Armored yellow entrance facing the viewer (+gy), from y0 back to its door at y1."""
    caixa(0.62, y0, 1.38, y1, 0.12, 0.74, '#facc15', bevel=0.04, linha=0.03)
    caixa(0.56, y0, 1.44, y1 + 0.04, 0.70, 0.80, '#eab308', bevel=0.02, linha=0.02)            # roof lip
    caixa(0.72, y1 - 0.02, 1.28, y1 + 0.03, 0.13, 0.62, '#334155', bevel=0.012, linha=0.012)   # door frame
    caixa(0.77, y1 + 0.02, 0.995, y1 + 0.05, 0.15, 0.58, '#475569', bevel=0.008, linha=0.006)  # two door leaves
    caixa(1.005, y1 + 0.02, 1.23, y1 + 0.05, 0.15, 0.58, '#475569', bevel=0.008, linha=0.006)
    for x in (0.885, 1.115):                                                                   # portholes
        bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.06, depth=0.03)
        o = bpy.context.active_object; o.location = (x, -(y1 + 0.055), 0.44); o.rotation_euler = (math.radians(90), 0, 0)
        bpy.ops.object.shade_smooth(); emissivo(_fim(o, '#7dd3fc', 0, 0.008), '#bae6fd', 1.2)
    for k in range(8):                                                                         # zebra band above the door
        x = 0.74 + k * 0.065
        caixa(x, y1 + 0.03, x + 0.065, y1 + 0.045, 0.635, 0.68, '#1c1917' if k % 2 else '#facc15', bevel=0, linha=0.003)
    visor(1.30, y1, 1.36, y1 + 0.02, 0.48, 0.54, '#86efac')                                    # "open" light
    for x in (0.60, 1.40):                                                                     # amber corner beacons
        cilindro(x, y1, 0.045, 0.80, 0.86, '#334155', v=12, linha=0.006)
        emissivo(esfera(x, y1, 0.89, 0.045, 0.045, 0.05, '#fbbf24', linha=0.006), '#fbbf24', 2.0)


def placa_radiacao(x, z, y, r=0.2):
    """Yellow round sign with the radiation trefoil, facing the viewer, centered on (x, z) at gy = y."""
    circulo = lambda rr, n: [(x + rr * math.cos(t), z + rr * math.sin(t)) for t in [math.tau * i / n for i in range(n)]]
    placa(circulo(r, 32), y, 0.03, '#fde047', linha=0.01)
    for k in range(3):
        a0 = math.radians(90 + k * 120) - math.radians(30)
        arco = [a0 + math.radians(60) * i / 10 for i in range(11)]
        lamina = [(x + r * 0.275 * math.cos(t), z + r * 0.275 * math.sin(t)) for t in arco] + \
                 [(x + r * 0.775 * math.cos(t), z + r * 0.775 * math.sin(t)) for t in reversed(arco)]
        placa(lamina, y + 0.03, 0.01, '#1c1917', linha=0.002)
    placa(circulo(r * 0.16, 16), y + 0.03, 0.01, '#1c1917', linha=0.002)


def parabolica(px, py, z0, alt, eixo, R=0.24, fundo=0.085):
    """A dish antenna on a post at map point (px, py), standing on z0 with its pivot `alt` above.
    eixo: world direction the dish faces. The bowl is a true paraboloid with real thickness, a rim,
    three struts and the receiver at the focus."""
    eixo = eixo.normalized()
    rot = eixo.to_track_quat('Z', 'Y')
    pivo = Vector((px, -py, z0 + alt))
    base = pivo - eixo * 0.07                       # the dish's back sits a little behind the pivot
    # Post and fork.
    haste((px, py, z0), (px, py, z0 + alt), 0.028, '#94a3b8', linha=0.006)
    cilindro(px, py, 0.06, z0, z0 + 0.05, '#64748b', v=16, linha=0.008)
    haste((px, py, z0 + alt), (base.x, -base.y, base.z), 0.03, '#64748b', linha=0.006)
    # Bowl: rings of a paraboloid z = fundo * (r / R)^2 around its local Z axis.
    aneis, lados = 9, 32
    verts = [(0, 0, 0)]
    for i in range(1, aneis + 1):
        r = R * i / aneis
        for k in range(lados):
            t = math.tau * k / lados
            verts.append((r * math.cos(t), r * math.sin(t), fundo * (r / R) ** 2))
    faces = [(0, 1 + (k + 1) % lados, 1 + k) for k in range(lados)]
    for i in range(aneis - 1):
        a, b = 1 + i * lados, 1 + (i + 1) * lados
        faces += [(a + k, a + (k + 1) % lados, b + (k + 1) % lados, b + k) for k in range(lados)]
    me = bpy.data.meshes.new('parabolica'); me.from_pydata(verts, [], faces); me.update()
    o = bpy.data.objects.new('parabolica', me); sc.collection.objects.link(o)
    o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = rot; o.location = base
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    for p in me.polygons: p.use_smooth = True
    esp = o.modifiers.new('espessura', 'SOLIDIFY'); esp.thickness = 0.018; esp.offset = -1
    _fim(o, '#f1f5f9', 0, 0.012)
    # Rim.
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=0.014, major_segments=40, minor_segments=8)
    o = bpy.context.active_object
    o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = rot; o.location = base + eixo * fundo
    bpy.ops.object.shade_smooth(); _fim(o, '#94a3b8', 0, 0.006)
    # Receiver at the focus, held by three struts from the rim.
    foco = base + eixo * (R * R / (4 * fundo))
    para_mapa = lambda v: (v.x, -v.y, v.z)
    for k in range(3):
        t = math.tau * k / 3 + 0.5
        borda = base + rot @ Vector((R * math.cos(t), R * math.sin(t), fundo))
        haste(para_mapa(borda), para_mapa(foco), 0.008, '#64748b', linha=0.003)
    esfera(foco.x, -foco.y, foco.z, 0.035, 0.035, 0.035, '#334155', linha=0.006)


AGUA = 3   # how full the water walls are: 0..3, the batteries given to the shield today


def blindagem():
    # Storm shelter tower. Its walls are water tanks: water stops the radiation of a solar storm (a
    # real NASA idea, "water walls"; on the ISS crews have stacked water packs around their beds).
    # The water is kept below and pumped up into the walls before a storm: that is what the
    # batteries power. The more batteries, the fuller the walls (AGUA), the better the crew is
    # protected. On top, an antenna gets the storm warnings from Earth and a sensor measures the
    # radiation: neither makes a shield, they tell the crew when to hide.
    w, h = TIPOS['blindagem']; piso(w, h)
    cx, cy = 1.0, 0.92
    alto = 1.22                      # top of the tanks
    porta = math.radians(90)

    cilindro(cx, cy, 0.58, 0.12, alto + 0.02, '#64748b', v=24, bevel=0.02)          # steel core
    # Water-tank wall. Each tank has a level window on its outer side showing the water inside.
    z0, z1 = 0.26, alto - 0.16
    nivel = z0 + (z1 - z0) * (0.12 + 0.88 * AGUA / 3)
    n = 14
    for k in range(n):
        a = math.tau * (k + 0.5) / n
        if abs((a - porta + math.pi) % math.tau - math.pi) < math.radians(24): continue
        tx, ty = cx + 0.66 * math.cos(a), cy + 0.66 * math.sin(a)
        cilindro(tx, ty, 0.135, 0.12, alto - 0.06, '#e2e8f0', v=18, bevel=0.012)
        esfera(tx, ty, alto - 0.06, 0.135, 0.135, 0.07, '#e2e8f0', linha=0.014, metade=True)
        cilindro(tx, ty, 0.142, 0.15, 0.2, '#94a3b8', v=18, linha=0.006)
        rx, ry = math.cos(a), math.sin(a)
        r = 0.133
        bloco(tx + rx * r, ty + ry * r, (z0 + z1) / 2, 0.02, 0.15, z1 - z0 + 0.05, '#1e293b', rot=a, bevel=0.01, linha=0.006)
        if nivel > z0 + 0.01:
            agua = bloco(tx + rx * (r + 0.008), ty + ry * (r + 0.008), (z0 + nivel) / 2, 0.012, 0.11, nivel - z0, '#38bdf8', rot=a, bevel=0.005, linha=0.002)
            emissivo(agua, '#38bdf8', 1.0)
            emissivo(bloco(tx + rx * (r + 0.012), ty + ry * (r + 0.012), nivel - 0.012, 0.01, 0.114, 0.026, '#bae6fd', rot=a, bevel=0.002, linha=0.001), '#e0f2fe', 1.2)
    # Feed ring at the foot: one pipe that fills every tank.
    for k in range(28):
        a0, a1 = math.tau * k / 28, math.tau * (k + 1) / 28
        haste((cx + 0.8 * math.cos(a0), cy + 0.8 * math.sin(a0), 0.2), (cx + 0.8 * math.cos(a1), cy + 0.8 * math.sin(a1), 0.2), 0.03, '#0ea5e9', linha=0.006)

    # Top collar with a hazard band, then the deck with windows.
    cilindro(cx, cy, 0.79, alto, alto + 0.09, '#94a3b8', v=32, bevel=0.02)
    for k in range(28):
        a = math.tau * (k + 0.5) / 28
        bloco(cx + 0.795 * math.cos(a), cy + 0.795 * math.sin(a), alto + 0.045, 0.03, 0.178, 0.055,
              '#facc15' if k % 2 else '#1c1917', rot=a, bevel=0.004, linha=0.003)
    cilindro(cx, cy, 0.46, alto + 0.09, alto + 0.33, '#cbd5e1', v=24, bevel=0.02)
    for k in range(5):
        a = math.radians(30 + k * 30)
        bloco(cx + 0.465 * math.cos(a), cy + 0.465 * math.sin(a), alto + 0.21, 0.02, 0.13, 0.08, '#7dd3fc', rot=a, bevel=0.004, linha=0.004)

    # Mast with the radiation sensor and the red light, and beside it the dish that gets the storm
    # warnings from Earth.
    zt = alto + 0.33
    haste((cx - 0.08, cy + 0.06, zt), (cx - 0.08, cy + 0.06, zt + 0.5), 0.028, '#94a3b8', linha=0.006)
    esfera(cx - 0.08, cy + 0.06, zt + 0.3, 0.07, 0.07, 0.07, '#f8fafc', linha=0.01)              # radiation sensor
    emissivo(esfera(cx - 0.08, cy + 0.06, zt + 0.54, 0.045, 0.045, 0.045, '#ef4444', linha=0.008), '#ef4444', 1.1)
    parabolica(cx + 0.2, cy - 0.06, zt, 0.22, Vector((0.95, 0.05, 0.75)))

    # Batteries power the pump that sends the stored water up into the walls.
    for i, bx in enumerate((1.56, 1.74, 1.92)):
        caixa(bx - 0.075, 1.66, bx + 0.075, 1.86, 0.12, 0.62, '#22c55e', bevel=0.03, linha=0.016)
        caixa(bx - 0.08, 1.65, bx + 0.08, 1.87, 0.62, 0.68, '#f8fafc', bevel=0.012, linha=0.01)     # cap
        cilindro(bx, 1.76, 0.03, 0.68, 0.72, '#94a3b8', v=12, linha=0.006)                            # terminal
        raio(bx, 1.86, 0.40, 0.3)
        haste((bx, 1.76, 0.72), (bx, 1.62, 0.84), 0.02, ['#ef4444', '#1e293b', '#ef4444'][i], linha=0.005)
        haste((bx, 1.62, 0.84), (1.72, 1.40, 0.84), 0.02, ['#ef4444', '#1e293b', '#ef4444'][i], linha=0.005)
    caixa(1.47, 1.62, 2.0, 1.66, 0.12, 0.70, '#64748b', bevel=0.01, linha=0.008)                      # rack back
    # Pump: a box with a round motor and a red valve wheel, piped into the feed ring.
    caixa(1.52, 1.22, 1.92, 1.52, 0.12, 0.62, '#3b82f6', bevel=0.03, linha=0.016)
    bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.12, depth=0.22)
    o = bpy.context.active_object; o.location = (1.72, -1.37, 0.74); o.rotation_euler = (0, math.radians(90), 0)
    bpy.ops.object.shade_smooth(); _fim(o, '#94a3b8', 0.01, 0.012)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.08, minor_radius=0.018, major_segments=20, minor_segments=8)
    o = bpy.context.active_object; o.location = (1.94, -1.37, 0.40); o.rotation_euler = (0, math.radians(90), 0)
    bpy.ops.object.shade_smooth(); _fim(o, '#ef4444', 0, 0.006)
    haste((1.92, 1.37, 0.40), (1.95, 1.37, 0.40), 0.015, '#ef4444', linha=0.004)
    haste((1.60, 1.30, 0.26), (cx + 0.8 * math.cos(math.radians(40)), cy + 0.8 * math.sin(math.radians(40)), 0.2), 0.035, '#0ea5e9', linha=0.006)
    visor(1.55, 1.52, 1.64, 1.54, 0.46, 0.52, '#86efac')

    entrada_blindada(y1=1.9, y0=1.36)
    placa_radiacao(1.0, 1.06, 1.74, r=0.17)                      # hung in front of the tanks, over the door
    caixa(0.97, 1.6, 1.03, 1.74, 0.80, 0.9, '#64748b', bevel=0.005, linha=0.005)


def oficina():
    # Same language as the habitat and life support: pale blue-grey body, one saturated accent
    # (the workshop's orange), dark glass and glowing screens. Light colors only: the toon ramp
    # multiplies them, so tan or brown here turned to mud next to the other modules.
    w, h = TIPOS['oficina']; piso(w, h)
    caixa(0.2, 0.2, 2.8, 2.8, 0.12, 0.7, '#cbd5e1')                           # hangar walls
    caixa(0.17, 0.17, 2.83, 2.83, 0.12, 0.26, '#f97316', bevel=0.02, linha=0.02)  # orange skirt
    caixa(0.17, 0.17, 2.83, 2.83, 0.62, 0.72, '#fb923c', bevel=0.02, linha=0.02)  # orange eave
    # half-cylinder hangar roof along gy
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=1.3, depth=2.6)
    o = bpy.context.active_object
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.x < -1e-4], context='VERTS')
    bm.to_mesh(o.data); bm.free()
    o.rotation_euler = (math.radians(90), math.radians(-90), 0); o.location = (1.5, -1.5, 0.7)
    o.scale = (1, 1, 1)
    bpy.ops.object.shade_smooth()
    _fim(o, '#e2e8f0', 0, 0.03)
    # Front gable wall: the vault is open at both ends, so close the +gy end with a half-disc
    # (otherwise the camera looks straight into the hangar above the door).
    # A half-disc prism built by hand: deleting half a cylinder also deletes its end cap faces.
    N = 16; ya, yb = -2.72, -2.80
    pts = [(1.5 + 1.3 * math.cos(math.pi * k / N), y, 0.7 + 1.3 * math.sin(math.pi * k / N))
           for y in (ya, yb) for k in range(N + 1)]
    faces = [list(range(N + 1)), list(range(2 * N + 1, N, -1))]
    faces += [[k, k + 1, N + 2 + k, N + 1 + k] for k in range(N)]
    faces.append([N, 0, N + 1, 2 * N + 1])                                   # flat underside
    me = bpy.data.meshes.new('gable'); me.from_pydata(pts, [], faces); me.update()
    o = bpy.data.objects.new('gable', me); bpy.context.collection.objects.link(o)
    bpy.context.view_layer.objects.active = o
    _fim(o, '#cbd5e1', 0, 0.02)
    # Orange arch ribs: the identity accent, readable at gameplay scale.
    for y in (0.30,1.5,2.72):
        for k in range(16):
            a,b=math.pi*k/16,math.pi*(k+1)/16
            haste((1.5+1.32*math.cos(a),y,0.7+1.32*math.sin(a)),(1.5+1.32*math.cos(b),y,0.7+1.32*math.sin(b)),0.035,'#f97316',linha=0.006)
    # Roof skylight strip, like the habitat's.
    esfera(1.5, 1.5, 2.0, 0.34, 0.5, 0.07, '#38bdf8', linha=0.02)
    # Big door: dark bay, steel slats, orange surround.
    caixa(0.8, 2.78, 2.2, 2.84, 0.12, 1.3, '#1e293b', bevel=0.005, linha=0.015)
    for x in (0.95, 1.3, 1.65, 2.0):
        caixa(x, 2.84, x + 0.05, 2.86, 0.12, 1.3, '#94a3b8', bevel=0, linha=0.005)
    caixa(0.65,2.83,0.78,2.9,0.12,1.38,'#f97316',linha=0.008)
    caixa(2.22,2.83,2.35,2.9,0.12,1.38,'#f97316',linha=0.008)
    caixa(0.65,2.83,2.35,2.9,1.3,1.4,'#f97316',linha=0.008)
    visor(1.12,2.92,1.88,2.96,1.43,1.55,'#7dd3fc')
    for i in range(3):
        visor(0.91+i*0.44,2.87,1.22+i*0.44,2.885,0.36,0.62,'#ffda91')
    visor(1.18+FASE*0.18,2.965,1.34+FASE*0.18,2.975,1.46,1.52,'#e1ffff')
    lampada(1.5,2.76,1.38,1.35)
    # Right wall (the side the camera sees): a window strip with glowing screens.
    caixa(2.8, 0.9, 2.9, 2.1, 0.34, 0.54, '#0f172a', bevel=0.005, linha=0.01)
    for i in range(3):
        visor(2.9, 1.0+i*0.34, 2.915, 1.24+i*0.34, 0.38, 0.50, '#8ae8ff')
    # Beacon mast on the roof ridge, like the shield's sensor mast.
    cilindro(1.5, 0.55, 0.05, 1.95, 2.45, '#94a3b8', v=12, linha=0.012)
    esfera(1.5, 0.55, 2.48, 0.1, 0.1, 0.1, '#ef4444', linha=0.015)
    caixa(2.3, 2.3, 2.75, 2.75, 0.12, 0.45, '#facc15', bevel=0.02)              # crate


def painel():
    caixa(0.3,0.22,1.7,0.78,0,0.10,PALETA['fundacao'][2],bevel=0.04,linha=0.012)
    caixa(0.28,0.2,1.72,0.8,0.0,0.05,'#f97316',bevel=0.02,linha=0.012)
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
    panel_piece(1,0,1.96,0.96,'#fb923c',0.075)
    panel_piece(1,0,1.84,0.84,'#172554',0.09)
    for col in range(6):
        for row in range(3):
            panel_piece(0.25+col*0.30,-0.27+row*0.27,0.27,0.23,'#2563a0',0.105)


def plataforma():
    w, h = TIPOS['plataforma']
    # Pale slate deck with the workshop's orange edge, dark pad, orange ring, cyan corner lamps.
    caixa(0.1, 0.1, 2.9, 2.9, 0.0, 0.1, '#f97316', bevel=0.03, linha=0.02)
    caixa(0.1, 0.1, 2.9, 2.9, 0.1, 0.2, '#cbd5e1', bevel=0.03, linha=0.02)
    cilindro(1.5, 1.5, 1.05, 0.2, 0.23, '#f97316', v=32, linha=0.015)
    cilindro(1.5, 1.5, 0.92, 0.2, 0.25, '#334155', v=32, linha=0.015)
    for x in (0.22, 2.62):
        for y in (0.22, 2.62):
            caixa(x, y, x + 0.16, y + 0.16, 0.20, 0.30, '#94a3b8', linha=0.008)
            visor(x + 0.025, y + 0.025, x + 0.135, y + 0.135, 0.30, 0.32, '#8ae8ff')
    for x in (0.7, 1.1, 1.5, 1.9, 2.3):
        caixa(x, 2.82, x + 0.2, 2.91, 0.20, 0.22, '#fb923c', linha=0.003)
    caixa(0.15, 0.15, 0.55, 0.55, 0.2, 2.6, '#cbd5e1', bevel=0.02)             # service tower
    caixa(0.13, 0.13, 0.57, 0.57, 0.2, 0.4, '#f97316', bevel=0.02, linha=0.02)
    for z in (0.8, 1.4, 2.0):
        caixa(0.55, 0.3, 1.1, 0.4, z, z + 0.08, '#fb923c', bevel=0.005, linha=0.015)
    cilindro(0.35, 0.35, 0.03, 2.6, 2.85, '#94a3b8', v=8, linha=0.01)
    esfera(0.35, 0.35, 2.88, 0.08, 0.08, 0.08, '#ef4444', linha=0.012)


def aleta(angulo, R, cor, grossura=0.08):
    """A chunky swept fin: a flat plate leaving the body at `angulo` (degrees in map space)."""
    r = math.radians(angulo); c, sn = math.cos(r), math.sin(r)
    perfil = [(R - 0.05, 0.25), (R + 0.5, 0.25), (R + 0.5, 0.48), (R - 0.05, 1.0)]   # (outward, height)
    def v(u, z, t): return (1.5 + c * u + sn * t, -(1.5 + sn * u - c * t), z)
    pts = [v(u, z, -grossura) for u, z in perfil] + [v(u, z, grossura) for u, z in perfil]
    faces = [[0, 1, 2, 3], [7, 6, 5, 4]] + [[i, (i + 1) % 4, 4 + (i + 1) % 4, 4 + i] for i in range(4)]
    me = bpy.data.meshes.new('aleta'); me.from_pydata(pts, [], faces); me.update()
    o = bpy.data.objects.new('aleta', me); bpy.context.collection.objects.link(o)
    bpy.context.view_layer.objects.active = o
    _fim(o, cor, 0, 0.03)


def ogiva(z0, R, L, cor, seg=36, aneis=14):
    """A pointed ogive nose cone: base radius R at z0, tip L above (tangent ogive profile)."""
    rho = (R * R + L * L) / (2 * R)
    pts = []; faces = []
    for i in range(aneis):
        x = L * (i / aneis) ** 0.85                       # height above the base
        r = math.sqrt(max(rho * rho - x * x, 0)) + R - rho    # x measured from the tip is L - x
        for j in range(seg):
            a = 2 * math.pi * j / seg
            pts.append((1.5 + r * math.cos(a), -1.5 + r * math.sin(a), z0 + x))
    pts.append((1.5, -1.5, z0 + L))
    for i in range(aneis - 1):
        for j in range(seg):
            faces.append([i * seg + j, i * seg + (j + 1) % seg, (i + 1) * seg + (j + 1) % seg, (i + 1) * seg + j])
    for j in range(seg):
        faces.append([(aneis - 1) * seg + j, (aneis - 1) * seg + (j + 1) % seg, len(pts) - 1])
    faces.append(list(range(seg))[::-1])
    me = bpy.data.meshes.new('ogiva'); me.from_pydata(pts, [], faces); me.update()
    bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    for f in me.polygons: f.use_smooth = True
    o = bpy.data.objects.new('ogiva', me); bpy.context.collection.objects.link(o)
    bpy.context.view_layer.objects.active = o
    return _fim(o, cor, 0, 0.035)


def foguete(etapa, sozinho=False):
    # etapa 0..4: 0 = base only, 4 = finished. Chubby toy rocket: pointed orange nose cone, pale body,
    # orange lower section, huge porthole with a dark rim and bright glass, sky-blue fins.
    # sozinho: the finished rocket alone for the launch film (foguete_voo), base on z=0, no pad.
    antes = len(grupo)
    if not sozinho: plataforma()
    alt = [0.35, 0.8, 1.3, 1.7, 2.0][etapa]
    R = 0.72
    BODY = '#f1f5f9'; ACC = '#f97316'; ACC2 = '#fb923c'; ARO = '#1e293b'; VIDRO = '#38bdf8'; ALETA = '#38bdf8'
    cilindro(1.5, 1.5, R * 0.5, 0.2, 0.34, '#334155', v=24, linha=0.02)           # engine nozzle
    cilindro(1.5, 1.5, R * 0.56, 0.2, 0.26, '#facc15', v=24, linha=0.02)          # nozzle lip
    cilindro(1.5, 1.5, R, 0.25, 0.25 + alt, BODY, v=36, linha=0.035)
    if etapa >= 1:                                                             # orange lower section
        cilindro(1.5, 1.5, R + 0.025, 0.25, 0.25 + min(alt, 0.55), ACC, v=36, linha=0.03)
        cilindro(1.5, 1.5, R + 0.045, 0.25 + min(alt, 0.55) - 0.07, 0.25 + min(alt, 0.55), ACC2, v=36, linha=0.025)
    if etapa >= 3:                                                             # porthole
        wz = 0.25 + alt * 0.72; d = (R - 0.04) * 0.7071
        esfera(1.5 + d, 1.5 + d, wz, 0.36, 0.36, 0.36, ARO, linha=0.03)            # thick rim
        esfera(1.5 + d + 0.10, 1.5 + d + 0.10, wz, 0.27, 0.27, 0.27, VIDRO, linha=0.02)   # glass
        esfera(1.5 + d + 0.24, 1.5 + d + 0.14, wz + 0.12, 0.07, 0.07, 0.07, '#ffffff', linha=0.004)
    for a in (0, 90, 180, 270):
        aleta(a, R, ALETA)
    if etapa == 4:
        top = 0.25 + alt
        cilindro(1.5, 1.5, R + 0.03, top - 0.05, top + 0.04, ACC2, v=36, linha=0.025)   # collar
        ogiva(top + 0.04, R + 0.02, 1.7, ACC)                                       # pointed ogive nose cone
        cilindro(1.5, 1.5, 0.035, top + 1.72, top + 1.9, '#94a3b8', v=8, linha=0.01)   # tip rod
        esfera(1.5, 1.5, top + 1.92, 0.06, 0.06, 0.06, '#ef4444', linha=0.01)
    else:                                                                      # scaffold: open frames
        for z in [0.25 + i * 0.45 for i in range(int(alt / 0.45) + 2)]:
            for (x0, y0, x1, y1) in ((0.55, 0.55, 2.45, 0.61), (0.55, 2.39, 2.45, 2.45), (0.55, 0.61, 0.61, 2.39), (2.39, 0.61, 2.45, 2.39)):
                caixa(x0, y0, x1, y1, z, z + 0.04, ACC2, bevel=0, linha=0.01)
    if sozinho:
        # Drop the pad parts and set the engine bell on z=0, so the flying rocket never carries
        # pad pixels (the old color-diff cut-out ate its skirt where the colors matched the pad).
        del grupo[:antes]
        for o in grupo: o.location.z -= 0.2


def antena():
    # Dish antenna to talk to Earth, on a tripod. At the pole Earth sits near the horizon, so the
    # dish looks almost sideways. Same language as the workshop: pale body, orange accent, cyan lights.
    w, h = TIPOS['antena']; piso(w, h)
    topo = (1.0, 1.0, 1.05)
    for a in (90, 210, 330):
        r = math.radians(a)
        foot = (1 + math.cos(r) * 0.6, 1 + math.sin(r) * 0.6, 0.12)
        haste(foot, topo, 0.045, '#cbd5e1', linha=0.014)
        cilindro(foot[0], foot[1], 0.09, 0.12, 0.2, '#f97316', v=12, linha=0.01)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=1)
    o = bpy.context.active_object
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z > -0.45], context='VERTS')
    bm.to_mesh(o.data); bm.free()
    o.scale = (0.8, 0.8, 0.8); o.location = (1.0, -1.0, 1.45)
    o.rotation_euler = (math.radians(-55), 0, math.radians(35))       # bowl opens up and toward the viewer
    bpy.ops.object.shade_smooth(); _fim(o, '#e2e8f0', 0, 0.03)
    haste(topo, (1.0, 1.0, 1.75), 0.04, '#94a3b8', linha=0.012)
    esfera(1.0, 1.0, 1.78, 0.09, 0.09, 0.09, '#ef4444', linha=0.015)
    caixa(1.45, 1.35, 1.85, 1.7, 0.12, 0.5, '#cbd5e1')                            # radio box
    caixa(1.43, 1.33, 1.87, 1.72, 0.12, 0.2, '#f97316', bevel=0.02, linha=0.02)
    visor(1.5, 1.705, 1.8, 1.72, 0.3, 0.42, '#8ae8ff')


def estufa():
    # Greenhouse: a glass half-tube over rows of green plants, with the workshop's orange ribs.
    w, h = TIPOS['estufa']; piso(w, h)
    for y in (0.55, 1.0, 1.45):
        caixa(0.35, y - 0.12, 2.65, y + 0.12, 0.12, 0.3, '#cbd5e1', bevel=0.01, linha=0.012)
        for x in (0.6, 1.1, 1.6, 2.1, 2.5):
            esfera(x, y, 0.38, 0.14, 0.14, 0.13, '#4ade80', linha=0.012)
    caixa(0.1, 0.03, 2.9, 0.12, 0.12, 0.22, '#f97316', bevel=0.015, linha=0.015)    # orange sills
    caixa(0.1, 1.88, 2.9, 1.97, 0.12, 0.22, '#f97316', bevel=0.015, linha=0.015)
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
    out = [n for n in N if n.type == 'OUTPUT_MATERIAL'][0]; em = [n for n in N if n.type in ('EMISSION', 'BSDF_PRINCIPLED')][0]   # toon: emission; estacao: Principled
    nt.links.new(em.outputs[0], mx.inputs[1]); nt.links.new(tr.outputs[0], mx.inputs[2]); nt.links.new(mx.outputs[0], out.inputs['Surface'])
    if o.users_collection and sc.collection not in o.users_collection:
        for c in o.users_collection: c.objects.unlink(o)
        sc.collection.objects.link(o)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(m2)
    if not NOVO or CARTOON:
        o.data.materials.append(contorno)
        sl = o.modifiers.new('contorno', 'SOLIDIFY')
        sl.thickness = min(0.05, 0.3 * min(o.dimensions)) if CARTOON else 0.02
        sl.offset = 1; sl.use_flip_normals = True; sl.material_offset = 1; sl.use_rim = False
    grupo.append(o)
    for x in (0.4, 1.5, 2.6):                                                 # ribs: arches over the tube
        for k in range(12):
            a0, a1 = math.pi * k / 12, math.pi * (k + 1) / 12
            haste((x, 1.0 - 0.95 * math.cos(a0), 0.12 + 0.95 * math.sin(a0)),
                  (x, 1.0 - 0.95 * math.cos(a1), 0.12 + 0.95 * math.sin(a1)), 0.035, '#f97316', linha=0.01)
    for x in (0.45, 2.55):
        visor(x, 0.64, x + 0.06, 1.36, 0.58, 0.63, '#fff0bd')


def perfuratriz():
    # Ice drill: a derrick over a bore hole, with a tank for the water it melts.
    w, h = TIPOS['perfuratriz']; piso(w, h)
    for (x, y) in ((0.35, 0.35), (1.65, 0.35), (0.35, 1.65), (1.65, 1.65)):
        haste((x, y, 0.12), (1.0 + (x - 1.0) * 0.2, 1.0 + (y - 1.0) * 0.2, 1.9), 0.05, '#f97316', linha=0.014)
    haste((0.35, 1.65, 0.6), (1.65, 1.65, 1.2), 0.03, '#fb923c', linha=0.01)                   # cross braces
    haste((1.65, 0.35, 0.6), (1.65, 1.65, 1.2), 0.03, '#fb923c', linha=0.01)
    cilindro(1.0, 1.0, 0.06, 0.12, 1.95, '#94a3b8', v=12, linha=0.012)        # drill string
    caixa(0.75, 0.75, 1.25, 1.25, 1.85, 2.05, '#e2e8f0', bevel=0.02, linha=0.02)
    caixa(0.72, 0.72, 1.28, 1.28, 1.98, 2.08, '#f97316', bevel=0.015, linha=0.02)
    visor(0.85, 1.255, 1.15, 1.27, 1.9, 1.96, '#8ae8ff')
    cilindro(1.0, 1.0, 0.22, 0.12, 0.3, '#1e293b', v=16, linha=0.012)        # hole
    cilindro(1.55, 0.45, 0.25, 0.12, 0.85, '#38bdf8', v=16, bevel=0.02)       # water tank
    cilindro(1.55, 0.45, 0.255, 0.4, 0.47, '#e2e8f0', v=16, linha=0.01)
    cilindro(1.55, 0.45, 0.255, 0.65, 0.72, '#f97316', v=16, linha=0.01)


def rover():
    # Lunar Terrain Vehicle style: open frame, two seats, four big wheels, antenna.
    caixa(0.15, 0.2, 1.85, 0.8, 0.28, 0.42, '#e2e8f0', bevel=0.03)
    caixa(0.15, 0.2, 1.85, 0.8, 0.28, 0.33, '#f97316', bevel=0.03, linha=0.02)     # orange chassis rail
    for x in (0.55, 1.15):
        caixa(x, 0.3, x + 0.35, 0.7, 0.42, 0.62, '#475569', bevel=0.03, linha=0.015)
    caixa(1.55, 0.3, 1.85, 0.7, 0.42, 0.55, '#fb923c', bevel=0.02, linha=0.015)
    for (x, y) in ((0.35, 0.12), (1.65, 0.12), (0.35, 0.88), (1.65, 0.88)):
        bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.2, depth=0.14)
        o = bpy.context.active_object; o.location = (x, -y, 0.2); o.rotation_euler = (math.radians(90), 0, 0)
        bpy.ops.object.shade_smooth(); _fim(o, '#475569', 0, 0.02)
        bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.09, depth=0.16)
        o = bpy.context.active_object; o.location = (x, -y + (0.01 if y > 0.5 else -0.01), 0.2); o.rotation_euler = (math.radians(90), 0, 0)
        bpy.ops.object.shade_smooth(); _fim(o, '#f97316', 0, 0.01)
    cilindro(0.25, 0.5, 0.025, 0.42, 1.1, '#94a3b8', v=8, linha=0.01)
    esfera(0.25, 0.5, 1.12, 0.1, 0.1, 0.1, '#ef4444', linha=0.012)
    for y in (0.3, 0.62):
        visor(1.84, y, 1.87, y + 0.08, 0.43, 0.52, '#8ae8ff')


def pouso():
    # Cargo lander: pale body with an orange band, four legs, engine bell, the crate on top.
    cilindro(1.0, 1.0, 0.62, 0.55, 1.25, '#cbd5e1', v=8, bevel=0.02)
    cilindro(1.0, 1.0, 0.64, 0.82, 0.96, '#f97316', v=8, bevel=0.01, linha=0.02)
    caixa(0.65, 0.65, 1.35, 1.35, 1.25, 1.75, '#fb923c', bevel=0.02)
    caixa(0.65, 0.98, 1.35, 1.02, 1.25, 1.75, '#c2410c', bevel=0, linha=0.008)
    esfera(1.0, 1.0, 1.0, 0.16, 0.16, 0.1, '#38bdf8', linha=0.02)
    bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=0.3, radius2=0.14, depth=0.35)
    o = bpy.context.active_object; o.location = (1.0, -1.0, 0.38); bpy.ops.object.shade_smooth(); _fim(o, '#64748b', 0, 0.02)
    for (x, y) in ((0.15, 0.15), (1.85, 0.15), (0.15, 1.85), (1.85, 1.85)):
        haste((1.0 + (x - 1.0) * 0.45, 1.0 + (y - 1.0) * 0.45, 0.9), (x, y, 0.05), 0.05, '#cbd5e1', linha=0.014)
        cilindro(x, y, 0.14, 0.0, 0.07, '#f97316', v=12, linha=0.012)


def usina():
    # Oxygen plant (ISRU), detailed: regolith pile -> hopper -> conveyor -> molten-regolith electrolysis
    # reactor (glowing furnace window, radiator fins) -> pipes -> O2 storage tank and spheres.
    w, h = TIPOS['usina']; piso(w, h)
    CLARO, LARANJA, LARANJA2, ACO, VIDRO = '#e2e8f0', '#f97316', '#fb923c', '#94a3b8', '#8ae8ff'
    AREIA, AREIA2, AGUA = '#e7d3b0', '#d9c19a', '#38bdf8'
    HX = (0, math.radians(90), 0)

    # --- regolith feed: pile, hopper on legs, conveyor up to the reactor ---
    esfera(0.5, 1.5, 0.12, 0.5, 0.36, 0.34, AREIA, linha=0.025, metade=True)
    esfera(0.78, 1.7, 0.12, 0.22, 0.2, 0.16, AREIA2, linha=0.02, metade=True)
    for (x, y) in ((0.2, 0.3), (0.62, 0.3), (0.2, 0.72), (0.62, 0.72)):
        haste((x, y, 0.12), (x, y, 0.6), 0.03, ACO, linha=0.01)
    caixa(0.12, 0.22, 0.72, 0.82, 0.6, 0.85, LARANJA2, bevel=0.03, linha=0.02)       # hopper body
    caixa(0.08, 0.18, 0.76, 0.86, 0.85, 0.95, LARANJA, bevel=0.02, linha=0.02)       # rim
    caixa(0.17, 0.27, 0.71, 0.81, 0.93, 0.97, AREIA, bevel=0.01, linha=0.01)         # dust inside
    haste((0.72, 0.52, 0.72), (0.88, 0.7, 0.9), 0.07, '#cbd5e1', linha=0.014)        # conveyor
    haste((0.45, 1.3, 0.2), (0.45, 0.85, 0.62), 0.045, ACO, linha=0.012)            # feed arm from pile

    # --- reactor: vertical tank with bands, glowing window, dome, radiator fins ---
    cx, cy = 1.4, 0.85
    cilindro(cx, cy, 0.46, 0.12, 0.2, '#cbd5e1', v=24, linha=0.02)                    # base ring
    cilindro(cx, cy, 0.42, 0.2, 1.3, CLARO, v=28, linha=0.03)
    esfera(cx, cy, 1.3, 0.42, 0.42, 0.28, CLARO, linha=0.03, metade=True)
    for z in (0.34, 0.68, 1.02):
        cilindro(cx, cy, 0.445, z, z + 0.07, LARANJA, v=28, linha=0.014)
    cilindro(cx, cy, 0.2, 1.52, 1.78, ACO, v=12, linha=0.02)                          # exhaust stack
    cilindro(cx, cy, 0.24, 1.74, 1.8, LARANJA, v=12, linha=0.015)
    esfera(cx, cy, 1.84, 0.07, 0.07, 0.07, '#ef4444', linha=0.012)
    caixa(cx - 0.2, cy + 0.38, cx + 0.2, cy + 0.46, 0.42, 0.62, '#334155', bevel=0.02, linha=0.015)   # furnace door
    visor(cx - 0.14, cy + 0.462, cx + 0.14, cy + 0.475, 0.46, 0.58, '#ffb35c')                       # molten glow
    for z in (0.8, 0.95, 1.1, 1.25):
        caixa(cx + 0.4, cy - 0.2, cx + 0.62, cy + 0.2, z, z + 0.05, '#cbd5e1', bevel=0.01, linha=0.01)
    caixa(cx + 0.57, cy - 0.2, cx + 0.62, cy + 0.2, 0.8, 1.3, ACO, bevel=0.005, linha=0.01)

    # --- catwalk + ladder at the reactor's front ---
    caixa(cx - 0.5, cy + 0.48, cx + 0.5, cy + 0.72, 0.62, 0.67, '#cbd5e1', bevel=0.01, linha=0.012)
    for x in (cx - 0.46, cx + 0.46):
        haste((x, cy + 0.7, 0.12), (x, cy + 0.7, 0.64), 0.025, ACO, linha=0.01)
    haste((cx - 0.46, cy + 0.7, 0.9), (cx + 0.46, cy + 0.7, 0.9), 0.022, LARANJA, linha=0.01)
    haste((cx - 0.46, cy + 0.7, 0.9), (cx - 0.46, cy + 0.7, 0.66), 0.022, LARANJA, linha=0.01)
    haste((cx + 0.46, cy + 0.7, 0.9), (cx + 0.46, cy + 0.7, 0.66), 0.022, LARANJA, linha=0.01)

    # --- O2 storage tank (cyan, horizontal) in front, with cradle and bands ---
    ty, tz = 1.5, 0.5
    cilindro(1.75, ty, 0.32, tz - 0.65, tz + 0.65, AGUA, v=24, rot=HX, linha=0.025)
    for x in (1.3, 2.2):
        cilindro(x, ty, 0.335, tz - 0.05, tz + 0.05, CLARO, v=24, rot=HX, linha=0.012)
    esfera(1.1, ty, tz, 0.14, 0.32, 0.32, AGUA, linha=0.025)
    esfera(2.4, ty, tz, 0.14, 0.32, 0.32, AGUA, linha=0.025)
    for x in (1.4, 2.1):
        caixa(x - 0.07, ty - 0.3, x + 0.07, ty + 0.3, 0.12, 0.25, LARANJA2, bevel=0.015, linha=0.015)    # cradles
    visor(1.5, ty + 0.318, 2.0, ty + 0.33, 0.5, 0.58, VIDRO)                           # gauge strip

    # --- two O2 spheres at the back right, with legs and a pipe ---
    for (x, y) in ((2.35, 0.45), (2.62, 1.0)):
        esfera(x, y, 0.62, 0.28, 0.28, 0.28, CLARO, linha=0.025)
        cilindro(x, y, 0.29, 0.58, 0.66, LARANJA, v=20, linha=0.012)
        for a in (45, 135, 225, 315):
            r = math.radians(a)
            haste((x + 0.18 * math.cos(r), y + 0.18 * math.sin(r), 0.45), (x + 0.26 * math.cos(r), y + 0.26 * math.sin(r), 0.12), 0.025, ACO, linha=0.01)

    # --- pipe network: elbows are small flanges ---
    haste((cx + 0.2, cy, 0.3), (2.2, 0.9, 0.3), 0.05, ACO, linha=0.012)               # reactor -> spheres
    haste((2.2, 0.9, 0.3), (2.35, 0.55, 0.3), 0.04, ACO, linha=0.012)
    haste((cx, cy + 0.3, 0.2), (1.5, 1.3, 0.2), 0.05, LARANJA2, linha=0.012)           # reactor -> O2 tank
    for (x, y, z) in ((2.2, 0.9, 0.3), (1.5, 1.3, 0.2)):
        cilindro(x, y, 0.07, z - 0.03, z + 0.03, LARANJA, v=12, linha=0.01)

    # --- control cabin with screens, status light tower, hazard skirt ---
    caixa(2.45, 1.45, 2.92, 1.92, 0.12, 0.85, '#cbd5e1')
    caixa(2.42, 1.42, 2.95, 1.95, 0.12, 0.2, LARANJA, bevel=0.02, linha=0.02)
    caixa(2.42, 1.42, 2.95, 1.95, 0.8, 0.9, LARANJA2, bevel=0.02, linha=0.02)
    visor(2.5, 1.955, 2.88, 1.97, 0.45, 0.68, VIDRO)
    visor(2.955, 1.5, 2.975, 1.85, 0.45, 0.68, VIDRO)
    haste((2.7, 1.68, 0.9), (2.7, 1.68, 1.3), 0.03, ACO, linha=0.01)                  # light tower
    for i, c in enumerate(('#ef4444', '#facc15', '#4ade80')):
        esfera(2.7, 1.68, 1.05 + i * 0.12, 0.07, 0.07, 0.06, c, linha=0.01)
    for i in range(8):                                                                    # hazard stripes on the deck edge
        x0 = 0.14 + i * 0.36
        caixa(x0, 1.9, x0 + 0.18, 1.95, 0.12, 0.17, '#facc15' if i % 2 else '#334155', bevel=0, linha=0.006)


def reciclador():
    # Water and air recycler (ECLSS), detailed: CO2 scrubber column with louvers, clean-water tank with a
    # level gauge, a CO2 storage bottle, a pump with its motor, piping with flanges, hazard skirt.
    w, h = TIPOS['reciclador']; piso(w, h)
    CLARO, LARANJA, LARANJA2, ACO, VIDRO, AGUA = '#e2e8f0', '#f97316', '#fb923c', '#94a3b8', '#8ae8ff', '#38bdf8'
    HY = (math.radians(90), 0, 0)
    # scrubber column
    cx, cy = 0.62, 0.62
    cilindro(cx, cy, 0.42, 0.12, 0.2, '#cbd5e1', v=24, linha=0.02)
    cilindro(cx, cy, 0.36, 0.2, 1.4, CLARO, v=24, linha=0.03)
    esfera(cx, cy, 1.4, 0.36, 0.36, 0.22, CLARO, linha=0.03, metade=True)
    for z in (0.38, 0.78, 1.18):
        cilindro(cx, cy, 0.385, z, z + 0.07, LARANJA, v=24, linha=0.014)
    for z in (0.52, 0.64, 0.92, 1.04):                                           # air louvers
        caixa(cx + 0.28, cy - 0.16, cx + 0.4, cy + 0.16, z, z + 0.05, '#94a3b8', bevel=0.005, linha=0.01)
        caixa(cx - 0.16, cy + 0.28, cx + 0.16, cy + 0.4, z, z + 0.05, '#94a3b8', bevel=0.005, linha=0.01)
    cilindro(cx, cy, 0.06, 1.55, 1.8, '#94a3b8', v=10, linha=0.012)               # CO2 exhaust
    esfera(cx, cy, 1.83, 0.08, 0.08, 0.08, '#ef4444', linha=0.012)
    # clean water tank
    wx, wy = 1.42, 1.3
    cilindro(wx, wy, 0.44, 0.12, 0.2, '#cbd5e1', v=24, linha=0.02)
    cilindro(wx, wy, 0.4, 0.2, 1.0, AGUA, v=24, bevel=0.01, linha=0.03)
    esfera(wx, wy, 1.0, 0.4, 0.4, 0.24, AGUA, linha=0.03, metade=True)
    for z in (0.38, 0.7):
        cilindro(wx, wy, 0.415, z, z + 0.06, CLARO, v=24, linha=0.012)
    visor(wx - 0.05, wy + 0.395, wx + 0.05, wy + 0.41, 0.3, 0.88, VIDRO)             # level gauge
    for z in (0.4, 0.55, 0.7):
        caixa(wx - 0.11, wy + 0.4, wx + 0.11, wy + 0.425, z, z + 0.015, '#1e293b', bevel=0, linha=0.004)
    # CO2 bottle, tall and thin
    cilindro(1.6, 0.42, 0.18, 0.12, 0.85, '#cbd5e1', v=16, linha=0.022)
    esfera(1.6, 0.42, 0.85, 0.18, 0.18, 0.13, '#cbd5e1', linha=0.02, metade=True)
    cilindro(1.6, 0.42, 0.19, 0.55, 0.62, LARANJA, v=16, linha=0.012)
    cilindro(1.6, 0.42, 0.04, 0.95, 1.08, '#94a3b8', v=8, linha=0.01)
    # pump with motor
    caixa(0.15, 1.15, 0.75, 1.65, 0.12, 0.42, LARANJA2, bevel=0.03, linha=0.02)
    cilindro(0.45, 1.4, 0.15, 0.42 - 0.28, 0.42 + 0.28, '#e2e8f0', v=16, rot=(0, math.radians(90), 0), linha=0.02)
    cilindro(0.45, 1.4, 0.17, 0.42 - 0.04, 0.42 + 0.04, LARANJA, v=16, rot=(0, math.radians(90), 0), linha=0.012)
    visor(0.2, 1.652, 0.7, 1.665, 0.18, 0.3, VIDRO)
    # pipes with flanges
    for a, b in (((cx, cy, 0.3), (1.6, 0.42, 0.3)), ((1.6, 0.42, 0.3), (wx, wy, 0.3)),
                 ((cx, cy + 0.3, 0.3), (0.45, 1.3, 0.42)), ((0.7, 1.4, 0.3), (wx - 0.3, wy, 0.3))):
        haste(a, b, 0.045, ACO, linha=0.012)
    for (x, y) in ((1.6, 0.42), (1.2, 0.9)):
        cilindro(x, y, 0.085, 0.27, 0.34, LARANJA, v=12, linha=0.01)
    for i in range(7):                                                              # hazard skirt
        x0 = 0.18 + i * 0.27
        caixa(x0, 1.9, x0 + 0.13, 1.95, 0.12, 0.17, '#facc15' if i % 2 else '#334155', bevel=0, linha=0.006)


def eclusa():
    # Airlock, detailed: cabin with hatch (hand wheel + status lights), grab bars, steps, tunnel stub,
    # roof vent and lamp, and a sign panel.
    w, h = TIPOS['eclusa']; piso(w, h)
    CLARO, LARANJA, LARANJA2, ACO, VIDRO = '#e2e8f0', '#f97316', '#fb923c', '#94a3b8', '#8ae8ff'
    A = (math.radians(90), 0, 0); H = (0, math.radians(90), 0)
    caixa(0.2, 0.1, 1.75, 0.82, 0.12, 0.95, CLARO, bevel=0.05)
    caixa(0.16, 0.06, 1.79, 0.86, 0.12, 0.24, LARANJA, bevel=0.03, linha=0.02)
    caixa(0.16, 0.06, 1.79, 0.86, 0.88, 1.0, LARANJA2, bevel=0.03, linha=0.02)
    cilindro(1.87, 0.46, 0.3, 0.52 - 0.12, 0.52 + 0.12, LARANJA, v=24, rot=H, linha=0.02)   # tunnel stub on +x
    cilindro(1.99, 0.46, 0.22, 0.52 - 0.02, 0.52 + 0.02, '#1e293b', v=24, rot=H, linha=0.01)
    # hatch with hand wheel
    cilindro(0.7, 0.84, 0.31, 0.5 - 0.05, 0.5 + 0.05, LARANJA, v=24, rot=A, linha=0.02)
    cilindro(0.7, 0.88, 0.25, 0.5 - 0.04, 0.5 + 0.04, '#334155', v=24, rot=A, linha=0.01)
    cilindro(0.7, 0.93, 0.1, 0.5 - 0.02, 0.5 + 0.02, ACO, v=16, rot=A, linha=0.01)
    caixa(0.6, 0.945, 0.8, 0.96, 0.495, 0.505, ACO, bevel=0, linha=0.006)
    caixa(0.695, 0.945, 0.705, 0.96, 0.4, 0.6, ACO, bevel=0, linha=0.006)
    visor(0.4, 0.845, 0.44, 0.86, 0.72, 0.8, '#ef4444'); visor(0.46, 0.845, 0.5, 0.86, 0.72, 0.8, '#4ade80')
    visor(1.15, 0.825, 1.6, 0.84, 0.55, 0.78, VIDRO)                                           # window
    caixa(1.12, 0.82, 1.63, 0.83, 0.52, 0.8, '#334155', bevel=0, linha=0.008)
    for x in (0.3, 1.1):
        haste((x, 0.88, 0.3), (x, 0.88, 0.8), 0.022, '#fde68a', linha=0.008)                  # grab bars
        haste((x, 0.82, 0.3), (x, 0.88, 0.3), 0.022, ACO, linha=0.008)
        haste((x, 0.82, 0.8), (x, 0.88, 0.8), 0.022, ACO, linha=0.008)
    for i, z in enumerate((0.12, 0.17)):                                                        # steps
        caixa(0.45, 0.86 + i * 0.05, 0.95, 0.96, z, z + 0.05, '#facc15' if i else '#334155', bevel=0.005, linha=0.01)
    caixa(1.15, 0.2, 1.5, 0.55, 1.0, 1.15, '#cbd5e1', bevel=0.02, linha=0.02)                   # roof vent
    for k in range(3):
        caixa(1.18 + k * 0.1, 0.2, 1.23 + k * 0.1, 0.55, 1.15, 1.18, ACO, bevel=0, linha=0.006)
    cilindro(0.5, 0.35, 0.04, 1.0, 1.3, ACO, v=8, linha=0.01)
    esfera(0.5, 0.35, 1.33, 0.08, 0.08, 0.08, '#ef4444', linha=0.012)


def bateria():
    # Battery bank, detailed: four cells with cooling ribs, terminals, charge bars; a junction box and cables.
    w, h = TIPOS['bateria']; piso(w, h)
    CLARO, LARANJA, ACO, VIDRO = '#cbd5e1', '#f97316', '#94a3b8', '#8ae8ff'
    cels = ((0.15, 0.15, 1.0), (1.2, 0.15, 0.85), (0.15, 1.05, 0.8), (1.2, 1.05, 0.95))
    jx, jy = 1.0, 0.98
    caixa(0.88, 0.8, 1.12, 1.0, 0.12, 0.45, '#fb923c', bevel=0.02, linha=0.02)                   # junction box
    visor(0.93, 1.002, 1.07, 1.012, 0.25, 0.38, '#fff0bd')
    for i, (x, y, hh) in enumerate(cels):
        caixa(x, y, x + 0.65, y + 0.65, 0.12, hh, CLARO, bevel=0.04)
        for k in range(5):                                                                        # cooling ribs
            caixa(x + 0.06 + k * 0.12, y + 0.65, x + 0.12 + k * 0.12, y + 0.69, 0.18, hh - 0.14, '#e2e8f0', bevel=0, linha=0.006)
            caixa(x + 0.65, y + 0.06 + k * 0.11, x + 0.69, y + 0.11 + k * 0.11, 0.18, hh - 0.14, '#e2e8f0', bevel=0, linha=0.006)
        caixa(x - 0.03, y - 0.03, x + 0.68, y + 0.68, hh - 0.08, hh + 0.04, LARANJA, bevel=0.02, linha=0.02)
        caixa(x - 0.03, y - 0.03, x + 0.68, y + 0.68, 0.12, 0.2, LARANJA, bevel=0.02, linha=0.02)
        cilindro(x + 0.2, y + 0.33, 0.06, hh + 0.04, hh + 0.14, '#ef4444', v=10, linha=0.01)      # + terminal
        cilindro(x + 0.45, y + 0.33, 0.06, hh + 0.04, hh + 0.14, '#334155', v=10, linha=0.01)     # - terminal
        n = 3 + (i % 2)
        for k in range(4):                                                                        # charge bars (+gy face)
            visor(x + 0.12 + k * 0.13, y + 0.69, x + 0.2 + k * 0.13, y + 0.705, hh - 0.35, hh - 0.2,
                  '#4ade80' if k < n else '#334155')
        haste((x + 0.2, y + 0.33, hh + 0.14), (jx, jy, 0.45), 0.02, '#ef4444' if i % 2 else LARANJA, linha=0.008)
    caixa(0.28, 0.95, 0.74, 1.0, 0.12, 0.2, '#facc15', bevel=0, linha=0.01)                      # floor bolt plate


def impressora():
    # 3D printer, detailed: rails, gantry with print head and hose, regolith silo, a U-shaped printed
    # shell in layers, a control box, a pile of feedstock.
    w, h = TIPOS['impressora']; piso(w, h)
    CLARO, LARANJA, LARANJA2, ACO, VIDRO = '#e2e8f0', '#f97316', '#fb923c', '#94a3b8', '#8ae8ff'
    for x in (0.25, 2.65):                                                                        # floor rails
        caixa(x - 0.05, 0.25, x + 0.1, 1.75, 0.12, 0.17, ACO, bevel=0.005, linha=0.01)
    for i in range(9):                                                                            # printed shell
        c = '#e7d3b0' if i % 2 else '#d9c19a'; z0 = 0.12 + i * 0.09
        caixa(0.75, 0.85, 2.25, 1.0, z0, z0 + 0.09, c, bevel=0.01, linha=0.008)
        caixa(0.75, 0.85, 0.9, 1.5, z0, z0 + 0.09, c, bevel=0.01, linha=0.008)
        if i < 7:
            caixa(2.1, 0.85, 2.25, 1.5, z0, z0 + 0.09, c, bevel=0.01, linha=0.008)
    for x in (0.18, 2.58):                                                                        # gantry posts
        caixa(x, 0.8, x + 0.24, 1.2, 0.12, 1.75, LARANJA, bevel=0.03, linha=0.02)
        caixa(x - 0.04, 0.76, x + 0.28, 1.24, 0.12, 0.25, LARANJA2, bevel=0.02, linha=0.015)
        haste((x + 0.12, 0.8, 0.3), (x + 0.12, 0.8, 1.5), 0.02, ACO, linha=0.008)
    caixa(0.15, 0.82, 2.85, 1.18, 1.55, 1.82, CLARO, bevel=0.03)
    caixa(0.15, 0.82, 2.85, 1.18, 1.55, 1.62, LARANJA, bevel=0.015, linha=0.015)
    caixa(1.25, 0.76, 1.75, 1.24, 1.15, 1.6, LARANJA2, bevel=0.03)                               # print head
    cilindro(1.5, 1.0, 0.07, 0.85, 1.15, ACO, v=10, linha=0.012)
    cilindro(1.5, 1.0, 0.1, 0.8, 0.88, '#334155', v=10, linha=0.01)
    visor(1.32, 1.245, 1.68, 1.26, 1.3, 1.42, VIDRO)
    # hose from the silo to the head, in segments
    pts = [(0.5, 1.55, 1.0), (0.6, 1.35, 1.35), (0.95, 1.1, 1.62), (1.3, 1.0, 1.5)]
    for a, b in zip(pts, pts[1:]): haste(a, b, 0.035, '#475569', linha=0.01)
    # regolith silo
    cilindro(0.45, 1.55, 0.3, 0.55, 1.15, CLARO, v=20, linha=0.025)
    esfera(0.45, 1.55, 1.15, 0.3, 0.3, 0.18, CLARO, linha=0.025, metade=True)
    cilindro(0.45, 1.55, 0.315, 0.8, 0.87, LARANJA, v=20, linha=0.012)
    cilindro(0.45, 1.55, 0.14, 0.4, 0.55, '#cbd5e1', v=12, linha=0.015)
    for (x, y) in ((0.2, 1.4), (0.7, 1.4), (0.2, 1.8), (0.7, 1.8)):
        haste((x, y, 0.12), (x + (0.45 - x) * 0.3, y + (1.55 - y) * 0.3, 0.6), 0.025, ACO, linha=0.01)
    # feedstock pile and control box
    esfera(2.1, 1.65, 0.12, 0.45, 0.3, 0.36, '#e7d3b0', linha=0.025, metade=True)
    caixa(2.45, 1.3, 2.9, 1.78, 0.12, 0.62, CLARO)
    caixa(2.42, 1.27, 2.93, 1.81, 0.12, 0.2, LARANJA, bevel=0.02, linha=0.02)
    visor(2.5, 1.782, 2.85, 1.795, 0.35, 0.52, VIDRO)
    cilindro(2.68, 1.5, 0.03, 0.62, 0.9, ACO, v=8, linha=0.01)
    esfera(2.68, 1.5, 0.93, 0.07, 0.07, 0.07, '#ef4444', linha=0.012)


def radiotelescopio():
    # Radio telescope, detailed: octagonal base with bolts, pedestal and yoke, a dish with an orange rim and
    # radial ribs, a tripod holding the receiver, a control cabin with a lamp and a cable.
    w, h = TIPOS['radiotelescopio']; piso(w, h)
    CLARO, LARANJA, ACO, VIDRO = '#e2e8f0', '#f97316', '#94a3b8', '#8ae8ff'
    cilindro(1.5, 1.5, 0.75, 0.12, 0.4, CLARO, v=8, bevel=0.02)
    cilindro(1.5, 1.5, 0.78, 0.22, 0.3, LARANJA, v=8, linha=0.015)
    for k in range(8):
        a = math.radians(22.5 + k * 45)
        cilindro(1.5 + 0.6 * math.cos(a), 1.5 + 0.6 * math.sin(a), 0.035, 0.4, 0.44, ACO, v=6, linha=0.008)
    cilindro(1.5, 1.5, 0.22, 0.4, 1.2, CLARO, v=12, linha=0.02)
    cilindro(1.5, 1.5, 0.26, 1.1, 1.2, LARANJA, v=12, linha=0.015)
    k = 1.25; rot = (math.radians(-55), 0, math.radians(35)); c = Vector((1.5, -1.5, 1.85))
    M = Euler(rot).to_matrix()
    def P(lx, ly, lz):
        v = M @ Vector((lx * k, ly * k, lz * k)) + c
        return (v.x, -v.y, v.z)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=1)
    o = bpy.context.active_object
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z > -0.45], context='VERTS')
    bm.to_mesh(o.data); bm.free()
    o.scale = (k, k, k); o.location = c; o.rotation_euler = rot
    bpy.ops.object.shade_smooth(); _fim(o, CLARO, 0, 0.03)
    rr = math.sqrt(1 - 0.45 ** 2)
    N = 24
    for i in range(N):                                                                            # orange rim
        a0, a1 = 2 * math.pi * i / N, 2 * math.pi * (i + 1) / N
        haste(P(rr * 1.02 * math.cos(a0), rr * 1.02 * math.sin(a0), -0.45), P(rr * 1.02 * math.cos(a1), rr * 1.02 * math.sin(a1), -0.45), 0.04, LARANJA, linha=0.012)
    for i in range(8):                                                                            # radial ribs
        a = 2 * math.pi * i / 8
        haste(P(0, 0, -1.02), P(rr * 1.02 * math.cos(a), rr * 1.02 * math.sin(a), -0.45), 0.018, ACO, linha=0.008)
    for r in (0.5, 0.8):                                                                          # concentric rings
        zr = -math.sqrt(max(1 - r * r, 0)) * 1.02
        for i in range(16):
            a0, a1 = 2 * math.pi * i / 16, 2 * math.pi * (i + 1) / 16
            haste(P(r * math.cos(a0), r * math.sin(a0), zr), P(r * math.cos(a1), r * math.sin(a1), zr), 0.014, ACO, linha=0.006)
    tip = P(0, 0, 0.75)
    for a in (90, 210, 330):                                                                      # receiver tripod
        r = math.radians(a)
        haste(P(rr * math.cos(r), rr * math.sin(r), -0.45), tip, 0.022, ACO, linha=0.008)
    cilindro(tip[0], tip[1], 0.07, tip[2] - 0.07, tip[2] + 0.07, LARANJA, v=12, linha=0.012)
    esfera(tip[0], tip[1], tip[2] + 0.1, 0.07, 0.07, 0.07, '#ef4444', linha=0.012)
    for sx in (-1, 1):                                                                            # yoke arms
        haste((1.5, 1.5, 1.2), P(sx * 0.62, 0, -0.78), 0.06, CLARO, linha=0.014)
    caixa(2.15, 2.0, 2.85, 2.78, 0.12, 0.72, '#cbd5e1')                                          # control cabin
    caixa(2.12, 1.97, 2.88, 2.81, 0.12, 0.2, LARANJA, bevel=0.02, linha=0.02)
    caixa(2.12, 1.97, 2.88, 2.81, 0.66, 0.76, '#fb923c', bevel=0.02, linha=0.02)
    visor(2.25, 2.815, 2.75, 2.83, 0.35, 0.55, VIDRO)
    visor(2.885, 2.1, 2.9, 2.7, 0.35, 0.55, VIDRO)
    cilindro(2.3, 2.15, 0.03, 0.76, 1.05, ACO, v=8, linha=0.01)
    esfera(2.3, 2.15, 1.08, 0.07, 0.07, 0.07, '#ef4444', linha=0.012)
    haste((2.15, 2.4, 0.2), (1.8, 1.8, 0.2), 0.035, '#475569', linha=0.01)                       # cable to the base


# ---------- surface decorations (no deck: they sit straight on the regolith) ----------
def _gira(o, rot):
    o.rotation_euler = rot
    return o


def deco_rover_velho():
    # Abandoned rover: one wheel missing, chassis dusty and sagging on that corner, antenna bent, no seats.
    CLARO, LARANJA, ACO = '#e2e8f0', '#f97316', '#94a3b8'
    caixa(0.2, 0.25, 1.8, 0.75, 0.3, 0.4, '#d9c19a', bevel=0.03)
    caixa(0.2, 0.25, 1.8, 0.75, 0.3, 0.35, LARANJA, bevel=0.03, linha=0.02)
    _gira(caixa(1.45, 0.25, 1.8, 0.75, 0.4, 0.47, CLARO, bevel=0.02, linha=0.015), (0, 0.12, 0))   # sagging panel
    caixa(0.5, 0.3, 0.85, 0.7, 0.4, 0.46, '#cbd5e1', bevel=0.02, linha=0.015)                      # empty seat frame
    for y in (0.3, 0.7):
        haste((0.55, y, 0.4), (0.55, y, 0.7), 0.025, ACO, linha=0.01)                              # seat posts, no seats
    for (x, y, ok) in ((0.35, 0.15, True), (1.65, 0.15, True), (0.35, 0.85, True), (1.65, 0.85, False)):
        if not ok:
            haste((1.65, 0.75, 0.32), (1.75, 1.1, 0.16), 0.03, ACO, linha=0.01)                     # broken axle
            continue
        bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.2, depth=0.14)
        o = bpy.context.active_object; o.location = (x, -y, 0.2); o.rotation_euler = (math.radians(90), 0, 0)
        bpy.ops.object.shade_smooth(); _fim(o, '#94a3b8', 0, 0.02)
        bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.09, depth=0.16)
        o = bpy.context.active_object; o.location = (x, -y + (0.01 if y > 0.5 else -0.01), 0.2); o.rotation_euler = (math.radians(90), 0, 0)
        bpy.ops.object.shade_smooth(); _fim(o, LARANJA, 0, 0.01)
    bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.2, depth=0.14)                         # lost wheel, on the ground
    o = bpy.context.active_object; o.location = (1.5, -1.15, 0.07); bpy.ops.object.shade_smooth(); _fim(o, '#94a3b8', 0, 0.02)
    haste((0.25, 0.5, 0.4), (0.25, 0.5, 0.95), 0.022, ACO, linha=0.01)                              # bent antenna
    haste((0.25, 0.5, 0.95), (0.5, 0.58, 1.05), 0.022, ACO, linha=0.01)
    esfera(0.5, 0.58, 1.07, 0.06, 0.06, 0.06, '#ef4444', linha=0.01)
    esfera(1.25, 1.2, 0.0, 0.3, 0.22, 0.12, '#e7d3b0', linha=0.02, metade=True)                      # dust drift


def deco_modulo_descida():
    # Old lunar lander descent stage, left behind: gold foil body, four landing legs, ladder, dead engine.
    OURO, LARANJA, ACO, CLARO = '#fde68a', '#f97316', '#94a3b8', '#e2e8f0'
    cilindro(1.0, 1.0, 0.55, 0.45, 1.0, OURO, v=8, bevel=0.02)
    cilindro(1.0, 1.0, 0.58, 0.72, 0.8, LARANJA, v=8, linha=0.015)
    cilindro(1.0, 1.0, 0.5, 1.0, 1.08, CLARO, v=8, linha=0.02)
    bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=0.26, radius2=0.1, depth=0.3)
    o = bpy.context.active_object; o.location = (1.0, -1.0, 0.3); bpy.ops.object.shade_smooth(); _fim(o, '#64748b', 0, 0.02)
    for (x, y) in ((0.12, 0.12), (1.88, 0.12), (0.12, 1.88), (1.88, 1.88)):
        haste((1.0 + (x - 1.0) * 0.45, 1.0 + (y - 1.0) * 0.45, 0.8), (x, y, 0.06), 0.035, CLARO, linha=0.012)
        haste((1.0 + (x - 1.0) * 0.5, 1.0 + (y - 1.0) * 0.5, 0.52), (x, y, 0.1), 0.02, ACO, linha=0.01)   # strut
        cilindro(x, y, 0.15, 0.0, 0.05, LARANJA, v=12, linha=0.012)                                         # foot pad
    haste((1.88, 1.88, 0.1), (1.7, 1.55, 0.68), 0.015, ACO, linha=0.008)                                    # ladder rails
    haste((1.8, 1.88, 0.1), (1.62, 1.55, 0.68), 0.015, ACO, linha=0.008)
    caixa(0.8, 1.52, 1.2, 1.57, 0.55, 0.8, '#334155', bevel=0, linha=0.01)                                 # hatch


def deco_sonda():
    # Crashed probe: a round body on one panel, antennas bent, one solar wing snapped off.
    CLARO, ACO, AZUL = '#e2e8f0', '#94a3b8', '#8ae8ff'
    esfera(0.55, 0.55, 0.28, 0.24, 0.24, 0.22, CLARO, linha=0.025)
    cilindro(0.55, 0.55, 0.255, 0.26, 0.31, '#f97316', v=20, linha=0.012)
    _gira(caixa(0.05, 0.2, 0.37, 0.9, 0.12, 0.16, AZUL, bevel=0.01, linha=0.015), (0.35, 0.1, 0))      # tilted wing
    _gira(caixa(0.78, 0.3, 1.1, 0.95, 0.04, 0.08, AZUL, bevel=0.01, linha=0.015), (0, 0, 0.5))        # broken wing on ground
    haste((0.5, 0.55, 0.45), (0.35, 0.55, 0.9), 0.02, ACO, linha=0.008)
    haste((0.6, 0.6, 0.45), (0.9, 0.9, 0.52), 0.02, ACO, linha=0.008)
    esfera(0.35, 0.55, 0.93, 0.05, 0.05, 0.05, '#ef4444', linha=0.01)
    esfera(0.55, 0.55, 0.0, 0.5, 0.4, 0.12, '#e7d3b0', linha=0.015, metade=True)


def deco_caixas():
    # A stack of supply crates with straps, one knocked over.
    caixa(0.1, 0.1, 0.62, 0.62, 0.0, 0.5, '#fb923c', bevel=0.03)
    caixa(0.1, 0.1, 0.62, 0.62, 0.22, 0.28, '#fdba74', bevel=0.01, linha=0.01)
    caixa(0.18, 0.18, 0.54, 0.54, 0.5, 0.8, '#cbd5e1', bevel=0.03)
    caixa(0.18, 0.18, 0.54, 0.54, 0.62, 0.67, '#f97316', bevel=0.01, linha=0.01)
    _gira(caixa(0.7, 0.1, 1.0, 0.45, 0.0, 0.3, '#e2e8f0', bevel=0.03), (0, 0, 0.35))
    _gira(caixa(0.2, 0.75, 0.55, 1.0, 0.0, 0.25, '#fb923c', bevel=0.03), (0.0, 0.2, -0.3))
    visor(0.625, 0.25, 0.64, 0.45, 0.3, 0.42, '#8ae8ff')


def deco_sismografo():
    # Seismometer: a white dome under a thermal blanket, antenna, little solar cell.
    CLARO, LARANJA, ACO = '#e2e8f0', '#f97316', '#94a3b8'
    cilindro(0.5, 0.5, 0.34, 0.0, 0.08, LARANJA, v=16, linha=0.015)
    esfera(0.5, 0.5, 0.08, 0.28, 0.28, 0.26, CLARO, linha=0.025, metade=True)
    cilindro(0.5, 0.5, 0.29, 0.14, 0.2, '#fde68a', v=20, linha=0.012)
    haste((0.5, 0.5, 0.32), (0.5, 0.5, 0.95), 0.02, ACO, linha=0.008)
    esfera(0.5, 0.5, 0.98, 0.055, 0.055, 0.055, '#ef4444', linha=0.01)
    _gira(caixa(0.65, 0.65, 0.95, 0.9, 0.05, 0.09, '#8ae8ff', bevel=0.005, linha=0.012), (-0.35, 0, 0))   # solar cell


def deco_refletor():
    # Laser retroreflector (real Apollo experiment): a grid of mirrors on a stand, facing Earth.
    CLARO, ACO = '#e2e8f0', '#94a3b8'
    cilindro(0.5, 0.5, 0.35, 0.0, 0.07, '#f97316', v=16, linha=0.015)
    caixa(0.4, 0.42, 0.6, 0.58, 0.07, 0.33, CLARO, bevel=0.02, linha=0.018)
    th = math.radians(50); M = Euler((th, 0, 0)).to_matrix(); c = Vector((0.5, -0.5, 0.55))
    _gira(caixa(0.14, 0.43, 0.86, 0.57, 0.5, 0.56, '#334155', bevel=0.01, linha=0.02), (th, 0, 0))
    for i in range(5):
        p = c + M @ Vector(((i - 2) * 0.13, 0, 0.045))
        o = caixa(-0.05, -0.05, 0.05, 0.05, 0, 0.03, '#8ae8ff', bevel=0.004, linha=0.006)
        o.location = (p.x, p.y, p.z); o.rotation_euler = (th, 0, 0)
    haste((0.5, 0.58, 0.3), (0.5, 0.75, 0.05), 0.025, ACO, linha=0.01)                                 # prop leg
    esfera(0.5, 0.5, 0.0, 0.45, 0.35, 0.1, '#e7d3b0', linha=0.015, metade=True)


def deco_baliza():
    # Beacon pole with orange and white bands and a lamp on top.
    ACO = '#94a3b8'
    cilindro(0.5, 0.5, 0.2, 0.0, 0.08, '#f97316', v=12, linha=0.015)
    for i in range(5):
        cilindro(0.5, 0.5, 0.045, 0.08 + i * 0.22, 0.08 + (i + 1) * 0.22, '#f97316' if i % 2 == 0 else '#f1f5f9', v=10, linha=0.012)
    esfera(0.5, 0.5, 1.26, 0.1, 0.1, 0.1, '#fff0bd', linha=0.012)
    cilindro(0.5, 0.5, 0.12, 1.14, 1.18, ACO, v=12, linha=0.01)
    for a in (45, 165, 285):
        r = math.radians(a)
        haste((0.5 + 0.17 * math.cos(r), 0.5 + 0.17 * math.sin(r), 0.0), (0.5, 0.5, 0.5), 0.015, ACO, linha=0.008)


def deco_barris():
    # Three fuel drums, one lying down.
    for (x, y, c) in ((0.3, 0.3, '#fb923c'), (0.72, 0.32, '#38bdf8')):
        cilindro(x, y, 0.2, 0.0, 0.5, c, v=16, bevel=0.0, linha=0.02)
        cilindro(x, y, 0.21, 0.15, 0.2, '#e2e8f0', v=16, linha=0.01)
        cilindro(x, y, 0.21, 0.32, 0.37, '#e2e8f0', v=16, linha=0.01)
        cilindro(x, y, 0.15, 0.5, 0.53, '#334155', v=16, linha=0.008)
    cilindro(0.5, 0.75, 0.2, 0.2 - 0.25, 0.2 + 0.25, '#e2e8f0', v=16, rot=(0, math.radians(90), 0), linha=0.02)
    cilindro(0.3, 0.75, 0.205, 0.2 - 0.02, 0.2 + 0.02, '#f97316', v=16, rot=(0, math.radians(90), 0), linha=0.01)
    cilindro(0.7, 0.75, 0.205, 0.2 - 0.02, 0.2 + 0.02, '#f97316', v=16, rot=(0, math.radians(90), 0), linha=0.01)


def deco_bandeira():
    # A small flag on a pole, planted in the dust, with a base ring of pebbles.
    cilindro(0.5, 0.5, 0.17, 0.0, 0.05, '#e2e8f0', v=12, linha=0.012)
    cilindro(0.5, 0.5, 0.022, 0.05, 1.15, '#cbd5e1', v=8, linha=0.01)
    caixa(0.52, 0.485, 0.98, 0.515, 0.7, 1.12, '#f97316', bevel=0.005, linha=0.012)
    caixa(0.52, 0.485, 0.98, 0.515, 0.7, 0.78, '#f1f5f9', bevel=0.0, linha=0.008)
    esfera(0.5, 0.5, 1.17, 0.045, 0.045, 0.045, '#facc15', linha=0.008)
    for (x, y, r) in ((0.3, 0.6, 0.06), (0.7, 0.68, 0.05), (0.36, 0.3, 0.05)):
        esfera(x, y, 0.0, r, r, r * 0.8, '#d9c19a', linha=0.008, metade=True)


def deco_pedras():
    # A cluster of boulders in pale grey-beige.
    for (x, y, rx, rz, c) in ((0.4, 0.45, 0.3, 0.26, '#e7d3b0'), (0.72, 0.35, 0.2, 0.18, '#d9c19a'),
                              (0.62, 0.72, 0.24, 0.2, '#cbd5e1'), (0.25, 0.75, 0.14, 0.12, '#e7d3b0')):
        esfera(x, y, 0.0, rx, rx * 0.85, rz, c, linha=0.02, metade=True)
    esfera(0.5, 0.55, 0.12, 0.12, 0.1, 0.1, '#f1f5f9', linha=0.012, metade=True)


def deco_camera():
    # Science camera on a tripod, lens pointing at the base.
    ACO = '#94a3b8'
    for a in (80, 200, 320):
        r = math.radians(a)
        haste((0.5, 0.5, 0.62), (0.5 + 0.28 * math.cos(r), 0.5 + 0.28 * math.sin(r), 0.0), 0.022, ACO, linha=0.01)
    caixa(0.36, 0.4, 0.64, 0.6, 0.62, 0.84, '#e2e8f0', bevel=0.02, linha=0.015)
    caixa(0.34, 0.38, 0.66, 0.62, 0.62, 0.68, '#f97316', bevel=0.01, linha=0.012)
    cilindro(0.5, 0.64, 0.07, 0.725, 0.745, '#1e293b', v=14, rot=(math.radians(90), 0, 0), linha=0.008)
    visor(0.46, 0.62, 0.54, 0.64, 0.7, 0.76, '#8ae8ff')
    haste((0.5, 0.5, 0.84), (0.5, 0.5, 1.0), 0.015, ACO, linha=0.008)
    esfera(0.5, 0.5, 1.02, 0.04, 0.04, 0.04, '#ef4444', linha=0.008)


def deco_amostras():
    # Sample case with core tubes and a scoop, as left after a geology walk.
    caixa(0.15, 0.2, 0.85, 0.65, 0.0, 0.22, '#cbd5e1', bevel=0.03)
    caixa(0.12, 0.17, 0.88, 0.68, 0.18, 0.26, '#f97316', bevel=0.02, linha=0.015)
    caixa(0.4, 0.62, 0.6, 0.7, 0.1, 0.18, '#334155', bevel=0.005, linha=0.01)
    for i, c in enumerate(('#e7d3b0', '#8ae8ff', '#fb923c')):
        cilindro(0.25 + i * 0.22, 0.85, 0.05, 0.0 + 0.05, 0.4 + 0.05, c, v=10, rot=(math.radians(90), 0, 0), linha=0.01)
    esfera(0.25, 0.85, 0.05, 0.06, 0.06, 0.06, '#e2e8f0', linha=0.008)


def deco_lanterna():
    # Solar lamp post lighting the path.
    ACO = '#94a3b8'
    cilindro(0.5, 0.5, 0.14, 0.0, 0.06, '#f97316', v=10, linha=0.012)
    cilindro(0.5, 0.5, 0.03, 0.06, 1.0, '#cbd5e1', v=8, linha=0.01)
    haste((0.5, 0.5, 0.97), (0.7, 0.5, 1.05), 0.025, ACO, linha=0.008)
    caixa(0.62, 0.43, 0.86, 0.57, 0.98, 1.06, '#334155', bevel=0.01, linha=0.01)
    emissivo(caixa(0.65, 0.46, 0.83, 0.54, 0.96, 0.98, '#fff0bd', bevel=0.005, linha=0.004), '#fff0bd', 2.4)
    _gira(caixa(0.3, 0.38, 0.5, 0.62, 1.08, 1.12, '#8ae8ff', bevel=0.005, linha=0.01), (0, -0.4, 0))  # tiny solar cell


def deco_ferramentas():
    # Tool rack: a frame with a shovel, a hammer and a drill hung on it.
    ACO = '#94a3b8'
    for x in (0.2, 0.8):
        haste((x, 0.4, 0.0), (x, 0.4, 0.75), 0.025, '#f97316', linha=0.01)
    haste((0.2, 0.4, 0.72), (0.8, 0.4, 0.72), 0.025, '#f97316', linha=0.01)
    haste((0.35, 0.45, 0.65), (0.35, 0.45, 0.1), 0.018, ACO, linha=0.008)        # shovel
    caixa(0.28, 0.43, 0.42, 0.47, 0.0, 0.12, '#e2e8f0', bevel=0.005, linha=0.01)
    haste((0.55, 0.45, 0.65), (0.55, 0.45, 0.2), 0.018, '#fb923c', linha=0.008)  # hammer
    caixa(0.48, 0.43, 0.62, 0.47, 0.6, 0.68, '#475569', bevel=0.005, linha=0.01)
    caixa(0.67, 0.42, 0.75, 0.48, 0.3, 0.62, '#f97316', bevel=0.01, linha=0.01)  # drill
    caixa(0.35, 0.55, 0.7, 0.8, 0.0, 0.18, '#cbd5e1', bevel=0.02, linha=0.015)    # tool box
    caixa(0.33, 0.53, 0.72, 0.82, 0.15, 0.2, '#f97316', bevel=0.01, linha=0.012)


def deco_carretel():
    # A big cable spool with orange cable, plus a loose loop.
    H = (0, math.radians(90), 0)
    cilindro(0.5, 0.5, 0.32, 0.5 - 0.3, 0.5 + 0.3, '#cbd5e1', v=24, rot=(0, math.radians(90), 0), linha=0.02)
    cilindro(0.5, 0.5, 0.19, 0.5 - 0.2, 0.5 + 0.2, '#f97316', v=20, rot=H, linha=0.012)
    for x in (0.5 - 0.31, 0.5 + 0.31):
        cilindro(x, 0.5, 0.34, 0.5 - 0.015, 0.5 + 0.015, '#e2e8f0', v=24, rot=H, linha=0.012)
    cilindro(0.5, 0.5, 0.05, 0.5 - 0.4, 0.5 + 0.4, '#94a3b8', v=8, rot=H, linha=0.01)
    haste((0.5, 0.82, 0.04), (0.85, 0.88, 0.04), 0.03, '#f97316', linha=0.01)
    haste((0.85, 0.88, 0.04), (0.9, 0.7, 0.04), 0.03, '#f97316', linha=0.01)


def deco_mochila():
    # A dropped life-support backpack lying next to its helmet.
    caixa(0.2, 0.25, 0.7, 0.62, 0.0, 0.26, '#e2e8f0', bevel=0.05)
    caixa(0.2, 0.25, 0.7, 0.62, 0.17, 0.22, '#f97316', bevel=0.02, linha=0.012)
    cilindro(0.35, 0.28, 0.06, 0.12, 0.3, '#94a3b8', v=8, rot=(math.radians(90), 0, 0), linha=0.008)
    visor(0.5, 0.625, 0.65, 0.635, 0.08, 0.16, '#8ae8ff')
    esfera(0.62, 0.8, 0.14, 0.17, 0.17, 0.16, '#f1f5f9', linha=0.018)               # helmet
    esfera(0.62, 0.8 + 0.1, 0.14, 0.12, 0.09, 0.1, '#8ae8ff', linha=0.008)           # visor
    esfera(0.58, 0.9, 0.0, 0.16, 0.1, 0.05, '#d9c19a', linha=0.006, metade=True)


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
           'usina': usina, 'reciclador': reciclador, 'eclusa': eclusa, 'bateria': bateria,
           'impressora': impressora, 'radiotelescopio': radiotelescopio,
           'pouso': pouso, 'chama': chama}
MODELOS['deco_rover_velho'] = deco_rover_velho
MODELOS['deco_modulo_descida'] = deco_modulo_descida
MODELOS['deco_sonda'] = deco_sonda
MODELOS['deco_caixas'] = deco_caixas
MODELOS['deco_sismografo'] = deco_sismografo
MODELOS['deco_refletor'] = deco_refletor
MODELOS['deco_baliza'] = deco_baliza
MODELOS['deco_barris'] = deco_barris
MODELOS['deco_bandeira'] = deco_bandeira
MODELOS['deco_pedras'] = deco_pedras
MODELOS['deco_camera'] = deco_camera
MODELOS['deco_amostras'] = deco_amostras
MODELOS['deco_lanterna'] = deco_lanterna
MODELOS['deco_ferramentas'] = deco_ferramentas
MODELOS['deco_carretel'] = deco_carretel
MODELOS['deco_mochila'] = deco_mochila
for i in range(5): MODELOS[f'foguete{i}'] = (lambda i=i: foguete(i))

def agua(n):
    def build():
        global AGUA
        AGUA = n
        blindagem()
        AGUA = 3
    return build

for n in range(4): MODELOS[f'blindagem_agua{n}'] = agua(n)


# ---------- detail kit (the solar station's level of detail) ----------
# Every main module gets, on top of its own shape: a name plate on the front of its base (like the panel's
# "SOL 01"), orange corner guards with bolts, bolts along the visible deck edges, and a small control
# pedestal (screen with text lines, three status LEDs) standing in a free spot of the deck, with a cable
# running to the module. The free spot is found from the model itself, so nothing goes through a wall.
CODIGOS = {
    'habitat': 'HAB-01', 'suporte': 'LIFE SUPPORT', 'blindagem': 'RAD SHIELD', 'oficina': 'ROCKET WORKSHOP',
    'plataforma': 'PAD-1', 'antena': 'COMMS', 'estufa': 'GREENHOUSE', 'perfuratriz': 'ICE DRILL',
    'usina': 'O2 PLANT', 'reciclador': 'RECYCLER', 'eclusa': 'AIRLOCK', 'impressora': '3D PRINTER',
    'radiotelescopio': 'RADIO SCOPE',
}

def texto3d(corpo, x, y, z, tam, cor, face='frente'):
    """Raised lettering on a vertical face the camera sees: 'frente' (+gy) or 'direita' (+gx). (x, y, z) is its center."""
    bpy.ops.object.text_add()
    o = bpy.context.active_object
    o.data.body = corpo; o.data.size = tam; o.data.extrude = 0.003
    o.data.align_x = 'CENTER'; o.data.align_y = 'CENTER'
    o.rotation_euler = (math.radians(90), 0, 0) if face == 'frente' else (math.radians(90), 0, math.radians(90))
    o.location = (x, -y, z)
    bpy.ops.object.convert(target='MESH')
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    return _fim(o, cor, 0, 0.002)

def _ocupado(deck_z):
    """Footprint boxes (gx0, gy0, gx1, gy1) of everything standing on the deck."""
    caixas = []
    for o in grupo:
        if o.type != 'MESH': continue
        pts = [o.matrix_world @ Vector(c) for c in o.bound_box]
        if max(p.z for p in pts) <= deck_z + 0.012: continue        # the deck itself and flat markings
        xs = [p.x for p in pts]; ys = [-p.y for p in pts]
        caixas.append((min(xs), min(ys), max(xs), max(ys)))
    return caixas

def _livre(caixas, x0, y0, x1, y1, folga=0.05):
    return all(x1 + folga <= a or x0 - folga >= c or y1 + folga <= b or y0 - folga >= d for a, b, c, d in caixas)

def cabo(pontos, cor='#334155', r=0.016):
    """A cable lying on the deck through (gx, gy, z) points."""
    cd = bpy.data.curves.new('cabo', 'CURVE'); cd.dimensions = '3D'; cd.bevel_depth = r; cd.bevel_resolution = 3
    sp = cd.splines.new('BEZIER'); sp.bezier_points.add(len(pontos) - 1)
    for bp, (x, y, z) in zip(sp.bezier_points, pontos):
        bp.co = (x, -y, z); bp.handle_left_type = bp.handle_right_type = 'AUTO'
    o = bpy.data.objects.new('cabo', cd); sc.collection.objects.link(o)
    for x in bpy.context.selected_objects: x.select_set(False)
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.convert(target='MESH')
    return _fim(bpy.context.active_object, cor, 0, 0.004)

def detalhar(base, w, h, deck=(0.1, 0.1), z=0.12):
    if base not in CODIGOS: return
    x0, y0 = deck; x1, y1 = w - deck[0], h - deck[1]
    caixas = _ocupado(z)
    # Name plate on the front of the base, centered, dark with light letters.
    pw = min(w - 0.5, 0.075 * len(CODIGOS[base]) + 0.2)
    caixa(w / 2 - pw / 2, h - 0.035, w / 2 + pw / 2, h + 0.004, z * 0.12, z * 0.92, '#1e293b', bevel=0.008)
    texto3d(CODIGOS[base], w / 2, h + 0.006, z * 0.52, 0.07, '#e2e8f0')
    # Corner guards with a bolt, where the corner is free.
    for cx, cy in ((x0, y0), (x1 - 0.16, y0), (x0, y1 - 0.16), (x1 - 0.16, y1 - 0.16)):
        if not _livre(caixas, cx, cy, cx + 0.16, cy + 0.16, 0.01): continue
        caixa(cx, cy, cx + 0.16, cy + 0.16, z, z + 0.03, '#e8894a', bevel=0.012)
        cilindro(cx + 0.08, cy + 0.08, 0.026, z + 0.03, z + 0.05, '#94a3b8', v=12)
    # Bolts along the two deck edges the camera sees.
    n = int(w / 0.45)
    for i in range(1, n):
        bx = x0 + (x1 - x0) * i / n
        if _livre(caixas, bx - 0.03, y1 - 0.09, bx + 0.03, y1 - 0.03, 0.0): cilindro(bx, y1 - 0.06, 0.022, z, z + 0.02, '#94a3b8', v=10)
    n = int(h / 0.45)
    for i in range(1, n):
        by = y0 + (y1 - y0) * i / n
        if _livre(caixas, x1 - 0.09, by - 0.03, x1 - 0.03, by + 0.03, 0.0): cilindro(x1 - 0.06, by, 0.022, z, z + 0.02, '#94a3b8', v=10)
    # Control pedestal in the free spot nearest the front-right corner (the side the camera sees best).
    def lugar(pw, ph, nota):
        melhor = None
        gy = y1 - ph - 0.05
        while gy >= y0 + 0.05:
            gx = x1 - pw - 0.05
            while gx >= x0 + 0.05:
                if _livre(caixas, gx, gy, gx + pw, gy + ph):
                    v = nota(gx, gy)
                    if melhor is None or v > melhor[0]: melhor = (v, gx, gy)
                gx -= 0.05
            gy -= 0.05
        if melhor: caixas.append((melhor[1], melhor[2], melhor[1] + pw, melhor[2] + ph))
        return melhor and melhor[1:]
    pw, ph, alto = 0.38, 0.26, 0.46
    ponto = lugar(pw, ph, lambda gx, gy: gx + gy)
    if ponto:
        px, py = ponto
        caixa(px + 0.05, py + 0.05, px + pw - 0.05, py + ph - 0.05, z, z + 0.06, '#64748b', bevel=0.012)       # foot
        caixa(px, py, px + pw, py + ph, z + 0.06, z + alto, '#d9dee6', bevel=0.03)                              # body
        caixa(px - 0.015, py - 0.015, px + pw + 0.015, py + ph + 0.015, z + alto, z + alto + 0.04, '#e8894a', bevel=0.015)
        # Screen on the front face with lines of "text", then the status LEDs and a little antenna.
        caixa(px + 0.035, py + ph - 0.01, px + pw - 0.035, py + ph + 0.01, z + 0.17, z + alto - 0.035, '#1e293b', bevel=0.008)
        visor(px + 0.055, py + ph + 0.006, px + pw - 0.055, py + ph + 0.016, z + 0.19, z + alto - 0.055, '#8ae8ff')
        for k in range(3):
            zz = z + alto - 0.095 - k * 0.055
            caixa(px + 0.085, py + ph + 0.016, px + 0.085 + (0.2, 0.13, 0.16)[k], py + ph + 0.022, zz, zz + 0.016, '#1e3a5f', bevel=0)
        for k, cor in enumerate(('#4ade80', '#fbbf24', '#ef4444')):
            emissivo(esfera(px + 0.09 + k * 0.09, py + ph + 0.008, z + 0.11, 0.024, 0.016, 0.024, cor, linha=0.002), cor, 2.4)
        cilindro(px + pw - 0.06, py + 0.06, 0.012, z + alto + 0.04, z + alto + 0.2, '#94a3b8', v=8)
        emissivo(esfera(px + pw - 0.06, py + 0.06, z + alto + 0.21, 0.025, 0.025, 0.025, '#ef4444', linha=0.002), '#ef4444', 2.0)
        # Cable from the pedestal's back to the nearest thing standing on the deck.
        outros = caixas[:-1]
        if outros:
            cxp, cyp = px + pw / 2, py
            def perto(b):
                qx = min(max(cxp, b[0]), b[2]); qy = min(max(cyp, b[1]), b[3])
                return (qx - cxp) ** 2 + (qy - cyp) ** 2, qx, qy
            d2, qx, qy = min(perto(b) for b in outros)
            if d2 > 0.02:
                cabo([(cxp, cyp - 0.01, z + 0.07), ((cxp + qx) / 2, (cyp + qy) / 2, z + 0.022), (qx, qy, z + 0.07)], r=0.02)
    # A spare battery cartridge, the same as the Battery Bank's: green body, light lid, orange handle,
    # standing on a round charging pad, in a free spot toward the front-left.
    cw = 0.24
    ponto = lugar(cw + 0.08, cw + 0.08, lambda gx, gy: gy - gx * 0.6)
    if ponto:
        bx, by = ponto[0] + 0.04, ponto[1] + 0.04
        cilindro(bx + cw / 2, by + cw / 2, cw * 0.72, z, z + 0.018, '#cfe8dc', v=24)
        caixa(bx, by, bx + cw, by + cw, z + 0.018, z + 0.3, '#5fa883', bevel=0.025)
        caixa(bx - 0.012, by - 0.012, bx + cw + 0.012, by + cw + 0.012, z + 0.3, z + 0.36, '#d9dee6', bevel=0.02)
        visor(bx + 0.05, by + cw - 0.002, bx + cw - 0.05, by + cw + 0.008, z + 0.17, z + 0.25, '#eafff4')
        for k in range(3):
            caixa(bx + 0.06, by + cw, bx + cw - 0.06, by + cw + 0.01, z + 0.06 + k * 0.03, z + 0.07 + k * 0.03, '#2f6b52', bevel=0)
        haste((bx + 0.05, by + cw / 2, z + 0.36), (bx + 0.05, by + cw / 2, z + 0.42), 0.014, '#e8894a')
        haste((bx + cw - 0.05, by + cw / 2, z + 0.36), (bx + cw - 0.05, by + cw / 2, z + 0.42), 0.014, '#e8894a')
        haste((bx + 0.05, by + cw / 2, z + 0.42), (bx + cw - 0.05, by + cw / 2, z + 0.42), 0.016, '#e8894a')

def com_detalhes(nome, fn):
    import re
    base = 'plataforma' if nome.startswith('foguete') else re.sub(r'_(anim\d|agua\d)$', '', nome)
    def build():
        fn()
        if NOVO and base in CODIGOS:
            w, h = TIPOS[base]
            if base == 'plataforma': detalhar(base, w, h, deck=(0.1, 0.1), z=0.2)
            else: detalhar(base, w, h)
    return build

def animado(fn,frame):
    def build():
        global FASE
        FASE=frame
        fn()
        FASE=0
    return build

for nome,count in ANIMADOS.items():
    for frame in range(1,count): MODELOS[f'{nome}_anim{frame}']=animado(MODELOS[nome],frame)

for _n in list(MODELOS): MODELOS[_n] = com_detalhes(_n, MODELOS[_n])
MODELOS['foguete_voo'] = (lambda: foguete(4, sozinho=True))   # the launch film's rocket: no pad, no detail kit

# ---------- camera: render_terrain.py's 2:1 isometric camera ----------
elev = math.radians(30)
to_cam = Vector((math.cos(elev) * math.sqrt(0.5), -math.cos(elev) * math.sqrt(0.5), math.sin(elev)))
q = (-to_cam).to_track_quat('-Z', 'Y'); m3 = q.to_matrix(); right, up = m3.col[0], m3.col[1]
s = SUPER * T / math.sqrt(0.5)
cam = bpy.data.cameras.new('ModCam'); cam.type = 'ORTHO'; cam.clip_end = 200
cam_o = bpy.data.objects.new('ModCam', cam); sc.collection.objects.link(cam_o); sc.camera = cam_o
cam_o.rotation_mode = 'QUATERNION'; cam_o.rotation_quaternion = q
sun = bpy.data.lights.new('Sol', 'SUN'); sun.energy = 4.0; sun.use_shadow = False
if NOVO and not CARTOON: sun.energy = 0.0   # the soft area light (luz_estacao) lights each model instead
sun_o = bpy.data.objects.new('Sol', sun); sc.collection.objects.link(sun_o)
to_sun = (to_cam * 0.5 - right * 1.0 + Vector((0, 0, 0.45))).normalized()
sun_o.rotation_euler = (-to_sun).to_track_quat('-Z', 'Y').to_euler()

def luz_estacao():
    """The solar station's key light: a big warm disk above the front-left, aimed at the model, with soft shadows."""
    if not NOVO or CARTOON: return
    pts = [o.matrix_world @ Vector(c) for o in grupo for c in o.bound_box]
    if not pts: return
    centro = sum(pts, Vector()) / len(pts)
    luz = bpy.data.lights.new('Sol de exportacao', 'AREA'); luz.energy = 1500; luz.shape = 'DISK'; luz.size = 7
    o = bpy.data.objects.new('Sol de exportacao', luz); sc.collection.objects.link(o)
    o.location = centro + Vector((2, -5, 9))
    o.rotation_euler = (centro - o.location).to_track_quat('-Z', 'Y').to_euler()

def enquadrar(zoom=1):
    """Frames the camera on the current model, like the export does; returns (W, H, cx, cy, s)."""
    bpy.context.view_layer.update()
    pts = []
    for o in grupo:
        for c in o.bound_box: pts.append(o.matrix_world @ Vector(c))
    xs = [p.dot(right) for p in pts]; ys = [p.dot(up) for p in pts]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    sz = s * zoom
    W = math.ceil((x1 - x0) * sz) + 2 * PAD; H = math.ceil((y1 - y0) * sz) + 2 * PAD
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    cam.ortho_scale = max(W, H) / sz
    cam_o.location = right * cx + up * cy + to_cam * 50
    sc.render.resolution_x, sc.render.resolution_y = W, H
    return W, H, cx, cy


# Live preview of one model: in Blender, set SO = 'blindagem' (and PREVIEW = 'out.png') before
# running this file; it builds only that model and, with PREVIEW, renders it zoomed in.
if LIVE and globals().get('SO'):
    # SO may also be a list: the models are built side by side, 3 tiles apart, to compare them.
    for i, nome in enumerate(SO if isinstance(SO, (list, tuple)) else [SO]):
        antes = len(grupo); MODELOS[nome]()
        for o in grupo[antes:]: o.location.x += 3 * i
    if globals().get('PREVIEW'):
        enquadrar(globals().get('ZOOM', 3))
        sc.render.filepath = PREVIEW
        bpy.ops.render.render(write_still=True)
    print('model', SO, 'ready')
elif LIVE and not globals().get('EXPORTAR_MODULOS',False):
    x = 0
    for nome in ('habitat', 'suporte', 'blindagem', 'oficina', 'painel', 'plataforma', 'foguete4'):
        grupo.clear(); MODELOS[nome]()
        for o in grupo: o.location.x += x
        x += 4
    print('scene "Modulos" ready')
else:
    os.makedirs(OUT, exist_ok=True)
    saida = json.load(open(JSON)) if os.path.exists(JSON) else {}
    # MODULOS=oficina,oficina_anim1 renders only those and keeps the other entries of modulos.json.
    so = globals().get('APENAS') or [n for n in os.environ.get('MODULOS', '').split(',') if n]
    for nome, fn in MODELOS.items():
        if so and nome not in so: continue
        for o in list(sc.objects):
            if o.type == 'MESH' or (o.type == 'LIGHT' and o.data.type != 'SUN'): bpy.data.objects.remove(o)
        grupo.clear(); fn()
        luz_estacao()
        W, H, cx, cy = enquadrar()
        png = os.path.join(OUT, f'{nome}.png')
        sc.render.filepath = png
        bpy.ops.render.render(write_still=True)
        try:
            subprocess.run(['magick', png, '-dither', 'None', '-colors', '255', 'PNG8:' + png], check=True)
        except FileNotFoundError:   # no ImageMagick: same 255-color PNG8 through Pillow, if Blender has it
            try:
                from PIL import Image
                Image.open(png).quantize(255, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(png)
            except ImportError:
                print('no magick or Pillow in Blender: quantize', png, 'to 255 colors by hand')
        if nome == 'foguete_voo':
            # The flying rocket has its own json (Chegada.ts and Superficie.pousarFoguete read
            # src/dados/foguete_voo.json, not modulos.json). peNoPad = where the rocket's lowest
            # point and axis sit inside foguete4.png (same camera), so the landed film rocket
            # swaps into the standing one pixel for pixel; make_flying_rocket.py crops the picture.
            a4 = saida.get('foguete4')
            if a4 is None: a4 = json.load(open(JSON))['foguete4']
            d = Vector((-up.x, -up.y, 0))
            if d.length: d = d / d.length
            pts = [Vector((1.5, -1.5, 0.2)) + d * (0.72 * 0.56)]   # the yellow engine lip, the widest at the bottom
            for a in (0, 90, 180, 270):                            # the fins' bottom edges may dip lower on screen
                r = math.radians(a); c_, sn_ = math.cos(r), math.sin(r)
                for u in (0.72 - 0.05, 0.72 + 0.5):
                    for t in (0.08, -0.08):
                        pts.append(Vector((1.5 + c_ * u + sn_ * t, -1.5 - sn_ * u + c_ * t, 0.25)))
            b = min(pts, key=lambda p: p.dot(up))
            voo = {'w': W, 'h': H, 'pe': [round(W / 2, 2), round(H - PAD, 2)],
                   'peNoPad': [round(a4['ancora'][0] + (1.5 * right.x - 1.5 * right.y) * s, 2),
                               round(a4['ancora'][1] - b.dot(up) * s, 2)]}
            json.dump(voo, open(os.path.join(ROOT, 'src', 'dados', 'foguete_voo.json'), 'w', encoding='utf8'), indent=1)
            print('module', nome, W, H)
            continue
        o0 = Vector((0, 0, 0))
        saida[nome] = {'arquivo': f'lua/modulos/{nome}.png', 'w': W, 'h': H, 'escala': 1 / SUPER,
                       'ancora': [round((o0.dot(right) - cx) * s + W / 2, 2), round(H / 2 - (o0.dot(up) - cy) * s, 2)]}
        print('module', nome, W, H)
    with open(JSON, 'w') as f:
        json.dump(saida, f, indent=1)
    print('DONE')
