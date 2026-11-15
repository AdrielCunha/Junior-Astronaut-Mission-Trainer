# Generated with AI assistance (Gemini). See README, "Use of AI tools".
# Renders 3D toon flags marking chosen spots on the Moon and other planets.
# Uses the game's 2:1 isometric camera, toon lighting, and outline style.
#
# Usage:
#   blender -b -P tools/lua3d/make_flags.py
#   python3 tools/lua3d/bl.py --run tools/lua3d/make_flags.py  (live in open Blender)
#
# Out:
#   public/lua/bandeiras/<planeta>.png
#   src/dados/bandeiras.json

import bpy, bmesh, os, json, math, subprocess
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT_DIR = os.path.join(ROOT, 'public', 'lua', 'bandeiras')
JSON_PATH = os.path.join(ROOT, 'src', 'dados', 'bandeiras.json')
CACHE_TEX = os.path.join(HERE, '.cache', 'bandeiras')

LIVE = not bpy.app.background
T = 30
SUPER = 4
PAD = 20

LIGHT = [(0.0, '#3a3550'), (0.10, '#8a7f92'), (0.35, '#c9c0c4'), (0.55, '#ece5df'), (0.75, '#fffaf0')]
OUTLINE = '#17130f'


def rgb(h, a=1.0):
    h = h.lstrip('#')
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return (*[c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb], a)


# The original team emblem is versioned with the generator, not read from Downloads at runtime.
def gerar_texturas_tecido():
    emblem = os.path.join(HERE, 'assets', 'Emblema_orbital_da_Liga_Estelar.png')
    return {planet: emblem for planet in ('lua', 'marte', 'terra')}


# ---------- Scene Setup ----------
if LIVE:
    old = bpy.data.scenes.get('Bandeiras')
    if old:
        for o in list(old.objects): bpy.data.objects.remove(o)
        bpy.data.scenes.remove(old)
    sc = bpy.data.scenes.new('Bandeiras')
    bpy.context.window.scene = sc
else:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene

sc.render.engine = 'BLENDER_EEVEE'
sc.render.film_transparent = True
sc.render.image_settings.file_format = 'PNG'
sc.render.image_settings.color_mode = 'RGBA'
sc.view_settings.view_transform = 'Standard'
sc.view_settings.look = 'None'
sc.render.filter_size = 1.0


# ---------- Toon Materials ----------
_mats = {}
def toon_cor(cor):
    if cor in _mats: return _mats[cor]
    m = bpy.data.materials.new('band_' + cor); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links; N.clear()
    dif = N.new('ShaderNodeBsdfDiffuse'); s2r = N.new('ShaderNodeShaderToRGB')
    L.new(dif.outputs['BSDF'], s2r.inputs['Shader'])
    r = N.new('ShaderNodeValToRGB'); cr = r.color_ramp; cr.interpolation = 'CONSTANT'
    while len(cr.elements) < len(LIGHT): cr.elements.new(0.99)
    for e, (p, c) in zip(cr.elements, LIGHT): e.position = p; e.color = rgb(c)
    L.new(s2r.outputs['Color'], r.inputs['Fac'])
    mix = N.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'
    mix.inputs['Factor'].default_value = 1; mix.inputs[6].default_value = rgb(cor)
    L.new(r.outputs['Color'], mix.inputs[7])
    out = N.new('ShaderNodeOutputMaterial'); L.new(mix.outputs[2], out.inputs['Surface'])
    _mats[cor] = m
    return m


def material_tecido(caminho_tex):
    m = bpy.data.materials.new('tecido_' + os.path.basename(caminho_tex))
    m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links; N.clear()
    # Image Texture
    img_node = N.new('ShaderNodeTexImage')
    img_node.image = bpy.data.images.load(caminho_tex)
    img_node.extension = 'CLIP'
    # Keep the full rectangular emblem inside the broad part of the triangular pennant.
    uv = N.new('ShaderNodeTexCoord')
    offset = N.new('ShaderNodeVectorMath'); offset.operation='SUBTRACT'
    offset.inputs[1].default_value=(0.035,0.28,0)
    scale = N.new('ShaderNodeVectorMath'); scale.operation='MULTIPLY'
    scale.inputs[1].default_value=(2,1/0.44,1)
    L.new(uv.outputs['UV'],offset.inputs[0]); L.new(offset.outputs['Vector'],scale.inputs[0])
    L.new(scale.outputs['Vector'],img_node.inputs['Vector'])
    badge = N.new('ShaderNodeMix'); badge.data_type='RGBA'
    badge.inputs[6].default_value=rgb('#07172e')
    L.new(img_node.outputs['Alpha'],badge.inputs['Factor'])
    L.new(img_node.outputs['Color'],badge.inputs[7])
    # Toon shading over the texture
    dif = N.new('ShaderNodeBsdfDiffuse'); s2r = N.new('ShaderNodeShaderToRGB')
    L.new(dif.outputs['BSDF'], s2r.inputs['Shader'])
    r = N.new('ShaderNodeValToRGB'); cr = r.color_ramp; cr.interpolation = 'CONSTANT'
    while len(cr.elements) < len(LIGHT): cr.elements.new(0.99)
    for e, (p, c) in zip(cr.elements, LIGHT): e.position = p; e.color = rgb(c)
    L.new(s2r.outputs['Color'], r.inputs['Fac'])
    mix = N.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'
    mix.inputs['Factor'].default_value = 0.25
    L.new(badge.outputs[2], mix.inputs[6])
    L.new(r.outputs['Color'], mix.inputs[7])
    out = N.new('ShaderNodeOutputMaterial')
    L.new(mix.outputs[2], out.inputs['Surface'])
    return m


