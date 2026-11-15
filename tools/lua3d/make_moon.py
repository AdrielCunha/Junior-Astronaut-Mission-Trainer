# Generated with AI assistance (Claude). See README, "Use of AI tools".
# Builds the Moon as a stylized sphere (flat colors, hard light bands, dark outline),
# seen from an isometric camera, using real NASA data:
#   nasa/lroc_color_poles_2k.tif  LRO / LROC color mosaic   (NASA SVS CGI Moon Kit, id 4720)
#   nasa/ldem_4_uint.tif          LRO / LOLA elevation map  (same kit)
#   nasa/starmap_2020_4k.exr      Deep Star Maps 2020, J2000 RA/Dec  (NASA SVS id 4851; not in git,
#   nasa/constellation_figures_4k.tif                                   the script downloads it)
#
# Geometry is real: the world frame is the ecliptic (X = vernal equinox, Z = ecliptic north,
# which is also the Moon's spin axis to within 1.5 deg). The Sun sits on the ecliptic at its
# May 2024 longitude, and the star map is rotated from equatorial to ecliptic, so the stars
# behind the Moon are the ones really in that direction.
#
# Two ways to run it:
#   Headless, renders the sprites for Phaser into public/lua/:
#     blender -b -P tools/lua3d/make_moon.py -- [--frames 48] [--size 384] [--still 1024]
#   Live, builds the scene "Lua" inside an open Blender (official MCP extension, port 9876):
#     python3 tools/lua3d/bl.py --run tools/lua3d/make_moon.py
# Output of the headless run:
#   .cache/moon_spin.png  sprite sheet of one lunar day, for reference (the game draws the Moon live)
#   sky.jpg          star field seen behind the Moon, same camera direction
#   .cache/constellations.png  IAU figures for the same view (make_constellations.py splits it)
# and src/dados/moon_view.json: frame layout + camera vectors, so the game can pin the surface.
import bpy, bmesh, sys, os, math, json, argparse
import numpy as np
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from estilo_lua import PALETA
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'public', 'lua')
TMP = os.path.join(HERE, '.cache', 'frames')
LIVE = not bpy.app.background

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv and not LIVE else []
ap = argparse.ArgumentParser()
ap.add_argument('--frames', type=int, default=144)   # 2.5 deg apart; the game blends neighbors
ap.add_argument('--size', type=int, default=320)
ap.add_argument('--cols', type=int, default=12)   # 12 x 320 = 3840 px: under the 4096 texture limit
ap.add_argument('--sky', type=int, default=2048, help='sky width; height is 9/16 of it')
args = ap.parse_args(argv)

# ---------- look: every tunable number lives here ----------
RELIEF = 0.035          # height exaggeration, fraction of the radius (real range is ~1.1%)
OUTLINE_W = 0.022       # outline thickness, fraction of the radius
# Albedo bands, dark maria -> bright highlands. Stops are linear luminance of the LROC map
# (measured: p10 = 0.14, p50 = 0.34, p90 = 0.44).
ALBEDO = PALETA['albedoLua']
# Light bands, multiplied over the albedo: night side, terminator, lit, sun-facing.
LIGHT = PALETA['luzLua']
OUTLINE = PALETA['contorno']

# Astronomy (all angles in degrees).
OBLIQUITY = 23.439       # Earth's axial tilt: rotates equatorial star coordinates to ecliptic
SUN_LON = 48.0           # Sun's ecliptic longitude on 2024-05-08 (chapter 1 is 5-12 May 2024)
NEW_MOON = '2024-05-08T03:22:00Z'   # at new moon the Sun is over lunar longitude 180
SYNODIC = 29.530589      # days in one lunar day (sunrise to sunrise)
CAM_ELEV = -math.degrees(math.atan(1 / math.sqrt(2)))  # isometric angle, from the south side
CAM_FROM_SUN = 60        # camera sits 60 deg around from the Sun: lit gibbous disc
BASE = {'name': 'Shackleton crater rim', 'lat': -89.55, 'lon': -163.5}  # center of the map (make_terrain.py)

def rgb(h, a=1.0):
    h = h.lstrip('#')
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return (*[c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb], a)

# ---------- scene: its own scene, so nothing else in the .blend is touched ----------
if LIVE:
    old = bpy.data.scenes.get('Lua')
    if old:
        for o in list(old.objects): bpy.data.objects.remove(o)
        bpy.data.scenes.remove(old)
    sc = bpy.data.scenes.new('Lua')
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
def load(name):
    p = os.path.join(HERE, 'nasa', name)
    if not os.path.exists(p):
        import urllib.request
        urllib.request.urlretrieve('https://svs.gsfc.nasa.gov/vis/a000000/a004800/a004851/' + name, p)
    for im in bpy.data.images:
        if im.filepath == p: return im
    return bpy.data.images.load(p)

