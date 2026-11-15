"""Tres estudos editaveis de aquecimento marciano; nao altera o jogo."""
import bpy, math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/blender/heating';OUT.mkdir(parents=True,exist_ok=True)
helpers=(ROOT/'tools/lua3d/make_solar_station.py').read_text(encoding='utf-8')
helpers=helpers[helpers.index('def collection('):helpers.index('# Uma frente')]
for variant,title in [(1,'Central termica'),(2,'Torres de troca de calor'),(3,'Modulo de aquecimento')]:
    scene=bpy.data.scenes.new('Heating %02d | '%variant+title)
    bpy.context.window.scene=scene
    scene.render.engine='BLENDER_EEVEE';scene.render.resolution_x=1000;scene.render.resolution_y=900;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.filepath=str(OUT/('heating_%02d.png'%variant))
    scene.view_settings.view_transform='AgX'
    scene.world=bpy.data.worlds.new('Heating ambiente');scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.09,.14,.23,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.45
    exec(helpers,globals())
    hot=material('Calor ambar',(1,.23,.035),emission=2.2)
    red=material('Vermelho termico',(.62,.045,.035),metal=.18)
    current=structure
    box('Solo marciano',(0,0,-.18),(4.8,4.3,.32),material('Regolito marciano',(.43,.20,.12)),.2)
    box('Fundacao',(0,0,.05),(3.8,3.4,.25),dark,.12)
    box('Plataforma isolada',(0,0,.20),(3.6,3.2,.18),white,.10)
    for x in [-1.5,1.5]:
        for y in [-1.3,1.3]:cyl('Fixacao',(x,y,.32),.075,.06,steel,vertices=6)
    current=panels;panels.name='Heating %02d | estrutura'%variant
    if variant==1:
        box('Corpo da central',(0,.25,1.05),(2.7,1.9,1.6),white,.18)
        box('Teto vermelho',(0,.25,1.92),(2.85,2.05,.24),red,.12)
        box('Camara termica',(0,-.75,1.10),(1.95,.10,.83),dark,.08)
        for x in [-.72,-.36,0,.36,.72]:box('Resistencia protegida',(x,-.82,1.10),(.11,.08,.61),hot,.045)
        for z in [.83,1.1,1.37]:bar('Grade protetora',(-.95,-.90,z),(.95,-.90,z),.027,steel)
        for x,h in [(-.8,2.65),(.8,2.35)]:
            cyl('Tubo de circulacao',(x,.66,(1.9+h)/2),.23,h-1.9,steel)
            cyl('Cabecote isolado',(x,.66,h),.32,.16,red)
        for side in [-1,1]:
            wire('Circuito de fluido',[(side*1.4,.55,1.5),(side*1.6,.4,1.5),(side*1.6,-1,.5),(side*1.1,-1.3,.4)],.11,orange)
    elif variant==2:
        for x in [-.85,.85]:
            cyl('Tanque termico',(x,.25,1.25),.51,1.85,white,vertices=24)
            cyl('Base do tanque',(x,.25,.42),.58,.20,red)
            cyl('Tampa do tanque',(x,.25,2.20),.57,.20,red)
            for z in [.72,.97,1.22,1.47,1.72,1.97]:
                cyl('Aleta de troca termica',(x,.25,z),.60,.065,steel,vertices=24)
                cyl('Nucleo aquecido',(x,.25,z+.10),.523,.085,hot,vertices=24)
            wire('Saida de calor',[(x,.25,2.25),(x,.25,2.65),(x,-.6,2.65),(x,-.85,2.25)],.13,orange)
        box('Bomba frontal',(0,-1.0,.72),(1.25,.7,.72),red,.1)
        cyl('Motor da bomba',(0,-1.39,.77),.28,.20,steel,rotation=(math.pi/2,0,0))
        for x in [-1.35,1.35]:wire('Circuito de retorno',[(x,.5,.45),(x,.9,.45),(0,1.15,.45)],.09,orange)
    else:
        box('Modulo isolado',(0,.25,1.1),(2.7,2.05,1.65),white,.30)
        box('Faixa termica',(0,.25,.55),(2.78,2.12,.28),red,.10)
        box('Teto',(0,.25,1.95),(2.5,1.9,.18),steel,.14)
        box('Porta de manutencao',(-.58,-.81,1.02),(.78,.08,1.08),dark,.12)
        box('Janela da porta',(-.58,-.87,1.25),(.50,.035,.30),cyan,.07)
        for x in [.15,.47,.79,1.11]:
            box('Canal de ar quente',(x,-.83,1.12),(.16,.12,.86),dark,.04)
            for z in [.83,1.05,1.27,1.49]:box('Aleta laranja',(x,-.92,z),(.15,.06,.07),hot,.018)
        for x in [-.65,.65]:
            cyl('Ventilador no teto',(x,.25,2.1),.42,.18,dark)
            for a in range(5):
                o=box('Helice',(x,.25,2.21),(.61,.08,.045),steel,.02);o.rotation_euler.z=a*math.pi/5
        wire('Duto de distribuicao',[(1.3,.8,1.25),(1.7,.8,1.25),(1.7,-1.1,.6),(1.25,-1.25,.45)],.18,red)
    current=cables
    box('Terminal de controle',(-1.35,-1.17,.73),(.48,.38,.70),orange,.06)
    box('Tela de temperatura',(-1.35,-1.37,.85),(.33,.025,.26),dark,.025)
    label('Temperatura','HEAT',(-1.35,-1.39,.86),.085,cyan)
    for x in [-.35,0,.35]:
        wire('Calor | pictograma',[(x-.07,-1.53,.29),(x,-1.48,.29),(x-.07,-1.40,.29),(x,-1.32,.29)],.023,yellow)
    label('Identificacao','%02d / HEATING'%variant,(.35,-1.53,.30),.13,dark,top=True)
    current=presentation
    box('Fundo',(0,0,-.42),(200,200,.12),ground,0)
    camera=bpy.data.objects.new('Camera',bpy.data.cameras.new('Camera'));current.objects.link(camera)
    camera.location=(6,-9,6);camera.rotation_euler=(Vector((0,0,1))-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.type='ORTHO';camera.data.ortho_scale=6.6;scene.camera=camera
    for loc,power,size,color in [((-3,-4,7),950,5,(1,.83,.68)),((4,2,6),1250,4,(.65,.80,1))]:
        d=bpy.data.lights.new('Luz','AREA');d.energy=power;d.shape='DISK';d.size=size;d.color=color
        o=bpy.data.objects.new('Luz',d);current.objects.link(o);o.location=loc;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
    scene['conceito']=title
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'heating_opcoes.blend'),copy=True)
print('Tres cenas Heating criadas e salvas.')
