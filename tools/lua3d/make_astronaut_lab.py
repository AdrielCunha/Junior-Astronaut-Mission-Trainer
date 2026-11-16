"""Isolated procedural astronaut lab. Blender meshes + stackable battery, no game assets overwritten.
Run: blender -b -P tools/lua3d/make_astronaut_lab.py
Runtime uses the same evaluated meshes, in metres with Y up and Z forward.
"""
import bpy, json, math, re, sys
from pathlib import Path
from mathutils import Vector, Matrix
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'public/lab';OUT.mkdir(parents=True,exist_ok=True)
ART=ROOT/'assets/blender/astronauta_lab';ART.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
sc=bpy.context.scene
materials={};parts=[]
def material(color):
    if color not in materials:
        m=bpy.data.materials.new(color);srgb=[int(color[i:i+2],16)/255 for i in (1,3,5)];m.diffuse_color=tuple(c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in srgb)+(1,);m.use_nodes=True
        p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=m.diffuse_color;p.inputs['Roughness'].default_value=.6
        materials[color]=m
    return materials[color]
def part(name,group,center,size,color,sphere=False,bevel=.025):
    # Author in the runtime coordinate system, convert to Blender Z-up for previews/GLB.
    x,y,z=center;sx,sy,sz=size
    if sphere:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=16,location=(x,z,y))
    else:bpy.ops.mesh.primitive_cube_add(size=2,location=(x,z,y))
    o=bpy.context.object;o.name=name;o.scale=(sx/2,sz/2,sy/2);o.data.materials.append(material(color))
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if not sphere and bevel:
        mod=o.modifiers.new('Soft protective corners','BEVEL');mod.width=bevel;mod.segments=3
        bpy.ops.object.modifier_apply(modifier=mod.name)
    o['lab_group']=group;parts.append(o)
    return o
W='#e2e8f0';D='#233249';O='#f97316';C='#38bdf8'
# Use the real game's meshes and material/outline setup for the torso and helmet.
# Execute only the model-building portion in its own namespace: it never renders/replaces sprites.
source_path=ROOT/'tools/lua3d/make_astronaut.py'
source=source_path.read_text().split('if LIVE:\n    pose(0.25)')[0]
source=source.replace('    sc.eevee.taa_render_samples = 128','    if hasattr(sc.eevee, "taa_render_samples"): sc.eevee.taa_render_samples = 128')
original={'__file__':str(source_path)}
exec(compile(source,str(source_path),'exec'),original)
original['pose'](None);bpy.context.view_layer.update()
sc=bpy.context.scene
body=original['corpo'].matrix_world.translation.copy()
helmet=bpy.data.objects['capacete'].matrix_world.translation.copy()
rotate=Matrix.Rotation(math.pi/2,4,'Z');scale=Matrix.Scale(2.45,4)
keep=[]
for ob in list(sc.objects):
    if ob.type!='MESH' or ob.name not in ['tronco','faixa','painel','mochila','listra','capacete','viseira','brilho','antena','farol']:continue
    group='head' if ob.name in ['capacete','viseira','brilho','antena','farol'] else 'torso'
    pivot=helmet if group=='head' else body
    evaluated=ob.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh=bpy.data.meshes.new_from_object(evaluated)
    mesh.transform(rotate@scale@Matrix.Translation(-pivot)@ob.matrix_world)
    clone=bpy.data.objects.new('Original | '+ob.name,mesh);clone['lab_group']=group;keep.append(clone)
