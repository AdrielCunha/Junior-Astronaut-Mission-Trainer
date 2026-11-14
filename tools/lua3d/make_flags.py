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
from mathutils import Vector
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT_DIR = os.path.join(ROOT, 'public', 'lua', 'bandeiras')
JSON_PATH = os.path.join(ROOT, 'src', 'dados', 'bandeiras.json')
CACHE_TEX = os.path.join(HERE, '.cache', 'bandeiras')

LIVE = not bpy.app.background
T = 30
SUPER = 2
PAD = 12

LIGHT = [(0.0, '#3a3550'), (0.10, '#8a7f92'), (0.35, '#c9c0c4'), (0.55, '#ece5df'), (0.75, '#fffaf0')]
OUTLINE = '#17130f'


def rgb(h, a=1.0):
    h = h.lstrip('#')
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return (*[c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb], a)


# ---------- Generate Flag Cloth Textures with PIL ----------
def gerar_texturas_tecido():
    os.makedirs(CACHE_TEX, exist_ok=True)
    w, h = 512, 340

    # 1. Lua (Moon Flag): deep space blue, gold border, crescent moon with craters & stars
    img_lua = Image.new('RGBA', (w, h), (15, 23, 42, 255))   # slate-900
    d = ImageDraw.Draw(img_lua)
    # Border
    d.rectangle([12, 12, w - 13, h - 13], outline=(234, 179, 8, 255), width=8)   # gold
    d.rectangle([20, 20, w - 21, h - 21], outline=(248, 250, 252, 180), width=3) # white inner
    # Full moon base disc
    cx, cy, r = 240, 170, 75
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(226, 232, 240, 255))
    # Crescent cutout to form a glowing lunar crescent
    d.ellipse([cx - r + 30, cy - r - 12, cx + r + 30, cy + r - 12], fill=(15, 23, 42, 255))
    # Crater spots on crescent
    d.ellipse([cx - 35, cy - 20, cx - 18, cy - 5], fill=(148, 163, 184, 255))
    d.ellipse([cx - 45, cy + 15, cx - 32, cy + 28], fill=(148, 163, 184, 255))
    d.ellipse([cx - 20, cy + 38, cx - 10, cy + 48], fill=(148, 163, 184, 255))
    # Stars
    def estrela(x, y, s, cor):
        d.polygon([(x, y - s), (x + s * 0.3, y - s * 0.3), (x + s, y), (x + s * 0.3, y + s * 0.3),
                   (x, y + s), (x - s * 0.3, y + s * 0.3), (x - s, y), (x - s * 0.3, y - s * 0.3)], fill=cor)
    estrela(370, 95, 18, (253, 224, 71, 255))
    estrela(395, 230, 14, (253, 224, 71, 255))
    estrela(340, 215, 10, (248, 250, 252, 255))
    estrela(120, 90, 12, (253, 224, 71, 255))
    estrela(100, 235, 14, (248, 250, 252, 255))
    tex_lua = os.path.join(CACHE_TEX, 'tecido_lua.png')
    img_lua.save(tex_lua)

    # 2. Marte (Mars Flag): dark charcoal, rust-orange ring, red planet with ice cap
    img_marte = Image.new('RGBA', (w, h), (24, 24, 27, 255))  # zinc-900
    d = ImageDraw.Draw(img_marte)
    d.rectangle([12, 12, w - 13, h - 13], outline=(234, 88, 12, 255), width=8)   # orange-600
    d.rectangle([20, 20, w - 21, h - 21], outline=(254, 215, 170, 180), width=3) # orange-200
    cx, cy, r = 240, 170, 75
    # Mars globe
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(194, 65, 12, 255))        # orange-700
    # Canyons & dark surface features
    d.ellipse([cx - 40, cy - 15, cx + 50, cy + 35], fill=(154, 52, 18, 255))
    # North polar ice cap
    d.chord([cx - 42, cy - r + 2, cx + 42, cy - r + 38], start=180, end=360, fill=(255, 255, 255, 255))
    # Moons: Phobos & Deimos
    d.ellipse([375, 120, 395, 140], fill=(214, 211, 209, 255))
    d.ellipse([345, 225, 357, 237], fill=(168, 162, 158, 255))
    tex_marte = os.path.join(CACHE_TEX, 'tecido_marte.png')
    img_marte.save(tex_marte)

    # 3. Terra (Earth Flag): deep navy, cyan border, Blue Marble globe
    img_terra = Image.new('RGBA', (w, h), (11, 19, 43, 255))
    d = ImageDraw.Draw(img_terra)
    d.rectangle([12, 12, w - 13, h - 13], outline=(56, 189, 248, 255), width=8)  # sky-400
    d.rectangle([20, 20, w - 21, h - 21], outline=(255, 255, 255, 180), width=3)
    cx, cy, r = 240, 170, 75
    # Ocean
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(37, 99, 235, 255))         # blue-600
    # Continents
    d.ellipse([cx - 50, cy - 45, cx + 15, cy + 20], fill=(34, 197, 94, 255))     # green-500
    d.ellipse([cx + 10, cy - 25, cx + 55, cy + 30], fill=(34, 197, 94, 255))
    d.ellipse([cx - 30, cy + 25, cx + 20, cy + 62], fill=(34, 197, 94, 255))
    # Clouds
    d.arc([cx - 60, cy - 60, cx + 40, cy + 40], start=20, end=140, fill=(255, 255, 255, 180), width=8)
    tex_terra = os.path.join(CACHE_TEX, 'tecido_terra.png')
    img_terra.save(tex_terra)

    return {'lua': tex_lua, 'marte': tex_marte, 'terra': tex_terra}


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
    # Toon shading over the texture
    dif = N.new('ShaderNodeBsdfDiffuse'); s2r = N.new('ShaderNodeShaderToRGB')
    L.new(dif.outputs['BSDF'], s2r.inputs['Shader'])
    r = N.new('ShaderNodeValToRGB'); cr = r.color_ramp; cr.interpolation = 'CONSTANT'
    while len(cr.elements) < len(LIGHT): cr.elements.new(0.99)
    for e, (p, c) in zip(cr.elements, LIGHT): e.position = p; e.color = rgb(c)
    L.new(s2r.outputs['Color'], r.inputs['Fac'])
    mix = N.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'
    mix.inputs['Factor'].default_value = 0.95
    L.new(img_node.outputs['Color'], mix.inputs[6])
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

    # 1. Base stake / ground ring (at Z = 0)
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.06, depth=0.04)
    base = bpy.context.active_object; base.location = (0, 0, 0.02)
    base.data.materials.append(toon_cor('#64748b'))   # slate-500
    adicionar_contorno(base, 0.012)
    objetos.append(base)

    # 2. Vertical Mast / Flagpole (from Z = 0 to Z = 0.95)
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.016, depth=0.96)
    mastro = bpy.context.active_object; mastro.location = (0, 0, 0.48)
    mastro.data.materials.append(toon_cor('#e2e8f0'))  # slate-200 (aluminum)
    adicionar_contorno(mastro, 0.012)
    objetos.append(mastro)

    # 3. Golden finial sphere on top of the mast (at Z = 0.96)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=12, radius=0.032)
    ponta = bpy.context.active_object; ponta.location = (0, 0, 0.96)
    ponta.data.materials.append(toon_cor('#f59e0b'))  # amber-500 gold
    adicionar_contorno(ponta, 0.012)
    objetos.append(ponta)

    # 4. Apollo horizontal crossbar rod (along +X at Z = 0.92)
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.009, depth=0.48)
    barra = bpy.context.active_object
    barra.rotation_euler = (0, math.radians(90), 0)
    barra.location = (0.24, 0, 0.92)
    barra.data.materials.append(toon_cor('#cbd5e1'))  # slate-300
    adicionar_contorno(barra, 0.01)
    objetos.append(barra)

    # 5. Flag cloth with gentle ripples / wave
    # Grid of vertices with sine wave displacement along X
    nx, nz = 16, 8
    largura = 0.46
    altura = 0.32
    z_topo = 0.92
    z_base = z_topo - altura

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
            y = 0.018 * math.sin(u_frac * math.pi * 2.2) * (0.3 + 0.7 * u_frac)
            v = bm.verts.new((x, y, z))
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
            u = (v.co.x - 0.01) / largura
            val_v = (v.co.z - z_base) / altura
            loop[uv_layer].uv = (u, val_v)

    me = bpy.data.meshes.new('tecido_mesh')
    bm.to_mesh(me); bm.free()
    tecido = bpy.data.objects.new('tecido', me)
    sc.collection.objects.link(tecido)
    tecido.data.materials.append(material_tecido(caminho_tex))
    adicionar_contorno(tecido, 0.01)
    objetos.append(tecido)

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

    if LIVE:
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
        subprocess.run(['magick', png, '-dither', 'None', '-colors', '255', 'PNG8:' + png], check=True)

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
