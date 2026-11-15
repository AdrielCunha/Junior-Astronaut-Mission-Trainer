"""Renderiza o astronauta segurando a bateria entre as maos, em oito direcoes e seis trajes."""
import bpy, math, json, os
from pathlib import Path
from mathutils import Vector, Matrix
import numpy as np
ROOT=Path(__file__).resolve().parents[2]
HERE=ROOT/'tools/lua3d';OUT=ROOT/'public/lua';TMP=HERE/'.cache/astronaut_carry';TMP.mkdir(parents=True,exist_ok=True)
source=(HERE/'make_astronaut.py').read_text(encoding='utf-8').split('if LIVE:\n    pose(0.25)')[0]
source=source.replace('    sc.eevee.taa_render_samples = 128','    if hasattr(sc.eevee, "taa_render_samples"): sc.eevee.taa_render_samples = 16')
exec(compile(source,str(HERE/'make_astronaut.py'),'exec'),globals())
ROOT=Path(ROOT);HERE=ROOT/'tools/lua3d';OUT=ROOT/'public/lua';TMP=HERE/'.cache/astronaut_carry';TMP.mkdir(parents=True,exist_ok=True)
metadata=json.loads((ROOT/'src/dados/astronauta.json').read_text(encoding='utf-8'))
assert metadata['frame']==FRAME and metadata['colunas']==WALK+1
assert all(abs(a-b)<.02 for a,b in zip(anchor,metadata['pe'])), 'Carrying feet must match the normal astronaut.'
# Hide only the original lowered arms in this newly generated scene.
for shoulder in bracos:
    for child in shoulder.children:child.hide_render=True;child.hide_set(True)

def limb(name,a,b,color,width):
    a,b=Vector(a),Vector(b);d=b-a
    o=peca(name,'box',(width,width,d.length),tuple((a+b)/2),color,corpo,bevel=.018)
    o.rotation_mode='QUATERNION';o.rotation_quaternion=d.to_track_quat('Z','Y')
    return o
arms=[]
for side in [-1,1]:
    shoulder=(0,side*.152,.208);elbow=(.085,side*.16,.105);hand=(.22,side*.115,.14)
    upper=limb('carry_upper',shoulder,elbow,SUIT,.075)
    lower=limb('carry_lower',elbow,hand,SUIT,.069)
    cuff=peca('carry_cuff','ball',(.078,.078,.078),(.185,side*.126,.13),ACCENT,corpo)
    glove=peca('carry_glove','ball',(.085,.085,.085),hand,TRIM,corpo)
    arms.append((upper,lower,cuff))
# Import the approved battery geometry, then attach it to the same torso rig as both hands.
with bpy.data.libraries.load(str(ROOT/'assets/blender/bateria_portatil/bateria_portatil.blend'),link=False) as (src,dst):
    dst.scenes=[n for n in src.scenes if n.startswith('Bateria portatil')][:1]
battery_scene=dst.scenes[0]
bpy.context.window.scene=battery_scene;bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get()
parts=[(o,o.evaluated_get(dg).matrix_world.copy()) for o in battery_scene.objects if o.type=='MESH']
bpy.context.window.scene=sc
transform=Matrix.Translation((.23,0,.15))@Matrix.Rotation(math.pi/2,4,'Z')@Matrix.Diagonal((.23,.23,.23,1))@Matrix.Translation((-.5,.5,-.65))
for original,world in parts:
    o=original.copy();sc.collection.objects.link(o);o.parent=corpo;o.matrix_local=transform@world;o.name='Bateria segurada | '+original.name
# Use the game's exact camera, frame, anchor and walking poses.
if hasattr(sc.eevee,'taa_render_samples'):sc.eevee.taa_render_samples=16
for light in sc.objects:
    if light.type=='LIGHT':light.data.use_shadow=False
originals={o.name:o for o in sc.objects}
def recolor(skin):
    colors=SKINS[skin]
    for name,o in originals.items():
        if o.type!='MESH' or name.startswith('Bateria segurada'):continue
        color=None
        if name.startswith(('tronco','capacete','perna','braco','carry_upper','carry_lower')):color=colors['suit']
        elif name.startswith(('faixa','listra','canela','manga','carry_cuff')):color=colors['accent']
        elif name.startswith('mochila'):color=colors['pack']
        elif name.startswith('bota'):color=colors['boot']
        elif name.startswith('brilho'):color=colors['glint']
        if color:o.data.materials[0]=toon(color)
cols=1+WALK
preview=ROOT/'assets/blender/astronauta_carga';preview.mkdir(parents=True,exist_ok=True)
for skin in SKINS:
    recolor(skin)
    sheet=np.zeros((8*FRAME,cols*FRAME,4),np.float32)
    for d in range(8):
        root.rotation_euler=(0,0,math.radians(d*45))
        for c in range(cols):
            pose(None if c==0 else (c-1)/WALK)
            bpy.context.view_layer.update()
            if skin=='comandante' and d==0 and c==0:
                bpy.ops.wm.save_as_mainfile(filepath=str(preview/'astronauta_segurando_bateria.blend'),copy=True)
            path=TMP/'frame.png';sc.render.filepath=str(path);bpy.ops.render.render(write_still=True)
            im=bpy.data.images.load(str(path));pixels=np.array(im.pixels[:],np.float32).reshape(FRAME,FRAME,4)
            row=7-d;sheet[row*FRAME:(row+1)*FRAME,c*FRAME:(c+1)*FRAME]=pixels;bpy.data.images.remove(im)
    img=bpy.data.images.new('carrying_'+skin,cols*FRAME,8*FRAME,alpha=True)
    img.pixels=sheet.ravel();img.filepath_raw=str(OUT/('astronaut_carga_'+skin+'.png'));img.file_format='PNG';img.save();bpy.data.images.remove(img)
    print('CARRY SKIN COMPLETE',skin,flush=True)
print('All carrying sprites complete; feet anchor:',anchor,flush=True)
