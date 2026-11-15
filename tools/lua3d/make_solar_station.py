"""Cria uma estação solar cartoon editável, sem modificar os sprites do jogo.

No Blender: execute este arquivo no editor de texto ou pelo MCP oficial.
Saídas: assets/blender/estacao_solar.blend e renders de apresentação.
"""
import math
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets' / 'blender'
OUT.mkdir(parents=True, exist_ok=True)
SCENE_NAME = 'Estacao Solar - 6 paineis e 5 baterias'
if bpy.data.scenes.get(SCENE_NAME):
    raise RuntimeError('A estação já existe. Preserve ou renomeie a cena antes de recriar.')
scene = bpy.data.scenes.new(SCENE_NAME)
if bpy.context.window:
    bpy.context.window.scene = scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 1800
scene.render.resolution_y = 1350
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.film_transparent = False
scene.render.filepath = str(OUT / 'estacao_solar.png')
scene.view_settings.view_transform = 'AgX'
scene.world = bpy.data.worlds.new('Estacao | ambiente azul')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (0.16, 0.21, 0.32, 1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = 0.5

def collection(name):
    c = bpy.data.collections.new(name)
    scene.collection.children.link(c)
    return c

structure = collection('01 | Terreno e fundacoes')
panels = collection('02 | Seis paineis solares')
batteries = collection('03 | Banco de cinco baterias')
cables = collection('04 | Cabos e controlador')
presentation = collection('05 | Cameras e iluminacao')
current = structure

def material(name, color, metal=0, roughness=0.45, emission=0):
    m = bpy.data.materials.new('Solar | ' + name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*color, 1)
    bs.inputs['Metallic'].default_value = metal
    bs.inputs['Roughness'].default_value = roughness
    if emission:
        bs.inputs['Emission Color'].default_value = (*color, 1)
        bs.inputs['Emission Strength'].default_value = emission
    return m

white = material('ceramica perola', (0.73, 0.84, 0.91), 0.2)
light = material('arestas claras', (0.94, 0.97, 1), 0.1)
dark = material('grafite azulado', (0.025, 0.052, 0.10), 0.35)
steel = material('metal acetinado', (0.24, 0.36, 0.46), 0.65)
orange = material('laranja missao', (1, 0.29, 0.045), 0.15)
yellow = material('amarelo seguranca', (1, 0.70, 0.12))
blue = material('celula azul cobalto', (0.025, 0.16, 0.46), 0.4, 0.24)
blue2 = material('celula azul alternada', (0.035, 0.23, 0.58), 0.4, 0.24)
trace = material('trilhas fotovoltaicas', (0.16, 0.53, 0.85), 0.5)
glint = material('reflexo suave', (0.14, 0.40, 0.69), 0.35)
green = material('bateria verde', (0.10, 0.57, 0.34), 0.12)
mint = material('carga verde luminosa', (0.25, 1, 0.60), emission=2)
cyan = material('visor ciano', (0.13, 0.76, 1), emission=1.6)
soil = material('regolito quente', (0.36, 0.30, 0.27), roughness=0.92)
rockmat = material('pedras lunares', (0.26, 0.24, 0.24), roughness=0.95)
ground = material('fundo azul noite', (0.025, 0.042, 0.075), roughness=0.8)

def link(o, name, mat, parent=None):
    o.name = name
    for c in list(o.users_collection):
        c.objects.unlink(o)
    current.objects.link(o)
    if mat:
        o.data.materials.append(mat)
    if parent:
        o.parent = parent
    return o

def box(name, loc, size, mat, bevel=0.04, parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1)
    o = bpy.context.object
    o.location = loc
    o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    link(o, name, mat, parent)
    if bevel:
        b = o.modifiers.new('Arestas cartoon', 'BEVEL')
        b.width = bevel
        b.segments = 3
        o.modifiers.new('Normais ponderadas', 'WEIGHTED_NORMAL')
    return o

def cyl(name, loc, radius, depth, mat, parent=None, rotation=None, vertices=16):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc)
    o = link(bpy.context.object, name, mat, parent)
    if rotation:
        o.rotation_euler = rotation
    b = o.modifiers.new('Bordas arredondadas', 'BEVEL')
    b.width = min(radius * 0.18, 0.025)
    b.segments = 2
    o.modifiers.new('Normais ponderadas', 'WEIGHTED_NORMAL')
    return o

