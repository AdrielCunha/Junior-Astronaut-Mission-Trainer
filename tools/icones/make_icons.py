"""Extra icons in the style of the lunar_icons_v6 pack (public/icons/lunar-v6).

Same 128 viewBox, same gradients, the same cream halo around the silhouette (a wide faint stroke plus a
solid 9px one), drawn as SVG and rasterized to 512x512 PNG by headless Chrome (transparent background).

    python tools/icones/make_icons.py          # writes <id>.svg + <id>.png and preview-extra.png
"""
import os
import subprocess
import sys
import tempfile

PASTA = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'icons', 'lunar-v6')
CHROME = [r'C:\Program Files\Google\Chrome\Application\chrome.exe',
          r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe']

DEFS = '''<defs>
<linearGradient id="gW" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#c3c1f0"/></linearGradient>
<linearGradient id="gN" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a69f5"/><stop offset="1" stop-color="#1a2a9c"/></linearGradient>
<linearGradient id="gO" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc94d"/><stop offset="1" stop-color="#ff8200"/></linearGradient>
<linearGradient id="gB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7be4ff"/><stop offset="1" stop-color="#1b78e4"/></linearGradient>
<linearGradient id="gG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfff63"/><stop offset="1" stop-color="#35b81c"/></linearGradient>
<linearGradient id="gY" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff08a"/><stop offset="1" stop-color="#ffb41f"/></linearGradient>
<linearGradient id="gR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff86a0"/><stop offset="1" stop-color="#d31c49"/></linearGradient>
<linearGradient id="gV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7d97ff"/><stop offset="1" stop-color="#2b3fd0"/></linearGradient>
<linearGradient id="gM" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffa36b"/><stop offset="1" stop-color="#d4471c"/></linearGradient>
</defs>'''

BRILHO = '<path d="{d}" fill="none" stroke="#fff" stroke-width="{w}" stroke-linecap="round" opacity=".55"/>'


def svg(silhueta: str, corpo: str, escala: float) -> str:
    t = f'translate(64 64) scale({escala}) translate(-64 -64)'
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="512" height="512">{DEFS}'
            f'<g transform="{t}" fill="#fff3c4" stroke="#fff3c4" stroke-linejoin="round" stroke-linecap="round">'
            f'<g stroke-width="18" opacity=".22">{silhueta}</g><g stroke-width="9">{silhueta}</g></g>'
            f'<g transform="{t}">{corpo}</g></svg>')


def raios(cx, cy, r0, r1, n, larg, fill):
    import math
    out = []
    for i in range(n):
        a = 2 * math.pi * i / n
        b = larg / r0
        p = [(cx + r0 * math.cos(a - b), cy + r0 * math.sin(a - b)), (cx + r1 * math.cos(a), cy + r1 * math.sin(a)),
             (cx + r0 * math.cos(a + b), cy + r0 * math.sin(a + b))]
        out.append('<polygon points="%s" fill="%s"/>' % (' '.join(f'{x:.1f},{y:.1f}' for x, y in p), fill))
    return ''.join(out)


def estrela(cx, cy, r, ri, pontas=5, rot=-90):
    import math
    pts = []
    for i in range(pontas * 2):
        a = math.radians(rot + 180 * i / pontas)
        rr = r if i % 2 == 0 else ri
        pts.append(f'{cx + rr * math.cos(a):.1f},{cy + rr * math.sin(a):.1f}')
    return ' '.join(pts)


ICONES = {}

# Sun: a fat yellow disc with orange rays.
ICONES['sun'] = (
    '<circle cx="64" cy="64" r="56"/>',
    raios(64, 64, 34, 58, 12, 9, 'url(#gO)')
    + '<circle cx="64" cy="64" r="36" fill="url(#gO)"/><circle cx="64" cy="64" r="29" fill="url(#gY)" stroke="#fff3a0" stroke-width="2.5"/>'
    + BRILHO.format(d='M48 54 A18 18 0 0 1 60 44', w=5)
    + '<circle cx="55" cy="66" r="3.4" fill="#c2410c"/><circle cx="73" cy="66" r="3.4" fill="#c2410c"/>'
    + '<path d="M56 75 Q64 82 72 75" fill="none" stroke="#c2410c" stroke-width="3.4" stroke-linecap="round"/>',
    0.92)

