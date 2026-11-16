"""Rigid articulated rig, matching the runtime's two-link IK and carrying anchor."""
import bpy, math
from mathutils import Vector, Matrix

def build_rig(scene, parts, out):
    B=Matrix(((1,0,0,0),(0,0,1,0),(0,1,0,0),(0,0,0,1)))
    def vec(p):return B.to_3x3()@Vector(p)
    def torso(p):return Vector((0,.82,0))+Matrix.Rotation(-.09,3,'X')@(Vector(p)-Vector((0,.82,0)))
    def ik(a,b,l1,l2,bend):
        d=(b-a).length;axis=(b-a).normalized();n=Vector(bend)-axis*Vector(bend).dot(axis);n.normalize()
        t=(l1*l1-l2*l2+d*d)/(2*d);return a+axis*t+n*math.sqrt(max(0,l1*l1-t*t))
    transforms={}; bones={}
    def rigid(name,p,parent,tail=None,rot=None):
        p=Vector(p);R=rot or Matrix.Identity(3);M=R.to_4x4();M.translation=p;transforms[name]=B@M@B
        bones[name]=(vec(p),vec(tail or p+Vector((0,.12,0))),parent)
    def segment(name,a,b,parent):
        up=(a-b).normalized();right=up.cross(Vector((0,0,1))).normalized();front=right.cross(up)
        R=Matrix((right,up,front)).transposed();rigid(name,a,parent,b,R)
    rigid('root',(0,0,0),None)
    rigid('torso',torso((0,.82,0)),'root',torso((0,1.3,0)),Matrix.Rotation(-.09,3,'X'))
    rigid('head',torso((0,1.68,0)),'torso',torso((0,1.92,0)),Matrix.Rotation(-.09,3,'X'))
    for side,sign in [('L',-1),('R',1)]:
        hip=Vector((sign*.155,.82,0));ankle=Vector((sign*.155,.043,0));knee=ik(hip,ankle,.41,.4,(0,0,1))
        segment(side+'thigh',hip,knee,'root');segment(side+'shin',knee,ankle,side+'thigh');rigid(side+'foot',ankle,side+'shin')
        shoulder=torso((sign*.34,1.3,.06));hand=torso((sign*.28,1.032,.62));elbow=ik(shoulder,hand,.32,.34,(sign,-.4,-.5))
        segment(side+'upperArm',shoulder,elbow,'torso');segment(side+'forearm',elbow,hand,side+'upperArm');rigid(side+'hand',hand,side+'forearm')
    rigid('cargo',torso((0,1.05,.62)),'torso',torso((0,1.30,.62)),Matrix.Rotation(-.09,3,'X'))
    arm=bpy.data.armatures.new('Astronauta | articulacoes');rig=bpy.data.objects.new('Astronauta procedural | RIG',arm);scene.collection.objects.link(rig)
    bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
    for name,(a,b,parent) in bones.items():
        bone=arm.edit_bones.new(name);bone.head=a;bone.tail=b
        if parent:bone.parent=arm.edit_bones[parent]
    bpy.ops.object.mode_set(mode='OBJECT');rig.show_in_front=True;arm.display_type='STICK'
    objects=[]
    def bind(ob,group,world):
        ob.parent=rig;ob.matrix_world=world
        vertex_group=ob.vertex_groups.new(name=group);vertex_group.add(list(range(len(ob.data.vertices))),1.0,'REPLACE')
        mod=ob.modifiers.new('Procedural articulated skeleton','ARMATURE');mod.object=rig
        objects.append(ob)
    for ob in parts:
        group=ob['lab_group']
        if group=='battery':
            for i in range(5):
                clone=ob.copy();clone.data=ob.data.copy();scene.collection.objects.link(clone);clone.name=f'Bateria {i+1} | '+ob.name;clone['lab_group']='cargo'
                shift=Matrix.Translation((0,0,i*.245));bind(clone,'cargo',transforms['cargo']@shift@ob.matrix_world)
            ob.hide_render=True;ob.hide_set(True)
        else:
            bone=group[0]+'foot' if group.endswith('magnet') else group
            bind(ob,bone,transforms[bone]@ob.matrix_world)
    bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
    for ob in objects:ob.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(out/'astronauta-procedural.glb'),use_selection=True,export_format='GLB',export_skins=True)
    assert len(arm.bones)==16
    assert all(len(ob.vertex_groups)>0 for ob in objects)
    return rig,objects