def bar(name, a, b, radius, mat, parent=None):
    a, b = Vector(a), Vector(b)
    o = cyl(name, (a + b) / 2, radius, (b-a).length, mat, parent)
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = (b-a).to_track_quat('Z', 'Y')
    return o

def wire(name, points, radius, mat, parent=None):
    c = bpy.data.curves.new(name, 'CURVE')
    c.dimensions = '3D'
    c.resolution_u = 16
    c.bevel_depth = radius
    c.bevel_resolution = 3
    sp = c.splines.new('BEZIER')
    sp.bezier_points.add(len(points)-1)
    for p, co in zip(sp.bezier_points, points):
        p.co = co
        p.handle_left_type = p.handle_right_type = 'AUTO'
    o = bpy.data.objects.new(name, c)
    current.objects.link(o)
    o.data.materials.append(mat)
    if parent:
        o.parent = parent
    return o

def label(name, text, loc, size, mat, parent=None, top=False):
    c = bpy.data.curves.new(name, 'FONT')
    c.body = text
    c.align_x = 'CENTER'
    c.align_y = 'CENTER'
    c.size = size
    c.extrude = 0.001
    o = bpy.data.objects.new(name, c)
    current.objects.link(o)
    o.location = loc
    if not top:
        o.rotation_euler.x = math.pi/2
    o.data.materials.append(mat)
    if parent:
        o.parent = parent
    return o

def empty(name, loc, coll):
    o = bpy.data.objects.new(name, None)
    coll.objects.link(o)
    o.location = loc
    o.empty_display_type = 'PLAIN_AXES'
    o.empty_display_size = 0.25
    return o

# Uma frente de atendimento livre permite acrescentar a interação do astronauta depois.
box('Ilha de regolito', (0.6, 0.2, -0.24), (13.6, 8.2, 0.46), soil, 0.30)
box('Base inferior do diorama', (0.6, 0.2, -0.48), (13.2, 7.8, 0.12), dark, 0.12)
box('Chao de apresentacao', (0, 0, -0.60), (200, 200, 0.1), ground, 0)

for row in range(2):
    for col in range(3):
        idx = row*3+col+1
        x, y = -4.35 + col*2.85, -0.45 + row*2.65
        current = panels
        root = empty('Painel %02d | modulo completo' % idx, (x,y,0), panels)
        root['funcao'] = 'Geracao solar; painel articulado independente'
        box('P%02d | sapata laranja' % idx, (0,0,0.09), (1.80,1.36,0.18), orange, 0.10, root)
        box('P%02d | base perola' % idx, (0,0,0.20), (1.66,1.24,0.16), white, 0.07, root)
        for fx in (-0.65,0.65):
            for fy in (-0.43,0.43):
                cyl('P%02d | parafuso da base' % idx, (fx,fy,0.30),0.06,0.055,dark,root,vertices=6)
            bar('P%02d | suporte principal' % idx,(fx,0.08,0.27),(fx,0.08,1.21),0.075,steel,root)
            bar('P%02d | reforco diagonal' % idx,(fx,-0.42,0.28),(fx,0.08,0.91),0.045,white,root)
        cyl('P%02d | eixo de inclinacao' % idx,(0,0.08,1.23),0.105,1.66,steel,root,(0,math.pi/2,0))
        for fx in (-0.87,0.87):
            cyl('P%02d | articulacao laranja' % idx,(fx,0.08,1.23),0.16,0.10,orange,root,(0,math.pi/2,0))
        hinge = empty('P%02d | painel inclinavel' % idx,(0,0.08,1.23),panels)
        hinge.parent = root
        hinge.rotation_euler.x = math.radians(24)
        box('P%02d | moldura estrutural' % idx,(0,0,0),(2.55,1.72,0.15),white,0.085,hinge)
        box('P%02d | borda interna grafite' % idx,(0,0,0.087),(2.35,1.52,0.055),dark,0.04,hinge)
        for cx in range(5):
            for cy in range(4):
                xx,yy=(cx-2)*0.45,(cy-1.5)*0.352
                box('P%02d | celula %d-%d' % (idx,cx+1,cy+1),(xx,yy,0.128),(0.418,0.319,0.035),blue if (cx+cy)%3 else blue2,0.022,hinge)
                for tx in (-0.11,0,0.11):
                    box('P%02d | trilha coletora' % idx,(xx+tx,yy,0.149),(0.009,0.281,0.004),trace,0.002,hinge)
        for sx in (-1,1):
            for sy in (-1,1):
                box('P%02d | protetor de canto' % idx,(sx*1.17,sy*0.76,0.09),(0.20,0.17,0.10),orange,0.035,hinge)
                cyl('P%02d | fixacao da moldura' % idx,(sx*1.17,sy*0.76,0.151),0.028,0.012,dark,hinge,vertices=6)
        # Reflexos largos e discretos deixam a leitura cartoon sem esconder a grade.
        for xx,yy in [(-0.66,0.55),(0.69,-0.51)]:
            o=box('P%02d | brilho de vidro' % idx,(xx,yy,0.153),(0.52,0.035,0.004),glint,0.01,hinge)
            o.rotation_euler.z=math.radians(-25)
        box('P%02d | identificacao' % idx,(0,-0.63,0.22),(0.60,0.032,0.15),dark,0.015,root)
        label('P%02d | numero' % idx,'SOL %02d' % idx,(0,-0.652,0.22),0.105,light,root)
        current = cables
        wire('P%02d | cabo para coletor' % idx,[(x+0.65,y+0.1,1.15),(x+0.92,y+0.3,0.44),(x+0.95,y+0.55,0.12),(x+0.95,y+0.95,0.10)],0.032,dark)

