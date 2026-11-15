"""Exporta o Heating aprovado e suas quatro orientacoes para o mapa isometrico."""
import bpy, json, math
from pathlib import Path
from mathutils import Matrix, Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'public/lua/modulos';INDEX=ROOT/'src/dados/modulos.json';ROT=ROOT/'src/dados/rotacoesModulos.json'
source=bpy.context.scene
assert any(o.name.startswith('Resistencia frontal') for o in source.objects), 'Abra o .blend do Heating aprovado com resistencias frontais.'
bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get()
parts=[(o,o.evaluated_get(dg).matrix_world.copy()) for o in source.objects if o.type in {'MESH','CURVE','FONT'}]
models=json.loads(INDEX.read_text(encoding='utf-8'));rotations=json.loads(ROT.read_text(encoding='utf-8'))
scale=60/math.sqrt(.5);direction=Vector((math.cos(math.pi/6)/math.sqrt(2),-math.cos(math.pi/6)/math.sqrt(2),.5));q=(-direction).to_track_quat('-Z','Y');right,up=q.to_matrix().col[0],q.to_matrix().col[1]
for turn in range(4):
    name='aquecedor'+(f'_r{turn}' if turn else '')
    sc=bpy.data.scenes.new('Exportacao | '+name);bpy.context.window.scene=sc
    sc.render.engine='BLENDER_EEVEE';sc.view_settings.view_transform='Standard';sc.view_settings.look='None';sc.render.film_transparent=True;sc.render.filter_size=1
    sc.render.image_settings.file_format='PNG';sc.render.image_settings.color_mode='RGBA';sc.render.resolution_percentage=100;sc.world=source.world
    transform=Matrix.Translation((1.5,-1.5,0))@Matrix.Rotation(-turn*math.pi/2,4,'Z')@Matrix.Translation((-1.5,1.5,0))@Matrix.Translation((.03,-.20,0))@Matrix.Diagonal((.7,.7,.7,1))
    copies=[]
    for original,world in parts:
        o=original.copy();o.parent=None;sc.collection.objects.link(o);o.matrix_world=transform@world;copies.append(o)
    cam=bpy.data.cameras.new('Camera isometrica');cam.type='ORTHO';o=bpy.data.objects.new('Camera',cam);sc.collection.objects.link(o);o.rotation_mode='QUATERNION';o.rotation_quaternion=q;sc.camera=o
    sun=bpy.data.lights.new('Sol dos modulos','SUN');sun.energy=4;sun.use_shadow=False
    lamp=bpy.data.objects.new('Sol',sun);sc.collection.objects.link(lamp);to_sun=(direction*.5-right+Vector((0,0,.45))).normalized();lamp.rotation_euler=(-to_sun).to_track_quat('-Z','Y').to_euler()
    bpy.context.view_layer.update();pts=[obj.matrix_world@Vector(p) for obj in copies for p in obj.bound_box]
    xs=[p.dot(right) for p in pts];ys=[p.dot(up) for p in pts];cx=(min(xs)+max(xs))/2;cy=(min(ys)+max(ys))/2
    w=math.ceil((max(xs)-min(xs))*scale)+36;h=math.ceil((max(ys)-min(ys))*scale)+36
    cam.ortho_scale=max(w,h)/scale;o.location=right*cx+up*cy+direction*50
    sc.render.resolution_x=w;sc.render.resolution_y=h;sc.render.filepath=str(OUT/(name+'.png'))
    bpy.ops.render.render(write_still=True)
    meta={'arquivo':'lua/modulos/'+name+'.png','w':w,'h':h,'escala':.5,'ancora':[round(w/2-cx*scale,2),round(h/2+cy*scale,2)],'pegada':[3,3]}
    (rotations if turn else models)[name]=meta
INDEX.write_text(json.dumps(models,indent=1,ensure_ascii=False),encoding='utf-8');ROT.write_text(json.dumps(rotations,indent=1,ensure_ascii=False),encoding='utf-8')
print('Heating aprovado exportado em quatro orientacoes.')
