"""Render ground-plane quarter turns, preserving the upright Z axis and map camera.

blender -b -P tools/lua3d/export_editor_rotations.py
blender -b assets/blender/estacao_solar.blend -P tools/lua3d/export_editor_rotations.py -- --solar
Original approved sprites are preserved. Output: rotacoesModulos.json and *_r1..3.png.
"""
import os, sys, json, math, re
from pathlib import Path
import bpy
from mathutils import Matrix, Vector

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
INDEX = ROOT / 'src/dados/rotacoesModulos.json'
if '--index' in sys.argv: INDEX=Path(sys.argv[sys.argv.index('--index')+1]).resolve()
OUT = ROOT / 'public/lua/modulos'
originals = json.loads((ROOT / 'src/dados/modulos.json').read_text(encoding='utf-8'))
result = json.loads(INDEX.read_text(encoding='utf-8')) if INDEX.exists() else {}

def progress(message):
    path=ROOT/('.playwright-mcp/render-progress-solar.txt' if '--solar' in sys.argv else '.playwright-mcp/render-progress.txt');path.parent.mkdir(exist_ok=True)
    path.write_text(message,encoding='utf-8')
    print(message,flush=True)

progress('Preparing model definitions')
bpy.context.preferences.edit.use_global_undo=False

def turn(w, h, q):
    nw, nh = (h, w) if q % 2 else (w, h)
    return Matrix.Translation((nw/2, -nh/2, 0)) @ Matrix.Rotation(-q*math.pi/2, 4, 'Z') @ Matrix.Translation((-w/2, h/2, 0))

if '--solar' in sys.argv:
    # The approved blend uses Blender 5.x compression. Recreate its committed generator
    # in memory when using an older Blender; never rewrite the original blend or sprites.
    if not bpy.data.scenes.get('Estacao Solar - 6 paineis e 5 baterias'):
        generator=(HERE/'make_solar_station.py').read_text(encoding='utf-8').split('bpy.ops.wm.save_as_mainfile')[0]
        generator=generator.replace("'BLENDER_EEVEE'","'BLENDER_EEVEE_NEXT'")
        # Only panel 01 is exported: avoid rebuilding five identical unused panels.
        generator=generator.replace('for row in range(2):\n    for col in range(3):','for row in range(1):\n    for col in range(1):',1)
        progress('Building approved solar station geometry')
        exec(compile(generator,str(HERE/'make_solar_station.py'),'exec'),{'__file__':str(HERE/'make_solar_station.py')})
    source = (HERE / 'export_solar_station.py').read_text(encoding='utf-8').split("if '--banco' not in sys.argv:")[0]
    source = source.replace("'BLENDER_EEVEE'", "'BLENDER_EEVEE_NEXT'")
    source = source.replace("('bateria_carga%d' % count) if bank else stem", "('bateria_carga%d' % count + sufixo) if bank else stem")
    source = source.replace("if bank:\n        # Default image", "if False:\n        # Default image")
    env = {'__file__': str(HERE / 'export_solar_station.py')}
    exec(compile(source, env['__file__'], 'exec'), env)
    env['models'] = result
    for q in (1, 2, 3):
        progress(f'Rendering solar station quarter turn {q}')
        env['sufixo'] = f'_r{q}'
        env['export']('Painel 01 | modulo completo', f'painel_r{q}', turn(2,1,q) @ Matrix.Translation((1,-0.5,0)) @ Matrix.Diagonal((0.76,0.76,0.76,1)))
        env['export']('Banco de baterias | cinco encaixes', f'bateria_r{q}', turn(2,5,q) @ Matrix.Translation((1,-2.2575,0)) @ Matrix.Diagonal((-0.8,0.70,0.80,1)), bank=True)
        for key in [f'painel_r{q}'] + [f'bateria_carga{i}_r{q}' for i in range(6)]:
            w,h = (2,1) if key.startswith('painel') else (2,5)
            result[key]['pegada'] = [h,w] if q%2 else [w,h]
        result[f'bateria_r{q}'] = dict(result[f'bateria_carga5_r{q}'])
else:
    os.environ['ESTILO'] = 'cartoon'
    source = (HERE / 'make_modules.py').read_text(encoding='utf-8').split('# Live preview of one model:')[0]
    source = source.replace("'BLENDER_EEVEE'", "'BLENDER_EEVEE_NEXT'")
    env = {'__file__': str(HERE / 'make_modules.py')}
    exec(compile(source, env['__file__'], 'exec'), env)
    sc, group = env['sc'], env['grupo']
    if hasattr(sc.eevee,'taa_render_samples'): sc.eevee.taa_render_samples = 16
    for name, build in env['MODELOS'].items():
        if name not in originals or name in ('painel','bateria','chama','foguete_voo'): continue
        base = 'plataforma' if name.startswith('foguete') else re.sub(r'_(anim\d|agua\d)$','',name)
        if base not in env['TIPOS']: continue
        w,h = env['TIPOS'][base]
        pending=[q for q in (1,2,3) if f'{name}_r{q}' not in result or not (ROOT/'public'/result[f'{name}_r{q}']['arquivo']).exists()]
        if not pending: continue
        progress('Building '+name)
        for obj in list(sc.objects):
            if obj.type == 'MESH' or (obj.type == 'LIGHT' and obj.data.type != 'SUN'): bpy.data.objects.remove(obj,do_unlink=True)
        group.clear(); build(); bpy.context.view_layer.update()
        snapshots={obj:obj.matrix_world.copy() for obj in group}
        for q in (1,2,3):
            key=f'{name}_r{q}'
            if q not in pending: continue
            transform=turn(w,h,q)
            for obj,matrix in snapshots.items(): obj.matrix_world=transform@matrix
            progress('Framing '+key)
            W,H,cx,cy=env['enquadrar']()
            progress('Rendering '+key)
            sc.render.filepath=str(OUT/f'{key}.png'); bpy.ops.render.render(write_still=True)
            right,up,s=env['right'],env['up'],env['s']
            result[key]={'arquivo':f'lua/modulos/{key}.png','w':W,'h':H,'escala':0.5,
                         'ancora':[round(W/2-cx*s,2),round(H/2+cy*s,2)],'pegada':[h,w] if q%2 else [w,h]}
            INDEX.write_text(json.dumps(result,indent=1),encoding='utf-8')
            print('ORIENTATION',key,flush=True)
INDEX.write_text(json.dumps(result,indent=1),encoding='utf-8')
print('UPRIGHT ORIENTATIONS COMPLETE',len(result),flush=True)
