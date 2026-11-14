# Generated with AI assistance (Claude). See README, "Use of AI tools".
# Renders the playable map (from make_terrain.py) as one isometric picture in the same toon
# style as the Moon, and writes the exact tile -> pixel mapping next to the heights.
#
#   blender -b -P tools/lua3d/render_terrain.py        (headless, ~20 s)
#   python3 tools/lua3d/bl.py --run tools/lua3d/render_terrain.py   (live, scene "Terreno")
#
# In:  src/dados/terreno.json (alturas)
# Out: public/lua/terrain.png, and terreno.json gains "imagem": {w, h, origem, ex, ey, ez}
#      so that pixel = origem + gx * ex + gy * ey + z * ez   (z in tiles, up)
import bpy, bmesh, os, json, math
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
JSON = os.path.join(ROOT, 'src', 'dados', 'terreno.json')
PNG = os.path.join(ROOT, 'public', 'lua', 'terrain.png')
LIVE = not bpy.app.background

T = 30                      # pixels per tile step: gx moves (T, T/2) on screen, the classic 2:1
SKIRT = 3.0                 # tiles of "cut ground" under the lowest point, diorama style
PAD = 24                    # px around the picture
# Palette shared with make_moon.py: warm regolith, cool purple shade, dark outline.
GROUND = [(0.0, '#8f8571'), (0.42, '#a39882'), (0.6, '#b6ab92'), (0.75, '#c6bba1')]
ROCK = '#6a6152'            # steep tiles
STRATA = [(0.0, '#3b342c'), (0.5, '#4f463b'), (0.8, '#5c5245')]
LIGHT = [(0.0, '#3a3550'), (0.10, '#8a7f92'), (0.35, '#c9c0c4'), (0.55, '#ece5df'), (0.75, '#fffaf0')]
OUTLINE = '#17130f'


def rgb(h, a=1.0):
    h = h.lstrip('#')
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return (*[c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb], a)


with open(JSON) as f:
    data = json.load(f)
H = data['alturas']
N = data['n']
zmin = min(min(r) for r in H) - SKIRT

# ---------- scene ----------
if LIVE:
    old = bpy.data.scenes.get('Terreno')
    if old:
        for o in list(old.objects): bpy.data.objects.remove(o)
        bpy.data.scenes.remove(old)
    sc = bpy.data.scenes.new('Terreno'); bpy.context.window.scene = sc
else:
    bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
sc.render.engine = 'BLENDER_EEVEE'
sc.render.film_transparent = True
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
sc.render.filter_size = 1.0

# ---------- mesh: Blender X = gx, Y = -gy, Z = height (all in tiles) ----------
bm = bmesh.new()
top = [[bm.verts.new((gx, -gy, H[gy][gx])) for gx in range(N + 1)] for gy in range(N + 1)]
for gy in range(N):
    for gx in range(N):
        bm.faces.new((top[gy][gx], top[gy + 1][gx], top[gy + 1][gx + 1], top[gy][gx + 1]))
ring = [top[0][i] for i in range(N + 1)] + [top[i][N] for i in range(1, N + 1)] + \
       [top[N][i] for i in range(N - 1, -1, -1)] + [top[i][0] for i in range(N - 1, 0, -1)]
low = [bm.verts.new((v.co.x, v.co.y, zmin)) for v in ring]
side = []
for i in range(len(ring)):
    j = (i + 1) % len(ring)
    side.append(bm.faces.new((ring[i], ring[j], low[j], low[i])))
bm.faces.new(low[::-1])
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
for f in side: f.material_index = 1
me = bpy.data.meshes.new('Terreno'); bm.to_mesh(me); bm.free()
for p in me.polygons: p.use_smooth = p.material_index == 0
ob = bpy.data.objects.new('Terreno', me); sc.collection.objects.link(ob)


