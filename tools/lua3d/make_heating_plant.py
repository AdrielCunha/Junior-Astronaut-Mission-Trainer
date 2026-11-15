"""Conceito de central termica industrial marciana, estilo cartoon do jogo."""
import bpy, bmesh, math, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
source=(ROOT/'tools/lua3d/make_modules.py').read_text(encoding='utf-8')
PALETA=json.loads((ROOT/'src/dados/paleta_lua.json').read_text(encoding='utf-8'))
LIGHT=PALETA['luzSolo'];OUTLINE='#17130f';NOVO=True;CARTOON=True;FASE=0
sc=bpy.data.scenes.new('Heating | Central termica industrial');bpy.context.window.scene=sc
sc.render.engine='BLENDER_EEVEE';sc.view_settings.view_transform='Standard';sc.view_settings.look='None'
sc.render.image_settings.file_format='PNG';sc.render.resolution_percentage=100
exec(source[source.index('def rgb('):source.index('if LIVE:')],globals())
exec(source[source.index('_mats = {}'):source.index('grupo = []')],globals())
grupo=[]
exec(source[source.index('def _fim('):source.index('def habitat(')],globals())
W='#cbd5e1';D='#1e293b';O='#f97316';H='#ffb020';C='#8ae8ff';R='#ef4444'
OUT=ROOT/'assets/blender/heating_plant';OUT.mkdir(parents=True,exist_ok=True)
sc.name='Heating | Central termica industrial';grupo=[]
Y='#facc15';S='#94a3b8'
caixa(.02,.02,4.18,3.68,0,.18,D,bevel=.065,linha=.035)
caixa(.10,.10,4.10,3.60,.18,.32,W,bevel=.05,linha=.022)
# Estrutura aparafusada e faixas de seguranca em toda a borda frontal.
for x in [.35,3.85]:caixa(x-.12,.3,x+.12,3.40,.32,.52,O,bevel=.04,linha=.02)
for k in range(12):
    x=.22+k*.31
    caixa(x,3.43,x+.23,3.59,.33,.40,Y if k%2==0 else D,bevel=.01,linha=.005)
for x in [.3,3.9]:
    for y in [.3,3.3]:cilindro(x,y,.07,.39,.47,D,v=6,linha=.012)
# Corpo principal: tambor termico horizontal em suportes, com aneis de reforco.
for y in [1.02,2.40]:
    caixa(.58,y-.15,2.65,y+.15,.36,.70,D,bevel=.065,linha=.025)
    caixa(.79,y-.17,2.44,y+.17,.65,.91,O,bevel=.065,linha=.022)
cilindro(1.62,1.68,.82,.70,3.04,W,v=32,rot=(math.pi/2,0,0),linha=.035,bevel=.07)
# cilindro() gira no centro z; reposiciona o tambor na altura da estrutura.
grupo[-1].location=(1.62,-1.65,1.48)
for y in [.55,1.05,2.20,2.78]:
    cilindro(1.62,y,.88,1.41,1.55,O if y in [.55,2.78] else D,v=32,rot=(math.pi/2,0,0),linha=.025,bevel=.025)
    grupo[-1].location=(1.62,-y,1.48)
# Tampa frontal com ventilador e grade industrial.
cilindro(1.62,2.90,.70,1.40,1.56,D,v=32,rot=(math.pi/2,0,0),linha=.025)
grupo[-1].location=(1.62,-2.65,1.48)
for k in range(5):
    a=k*math.tau/5
    haste((1.62,2.86,1.48),(1.62+.47*math.cos(a),2.86,1.48+.47*math.sin(a)),.115,S,linha=.018)
esfera(1.62,2.88,1.48,.18,.10,.18,C,linha=.018)
# Resistencias na frente do rotor e atras da grade, presas em isoladores ceramicos.
heat=bpy.data.materials.new('Resistencia | calor laranja');heat.use_nodes=True
nodes=heat.node_tree.nodes;nodes.clear();em=nodes.new('ShaderNodeEmission')
em.inputs['Color'].default_value=rgb('#ffad32');em.inputs['Strength'].default_value=1.25
output=nodes.new('ShaderNodeOutputMaterial');heat.node_tree.links.new(em.outputs[0],output.inputs['Surface'])
for x in [1.26,1.62,1.98]:
    pts=[(x+(.065 if k%2 else -.065),3.045,1.10+k*.76/8) for k in range(9)]
    for a,b in zip(pts,pts[1:]):
        o=haste(a,b,.030,H,linha=.008);o.name='Resistencia frontal | serpentina';o.data.materials[0]=heat
    for z in [1.035,1.925]:
        caixa(x-.075,2.99,x+.075,3.09,z-.035,z+.035,W,bevel=.018,linha=.009)
for x in [1.24,1.62,2.00]:haste((x,3.14,.99),(x,3.14,1.97),.025,D,linha=.01)
for z in [1.20,1.48,1.76]:haste((1.09,3.14,z),(2.15,3.14,z),.025,D,linha=.01)
# Carcaca anular: prende a grade ao tambor sem bloquear a abertura do ventilador.
verts=[];faces=[];steps=32
for y,r in [(2.76,.79),(3.14,.79),(2.76,.62),(3.14,.62)]:
    for k in range(steps):
        a=k*math.tau/steps;verts.append((1.62+r*math.cos(a),-y,1.48+r*math.sin(a)))
for k in range(steps):
    n=(k+1)%steps
    faces.extend([(k,n,steps+n,steps+k),(2*steps+k,3*steps+k,3*steps+n,2*steps+n),
                  (steps+k,steps+n,3*steps+n,3*steps+k),(k,2*steps+k,2*steps+n,n)])
