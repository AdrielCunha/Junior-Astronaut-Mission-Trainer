"""Aplica acabamento toon e contorno aos tres estudos Heating."""
import bpy
from pathlib import Path
OUT=Path(r'D:/space_apps_challenges/assets/blender/heating')
ink=bpy.data.materials.new('Heating | Contorno forte');ink.use_nodes=True;ink.use_backface_culling=True
nodes=ink.node_tree.nodes;nodes.clear();em=nodes.new('ShaderNodeEmission');em.inputs['Color'].default_value=(.008,.012,.022,1);out=nodes.new('ShaderNodeOutputMaterial');ink.node_tree.links.new(em.outputs[0],out.inputs['Surface'])
done=set()
for scene in bpy.data.scenes:
    if not scene.name.startswith('Heating'):continue
    scene.view_settings.view_transform='Standard';scene.view_settings.look='None'
    for o in scene.objects:
        if o.type!='MESH' or o.name.startswith('Fundo'):continue
        for mat in list(o.data.materials):
            if mat in done or mat==ink or not mat.use_nodes:continue
            done.add(mat);bs=mat.node_tree.nodes.get('Principled BSDF')
            if not bs:continue
            color=tuple(bs.inputs['Base Color'].default_value)
            N=mat.node_tree.nodes;L=mat.node_tree.links;N.clear()
            diffuse=N.new('ShaderNodeBsdfDiffuse');rgb=N.new('ShaderNodeShaderToRGB');L.new(diffuse.outputs[0],rgb.inputs[0])
            ramp=N.new('ShaderNodeValToRGB');ramp.color_ramp.interpolation='CONSTANT'
            ramp.color_ramp.elements.remove(ramp.color_ramp.elements[1])
            for i,(threshold,mult) in enumerate([(0,.42),(.38,.72),(.72,1)]):
                e=ramp.color_ramp.elements[0] if i==0 else ramp.color_ramp.elements.new(threshold)
                e.position=threshold;e.color=tuple(min(1,c*mult) for c in color[:3])+(1,)
            L.new(rgb.outputs[0],ramp.inputs[0]);em=N.new('ShaderNodeEmission');L.new(ramp.outputs[0],em.inputs['Color']);out=N.new('ShaderNodeOutputMaterial');L.new(em.outputs[0],out.inputs['Surface'])
        if not o.modifiers.get('Contorno cartoon forte'):
            o.data.materials.append(ink)
            mod=o.modifiers.new('Contorno cartoon forte','SOLIDIFY');mod.thickness=.026;mod.offset=1;mod.use_flip_normals=True;mod.material_offset=len(o.data.materials)-1;mod.use_rim=False
    scene.render.filepath=str(OUT/('heating_'+scene.name.split()[1]+'.png'))
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.shading.type='MATERIAL';area.spaces.active.region_3d.view_perspective='CAMERA';area.spaces.active.overlay.show_overlays=False
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'heating_opcoes.blend'),copy=True)