# Moon / night: blue crescent with two little stars.
LUA = 'M78 10 A54 54 0 1 0 118 84 A42 42 0 0 1 78 10Z'
ICONES['moon'] = (
    f'<path d="{LUA}"/><polygon points="{estrela(98, 30, 14, 6)}"/>',
    f'<path d="{LUA}" fill="url(#gN)"/>'
    f'<path d="{LUA}" fill="url(#gW)" transform="translate(58 66) scale(0.84) translate(-58 -66)"/>'
    '<circle cx="44" cy="80" r="7" fill="#c3c1f0"/><circle cx="62" cy="100" r="4.5" fill="#c3c1f0"/><circle cx="34" cy="56" r="4" fill="#c3c1f0"/>'
    + BRILHO.format(d='M30 44 Q24 64 32 84', w=5)
    + f'<polygon points="{estrela(98, 30, 14, 6)}" fill="url(#gY)" stroke="#fff3a0" stroke-width="2" stroke-linejoin="round"/>',
    0.9)

# Star (score, goal reached).
ESTRELA = estrela(64, 68, 58, 26)
ICONES['star'] = (
    f'<polygon points="{ESTRELA}"/>',
    f'<polygon points="{ESTRELA}" fill="url(#gO)" stroke-linejoin="round"/>'
    f'<polygon points="{estrela(64, 70, 44, 20)}" fill="url(#gY)" stroke="#fff3a0" stroke-width="2.5" stroke-linejoin="round"/>'
    + BRILHO.format(d='M50 52 L58 40', w=5),
    0.92)

# Timer: a stopwatch with an orange slice of time.
ICONES['timer'] = (
    '<circle cx="64" cy="72" r="50"/><rect x="50" y="6" width="28" height="16" rx="6"/><rect x="58" y="16" width="12" height="12"/>',
    '<rect x="58" y="16" width="12" height="14" fill="url(#gN)"/><rect x="50" y="6" width="28" height="15" rx="6" fill="url(#gO)"/>'
    '<rect x="96" y="22" width="16" height="11" rx="5" fill="url(#gN)" transform="rotate(42 104 28)"/>'
    '<circle cx="64" cy="72" r="50" fill="url(#gN)"/><circle cx="64" cy="72" r="41" fill="url(#gW)"/>'
    '<path d="M64 72 L64 38 A34 34 0 0 1 96 82 Z" fill="url(#gO)" opacity=".9"/>'
    '<path d="M64 72 L64 44" stroke="#1a2a9c" stroke-width="7" stroke-linecap="round"/>'
    '<path d="M64 72 L86 82" stroke="#1a2a9c" stroke-width="6" stroke-linecap="round"/><circle cx="64" cy="72" r="6" fill="#1a2a9c"/>'
    + BRILHO.format(d='M34 60 Q36 46 46 40', w=5),
    0.86)

# Cargo crate (supply drop).
ICONES['cargo'] = (
    '<rect x="12" y="26" width="104" height="90" rx="14"/>',
    '<rect x="12" y="26" width="104" height="90" rx="14" fill="url(#gO)"/>'
    '<rect x="21" y="35" width="86" height="72" rx="8" fill="url(#gY)"/>'
    '<path d="M21 42 L100 107 M28 107 L107 42" stroke="url(#gO)" stroke-width="12"/>'
    '<rect x="12" y="26" width="104" height="18" rx="9" fill="url(#gN)"/>'
    '<rect x="50" y="18" width="28" height="18" rx="6" fill="url(#gN)"/><rect x="58" y="22" width="12" height="6" rx="3" fill="#fff" opacity=".6"/>'
    + BRILHO.format(d='M26 54 V96', w=5),
    0.86)

