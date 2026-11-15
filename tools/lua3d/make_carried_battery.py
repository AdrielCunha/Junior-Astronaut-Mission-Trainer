"""Bateria portatil cartoon, modelo e sprite para a mao do astronauta."""
import bpy, math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
base=(ROOT/'tools/lua3d/make_heating_plant.py').read_text(encoding='utf-8')
exec(base[:base.index("Y='#facc15'")],globals())
OUT=ROOT/'assets/blender/bateria_portatil';OUT.mkdir(parents=True,exist_ok=True)
sc.name='Bateria portatil | astronauta';grupo=[]
caixa(.18,.20,.82,.80,.12,.92,'#22c55e',bevel=.10,linha=.026);grupo[-1].name='Bateria | corpo'
caixa(.14,.16,.86,.84,.08,.23,D,bevel=.06,linha=.022)
caixa(.14,.16,.86,.84,.87,1.03,W,bevel=.06,linha=.022)
for x in [.30,.70]:haste((x,.50,1.02),(x,.50,1.21),.045,D,linha=.013)
haste((.30,.50,1.21),(.70,.50,1.21),.055,O,linha=.016)
for x,color in [(.31,R),(.69,D)]:cilindro(x,.35,.055,1.02,1.09,color,v=12,linha=.012)
caixa(.28,.79,.72,.84,.32,.74,D,bevel=.045,linha=.015)
# Raio grande, reconhecivel mesmo em tamanho pequeno.
verts=[(.52,-.861,.72),(.33,-.861,.49),(.48,-.861,.49),(.42,-.861,.34),(.68,-.861,.57),(.53,-.861,.57)]
me=bpy.data.meshes.new('Simbolo energia');me.from_pydata(verts,[],[list(range(6))]);me.update();o=bpy.data.objects.new('Raio amarelo',me);sc.collection.objects.link(o);me.materials.append(toon('#fde047'));grupo.append(o)
for y in [.32,.50,.68]:caixa(.805,y,.84,y+.065,.29,.73,W,bevel=.015,linha=.007)
for x in [.30,.50,.70]:caixa(x-.04,.82,x+.04,.86,.78,.83,C,bevel=.012,linha=.005)
cam=bpy.data.cameras.new('Camera isometrica');cam.type='ORTHO';cam.ortho_scale=1.8
ob=bpy.data.objects.new('Camera',cam);sc.collection.objects.link(ob);direction=Vector((.612372,-.612372,.5));ob.location=Vector((.5,-.5,.65))+direction*15;ob.rotation_mode='QUATERNION';ob.rotation_quaternion=(-direction).to_track_quat('-Z','Y');sc.camera=ob
sun=bpy.data.lights.new('Sol cartoon','SUN');sun.energy=4;sun.use_shadow=False
ob=bpy.data.objects.new('Sol',sun);sc.collection.objects.link(ob);ob.rotation_euler=(.45,-.55,-.5)
sc.render.resolution_x=700;sc.render.resolution_y=800;sc.render.resolution_percentage=100;sc.render.image_settings.file_format='PNG';sc.render.filepath=str(OUT/'bateria_portatil.png')
sc.world=bpy.data.worlds.new('Fundo');sc.world.use_nodes=True;sc.world.node_tree.nodes['Background'].inputs[0].default_value=(.022,.035,.065,1)
bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'bateria_portatil.blend'),copy=True)
if bpy.app.background:
    bpy.ops.render.render(write_still=True)
    sc.render.film_transparent=True;sc.render.resolution_x=140;sc.render.resolution_y=160
    sc.render.filepath=str(ROOT/'public/lua/modulos/bateria_portatil.png');bpy.ops.render.render(write_still=True)