for ob in list(sc.objects):bpy.data.objects.remove(ob,do_unlink=True)
for ob in keep:sc.collection.objects.link(ob);parts.append(ob)
# Articulated limbs retain the original bevel, suit palette, round joints and outline.
# The geometry is authored with actual elbow/knee seams, not cut rigid cubes.
for side in ['L','R']:
    for bone,length,width in [('upperArm',.32,.19),('forearm',.34,.18),('thigh',.41,.205),('shin',.40,.19)]:
        part(side+' '+bone,side+bone,(0,-length/2,0),(width,length,width),W,bevel=.045)
        part(side+' '+bone+' joint',side+bone,(0,-.025,0),(width*.93,.10,width*.93),'#94a3b8',True)
    part(side+' knee protector',side+'shin',(0,-.055,.102),(.19,.105,.055),O,bevel=.018)
    part(side+' cuff',side+'forearm',(0,-.30,0),(.195,.055,.195),O,bevel=.012)
    part(side+' glove',side+'hand',(0,-.025,.02),(.19,.17,.20),'#94a3b8',True)
    part(side+' boot',side+'foot',(0,.035,.055),(.235,.15,.36),'#334155',bevel=.035)
    part(side+' sole',side+'foot',(0,-.025,.06),(.24,.035,.37),'#1e293b',bevel=.009)
# More segments and smooth normals are used for the exported real-time model.
for ob in parts:
    if ob.name.startswith('Original |'):continue
    for poly in ob.data.polygons:poly.use_smooth=True
# Optional magnetic boot armour. Runtime draws these groups only inside the ship.
for side,sign in [('L',-1),('R',1)]:
    part(side+' magnetic toe armour',side+'magnet',(0,.045,.16),(.255,.12,.18),'#64748b',bevel=.025)
    part(side+' magnetic sole',side+'magnet',(0,-.0175,.06),(.25,.05,.38),'#334155',bevel=.008)
    part(side+' magnetic ankle collar',side+'magnet',(0,.12,-.01),(.25,.08,.22),'#94a3b8',bevel=.018)
    part(side+' magnetic lock indicator',side+'magnet',(sign*.129,.06,.04),(.012,.028,.07),'#22d3ee',bevel=.003)
# A low, wide module with corner interlocks. The handle is recessed so five modules stack flush.
part('Battery green shell','battery',(0,.105,0),(.52,.21,.30),'#22c55e',bevel=.035)
part('Battery bottom bumper','battery',(0,.025,0),(.54,.05,.32),D,bevel=.012)
part('Battery top rim','battery',(0,.197,0),(.54,.035,.32),W,bevel=.012)
part('Battery handle recess','battery',(0,.217,0),(.23,.014,.12),D,bevel=.004)
part('Battery flat handle','battery',(0,.228,0),(.17,.014,.035),O,bevel=.004)
part('Battery faceplate','battery',(0,.115,.155),(.29,.12,.018),D,bevel=.008)
for i in range(3):part('Charge LED '+str(i),'battery',(-.065+i*.065,.15,.17),(.035,.019,.008),'#a3ffcb',bevel=.002)
# Raised lightning emblem, defined as a real mesh rather than a texture.
verts=[(-.01,.137),(-.065,.09),(-.015,.09),(-.03,.055),(.065,.114),(.018,.114)]
vs=[(x,.169,y) for x,y in verts]+[(x,.182,y) for x,y in verts]
faces=[tuple(range(5,-1,-1)),tuple(range(6,12))]+[(i,(i+1)%6,(i+1)%6+6,i+6) for i in range(6)]
mesh=bpy.data.meshes.new('Lightning solid');mesh.from_pydata(vs,[],faces);mesh.update();o=bpy.data.objects.new('Battery lightning',mesh);sc.collection.objects.link(o);o.data.materials.append(material('#fde047'));o['lab_group']='battery';parts.append(o)
for x in [-.21,.21]:
    for z in [-.105,.105]:part('Stack interlock','battery',(x,.226,z),(.045,.025,.045),O,bevel=.004)