def contorno_mat():
    m = bpy.data.materials.new('contorno'); m.use_nodes = True
    m.use_backface_culling = True
    N = m.node_tree.nodes; L = m.node_tree.links; N.clear()
    em = N.new('ShaderNodeEmission'); em.inputs['Color'].default_value = rgb(OUTLINE)
    out = N.new('ShaderNodeOutputMaterial'); L.new(em.outputs[0], out.inputs['Surface'])
    return m

MAT_CONTORNO = contorno_mat()

def adicionar_contorno(obj, espessura=0.015):
    obj.data.materials.append(MAT_CONTORNO)
    s = obj.modifiers.new('contorno', 'SOLIDIFY')
    s.thickness = espessura; s.offset = 1; s.use_flip_normals = True
    s.material_offset = len(obj.data.materials) - 1
    s.use_rim = False


# ---------- Build the 3D Flag Model ----------
def construir_bandeira(caminho_tex):
    objetos = []
    largura = 1.4
    source = bpy.data.images.load(caminho_tex, check_existing=True)
    aspect = source.size[0] / source.size[1]
    altura = largura / aspect / math.cos(math.radians(30))
    z_topo = 2.15
    z_base = z_topo - altura

    # 1. Base stake / ground ring (at Z = 0)
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.09, depth=0.04)
    base = bpy.context.active_object; base.location = (0, 0, 0.02)
    base.data.materials.append(toon_cor('#64748b'))   # slate-500
    adicionar_contorno(base, 0.012)
    objetos.append(base)

    # 2. Taller destination mast, anchored at the selected map point.
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.022, depth=2.2)
    mastro = bpy.context.active_object; mastro.location = (0, 0, 1.1)
    mastro.data.materials.append(toon_cor('#e2e8f0'))  # slate-200 (aluminum)
    adicionar_contorno(mastro, 0.012)
    objetos.append(mastro)

    # 3. Golden finial above the fabric.
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=12, radius=0.032)
    ponta = bpy.context.active_object; ponta.location = (0, 0, 2.2)
    ponta.data.materials.append(toon_cor('#f59e0b'))  # amber-500 gold
    adicionar_contorno(ponta, 0.012)
    objetos.append(ponta)

    # 4. Rigid crossbar holds the emblem toward the isometric camera.
    support = right * largura + Vector((0,0,-altura/2))
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.012, depth=support.length)
    barra = bpy.context.active_object
    barra.rotation_mode='QUATERNION'
    barra.rotation_quaternion=support.to_track_quat('Z','Y')
    barra.location = support/2 + Vector((0,0,z_topo))
    barra.data.materials.append(toon_cor('#cbd5e1'))  # slate-300
    adicionar_contorno(barra, 0.01)
    objetos.append(barra)

    # 5. Flag cloth with gentle ripples / wave
    # Grid of vertices with sine wave displacement along X
    nx, nz = 32, 16

    bm = bmesh.new()
    verts_grid = []
    for j in range(nz + 1):
        row = []
        v_frac = j / nz
        z = z_base + v_frac * altura
        for i in range(nx + 1):
            u_frac = i / nx
            x = 0.01 + u_frac * largura
            # Subtle gentle wave along X, slightly larger near the free edge
            wave = 0.008 * math.sin(u_frac * math.pi * 2.2) * u_frac
            triangular_z = z_base + altura/2 + (v_frac-0.5)*altura*(1-u_frac)
            pos = right * x + Vector((0,0,triangular_z)) + Vector((to_cam.x,to_cam.y,0)).normalized()*wave
            v = bm.verts.new(pos)
            row.append(v)
        verts_grid.append(row)

    bm.verts.ensure_lookup_table()
    for j in range(nz):
        for i in range(nx):
            bm.faces.new((verts_grid[j][i], verts_grid[j][i + 1], verts_grid[j + 1][i + 1], verts_grid[j + 1][i]))

    # Set up UV mapping
    uv_layer = bm.loops.layers.uv.new()
    for face in bm.faces:
        for loop in face.loops:
            v = loop.vert
            # Map X to U, Z to V
            u = (v.co.dot(right) - 0.01) / largura
            val_v = (v.co.z - z_base) / altura
            loop[uv_layer].uv = (u, val_v)

    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=0.00001)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    me = bpy.data.meshes.new('tecido_mesh')
    bm.to_mesh(me); bm.free()
    tecido = bpy.data.objects.new('tecido', me)
    sc.collection.objects.link(tecido)
    tecido.data.materials.append(material_tecido(caminho_tex))
    adicionar_contorno(tecido, 0.005)
    objetos.append(tecido)

    # Turn the complete model in world space: diagonal crossbar and receding fabric,
    # while the mast stays upright and its foot remains exactly on the destination.
    bpy.context.view_layer.update()
    turn = Matrix.Rotation(math.radians(-30), 4, 'Z')
    for obj in objetos:
        obj.matrix_world = turn @ obj.matrix_world
    return objetos