# Light bulb: a fact / "did you know?".
ICONES['idea'] = (
    '<path d="M64 6 A42 42 0 0 1 90 82 V96 H38 V82 A42 42 0 0 1 64 6Z"/><rect x="40" y="94" width="48" height="28" rx="10"/>',
    '<rect x="40" y="94" width="48" height="26" rx="10" fill="url(#gN)"/><rect x="44" y="100" width="40" height="5" rx="2.5" fill="#7d97ff"/>'
    '<rect x="44" y="109" width="40" height="5" rx="2.5" fill="#7d97ff"/>'
    '<path d="M64 6 A42 42 0 0 1 90 82 V96 H38 V82 A42 42 0 0 1 64 6Z" fill="url(#gO)"/>'
    '<path d="M64 14 A34 34 0 0 1 84 76 V88 H44 V76 A34 34 0 0 1 64 14Z" fill="url(#gY)"/>'
    '<path d="M52 86 V66 L58 60 L64 66 L70 60 L76 66 V86" fill="none" stroke="#ff8200" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>'
    + BRILHO.format(d='M40 46 Q42 30 56 24', w=6),
    0.86)

# Green check in a disc: success.
ICONES['check'] = (
    '<circle cx="64" cy="64" r="56"/>',
    '<circle cx="64" cy="64" r="56" fill="url(#gN)"/><circle cx="64" cy="64" r="47" fill="url(#gG)"/>'
    '<path d="M38 66 L56 84 L92 46" fill="none" stroke="#fff" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>'
    + BRILHO.format(d='M30 54 Q34 34 52 26', w=5),
    0.9)

# Red cross in a disc: failure / do not.
ICONES['cross'] = (
    '<circle cx="64" cy="64" r="56"/>',
    '<circle cx="64" cy="64" r="56" fill="url(#gN)"/><circle cx="64" cy="64" r="47" fill="url(#gR)"/>'
    '<path d="M44 44 L84 84 M84 44 L44 84" fill="none" stroke="#fff" stroke-width="15" stroke-linecap="round"/>'
    + BRILHO.format(d='M30 54 Q34 34 52 26', w=5),
    0.9)

# Warning triangle.
TRI = 'M64 8 C70 8 73 11 76 16 L120 98 C124 106 120 116 110 116 H18 C8 116 4 106 8 98 L52 16 C55 11 58 8 64 8Z'
ICONES['warning'] = (
    f'<path d="{TRI}"/>',
    f'<path d="{TRI}" fill="url(#gO)"/>'
    f'<path d="{TRI}" fill="url(#gY)" transform="translate(64 74) scale(0.8) translate(-64 -74)"/>'
    '<rect x="57" y="40" width="14" height="44" rx="7" fill="#1a2a9c"/><circle cx="64" cy="98" r="8" fill="#1a2a9c"/>',
    0.9)

# Astronaut helmet: the crew.
ICONES['helmet'] = (
    '<circle cx="64" cy="60" r="52"/><rect x="24" y="92" width="80" height="30" rx="12"/>',
    '<rect x="24" y="92" width="80" height="28" rx="12" fill="url(#gN)"/><rect x="34" y="98" width="60" height="6" rx="3" fill="url(#gO)"/>'
    '<circle cx="64" cy="60" r="52" fill="url(#gW)"/>'
    '<rect x="22" y="40" width="84" height="48" rx="24" fill="url(#gN)"/>'
    '<rect x="28" y="45" width="72" height="38" rx="19" fill="url(#gB)"/>'
    '<path d="M38 58 Q44 50 56 50" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".8"/>'
    '<circle cx="14" cy="64" r="8" fill="url(#gO)"/><circle cx="114" cy="64" r="8" fill="url(#gO)"/>'
    + BRILHO.format(d='M40 22 Q50 14 64 13', w=5),
    0.88)