# World: star map. Blender's equirect lookup puts u = 0.5 at -X, so the vector is turned
# 180 deg about Z after the ecliptic -> equatorial tilt about X.
star_img = load('starmap_2020_4k.exr'); star_img.colorspace_settings.name = 'Linear Rec.709'
figs_img = load('constellation_figures_4k.tif')
world = bpy.data.worlds.get('LuaWorld') or bpy.data.worlds.new('LuaWorld')
sc.world = world; world.use_nodes = True
wn = world.node_tree.nodes; wl = world.node_tree.links; wn.clear()
w_tc = wn.new('ShaderNodeTexCoord')
w_map = wn.new('ShaderNodeMapping'); w_map.vector_type = 'POINT'
w_map.inputs['Rotation'].default_value = (math.radians(OBLIQUITY), 0, math.radians(180))
w_env = wn.new('ShaderNodeTexEnvironment'); w_env.image = star_img
w_bg = wn.new('ShaderNodeBackground'); w_bg.inputs['Strength'].default_value = 1.0
w_out = wn.new('ShaderNodeOutputWorld')
wl.new(w_tc.outputs['Generated'], w_map.inputs['Vector']); wl.new(w_map.outputs['Vector'], w_env.inputs['Vector'])
wl.new(w_env.outputs['Color'], w_bg.inputs['Color']); wl.new(w_bg.outputs['Background'], w_out.inputs['Surface'])

color_img = load('lroc_color_poles_2k.tif')
dem_img = load('ldem_4_uint.tif'); dem_img.colorspace_settings.name = 'Non-Color'

# ---------- moon mesh: cube-sphere (no pinched poles), equirectangular UVs ----------
def cube_sphere(n):
    verts, faces, base = [], [], 0
    t = np.linspace(-1, 1, n + 1)
    a, b = np.meshgrid(t, t, indexing='ij')
    one = np.ones_like(a)
    for axis, sign in [(0, 1), (0, -1), (1, 1), (1, -1), (2, 1), (2, -1)]:
        p = [None] * 3
        p[axis] = one * sign
        o = [i for i in range(3) if i != axis]
        p[o[0]], p[o[1]] = (a, b) if sign > 0 else (b, a)
        q = np.stack(p, -1).reshape(-1, 3)
        verts.append(q / np.linalg.norm(q, axis=1, keepdims=True))
        idx = np.arange((n + 1) ** 2).reshape(n + 1, n + 1) + base
        faces.append(np.stack([idx[:-1, :-1], idx[1:, :-1], idx[1:, 1:], idx[:-1, 1:]], -1).reshape(-1, 4))
        base += (n + 1) ** 2
    return np.concatenate(verts), np.concatenate(faces)

V, F = cube_sphere(220)
me = bpy.data.meshes.new('Moon')
me.from_pydata(V.tolist(), [], F.tolist())
bm = bmesh.new(); bm.from_mesh(me)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
uvl = bm.loops.layers.uv.new('UVMap')
for f in bm.faces:
    uvs = []
    for lp in f.loops:
        x, y, z = lp.vert.co
        # Longitude 0 (center of the near side, u = 0.5) points to +X; north is +Z.
        uvs.append([0.5 + math.atan2(y, x) / (2 * math.pi),
                    0.5 + math.asin(max(-1, min(1, z))) / math.pi,
                    abs(z) > 0.99999])
    us = [q[0] for q in uvs if not q[2]]
    if max(us) - min(us) > 0.5:          # face crosses the 180 deg seam
        for q in uvs:
            if q[0] < 0.5: q[0] += 1
        us = [q[0] for q in uvs if not q[2]]
    for q in uvs:
        if q[2]: q[0] = sum(us) / len(us)  # pole vertex: take the face's longitude
    for lp, q in zip(f.loops, uvs):
        lp[uvl].uv = (q[0], q[1])
bm.to_mesh(me); bm.free()
for p in me.polygons: p.use_smooth = True
moon = bpy.data.objects.new('Moon', me); sc.collection.objects.link(moon)

tex = bpy.data.textures.new('MoonDEM', type='IMAGE'); tex.image = dem_img; tex.extension = 'REPEAT'
d = moon.modifiers.new('relief', 'DISPLACE')
d.texture = tex; d.texture_coords = 'UV'; d.direction = 'NORMAL'
d.mid_level = 0.5; d.strength = RELIEF

# ---------- toon material ----------
m = bpy.data.materials.new('MoonToon'); m.use_nodes = True
nt = m.node_tree; N = nt.nodes; L = nt.links; N.clear()
def node(t, x, y, **kw):
    n = N.new(t); n.location = (x, y)
    for k, v in kw.items(): setattr(n, k, v)
    return n