current = cables
for row in range(2):
    y=-0.45+row*2.65+0.95
    wire('Linha de coleta %d' % (row+1),[(-3.4,y,0.10),(-0.5,y,0.10),(2.35,y,0.10),(3.15,y,0.10)],0.045,dark)
wire('Alimentacao do banco',[(3.15,3.15,0.10),(3.4,2.5,0.11),(3.4,-0.9,0.11),(4.1,-1.2,0.38)],0.055,orange)

# Cinco cartuchos individuais em fila: alça e faces voltadas para o corredor.
current = batteries
bank = empty('Banco de baterias | cinco encaixes',(4.65,0.25,0),batteries)
bank['capacidade'] = 5
bank['observacao'] = 'Cada bateria e um objeto independente para futura coleta no jogo.'
box('Banco | plataforma laranja',(0,0,0.12),(2.25,6.45,0.24),orange,0.16,bank)
box('Banco | piso de atendimento',(0,0,0.27),(2.10,6.30,0.14),steel,0.10,bank)
box('Banco | barramento traseiro',(0.82,0,0.73),(0.22,5.87,0.94),white,0.07,bank)
box('Banco | linha de carga',(0.69,0,0.78),(0.04,5.67,0.075),cyan,0.015,bank)
for i in range(5):
    by=(i-2)*1.10
    pack=empty('Bateria %02d | removivel' % (i+1),(0,by,0),batteries)
    pack.parent=bank
    pack['slot']=i+1
    box('B%02d | encaixe' % (i+1),(-0.10,0,0.38),(1.34,0.96,0.15),dark,0.065,pack)
    box('B%02d | corpo verde' % (i+1),(-0.06,0,0.94),(0.92,0.77,1.04),green,0.11,pack)
    box('B%02d | pe reforcado' % (i+1),(-0.06,0,0.49),(1.00,0.84,0.16),dark,0.055,pack)
    box('B%02d | tampa perola' % (i+1),(-0.06,0,1.46),(1.00,0.84,0.18),white,0.065,pack)
    for yy in (-0.26,0.26):
        bar('B%02d | apoio da alca' % (i+1),(-0.06,yy,1.54),(-0.06,yy,1.74),0.055,dark,pack)
    bar('B%02d | alca de transporte' % (i+1),(-0.06,-0.26,1.74),(-0.06,0.26,1.74),0.065,orange,pack)
    for yy,mat in [(-0.20,orange),(0.20,dark)]:
        cyl('B%02d | contato de carga' % (i+1),(0.25,yy,1.59),0.06,0.11,mat,pack)
    # Mostradores na lateral de coleta (voltada aos paineis).
    box('B%02d | visor de carga' % (i+1),(-0.53,0,1.14),(0.025,0.49,0.24),dark,0.02,pack)
    for j in range(4):
        box('B%02d | barra de carga %d' % (i+1,j+1),(-0.549,(j-1.5)*0.10,1.14),(0.012,0.064,0.15),mint,0.009,pack)
    for j in range(3):
        box('B%02d | ranhura de refrigeracao' % (i+1),(-0.531,0,0.66+j*0.075),(0.02,0.42,0.025),dark,0.009,pack)
    # Marca de energia com geometria, independente de fontes de simbolos.
    verts=[(-0.547,-0.07,1.00),(-0.547,0.04,0.87),(-0.547,-0.01,0.87),(-0.547,0.06,0.76),(-0.547,-0.06,0.88),(-0.547,-0.02,0.88)]
    mesh=bpy.data.meshes.new('Raio');mesh.from_pydata(verts,[],[list(range(6))]);mesh.update()
    bolt=bpy.data.objects.new('B%02d | simbolo de energia' % (i+1),mesh);current.objects.link(bolt);bolt.parent=pack;mesh.materials.append(yellow)
    # Numero na tampa, legivel de cima.
    label('B%02d | numero do cartucho' % (i+1),'%02d' % (i+1),(-0.28,0,1.558),0.18,dark,pack,top=True)
    cyl('B%02d | luz do encaixe' % (i+1),(-0.84,0,0.39),0.065,0.04,mint,pack)

