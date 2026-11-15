"""Novos conceitos Heating com a receita cartoon dos sprites do jogo."""
import bpy, bmesh, math, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/blender/heating_v2';OUT.mkdir(parents=True,exist_ok=True)
source=(ROOT/'tools/lua3d/make_modules.py').read_text(encoding='utf-8')
PALETA=json.loads((ROOT/'src/dados/paleta_lua.json').read_text())
LIGHT=PALETA['luzSolo'];OUTLINE='#17130f';NOVO=True;CARTOON=True;FASE=0
sc=bpy.data.scenes.new('Heating V2 | 3 novos modelos cartoon');bpy.context.window.scene=sc
sc.render.engine='BLENDER_EEVEE';sc.view_settings.view_transform='Standard';sc.view_settings.look='None'
sc.render.resolution_x=1800;sc.render.resolution_y=900;sc.render.resolution_percentage=100
sc.render.image_settings.file_format='PNG';sc.render.filepath=str(OUT/'heating_cartoon_comparacao.png')
exec(source[source.index('def rgb('):source.index('if LIVE:')],globals())
exec(source[source.index('_mats = {}'):source.index('grupo = []')],globals())
grupo=[]
exec(source[source.index('def _fim('):source.index('def habitat(')],globals())
# As mesmas cores vivas dos modulos existentes: perola, grafite, laranja e ciano.
W='#cbd5e1';D='#1e293b';O='#f97316';H='#ffb020';C='#8ae8ff';R='#ef4444'
right=Vector((math.sqrt(.5),math.sqrt(.5),0))
for variant in range(3):
    grupo=[]
    caixa(.02,.02,2.98,2.98,0,.13,O,bevel=.06,linha=.035)
    caixa(.12,.12,2.88,2.88,.13,.24,W,bevel=.08,linha=.025)
    if variant==0:
        # Um aquecedor baixo e arredondado: silhueta de forno espacial, nunca um galpao.
        esfera(1.5,1.40,1.00,1.02,.90,.95,W,linha=.035)
        cilindro(1.5,1.40,1.02,.25,.47,D,bevel=.04,linha=.025)
        caixa(.65,2.08,2.35,2.30,.62,1.34,O,bevel=.11,linha=.03)
        caixa(.78,2.27,2.22,2.34,.73,1.23,D,bevel=.09,linha=.023)
        for x in [1.0,1.5,2.0]:
            caixa(x-.12,2.34,x+.12,2.38,.82,1.14,H,bevel=.07,linha=.012)
        cilindro(1.5,1.40,.46,1.71,2.00,O,bevel=.04,linha=.025)
        esfera(1.5,1.40,2.02,.55,.55,.18,D,linha=.025)
        cilindro(1.5,1.40,.24,2.10,2.37,W,linha=.025)
        esfera(1.5,1.40,2.38,.32,.32,.12,O,linha=.025)
        for x in [.45,2.55]:
            haste((x,1.2,.5),(x,2.5,.5),.14,O,linha=.022)
            esfera(x,2.5,.5,.22,.22,.22,D,linha=.018)
    elif variant==1:
        # Dois cartuchos termicos gordinhos ligados por um coletor de calor.
        for x in [.86,2.14]:
            cilindro(x,1.40,.48,.43,1.85,W,bevel=.10,linha=.03)
            esfera(x,1.40,1.86,.48,.48,.34,W,linha=.03)
            cilindro(x,1.40,.56,.30,.52,O,bevel=.06,linha=.025)
            for z in [.72,1.1,1.48]:
                cilindro(x,1.40,.53,z,z+.13,D,bevel=.025,linha=.015)
                caixa(x-.22,1.88,x+.22,1.97,z+.02,z+.11,H,bevel=.025,linha=.009)
            cilindro(x,1.40,.23,2.05,2.30,O,bevel=.035,linha=.023)
            esfera(x,1.40,2.30,.27,.27,.13,D,linha=.02)
        caixa(.65,2.05,2.35,2.62,.28,.92,O,bevel=.14,linha=.03)
        caixa(.92,2.57,2.08,2.67,.48,.75,D,bevel=.07,linha=.018)
        for x in [1.1,1.5,1.9]:caixa(x-.09,2.66,x+.09,2.70,.53,.69,C,bevel=.025,linha=.009)
        haste((.86,1.4,.55),(.86,2.32,.55),.17,D,linha=.025)
        haste((2.14,1.4,.55),(2.14,2.32,.55),.17,D,linha=.025)
    else:
        # Radiador compacto com cabeca circular e aletas grandes, leitura clara em sprite.
        caixa(.53,.6,2.47,2.40,.30,1.60,W,bevel=.23,linha=.035)
        caixa(.46,.53,2.54,2.47,.28,.48,O,bevel=.09,linha=.025)
        cilindro(1.5,1.48,.84,1.60,1.81,D,bevel=.04,linha=.025)
        cilindro(1.5,1.48,.67,1.79,1.88,O,bevel=.03,linha=.018)
        for k in range(6):
            a=k*math.tau/6
            haste((1.5,1.48,1.91),(1.5+.51*math.cos(a),1.48+.51*math.sin(a),1.91),.10,W,linha=.015)
        esfera(1.5,1.48,1.95,.20,.20,.10,C,linha=.018)
        caixa(.78,2.34,2.22,2.47,.66,1.35,D,bevel=.09,linha=.023)
        for x in [1.0,1.5,2.0]:
            caixa(x-.12,2.46,x+.12,2.55,.73,1.27,O,bevel=.045,linha=.018)
            caixa(x-.065,2.54,x+.065,2.59,.83,1.17,H,bevel=.03,linha=.008)
        for x in [.35,2.65]:esfera(x,1.52,.75,.20,.44,.30,O,linha=.023)
    # Terminal de energia e simbolos grandes em vez de miudezas realistas.
    caixa(.24,2.44,.66,2.83,.24,.94,D,bevel=.07,linha=.02)
    caixa(.31,2.80,.59,2.87,.66,.86,C,bevel=.025,linha=.01)
    coll=bpy.data.collections.new('%02d | Heating cartoon'%(variant+1));sc.collection.children.link(coll)
    shift=right*((variant-1)*5.3)
    for o in grupo:
        for old in list(o.users_collection):old.objects.unlink(o)
        coll.objects.link(o);o.location+=shift
    text=bpy.data.curves.new('Numero da opcao','FONT');text.body='0%d'%(variant+1);text.size=.50;text.align_x='CENTER'
    ob=bpy.data.objects.new('Numero 0%d'%(variant+1),text);sc.collection.objects.link(ob);text.materials.append(toon(C));ob.location=Vector((1.5,-3.35,.15))+shift;ob.rotation_euler=(math.pi/2,0,math.pi/4)
# Camera identica em inclinacao a dos sprites da Lua.
elev=math.radians(30);direction=Vector((math.cos(elev)/math.sqrt(2),-math.cos(elev)/math.sqrt(2),math.sin(elev)))
cam=bpy.data.cameras.new('Comparacao cartoon');cam.type='ORTHO';cam.ortho_scale=17.3
ob=bpy.data.objects.new('Camera',cam);sc.collection.objects.link(ob);ob.location=Vector((1.5,-1.5,.8))+direction*30;ob.rotation_mode='QUATERNION';ob.rotation_quaternion=(-direction).to_track_quat('-Z','Y');sc.camera=ob
sun=bpy.data.lights.new('Sol cartoon','SUN');sun.energy=4;sun.use_shadow=False
ob=bpy.data.objects.new('Sol cartoon',sun);sc.collection.objects.link(ob);ob.rotation_euler=(.45,-.55,-.5)
world=bpy.data.worlds.new('Fundo ilustrado');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.022,.035,.065,1);sc.world=world
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':area.spaces.active.shading.type='RENDERED';area.spaces.active.region_3d.view_perspective='CAMERA';area.spaces.active.overlay.show_overlays=False
bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'heating_cartoon_v2.blend'),copy=True)