mesh=bpy.data.meshes.new('Carcaca frontal anular');mesh.from_pydata(verts,[],faces);mesh.update()
o=bpy.data.objects.new('Carcaca | grade presa ao tambor',mesh);sc.collection.objects.link(o)
bpy.context.view_layer.objects.active=o;o.select_set(True);_fim(o,O,.012,.018)
for k in range(8):
    a=k*math.tau/8
    cilindro(1.62+.71*math.cos(a),3.18,.038,1.48+.71*math.sin(a)-.025,1.48+.71*math.sin(a)+.025,D,v=6,rot=(math.pi/2,0,0),linha=.006)
    grupo[-1].location=(1.62+.71*math.cos(a),-3.18,1.48+.71*math.sin(a))

# Saida lateral com curva grossa e conexoes flangeadas.
for y in [.95,2.10]:
    haste((2.20,y,1.58),(3.25,y,1.58),.19,O,linha=.025)
    esfera(3.25,y,1.58,.23,.23,.23,O,linha=.025)
    haste((3.25,y,1.58),(3.25,y,.65),.19,O,linha=.025)
    cilindro(3.25,y,.29,.55,.72,D,v=16,linha=.02,bevel=.03)
    cilindro(3.25,y,.27,1.12,1.25,W,v=16,linha=.02)
# Dois volantes de valvula com raios.
for y in [.95,2.10]:
    haste((3.25,y,1.10),(3.65,y,1.10),.055,D,linha=.012)
    bpy.ops.mesh.primitive_torus_add(major_radius=.20,minor_radius=.045,major_segments=20,minor_segments=8,location=(3.68,-y,1.10),rotation=(0,math.pi/2,0))
    _fim(bpy.context.object,R,0,.015)
    for a in [0,math.pi/2]:haste((3.68,y-.18*math.cos(a),1.10-.18*math.sin(a)),(3.68,y+.18*math.cos(a),1.10+.18*math.sin(a)),.025,R,linha=.008)
# Vase d'expansion isole sur l'arriere de la tuyauterie.
cilindro(3.30,.42,.34,.55,1.95,D,v=24,linha=.025,bevel=.04)
esfera(3.30,.42,1.96,.34,.34,.22,W,linha=.025)
for z in [.73,1.65]:cilindro(3.30,.42,.39,z,z+.12,O,v=24,linha=.02)
# Resistances visibles sur le cote du tambour, en orange chaud.
caixa(.76,1.15,.92,2.12,1.10,1.84,D,bevel=.07,linha=.022)
for y in [1.30,1.59,1.88]:caixa(.72,y,.79,y+.13,1.20,1.74,H,bevel=.03,linha=.012)
# Manometres et boitier de commande industriel independant.
caixa(.15,2.50,.69,3.20,.40,1.34,D,bevel=.07,linha=.025)
caixa(.20,3.17,.64,3.25,.88,1.22,C,bevel=.04,linha=.015)
for x in [.29,.52]:esfera(x,3.27,.66,.065,.035,.065,R if x<.4 else '#22c55e',linha=.012)
for x in [1.27,1.95]:
    haste((x,.88,2.04),(x,.88,2.48),.04,S,linha=.012)
    cilindro(x,.88,.19,2.44,2.54,D,rot=(math.pi/2,0,0),linha=.02)
    grupo[-1].location=(x,-.88,2.46)
    cilindro(x,.95,.145,2.44,2.49,W,rot=(math.pi/2,0,0),linha=.012)
    grupo[-1].location=(x,-.95,2.46)
    haste((x,.99,2.46),(x+.075,.99,2.53),.015,R,linha=.005)
# Passerelle de service antiderapante et arceau de protection.
for y in [.5,.82,1.14,1.46,1.78,2.10,2.42,2.74]:caixa(3.55,y,3.95,y+.13,.36,.41,D,bevel=.015,linha=.008)
for x in [.58,2.68]:
    haste((x,.55,.4),(x,.55,2.45),.055,D,linha=.018)
    haste((x,.55,2.45),(x,2.7,2.45),.055,D,linha=.018)
    haste((x,2.7,2.45),(x,2.7,.4),.055,D,linha=.018)
cam=bpy.data.cameras.new('Camera central');cam.type='ORTHO';cam.ortho_scale=6.8
o=bpy.data.objects.new('Camera',cam);sc.collection.objects.link(o);direction=Vector((.612372,-.612372,.5));o.location=Vector((2.05,-1.8,1.1))+direction*25;o.rotation_mode='QUATERNION';o.rotation_quaternion=(-direction).to_track_quat('-Z','Y');sc.camera=o
sun=bpy.data.lights.new('Sol cartoon','SUN');sun.energy=4;sun.use_shadow=False
o=bpy.data.objects.new('Sol',sun);sc.collection.objects.link(o);o.rotation_euler=(.45,-.55,-.5)
sc.world=bpy.data.worlds.new('Fundo');sc.world.use_nodes=True;sc.world.node_tree.nodes['Background'].inputs[0].default_value=(.022,.035,.065,1)
sc.render.resolution_x=1200;sc.render.resolution_y=1100;sc.render.filepath=str(OUT/'central_termica.png')
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':area.spaces.active.shading.type='RENDERED';area.spaces.active.region_3d.view_perspective='CAMERA';area.spaces.active.overlay.show_overlays=False
bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'central_termica.blend'),copy=True)
