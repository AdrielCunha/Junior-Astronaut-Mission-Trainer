"""Casa de maquinas termicas para Marte, conceito cartoon independente."""
import bpy, math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
base=(ROOT/'tools/lua3d/make_heating_cartoon_v2.py').read_text(encoding='utf-8-sig')
exec(base[:base.index('for variant in range(3):')],globals())
OUT=ROOT/'assets/blender/heating_house';OUT.mkdir(parents=True,exist_ok=True)
sc.name='Heating | Casa termica marciana'
grupo=[]
caixa(.02,.02,3.48,3.18,0,.14,O,bevel=.07,linha=.03)
caixa(.12,.12,3.38,3.08,.14,.25,W,bevel=.06,linha=.022)
# Predio com porta, paredes espessas e telhado inclinado.
caixa(.38,.35,2.96,2.70,.25,1.90,W,bevel=.10,linha=.03)
caixa(.32,.29,3.02,2.76,.25,.48,D,bevel=.04,linha=.022)
caixa(.32,.29,3.02,2.76,1.66,1.86,O,bevel=.035,linha=.018)
# Duas aguas com beiral largo e cumeeira laranja.
verts=[(.22,-.16,1.90),(3.12,-.16,1.90),(1.67,-.16,2.64),(.22,-2.88,1.90),(3.12,-2.88,1.90),(1.67,-2.88,2.64)]
faces=[(0,2,1),(3,4,5),(0,3,5,2),(2,5,4,1),(0,1,4,3)]
me=bpy.data.meshes.new('Telhado de duas aguas');me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new('Telhado termico',me);sc.collection.objects.link(o);bpy.context.view_layer.objects.active=o;o.select_set(True);_fim(o,D,.04,.035)
haste((1.67,.12,2.66),(1.67,2.92,2.66),.075,O,linha=.02)
for x in [.24,3.10]:haste((x,.12,1.92),(x,2.92,1.92),.065,O,linha=.022)
for y in [.65,1.20,1.75,2.30]:
    haste((.28,y,1.94),(1.67,y,2.65),.026,W,linha=.01)
    haste((1.67,y,2.65),(3.06,y,1.94),.026,W,linha=.01)
# Acesso frontal reconhecivel como edificio.
caixa(.64,2.67,1.62,2.82,.36,1.58,O,bevel=.09,linha=.025)
caixa(.76,2.80,1.50,2.86,.39,1.45,D,bevel=.06,linha=.018)
caixa(.87,2.85,1.39,2.89,1.01,1.30,C,bevel=.035,linha=.012)
caixa(1.32,2.89,1.41,2.94,.72,.87,H,bevel=.025,linha=.012)
caixa(.52,2.82,1.75,3.02,.25,.34,W,bevel=.04,linha=.018)
# Janela quente da sala de maquinas.
caixa(1.91,2.69,2.74,2.79,.82,1.43,D,bevel=.09,linha=.025)
caixa(2.02,2.78,2.63,2.82,.92,1.33,H,bevel=.06,linha=.012)
haste((2.32,2.84,.91),(2.32,2.84,1.34),.025,W,linha=.008)
# Placa com tres ondas de calor no frontao.
caixa(1.30,2.83,2.04,2.90,1.93,2.22,O,bevel=.05,linha=.018)
for x in [1.47,1.67,1.87]:
    for a,b in [((x,2.94,1.99),(x-.035,2.94,2.055)),((x-.035,2.94,2.055),(x+.035,2.94,2.12)),((x+.035,2.94,2.12),(x,2.94,2.18))]:haste(a,b,.018,H,linha=.005)
# Circuito externo fechado: ida quente e retorno, com isolamento e valvulas.
for y in [.85,1.65]:
    haste((2.91,y,1.30),(3.20,y,1.30),.11,O,linha=.018)
    haste((3.20,y,1.30),(3.20,y,.52),.11,O,linha=.018)
    haste((3.20,y,.52),(3.20,2.65,.52),.11,O,linha=.018)
    esfera(3.20,y,1.30,.16,.16,.16,W,linha=.018)
    cilindro(3.20,y,.16,.70,.84,D,linha=.015)
# Caixa trocadora e aletas grandes na lateral visivel.
caixa(2.96,1.94,3.22,2.58,.68,1.45,D,bevel=.06,linha=.02)
for y in [2.04,2.22,2.40]:caixa(3.20,y,3.30,y+.09,.78,1.34,O,bevel=.025,linha=.012)
# Claraboia e sensor: leitura de modulo espacial, sem fumaca.
cilindro(1.70,1.25,.28,2.56,2.72,O,linha=.022)
esfera(1.70,1.25,2.73,.22,.22,.11,C,linha=.018)
haste((.60,.60,2.15),(.60,.60,2.63),.035,W,linha=.012)
esfera(.60,.60,2.67,.095,.095,.10,R,linha=.015)
camera=bpy.data.cameras.new('Camera casa termica');camera.type='ORTHO';camera.ortho_scale=5.9
ob=bpy.data.objects.new('Camera',camera);sc.collection.objects.link(ob)
direction=Vector((.612372,-.612372,.5));ob.location=Vector((1.75,-1.6,1.1))+direction*25;ob.rotation_mode='QUATERNION';ob.rotation_quaternion=(-direction).to_track_quat('-Z','Y');sc.camera=ob
sun=bpy.data.lights.new('Sol cartoon','SUN');sun.energy=4;sun.use_shadow=False
ob=bpy.data.objects.new('Sol',sun);sc.collection.objects.link(ob);ob.rotation_euler=(.45,-.55,-.5)
sc.world=bpy.data.worlds.new('Fundo');sc.world.use_nodes=True;sc.world.node_tree.nodes['Background'].inputs[0].default_value=(.022,.035,.065,1)
sc.render.resolution_x=1100;sc.render.resolution_y=1100;sc.render.filepath=str(OUT/'casa_termica.png')
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':area.spaces.active.shading.type='RENDERED';area.spaces.active.region_3d.view_perspective='CAMERA';area.spaces.active.overlay.show_overlays=False
bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'casa_termica.blend'),copy=True)
