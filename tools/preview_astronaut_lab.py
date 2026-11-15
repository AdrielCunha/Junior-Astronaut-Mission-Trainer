"""Rasterize frames recorded by LAB_CAPTURE=1 npm run lab:smoke.
Requires Pillow. These are previews of the runtime mesh projection, not offline Blender poses.
"""
import json
from pathlib import Path
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/lab'
def render(path):
    im=Image.new('RGB',(1280,1120),'#142235');draw=ImageDraw.Draw(im,'RGBA')
    for command in json.loads(path.read_text()):
        color=command['color']
        if color.startswith('rgba'):
            v=color[5:-1].split(',');color=tuple(int(float(x)) for x in v[:3])+(int(float(v[3])*255),)
        elif color.startswith('rgb'):
            color=tuple(map(int,color[4:-1].split(',')))+(int(command['alpha']*255),)
        else:color=tuple(int(color[i:i+2],16) for i in (1,3,5))+(int(command['alpha']*255),)
        if len(command['path'])>=3:draw.polygon([(x*1280/900,y*1120/800) for x,y in command['path']],fill=color)
    return im.resize((640,560),Image.Resampling.LANCZOS)
for prefix,count,duration,name in [('walk',20,33,'previa-movimento.gif'),('jump',63,67,'previa-salto.gif')]:
    frames=[render(Path(f'/tmp/nasa-lab-{prefix}-{i}.json')) for i in range(count)]
    frames[0].save(OUT/name,save_all=True,append_images=frames[1:],duration=duration,loop=0,optimize=True)
    print('Saved',OUT/name,flush=True)
    if prefix=='jump':
        sheet=Image.new('RGB',(640*3,560*2),'#142235')
        for k,i in enumerate([0,5,11,26,48,53]):sheet.paste(frames[i],((k%3)*640,(k//3)*560))
        sheet.save(OUT/'fases-salto.png')