# Radio dish: Mission Control / the antenna.
ICONES['antenna'] = (
    '<path d="M14 40 A52 52 0 0 0 88 114 Z"/><rect x="40" y="86" width="48" height="34" rx="8"/><circle cx="90" cy="34" r="14"/>',
    '<rect x="40" y="96" width="48" height="24" rx="8" fill="url(#gN)"/><rect x="58" y="76" width="12" height="26" fill="url(#gO)"/>'
    '<path d="M14 40 A52 52 0 0 0 88 114 Z" fill="url(#gW)"/>'
    '<path d="M22 50 A42 42 0 0 0 78 106 Z" fill="url(#gB)"/>'
    '<path d="M50 78 L80 46" stroke="#1a2a9c" stroke-width="5" stroke-linecap="round"/><circle cx="82" cy="44" r="7" fill="url(#gO)"/>'
    '<path d="M94 24 A16 16 0 0 1 104 36 M98 12 A28 28 0 0 1 116 32" fill="none" stroke="#ffd21f" stroke-width="6" stroke-linecap="round"/>',
    0.88)

# Cold: a thermometer with a snowflake.
ICONES['cold'] = (
    '<rect x="34" y="8" width="30" height="80" rx="15"/><circle cx="49" cy="96" r="24"/><circle cx="96" cy="44" r="26"/>',
    '<rect x="34" y="8" width="30" height="82" rx="15" fill="url(#gW)"/><circle cx="49" cy="96" r="24" fill="url(#gW)"/>'
    '<rect x="43" y="52" width="12" height="44" rx="6" fill="url(#gB)"/><circle cx="49" cy="96" r="15" fill="url(#gB)"/>'
    '<path d="M64 26 H56 M64 40 H56 M64 54 H56" stroke="#7d97ff" stroke-width="4" stroke-linecap="round"/>'
    '<g stroke="#1b78e4" stroke-width="6" stroke-linecap="round"><path d="M96 24 V64 M79 34 L113 54 M79 54 L113 34"/></g>'
    '<g stroke="#7be4ff" stroke-width="3" stroke-linecap="round"><path d="M96 24 V64 M79 34 L113 54 M79 54 L113 34"/></g>'
    + BRILHO.format(d='M40 18 V44', w=4),
    0.88)

# Mars: an orange planet with craters.
ICONES['mars'] = (
    '<circle cx="64" cy="64" r="54"/>',
    '<circle cx="64" cy="64" r="54" fill="url(#gM)"/>'
    '<circle cx="46" cy="50" r="10" fill="#c2410c" opacity=".55"/><circle cx="82" cy="82" r="14" fill="#c2410c" opacity=".5"/>'
    '<circle cx="80" cy="40" r="6" fill="#c2410c" opacity=".5"/><circle cx="44" cy="88" r="6" fill="#c2410c" opacity=".45"/>'
    '<path d="M28 64 Q50 70 72 60 T104 66" fill="none" stroke="#fff3c4" stroke-width="4" opacity=".35"/>'
    '<ellipse cx="64" cy="14" rx="18" ry="5" fill="#fff" opacity=".9"/>'
    + BRILHO.format(d='M26 54 Q30 32 50 22', w=5),
    0.9)

# Rover: a little moon buggy.
ICONES['rover'] = (
    '<rect x="8" y="44" width="112" height="44" rx="14"/><circle cx="32" cy="94" r="22"/><circle cx="96" cy="94" r="22"/><rect x="40" y="18" width="40" height="30" rx="8"/>',
    '<rect x="44" y="22" width="32" height="26" rx="7" fill="url(#gB)"/><path d="M50 30 Q56 26 62 28" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round"/>'
    '<rect x="8" y="44" width="112" height="40" rx="14" fill="url(#gO)"/><rect x="16" y="50" width="96" height="10" rx="5" fill="url(#gY)"/>'
    '<circle cx="32" cy="94" r="22" fill="url(#gN)"/><circle cx="32" cy="94" r="10" fill="url(#gW)"/>'
    '<circle cx="96" cy="94" r="22" fill="url(#gN)"/><circle cx="96" cy="94" r="10" fill="url(#gW)"/>'
    '<rect x="100" y="30" width="6" height="16" fill="url(#gN)"/><circle cx="103" cy="28" r="7" fill="url(#gW)"/>',
    0.88)

