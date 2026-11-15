"""Exporta os modelos aprovados para a projecao isometrica do mapa.

blender -b assets/blender/estacao_solar.blend -P tools/lua3d/export_solar_station.py
"""
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public' / 'lua' / 'modulos'
JSON = ROOT / 'src' / 'dados' / 'modulos.json'
source = bpy.data.scenes['Estacao Solar - 6 paineis e 5 baterias']
models = json.loads(JSON.read_text(encoding='utf-8'))
scale = 60 / math.sqrt(0.5)
elev = math.radians(30)
direction = Vector((math.cos(elev) / math.sqrt(2), -math.cos(elev) / math.sqrt(2), math.sin(elev)))
rotation = (-direction).to_track_quat('-Z', 'Y')
right, up = rotation.to_matrix().col[0], rotation.to_matrix().col[1]

sys.path.insert(0, str(Path(__file__).resolve().parent))
from estilo_lua import PALETA

def srgb_to_linear(h):
    h = h.lstrip('#')
    return [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
            for c in (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))]

# Same toon look as the other base modules (make_modules.py): stepped light ramp times the
# model's own color, and a dark inverted-hull outline. The approved .blend keeps its materials.
_toon = {}
def toon(src):
    if src is None or src.name in _toon:
        return _toon.get(src.name) if src else None
    bs = src.node_tree.nodes.get('Principled BSDF') if src.use_nodes else None
    cor = list(bs.inputs['Base Color'].default_value) if bs else list(src.diffuse_color)
    brilho = bs.inputs['Emission Strength'].default_value if bs else 0
    m = bpy.data.materials.new('Toon | ' + src.name); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links; N.clear()
    em = N.new('ShaderNodeEmission'); out = N.new('ShaderNodeOutputMaterial')
    L.new(em.outputs[0], out.inputs['Surface'])
    if brilho > 0:
        em.inputs['Color'].default_value = cor   # screens and lamps stay lit
    else:
        dif = N.new('ShaderNodeBsdfDiffuse'); s2r = N.new('ShaderNodeShaderToRGB')
        L.new(dif.outputs['BSDF'], s2r.inputs['Shader'])
        r = N.new('ShaderNodeValToRGB'); cr = r.color_ramp; cr.interpolation = 'CONSTANT'
        while len(cr.elements) < len(PALETA['luzSolo']): cr.elements.new(0.99)
        for e, (pos, c) in zip(cr.elements, PALETA['luzSolo']): e.position = pos; e.color = (*srgb_to_linear(c), 1)
        L.new(s2r.outputs['Color'], r.inputs['Fac'])
        mix = N.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'
        mix.inputs['Factor'].default_value = 1; mix.inputs[6].default_value = cor
        L.new(r.outputs['Color'], mix.inputs[7]); L.new(mix.outputs[2], em.inputs['Color'])
    _toon[src.name] = m
    return m

contorno = bpy.data.materials.new('Toon | contorno'); contorno.use_nodes = True; contorno.use_backface_culling = True
_n = contorno.node_tree.nodes; _n.clear()
_e = _n.new('ShaderNodeEmission'); _e.inputs['Color'].default_value = (*srgb_to_linear('#17130f'), 1)
contorno.node_tree.links.new(_e.outputs[0], _n.new('ShaderNodeOutputMaterial').inputs['Surface'])

def cartoon(clone):
    if clone.type != 'MESH':
        return
    clone.data = clone.data.copy()
    mats = clone.data.materials
    for i, m in enumerate(mats):
        mats[i] = toon(m)
    menor = min(clone.dimensions)
    if menor < 0.005:
        return   # flat decals (battery bolts): a hull would cover them
    mats.append(contorno)
    escala = sum(clone.matrix_world.to_scale()) / 3
    # Thin parts (cells, cables) get a thinner line so the panel grid does not turn black.
    linha = min(0.03, 0.2 * menor) / escala
    s = clone.modifiers.new('contorno', 'SOLIDIFY')
    s.thickness = linha; s.offset = 1; s.use_flip_normals = True; s.use_rim = False
    s.material_offset = len(mats) - 1

def children(o):
    return [o] + [child for c in o.children for child in children(c)]