def ramp(n, stops):
    cr = n.color_ramp; cr.interpolation = 'CONSTANT'
    while len(cr.elements) < len(stops): cr.elements.new(0.99)
    for e, (pos, col) in zip(cr.elements, stops): e.position = pos; e.color = rgb(col)

uv = node('ShaderNodeTexCoord', -1200, 0)
im = node('ShaderNodeTexImage', -1000, 200, image=color_img, interpolation='Linear', extension='REPEAT')
L.new(uv.outputs['UV'], im.inputs['Vector'])
bw = node('ShaderNodeRGBToBW', -720, 200); L.new(im.outputs['Color'], bw.inputs['Color'])
ramp_a = node('ShaderNodeValToRGB', -520, 200); ramp_a.label = 'Albedo bands'; ramp(ramp_a, ALBEDO)
L.new(bw.outputs['Val'], ramp_a.inputs['Fac'])
dif = node('ShaderNodeBsdfDiffuse', -720, -200); dif.inputs['Color'].default_value = (1, 1, 1, 1)
s2r = node('ShaderNodeShaderToRGB', -520, -200); L.new(dif.outputs['BSDF'], s2r.inputs['Shader'])
ramp_l = node('ShaderNodeValToRGB', -300, -200); ramp_l.label = 'Light bands'; ramp(ramp_l, LIGHT)
L.new(s2r.outputs['Color'], ramp_l.inputs['Fac'])
mix = node('ShaderNodeMix', -60, 0, data_type='RGBA', blend_type='MULTIPLY')
mix.inputs['Factor'].default_value = 1.0
L.new(ramp_a.outputs['Color'], mix.inputs[6]); L.new(ramp_l.outputs['Color'], mix.inputs[7])
emit = node('ShaderNodeEmission', 160, 0); L.new(mix.outputs[2], emit.inputs['Color'])
out = node('ShaderNodeOutputMaterial', 360, 0); L.new(emit.outputs['Emission'], out.inputs['Surface'])
moon.data.materials.append(m)

# ---------- outline: inverted hull ----------
ol = bpy.data.materials.new('MoonOutline'); ol.use_nodes = True
ol.use_backface_culling = True
on = ol.node_tree.nodes; on.clear()
oe = on.new('ShaderNodeEmission'); oe.inputs['Color'].default_value = rgb(OUTLINE)
oo = on.new('ShaderNodeOutputMaterial'); ol.node_tree.links.new(oe.outputs[0], oo.inputs['Surface'])
moon.data.materials.append(ol)
sol = moon.modifiers.new('outline', 'SOLIDIFY')
sol.thickness = OUTLINE_W; sol.offset = 1.0; sol.use_flip_normals = True
sol.material_offset = 1; sol.use_rim = False

# ---------- isometric camera and the real Sun ----------
from datetime import datetime, timezone
def unit(az, el):
    a, e = math.radians(az), math.radians(el)
    return Vector((math.cos(e) * math.cos(a), math.cos(e) * math.sin(a), math.sin(e)))

to_sun = unit(SUN_LON, 0)
def camera_dir(side):
    return unit(SUN_LON + side * CAM_FROM_SUN, CAM_ELEV)
def cam_basis(to_cam):
    q = (-to_cam).to_track_quat('-Z', 'Y')
    m = q.to_matrix()
    return q, m.col[0], m.col[1]
# Pick the side that puts the Sun on the left of the screen.
to_cam = camera_dir(1)
if cam_basis(to_cam)[1].dot(to_sun) > 0: to_cam = camera_dir(-1)
cam_q, cam_right, cam_up = cam_basis(to_cam)

cam = bpy.data.cameras.new('IsoCam'); cam.type = 'ORTHO'
cam.ortho_scale = 2.0 * (1 + RELIEF + OUTLINE_W) + 0.08
cam_o = bpy.data.objects.new('IsoCam', cam); sc.collection.objects.link(cam_o); sc.camera = cam_o
cam_o.location = to_cam * 10; cam_o.rotation_mode = 'QUATERNION'; cam_o.rotation_quaternion = cam_q

# Sky camera: same direction, perspective, for the star background.
sky = bpy.data.cameras.new('SkyCam'); sky.type = 'PERSP'; sky.sensor_fit = 'HORIZONTAL'; sky.angle = math.radians(70)
sky_o = bpy.data.objects.new('SkyCam', sky); sc.collection.objects.link(sky_o)
sky_o.location = (0, 0, 0); sky_o.rotation_mode = 'QUATERNION'; sky_o.rotation_quaternion = cam_q

# No cast shadows: the outline shell would shadow the Moon, and flat bands read better.
sun = bpy.data.lights.new('Sun', 'SUN'); sun.energy = 4.0; sun.angle = 0.0; sun.use_shadow = False
sun_o = bpy.data.objects.new('Sun', sun); sc.collection.objects.link(sun_o)
sun_o.rotation_euler = (-to_sun).to_track_quat('-Z', 'Y').to_euler()