# Plant sprout: the Greenhouse.
ICONES['plant'] = (
    '<path d="M64 60 C20 70 10 30 14 16 C40 12 64 30 64 60Z"/><path d="M64 52 C70 20 100 10 118 16 C120 44 96 62 64 60Z"/><rect x="30" y="70" width="68" height="50" rx="12"/>',
    '<path d="M60 92 V54" stroke="#35b81c" stroke-width="8" stroke-linecap="round"/>'
    '<path d="M62 62 C24 70 14 34 18 20 C42 18 62 34 62 62Z" fill="url(#gG)"/>'
    '<path d="M62 56 C68 26 96 16 114 20 C114 44 94 60 62 58Z" fill="url(#gG)"/>'
    '<path d="M26 28 Q42 40 54 56 M106 28 Q88 36 70 52" stroke="#fff" stroke-width="3.5" fill="none" opacity=".6" stroke-linecap="round"/>'
    '<path d="M30 72 H98 L90 120 H38Z" fill="url(#gO)"/><rect x="26" y="68" width="76" height="14" rx="6" fill="url(#gN)"/>',
    0.88)

# Big arrow pointing right: "go there", objective.
SETA = 'M10 48 H66 V18 L120 64 L66 110 V80 H10Z'
ICONES['goal'] = (
    f'<path d="{SETA}"/>',
    f'<path d="{SETA}" fill="url(#gO)"/>'
    f'<path d="{SETA}" fill="url(#gY)" transform="translate(62 64) scale(0.78) translate(-62 -64)"/>'
    + BRILHO.format(d='M20 56 H60', w=5),
    0.9)


def rasterizar(svg_path: str, png_path: str):
    chrome = next((c for c in CHROME if os.path.exists(c)), None)
    if not chrome:
        sys.exit('Chrome/Edge not found')
    with tempfile.TemporaryDirectory() as tmp:
        html = os.path.join(tmp, 'i.html')
        with open(html, 'w', encoding='utf-8') as f:
            f.write('<html><body style="margin:0;background:transparent">'
                    f'<img src="file:///{os.path.abspath(svg_path).replace(os.sep, "/")}" width="512" height="512"></body></html>')
        subprocess.run([chrome, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--default-background-color=00000000',
                        f'--screenshot={os.path.abspath(png_path)}', '--window-size=512,512', f'--user-data-dir={tmp}',
                        'file:///' + html.replace(os.sep, '/')], check=True, capture_output=True, timeout=60)


def main():
    os.makedirs(PASTA, exist_ok=True)
    for nome, (sil, corpo, esc) in ICONES.items():
        p = os.path.join(PASTA, f'{nome}.svg')
        with open(p, 'w', encoding='utf-8') as f:
            f.write(svg(sil, corpo, esc))
        rasterizar(p, os.path.join(PASTA, f'{nome}.png'))
        print(nome)
    # Preview sheet on the game's blue, big and at HUD size.
    from PIL import Image
    nomes = list(ICONES)
    folha = Image.new('RGBA', (len(nomes) * 140 + 20, 230), (32, 52, 200, 255))
    for i, n in enumerate(nomes):
        im = Image.open(os.path.join(PASTA, f'{n}.png')).convert('RGBA')
        folha.alpha_composite(im.resize((120, 120), Image.LANCZOS), (20 + i * 140, 20))
        folha.alpha_composite(im.resize((32, 32), Image.LANCZOS), (64 + i * 140, 170))
    folha.save(os.path.join(PASTA, 'preview-extra.png'))


if __name__ == '__main__':
    main()