def toon(name, albedo_fn):
    m = bpy.data.materials.new(name); m.use_nodes = True
    N_ = m.node_tree.nodes; L = m.node_tree.links; N_.clear()
    def node(t, **kw):
        n = N_.new(t)
        for k, v in kw.items(): setattr(n, k, v)
        return n
    def ramp(stops):
        n = node('ShaderNodeValToRGB'); cr = n.color_ramp; cr.interpolation = 'CONSTANT'
        while len(cr.elements) < len(stops): cr.elements.new(0.99)
        for e, (p, c) in zip(cr.elements, stops): e.position = p; e.color = rgb(c)
        return n
    albedo = albedo_fn(node, ramp, L)
    dif = node('ShaderNodeBsdfDiffuse'); s2r = node('ShaderNodeShaderToRGB')
    L.new(dif.outputs['BSDF'], s2r.inputs['Shader'])
    rl = ramp(LIGHT); L.new(s2r.outputs['Color'], rl.inputs['Fac'])
    mix = node('ShaderNodeMix', data_type='RGBA', blend_type='MULTIPLY'); mix.inputs['Factor'].default_value = 1
    L.new(albedo, mix.inputs[6]); L.new(rl.outputs['Color'], mix.inputs[7])
    em = node('ShaderNodeEmission'); L.new(mix.outputs[2], em.inputs['Color'])
    out = node('ShaderNodeOutputMaterial'); L.new(em.outputs[0], out.inputs['Surface'])
    return m