# ---------- 2:1 Isometric Orthographic Camera Setup ----------
elev = math.radians(30)
to_cam = Vector((math.cos(elev) * math.sqrt(0.5), -math.cos(elev) * math.sqrt(0.5), math.sin(elev)))
q = (-to_cam).to_track_quat('-Z', 'Y'); m3 = q.to_matrix(); right, up = m3.col[0], m3.col[1]
s = SUPER * T / math.sqrt(0.5)

cam = bpy.data.cameras.new('BandeiraCam'); cam.type = 'ORTHO'; cam.clip_end = 200
cam_o = bpy.data.objects.new('BandeiraCam', cam); sc.collection.objects.link(cam_o); sc.camera = cam_o
cam_o.rotation_mode = 'QUATERNION'; cam_o.rotation_quaternion = q

sun = bpy.data.lights.new('BandeiraSol', 'SUN'); sun.energy = 4.5; sun.use_shadow = False
sun_o = bpy.data.objects.new('BandeiraSol', sun); sc.collection.objects.link(sun_o)
to_sun = (to_cam * 0.5 - right * 1.0 + Vector((0, 0, 0.5))).normalized()
sun_o.rotation_euler = (-to_sun).to_track_quat('-Z', 'Y').to_euler()


def main():
    tex_map = gerar_texturas_tecido()
    os.makedirs(OUT_DIR, exist_ok=True)

    if LIVE and not globals().get('EXPORTAR_BANDEIRAS', False):
        # Arrange all 3 flags side by side in Blender scene
        off_x = 0
        for nome, tex in tex_map.items():
            objs = construir_bandeira(tex)
            for o in objs: o.location.x += off_x
            off_x += 1.2
        print('Scene "Bandeiras" ready live in Blender')
        return

    saida = {}
    for nome, tex in tex_map.items():
        # Clear previous meshes
        for o in list(sc.objects):
            if o.type == 'MESH': bpy.data.objects.remove(o)

        objs = construir_bandeira(tex)
        bpy.context.view_layer.update()

        pts = []
        for o in objs:
            for c in o.bound_box: pts.append(o.matrix_world @ Vector(c))
        xs = [p.dot(right) for p in pts]; ys = [p.dot(up) for p in pts]
        x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)

        W = math.ceil((x1 - x0) * s) + 2 * PAD
        H = math.ceil((y1 - y0) * s) + 2 * PAD
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2

        cam.ortho_scale = max(W, H) / s
        cam_o.location = right * cx + up * cy + to_cam * 50
        sc.render.resolution_x, sc.render.resolution_y = W, H

        png = os.path.join(OUT_DIR, f'{nome}.png')
        sc.render.filepath = png
        bpy.ops.render.render(write_still=True)

        # Optimize PNG palette using ImageMagick
        subprocess.run(['magick', png, '-strip', png], check=True)

        o0 = Vector((0, 0, 0))
        ancora_x = round((o0.dot(right) - cx) * s + W / 2, 2)
        ancora_y = round(H / 2 - (o0.dot(up) - cy) * s, 2)

        saida[nome] = {
            'arquivo': f'lua/bandeiras/{nome}.png',
            'w': W, 'h': H,
            'escala': 1 / SUPER,
            'ancora': [ancora_x, ancora_y],
        }
        print(f'Rendered flag "{nome}": {W}x{H}, anchor={ancora_x},{ancora_y}')

    with open(JSON_PATH, 'w') as f:
        json.dump(saida, f, indent=2)

    print('DONE. Metadata saved to', JSON_PATH)


main()
