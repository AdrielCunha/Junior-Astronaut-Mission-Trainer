"""Aquecedor industrial cartoon para Marte, estudo independente."""
import bpy, math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
base=(ROOT/'tools/lua3d/make_heating_cartoon_v2.py').read_text(encoding='utf-8-sig')
exec(base[:base.index('for variant in range(3):')],globals())
OUT=ROOT/'assets/blender/heating_industrial';OUT.mkdir(parents=True,exist_ok=True)
sc.name='Heating | Aquecedor industrial cartoon';grupo=[]
caixa(.05,.05,3.45,3.15,0,.16,O,bevel=.07,linha=.03)
caixa(.15,.15,3.35,3.05,.16,.28,W,bevel=.06,linha=.022)
# Corpo baixo e largo de equipamento termico, com cantos grandes e pes de apoio.
for x in [.65,2.85]:caixa(x-.16,.65,x+.16,2.62,.28,.52,D,bevel=.06,linha=.022)
caixa(.40,.52,3.10,2.66,.49,1.84,W,bevel=.24,linha=.035)
caixa(.33,.46,3.17,2.72,.50,.72,O,bevel=.09,linha=.025)
caixa(.33,.46,3.17,2.72,1.62,1.86,O,bevel=.10,linha=.025)
# Grande janela frontal com tres resistencias incandescentes em zigue-zague.
caixa(.64,2.61,2.86,2.79,.79,1.57,D,bevel=.12,linha=.028)
for x in [1.02,1.75,2.48]:
    pts=[(x-.13,2.84,.90),(x+.13,2.84,1.01),(x-.13,2.84,1.12),(x+.13,2.84,1.23),(x-.13,2.84,1.34),(x+.13,2.84,1.45)]
    for a,b in zip(pts,pts[1:]):haste(a,b,.045,H,linha=.009)
for z in [1.01,1.25,1.49]:haste((.77,2.93,z),(2.73,2.93,z),.025,W,linha=.01)
# Ventilador grande sobre o aparelho: silhueta imediatamente mecanica.
cilindro(1.75,1.50,.78,1.81,2.01,D,bevel=.05,linha=.025)
cilindro(1.75,1.50,.64,1.99,2.08,O,bevel=.035,linha=.018)
for k in range(5):
    a=k*math.tau/5
    haste((1.75,1.50,2.12),(1.75+.48*math.cos(a),1.50+.48*math.sin(a),2.12),.11,W,linha=.018)
esfera(1.75,1.50,2.15,.19,.19,.10,C,linha=.018)
# Cabos de energia e dois dutos laterais de ar quente.
for y in [.95,2.07]:
    haste((3.02,y,1.16),(3.40,y,1.16),.24,D,linha=.027)
    esfera(3.40,y,1.16,.25,.25,.25,O,linha=.024)
    haste((3.40,y,1.16),(3.40,y,.56),.18,O,linha=.022)
    cilindro(3.40,y,.24,.36,.56,D,bevel=.03,linha=.02)
# Laterais reforcadas, painel de comando embutido e alcas de manutencao.
for y in [.83,1.25,1.67,2.09]:caixa(.32,y,.43,y+.14,.86,1.48,D,bevel=.03,linha=.015)
caixa(.64,.76,1.17,1.17,1.82,1.94,D,bevel=.04,linha=.018)
caixa(.73,.85,1.08,1.08,1.94,1.97,C,bevel=.025,linha=.009)
for x in [.70,2.80]:
    haste((x,.72,1.86),(x,.72,2.04),.045,D,linha=.015)
    haste((x,.72,2.04),(x,1.16,2.04),.055,D,linha=.018)
    haste((x,1.16,2.04),(x,1.16,1.86),.045,D,linha=.015)
# Identificacao curta, sem fachada ou arquitetura residencial.
text=bpy.data.curves.new('Heating label','FONT');text.body='HEAT';text.size=.18;text.align_x='CENTER'
o=bpy.data.objects.new('HEAT',text);sc.collection.objects.link(o);text.materials.append(toon(C));o.location=(1.75,-2.775,.63);o.rotation_euler=(math.pi/2,0,0)
cam=bpy.data.cameras.new('Camera aquecedor');cam.type='ORTHO';cam.ortho_scale=5.9
o=bpy.data.objects.new('Camera',cam);sc.collection.objects.link(o);direction=Vector((.612372,-.612372,.5));o.location=Vector((1.9,-1.6,.95))+direction*25;o.rotation_mode='QUATERNION';o.rotation_quaternion=(-direction).to_track_quat('-Z','Y');sc.camera=o
sun=bpy.data.lights.new('Sol cartoon','SUN');sun.energy=4;sun.use_shadow=False
o=bpy.data.objects.new('Sol',sun);sc.collection.objects.link(o);o.rotation_euler=(.45,-.55,-.5)
sc.world=bpy.data.worlds.new('Fundo');sc.world.use_nodes=True;sc.world.node_tree.nodes['Background'].inputs[0].default_value=(.022,.035,.065,1)
sc.render.resolution_x=1100;sc.render.resolution_y=1000;sc.render.filepath=str(OUT/'aquecedor_industrial.png')
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':area.spaces.active.shading.type='RENDERED';area.spaces.active.region_3d.view_perspective='CAMERA';area.spaces.active.overlay.show_overlays=False
bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'aquecedor_industrial.blend'),copy=True)