current=cables
box('Controlador | corpo',(4.63,-3.25,0.72),(1.52,0.68,1.10),white,0.10)
box('Controlador | rodape',(4.63,-3.25,0.23),(1.62,0.77,0.19),orange,0.06)
box('Controlador | painel frontal',(4.63,-3.601,0.85),(1.24,0.038,0.60),dark,0.045)
box('Controlador | tela',(4.47,-3.627,0.94),(0.70,0.02,0.26),cyan,0.025)
label('Controlador | indicador','SOLAR / 100%',(4.47,-3.644,0.94),0.083,dark)
for i,mat in enumerate([mint,yellow,orange]):
    cyl('Controlador | botao',(5.05,-3.63,0.99-i*0.17),0.055,0.035,mat,rotation=(math.pi/2,0,0))
label('Controlador | legenda','POWER BANK',(4.50,-3.642,0.69),0.105,light)

current=structure
# Marcas de abordagem, sem cercas ou cabos na frente dos cartuchos.
for i in range(7):
    box('Corredor | marcador',(2.98,-2.65+i*0.83,0.017),(0.13,0.33,0.018),yellow,0.025)
for x,y,sz in [(-5.5,-2.4,0.24),(-5.7,3.0,0.17),(-2.0,-2.8,0.17),(0.6,3.85,0.19),(6.7,2.8,0.21),(-5.1,-2.7,0.1)]:
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=(x,y,sz*0.24))
    o=link(bpy.context.object,'Rocha de regolito',rockmat)
    o.scale=(sz*1.5,sz,sz*0.75)

current=presentation
def aim(o, point):
    o.rotation_euler=(Vector(point)-o.location).to_track_quat('-Z','Y').to_euler()

camdata=bpy.data.cameras.new('Camera isometrica')
cam=bpy.data.objects.new('Camera | conjunto completo',camdata);current.objects.link(cam)
cam.location=(-12,-17,14)
aim(cam,(0.25,0.0,0.30))
camdata.type='ORTHO';camdata.ortho_scale=18.2;camdata.lens=50
scene.camera=cam
for name,loc,energy,size,color in [('Luz principal',(-5,-8,12),2300,8,(1,0.88,0.75)),('Preenchimento',(6,-1,9),1700,7,(0.65,0.81,1)),('Recorte',(1,7,11),2400,6,(0.80,0.90,1))]:
    data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.shape='DISK';data.size=size;data.color=color
    o=bpy.data.objects.new(name,data);current.objects.link(o);o.location=loc;aim(o,(0,0,0))

scene['descricao']='Estacao lunar cartoon: 6 paineis em 2 fileiras de 3 e 5 baterias removiveis alinhadas ao lado.'
scene['integracao']='Estudo de modelo. Nenhuma regra de coleta ou sprite do jogo foi alterado.'
scene['gerador']='tools/lua3d/make_solar_station.py'
# Deixa a cena pronta para inspecao no Blender aberto.
for o in bpy.context.selected_objects:
    o.select_set(False)
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_perspective='CAMERA'
            area.spaces.active.shading.type='MATERIAL'
            area.spaces.active.overlay.show_overlays=False
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'estacao_solar.blend'),copy=True)
print('Estacao criada:',len(scene.objects),'objetos. Arquivo:',OUT/'estacao_solar.blend')
