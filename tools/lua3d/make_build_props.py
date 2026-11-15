"""Render the three construction-browser props in four upright map orientations.
Run: blender -b -P tools/lua3d/make_build_props.py
"""
import os,json,math
from pathlib import Path
import bpy
from mathutils import Matrix
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
os.environ['ESTILO']='cartoon'
source=(HERE/'make_modules.py').read_text(encoding='utf-8').split('# Live preview of one model:')[0]
source=source.replace("'BLENDER_EEVEE'","'BLENDER_EEVEE_NEXT'")
env={'__file__':str(HERE/'make_modules.py')}
exec(compile(source,env['__file__'],'exec'),env)
box,cyl,bar=env['caixa'],env['cilindro'],env['haste']

def generator():
    box(.12,.18,.88,.82,.03,.13,'#26374c',bevel=.05)
    box(.19,.24,.81,.76,.13,.63,'#f58a1f',bevel=.07)
    box(.17,.25,.25,.75,.2,.53,'#33465d')
    for y in (.32,.42,.52,.62):box(.16,y,.18,y+.035,.25,.48,'#90a2b7',bevel=.005)
    box(.4,.75,.67,.78,.3,.48,'#26374c',bevel=.015)
    box(.44,.78,.51,.79,.35,.42,'#73e0b0',bevel=.005)
    bar((.32,.5,.67),(.32,.5,.8),.025,'#26374c')
    bar((.68,.5,.67),(.68,.5,.8),.025,'#26374c')
    bar((.32,.5,.8),(.68,.5,.8),.03,'#26374c')

def canister():
    cyl(.5,.5,.25,.05,.13,'#536780')
    cyl(.5,.5,.23,.13,.83,'#e6ecf3')
    cyl(.5,.5,.25,.77,.85,'#b7c4d4')
    cyl(.5,.5,.12,.85,.93,'#536780')
    box(.37,.475,.63,.525,.36,.54,'#f58a1f',bevel=.012)

def toolkit():
    box(.15,.23,.85,.77,.06,.18,'#26374c',bevel=.04)
    box(.16,.24,.84,.76,.18,.48,'#f58a1f',bevel=.06)
    box(.14,.22,.86,.78,.47,.56,'#efac44',bevel=.045)
    for x in (.29,.67):box(x,.76,x+.045,.79,.36,.51,'#dce7ee',bevel=.008)
    bar((.33,.5,.58),(.33,.5,.74),.026,'#26374c')
    bar((.67,.5,.58),(.67,.5,.74),.026,'#26374c')
    bar((.33,.5,.74),(.67,.5,.74),.03,'#26374c')

index=ROOT/'src/dados/rotacoesModulos.json'
metadata=json.loads(index.read_text(encoding='utf-8'))
sc,group=env['sc'],env['grupo']
if hasattr(sc.eevee,'taa_render_samples'):sc.eevee.taa_render_samples=16
bpy.context.preferences.edit.use_global_undo=False
for name,build in [('generator',generator),('canister',canister),('toolkit',toolkit)]:
    for obj in list(sc.objects):
        if obj.type=='MESH':bpy.data.objects.remove(obj,do_unlink=True)
    group.clear();build();bpy.context.view_layer.update()
    matrices={o:o.matrix_world.copy() for o in group}
    for q in range(4):
        transform=Matrix.Translation((.5,-.5,0))@Matrix.Rotation(-q*math.pi/2,4,'Z')@Matrix.Translation((-.5,.5,0))
        for obj,m in matrices.items():obj.matrix_world=transform@m
        W,H,cx,cy=env['enquadrar']()
        key='deco_'+name+(f'_r{q}' if q else '')
        sc.render.filepath=str(ROOT/'public/lua/modulos'/f'{key}.png')
        bpy.ops.render.render(write_still=True)
        metadata[key]={'arquivo':f'lua/modulos/{key}.png','w':W,'h':H,'escala':.5,'ancora':[round(W/2-cx*env['s'],2),round(H/2+cy*env['s'],2)],'pegada':[1,1]}
index.write_text(json.dumps(metadata,indent=1)+'\n',encoding='utf-8')
print('BUILD PROPS READY',flush=True)
