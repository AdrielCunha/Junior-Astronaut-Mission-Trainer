# Shared approved lunar palette and illustrated crater rims for Blender generators.
import json, math, os
HERE=os.path.dirname(os.path.abspath(__file__))
ROOT=os.path.abspath(os.path.join(HERE,'..','..'))
with open(os.path.join(ROOT,'src','dados','paleta_lua.json')) as f: PALETA=json.load(f)

def contornos_crateras(bpy,scene,crateras,transform):
    def material(name,color):
        mat=bpy.data.materials.new(name);mat.use_nodes=True
        n=mat.node_tree.nodes;n.clear()
        em=n.new('ShaderNodeEmission');h=color.lstrip('#');srgb=[int(h[i:i+2],16)/255 for i in (0,2,4)]
        em.inputs['Color'].default_value=(*[c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in srgb],1)
        out=n.new('ShaderNodeOutputMaterial');mat.node_tree.links.new(em.outputs[0],out.inputs['Surface'])
        return mat
    ink=material('Crater illustrated outline',PALETA['contorno'])
    bright=material('Crater chalk edge',PALETA['realceCratera'])
    for x,y,r,depth in crateras:
        for begin,end,mat in [(1.015,1.085,ink),(.785,.825,ink),(.94,.975,bright)]:
            verts=[];faces=[];steps=112
            for k in range(steps):
                angle=math.tau*k/steps
                for frac in (begin,end):
                    rr=r*(frac+.004*math.sin(angle*5+x))
                    verts.append(transform(x+math.cos(angle)*rr,y+math.sin(angle)*rr))
            for k in range(steps):
                a,b=2*k,2*((k+1)%steps);faces.append((a,b,b+1,a+1))
            mesh=bpy.data.meshes.new('Crater contour');mesh.from_pydata(verts,[],faces);mesh.update()
            obj=bpy.data.objects.new('Crater illustrated rim',mesh);scene.collection.objects.link(obj);mesh.materials.append(mat)