def export(root_name, stem, transform, bank=False):
    bpy.context.window.scene = source
    bpy.context.view_layer.update()
    root = source.objects[root_name]
    selected = children(root)
    if bank:
        selected += [o for o in source.objects if o.name.startswith('Controlador |')]
    # Snapshot evaluated transforms before changing scenes: parented parts otherwise use
    # stale cached matrices and some cells/corner guards drift into the panel surface.
    depsgraph = bpy.context.evaluated_depsgraph_get()
    world = {o: o.evaluated_get(depsgraph).matrix_world.copy() for o in selected}
    root_inverse = world[root].inverted()
    sc = bpy.data.scenes.new('Exportacao | ' + stem)
    bpy.context.window.scene = sc
    sc.render.engine = 'BLENDER_EEVEE'
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.render.film_transparent = True
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
    sc.render.filter_size = 1.0
    sc.world = source.world
    copies = []
    for o in selected:
        if o.type == 'EMPTY':
            continue
        clone = o.copy()
        clone.parent = None
        sc.collection.objects.link(clone)
        clone.matrix_world = transform @ root_inverse @ world[o]
        if bank and o.type == 'FONT':
            # The bank faces the map camera; keep lettering readable after the X reflection.
            clone.matrix_world = clone.matrix_world @ Matrix.Diagonal((-1, 1, 1, 1))
        index = next((i for i in range(1, 6) if any(p.name.startswith('Bateria %02d |' % i) for p in ancestors(o))), 0)
        cartoon(clone)
        copies.append((clone, index))
    camdata = bpy.data.cameras.new('Camera de exportacao')
    camdata.type = 'ORTHO'
    camera = bpy.data.objects.new('Camera de exportacao', camdata)
    sc.collection.objects.link(camera)
    camera.rotation_mode = 'QUATERNION'
    camera.rotation_quaternion = rotation
    sc.camera = camera
    # The modules' sun (make_modules.py): from the camera side, a little from the left and above.
    light = bpy.data.lights.new('Sol de exportacao', 'SUN')
    light.energy = 4.0
    light.use_shadow = False
    lamp = bpy.data.objects.new('Sol de exportacao', light)
    sc.collection.objects.link(lamp)
    to_sun = (direction * 0.5 - right * 1.0 + Vector((0, 0, 0.45))).normalized()
    lamp.rotation_euler = (-to_sun).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.view_layer.update()
    points = [o.matrix_world @ Vector(p) for o, _ in copies for p in o.bound_box]
    xs, ys = [p.dot(right) for p in points], [p.dot(up) for p in points]
    w = math.ceil((max(xs)-min(xs))*scale) + 36
    h = math.ceil((max(ys)-min(ys))*scale) + 36
    cx, cy = (min(xs)+max(xs))/2, (min(ys)+max(ys))/2
    camera.location = right*cx + up*cy + direction*50
    camdata.ortho_scale = max(w, h)/scale
    sc.render.resolution_x, sc.render.resolution_y = w, h
    sc.render.resolution_percentage = 100
    sc.render.image_settings.compression = 80
    for count in (range(6) if bank else [None]):
        for obj, idx in copies:
            obj.hide_render = bool(bank and idx > count)
        name = ('bateria_carga%d' % count) if bank else stem
        sc.render.filepath = str(OUT / (name + '.png'))
        bpy.ops.render.render(write_still=True)
        models[name] = {'arquivo': 'lua/modulos/'+name+'.png', 'w': w, 'h': h,
                        'escala': 0.5, 'ancora': [round(w/2-cx*scale, 2), round(h/2+cy*scale, 2)]}
    if bank:
        # Default image for the asset index and any non-interactive use of the bank.
        import shutil
        shutil.copyfile(OUT/'bateria_carga5.png', OUT/'bateria.png')
        models['bateria'] = {**models['bateria_carga5'], 'arquivo': 'lua/modulos/bateria.png'}

def ancestors(o):
    while o:
        yield o
        o = o.parent

if '--banco' not in sys.argv:
    export('Painel 01 | modulo completo', 'painel', Matrix.Translation((1, -0.5, 0)) @ Matrix.Diagonal((0.76, 0.76, 0.76, 1)))
if '--painel' not in sys.argv:
    export('Banco de baterias | cinco encaixes', 'bateria', Matrix.Translation((1, -2.2575, 0)) @ Matrix.Diagonal((-0.8, 0.70, 0.80, 1)), bank=True)
JSON.write_text(json.dumps(models, indent=1, ensure_ascii=False), encoding='utf-8')
print('Estacao solar exportada: painel e banco com 0 a 5 baterias.')