# Export evaluated mesh data once. No runtime network/dependency is needed for rendering.
groups={}
roles={'#e2e8f0':'suit','#f97316':'accent','#334155':'boot','#cbd5e1':'pack','#38bdf8':'glint','#22d3ee':'magnet'}
for ob in parts:
    mesh=ob.data
    verts=[ob.matrix_world@v.co for v in mesh.vertices]
    normal_matrix=ob.matrix_world.to_3x3().inverted().transposed()
    normals=[(normal_matrix@v.normal).normalized() for v in mesh.vertices]
    for idx,mat in enumerate(mesh.materials):
        faces=[list(p.vertices) for p in mesh.polygons if p.material_index==idx]
        if not faces:continue
        found=re.search(r'#[0-9a-fA-F]{6}',mat.name)
        color=found.group(0) if found else '#1e293b'
        outline='Contorno' in mat.name
        groups.setdefault(ob['lab_group'],[]).append({'name':ob.name,'color':color,'outline':outline,'role':roles.get(color) if ob['lab_group']!='battery' and (not ob['lab_group'].endswith('magnet') or color=='#22d3ee') else None,
            'vertices':[[round(v.x,5),round(v.z,5),round(v.y,5)] for v in verts],
            'normals':[[round(v.x,5),round(v.z,5),round(v.y,5)] for v in normals], 'faces':faces})
(OUT/'astronauta-modelo.json').write_text(json.dumps({'units':'metres','version':2,'source':'make_astronaut.py original torso, helmet and materials','batteryPitch':.245,'maxBatteries':5,'groups':groups},separators=(',',':')))
# Battery-only source model and portable GLB, preserving real dimensions and separate materials.
bpy.ops.object.select_all(action='DESELECT')
for o in parts:
    if o['lab_group']=='battery':o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'bateria-empilhavel.glb'),use_selection=True,export_format='GLB')
# The source .blend and full GLB contain real bones and rigid vertex weights.
sys.path.insert(0,str(ROOT/'tools/lua3d'))
from rig_astronaut_lab import build_rig
rig,rig_objects=build_rig(sc,parts,OUT)
(OUT/'modelo-relatorio.json').write_text(json.dumps({'bones':len(rig.data.bones),'riggedObjects':len(rig_objects),'groups':list(groups),'source':'Original Blender astronaut + articulated limbs','maxBatteries':5},indent=2))
# Floor, orthographic camera and soft studio lights for the static preview.
part('Preview floor','preview',(0,-.06,0),(8,.08,8),'#17243a',bevel=0)
bpy.ops.object.camera_add(location=(4.0,6.2,3.6));cam=bpy.context.object;cam.rotation_euler=(Vector((0,.15,1.1))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=3.5;sc.camera=cam
for pos,energy,size in [((3,4,6),700,5),((-4,1,4),500,4),((0,-4,4),900,3)]:
    bpy.ops.object.light_add(type='AREA',location=pos);l=bpy.context.object;l.data.energy=energy;l.data.shape='DISK';l.data.size=size;l.rotation_euler=(Vector((0,0,1))-l.location).to_track_quat('-Z','Y').to_euler()
sc.world.color=(.12,.12,.12);sc.render.engine='BLENDER_EEVEE';sc.cycles.samples=48
sc.render.resolution_x=900;sc.render.resolution_y=900;sc.render.resolution_percentage=100
sc.render.image_settings.file_format='PNG';sc.render.filepath=str(OUT/'previa-baterias.png')
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(ART/'astronauta_baterias.blend'))
# CPU-only review render. The source file and GLB keep the original Eevee outline material.
sc.render.engine='CYCLES'
outline=bpy.data.materials.get('astroContorno')
if outline:
    nodes=outline.node_tree.nodes;nodes.clear();tr=nodes.new('ShaderNodeBsdfTransparent');output=nodes.new('ShaderNodeOutputMaterial');outline.node_tree.links.new(tr.outputs[0],output.inputs['Surface'])
bpy.ops.render.render(write_still=True)
# An unobstructed hero render lets the original silhouette and finish be reviewed.
for ob in sc.objects:
    if ob.get('lab_group')=='cargo':ob.hide_render=True
sc.render.filepath=str(OUT/'previa-astronauta-polido.png');bpy.ops.render.render(write_still=True)
print('LAB ASSETS READY',flush=True)
