# Generated with AI assistance (Claude). See README, "Use of AI tools".
# Reduces rendered module pictures to 255-color PNG8 with alpha, like make_modules.py does with
# ImageMagick, for machines without it. Needs Pillow.
#   python tools/lua3d/png8.py public/lua/modulos/blindagem.png [more.png ...]
import sys
from PIL import Image

for caminho in sys.argv[1:]:
    im = Image.open(caminho).convert('RGBA')
    im.quantize(colors=255, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(caminho, optimize=True)
    print('png8', caminho)