def ground(node, ramp, L):
    # Regolith: soft noise patches in a few flat tones; steep tiles turn to darker rock.
    tc = node('ShaderNodeTexCoord')
    nz = node('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 0.22
    nz.inputs['Detail'].default_value = 3.0
    L.new(tc.outputs['Object'], nz.inputs['Vector'])
    g = ramp(GROUND); L.new(nz.outputs['Fac'], g.inputs['Fac'])
    geo = node('ShaderNodeNewGeometry'); sep = node('ShaderNodeSeparateXYZ')
    L.new(geo.outputs['Normal'], sep.inputs['Vector'])
    steep = node('ShaderNodeMath', operation='LESS_THAN'); steep.inputs[1].default_value = math.cos(math.radians(22))
    L.new(sep.outputs['Z'], steep.inputs[0])
    mx = node('ShaderNodeMix', data_type='RGBA'); mx.inputs[7].default_value = rgb(ROCK)
    L.new(steep.outputs[0], mx.inputs['Factor']); L.new(g.outputs['Color'], mx.inputs[6])
    # Contour line every tile of height (80 m): thin, so the relief reads at a glance.
    sp = node('ShaderNodeSeparateXYZ'); L.new(tc.outputs['Object'], sp.inputs['Vector'])
    fr = node('ShaderNodeMath', operation='FRACT'); L.new(sp.outputs['Z'], fr.inputs[0])
    dist = node('ShaderNodeMath', operation='PINGPONG'); dist.inputs[1].default_value = 0.5
    L.new(fr.outputs[0], dist.inputs[0])
    line = node('ShaderNodeMath', operation='LESS_THAN'); line.inputs[1].default_value = 0.035
    L.new(dist.outputs[0], line.inputs[0])
    ln = node('ShaderNodeMix', data_type='RGBA'); ln.inputs[7].default_value = rgb('#6f6556')
    L.new(line.outputs[0], ln.inputs['Factor']); L.new(mx.outputs[2], ln.inputs[6])
    return ln.outputs[2]


def strata(node, ramp, L):
    tc = node('ShaderNodeTexCoord'); sep = node('ShaderNodeSeparateXYZ')
    L.new(tc.outputs['Object'], sep.inputs['Vector'])
    wave = node('ShaderNodeMath', operation='FRACT')
    sc_ = node('ShaderNodeMath', operation='MULTIPLY'); sc_.inputs[1].default_value = 0.45
    L.new(sep.outputs['Z'], sc_.inputs[0]); L.new(sc_.outputs[0], wave.inputs[0])
    r = ramp(STRATA); L.new(wave.outputs[0], r.inputs['Fac'])
    return r.outputs['Color']


me.materials.append(toon('TerrenoChao', ground))
me.materials.append(toon('TerrenoCorte', strata))
ol = bpy.data.materials.new('TerrenoContorno'); ol.use_nodes = True; ol.use_backface_culling = True
on = ol.node_tree.nodes; on.clear()
oe = on.new('ShaderNodeEmission'); oe.inputs['Color'].default_value = rgb(OUTLINE)
oo = on.new('ShaderNodeOutputMaterial'); ol.node_tree.links.new(oe.outputs[0], oo.inputs['Surface'])
me.materials.append(ol)
sol = ob.modifiers.new('contorno', 'SOLIDIFY')
sol.thickness = 0.12; sol.offset = 1.0; sol.use_flip_normals = True; sol.material_offset = 2; sol.use_rim = False

# ---------- 2:1 isometric camera: 30 deg above the ground, looking along +gx +gy ----------
elev = math.radians(30)
to_cam = Vector((math.cos(elev) * math.sqrt(0.5), -math.cos(elev) * math.sqrt(0.5), math.sin(elev)))
q = (-to_cam).to_track_quat('-Z', 'Y'); m3 = q.to_matrix()
right, up = m3.col[0], m3.col[1]
s = T / math.sqrt(0.5)                         # px per world unit, so one gx step is T px across
pts = [v.co for v in me.vertices]
xs = [p.dot(right) for p in pts]; ys = [p.dot(up) for p in pts]
x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
W = math.ceil((x1 - x0) * s) + 2 * PAD; Hh = math.ceil((y1 - y0) * s) + 2 * PAD
cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
cam = bpy.data.cameras.new('TerrenoCam'); cam.type = 'ORTHO'; cam.ortho_scale = max(W, Hh) / s
cam_o = bpy.data.objects.new('TerrenoCam', cam); sc.collection.objects.link(cam_o); sc.camera = cam_o
cam_o.location = right * cx + up * cy + to_cam * 200
cam_o.rotation_mode = 'QUATERNION'; cam_o.rotation_quaternion = q
cam.clip_end = 1000
sc.render.resolution_x, sc.render.resolution_y = W, Hh


def pixel(p):
    return [(p.dot(right) - cx) * s + W / 2, Hh / 2 - (p.dot(up) - cy) * s]


o = pixel(Vector((0, 0, 0)))
ex = [a - b for a, b in zip(pixel(Vector((1, 0, 0))), o)]
ey = [a - b for a, b in zip(pixel(Vector((0, -1, 0))), o)]
ez = [a - b for a, b in zip(pixel(Vector((0, 0, 1))), o)]

# Sun: stylized, from the upper left of the screen like the Moon view. (At the real pole the
# Sun skims the horizon; the game says so in the space view instead of hiding the map in shadow.)
sun = bpy.data.lights.new('Sol', 'SUN'); sun.energy = 4.0; sun.use_shadow = False
sun_o = bpy.data.objects.new('Sol', sun); sc.collection.objects.link(sun_o)
to_sun = (to_cam * 0.5 - right * 1.0 + Vector((0, 0, 0.45))).normalized()
sun_o.rotation_euler = (-to_sun).to_track_quat('-Z', 'Y').to_euler()

if LIVE:
    for area in bpy.context.window.screen.areas:
        if area.type == 'VIEW_3D':
            sp = area.spaces.active; sp.shading.type = 'RENDERED'
            sp.region_3d.view_perspective = 'CAMERA'; sp.overlay.show_overlays = False
    print('scene "Terreno" ready', W, Hh)
else:
    os.makedirs(os.path.dirname(PNG), exist_ok=True)
    sc.render.filepath = PNG
    bpy.ops.render.render(write_still=True)
    import subprocess
    subprocess.run(['magick', PNG, '-dither', 'None', '-colors', '255', 'PNG8:' + PNG], check=True)
    r = lambda v: [round(c, 4) for c in v]
    data['imagem'] = {'arquivo': 'lua/terrain.png', 'w': W, 'h': Hh, 'origem': r(o), 'ex': r(ex), 'ey': r(ey), 'ez': r(ez)}
    with open(JSON, 'w') as f:
        json.dump(data, f, separators=(',', ':'))
    print('DONE', W, Hh, data['imagem'])