# Spin. Moon-fixed longitude L sits at world azimuth (spin + L). The subsolar longitude is
# 180 at new moon and falls 360 deg per synodic day, so spin = SUN_LON - subsolar.
def spin_on(iso):
    t = datetime.fromisoformat(iso.replace('Z', '+00:00'))
    t0 = datetime.fromisoformat(NEW_MOON.replace('Z', '+00:00'))
    days = (t - t0).total_seconds() / 86400
    return SUN_LON - (180 - 360 * days / SYNODIC)
# Frame k of the sprite sheet shows spin = 360 * k / frames. Play in Blender previews it.
sc.frame_start, sc.frame_end = 1, args.frames
drv = moon.driver_add('rotation_euler', 2).driver
drv.type = 'SCRIPTED'
drv.expression = f'(frame - 1) / {args.frames} * 2 * pi'
# Open on chapter 1, day 1.
day1 = spin_on('2024-05-05T12:00:00Z') % 360
sc.frame_set(1 + round(day1 / 360 * args.frames) % args.frames)

if LIVE:
    # Look through the iso camera, rendered shading, stars visible.
    sc.render.film_transparent = False
    for area in bpy.context.window.screen.areas:
        if area.type == 'VIEW_3D':
            sp = area.spaces.active
            sp.shading.type = 'RENDERED'
            sp.region_3d.view_perspective = 'CAMERA'
            sp.overlay.show_overlays = False
    print('Scene "Lua" ready:', len(me.vertices), 'vertices')
else:
    def render(path, w, h):
        sc.render.resolution_x, sc.render.resolution_y = w, h
        sc.render.filepath = path
        bpy.ops.render.render(write_still=True)

    os.makedirs(OUT, exist_ok=True); os.makedirs(TMP, exist_ok=True)
    sc.render.film_transparent = True
    import subprocess
    sp = lambda *a: subprocess.run(['magick', *a], check=True, cwd=OUT)

    # Moon frames, transparent background.
    frames = []
    for i in range(args.frames):
        sc.frame_set(i + 1)
        p = os.path.join(TMP, f'f{i:03d}.png'); render(p, args.size, args.size); frames.append(p)
    sz, cols = args.size, args.cols
    rows = math.ceil(len(frames) / cols)
    buf = np.zeros((rows * sz, cols * sz, 4), dtype=np.float32)
    for i, p in enumerate(frames):
        im2 = bpy.data.images.load(p)
        r, c = rows - 1 - i // cols, i % cols      # Blender pixel rows start at the bottom
        buf[r * sz:(r + 1) * sz, c * sz:(c + 1) * sz] = np.array(im2.pixels[:], dtype=np.float32).reshape(sz, sz, 4)
        bpy.data.images.remove(im2)
    sheet = bpy.data.images.new('sheet', cols * sz, rows * sz, alpha=True)
    sheet.pixels = buf.ravel()
    # Reference only: the game draws the Moon live (src/cenas/luaShader.ts).
    sheet.filepath_raw = os.path.join(HERE, '.cache', 'moon_spin.png'); sheet.file_format = 'PNG'; sheet.save()

    # Sky and constellation figures, Moon hidden.
    moon.hide_render = True; sc.camera = sky_o; sc.render.film_transparent = False
    render(os.path.join(OUT, 'sky.png'), args.sky, args.sky * 9 // 16)
    w_env.image = figs_img
    os.makedirs(os.path.join(HERE, '.cache'), exist_ok=True)   # split later by make_constellations.py
    render(os.path.join(HERE, '.cache', 'constellations.png'), args.sky, args.sky * 9 // 16)

    v = lambda x: [round(c, 6) for c in x]
    # The game imports this (src/dados/moon_view.json): frame layout and camera vectors.
    with open(os.path.join(ROOT, 'src', 'dados', 'moon_view.json'), 'w') as f:
        json.dump({
            'frameWidth': sz, 'frameHeight': sz, 'frames': len(frames), 'cols': cols,
            'halfExtent': cam.ortho_scale / 2,          # world units from the frame center to its edge
            'right': v(cam_right), 'up': v(cam_up), 'toCamera': v(to_cam), 'toSun': v(to_sun),
            'sunLon': SUN_LON, 'newMoon': NEW_MOON, 'synodicDays': SYNODIC,
            'base': BASE, 'skyFov': 70,
        }, f, indent=1)
    # Shrink for the web (ImageMagick): toon colors fit a 255-color palette; the sky is a photo.
    sp('sky.png', '-quality', '85', 'sky.jpg'); os.remove(os.path.join(OUT, 'sky.png'))
    print('DONE', OUT)
