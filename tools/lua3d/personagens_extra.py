# Generated with AI assistance (Claude). See README, "Use of AI tools".
# The different astronaut characters of the wardrobe (page "Astronauts"). exec'ed into make_astronaut.py's
# namespace (peca, H, corpo, cabeca, math, K = the character's entry in SKINS) right after the body is built.
# Same skeleton, walk cycle, helmet size and feet anchor as the commander (so hats and faces fit every
# character): what changes is the colors, the chunkiness (K['cw']) and the extras built here (ears, tails,
# horns, antennae, wings...). Light colors only. Ids must match src/dados/skins.ts.

def _par(nome, kind, size, loc, cor, pai, rot=(0, 0, 0), lados=(-1, 1), espelhar_rot=False):
    """The same part on both sides (y mirrored)."""
    for l in lados:
        r = (rot[0] * l, rot[1], rot[2] * l) if espelhar_rot else rot
        peca(f'{nome}{l}', kind, size, (loc[0], loc[1] * l, loc[2]), cor, pai, rot=r)

def pers_robo():
    _par('x_parafuso', 'cyl', (H * 0.07, H * 0.07, H * 0.05), (0, H * 0.205, H * 0.20), '#94a3b8', cabeca, rot=(math.pi / 2, 0, 0))
    for i in range(4):   # coil antenna
        peca(f'x_mola{i}', 'cyl', (H * 0.05, H * 0.05, H * 0.022), (-H * 0.05, -H * 0.12, H * (0.385 + i * 0.03)), '#38bdf8' if i % 2 else '#cbd5e1', cabeca)
    peca('x_painel', 'box', (H * 0.02, H * 0.17, H * 0.12), (H * 0.128, 0, H * 0.13), '#38bdf8', corpo, bevel=0.004)
    for i in range(3): peca(f'x_botao{i}', 'ball', (H * 0.03, H * 0.03, H * 0.03), (H * 0.14, (i - 1) * H * 0.05, H * 0.13), '#fde047' if i == 1 else '#f9a8d4', corpo)

def pers_alien():
    _par('x_haste', 'cyl', (H * 0.018, H * 0.018, H * 0.12), (0, H * 0.085, H * 0.43), '#86efac', cabeca, rot=(0.25, 0, 0), espelhar_rot=True)
    _par('x_bola', 'ball', (H * 0.065, H * 0.065, H * 0.065), (0, H * 0.115, H * 0.495), '#f0abfc', cabeca)
    _par('x_ponta', 'cone', (H * 0.06, H * 0.06, H * 0.10), (-H * 0.01, H * 0.205, H * 0.20), '#bbf7d0', cabeca, rot=(math.pi / 2 + 0.2, 0, 0), espelhar_rot=True)

def pers_gato():
    _par('x_orelha', 'cone', (H * 0.15, H * 0.12, H * 0.19), (-H * 0.01, H * 0.12, H * 0.43), '#fed7aa', cabeca, rot=(0.30, 0, 0), espelhar_rot=True)
    _par('x_dentro', 'cone', (H * 0.085, H * 0.06, H * 0.11), (H * 0.015, H * 0.118, H * 0.425), '#f9a8d4', cabeca, rot=(0.30, 0, 0), espelhar_rot=True)
    for i, (x, z) in enumerate([(-0.21, 0.04), (-0.27, 0.09), (-0.30, 0.16), (-0.29, 0.23)]):
        peca(f'x_rabo{i}', 'ball', (H * (0.09 - i * 0.008), H * (0.09 - i * 0.008), H * (0.09 - i * 0.008)), (H * x, 0, H * z), '#fb923c' if i == 3 else '#fed7aa', corpo)

def pers_urso():
    _par('x_orelha', 'ball', (H * 0.12, H * 0.09, H * 0.12), (0, H * 0.14, H * 0.385), '#d6b48a', cabeca)
    _par('x_dentro', 'ball', (H * 0.07, H * 0.05, H * 0.07), (H * 0.02, H * 0.14, H * 0.385), '#f5deb3', cabeca)
    peca('x_barriga', 'ball', (H * 0.04, H * 0.20, H * 0.20), (H * 0.115, 0, H * 0.14), '#f5deb3', corpo)

def pers_coelho():
    _par('x_orelha', 'cyl', (H * 0.075, H * 0.05, H * 0.21), (-H * 0.02, H * 0.075, H * 0.485), '#fce7f3', cabeca, rot=(0.20, 0, 0), espelhar_rot=True)
    _par('x_dentro', 'cyl', (H * 0.04, H * 0.03, H * 0.15), (H * 0.003, H * 0.075, H * 0.485), '#f9a8d4', cabeca, rot=(0.20, 0, 0), espelhar_rot=True)
    peca('x_rabo', 'ball', (H * 0.13, H * 0.13, H * 0.13), (-H * 0.27, 0, H * 0.10), '#ffffff', corpo)

def pers_cachorro():
    _par('x_orelha', 'ball', (H * 0.075, H * 0.05, H * 0.15), (-H * 0.01, H * 0.215, H * 0.22), '#b45309', cabeca, rot=(0.25, 0, 0), espelhar_rot=True)
    for i, (x, z) in enumerate([(-0.20, 0.06), (-0.25, 0.13), (-0.27, 0.20)]):
        peca(f'x_rabo{i}', 'ball', (H * 0.075, H * 0.075, H * 0.085), (H * x, 0, H * z), '#fcd34d', corpo)
    peca('x_mancha', 'ball', (H * 0.13, H * 0.10, H * 0.11), (-H * 0.02, -H * 0.10, H * 0.34), '#fcd34d', cabeca)

def pers_pinguim():
    peca('x_barriga', 'ball', (H * 0.05, H * 0.22, H * 0.24), (H * 0.115, 0, H * 0.14), '#ffffff', corpo)
    peca('x_bico', 'cone', (H * 0.08, H * 0.05, H * 0.09), (H * 0.215, 0, H * 0.095), '#f97316', cabeca, rot=(0, math.pi / 2, 0))
    _par('x_asa', 'ball', (H * 0.06, H * 0.05, H * 0.20), (0, H * 0.235, H * 0.12), '#60a5fa', corpo, rot=(0.20, 0, 0), espelhar_rot=True)

def pers_dino():
    for i, z in enumerate([0.30, 0.24, 0.18, 0.12]):
        peca(f'x_espinho{i}', 'cone', (H * 0.09, H * 0.05, H * (0.13 - i * 0.012)), (-H * 0.245, 0, H * z), '#facc15', corpo, rot=(0, -math.pi / 2 + 0.3, 0))
    for i, (x, z, s) in enumerate([(-0.22, 0.04, 0.10), (-0.30, 0.07, 0.075), (-0.355, 0.095, 0.05)]):
        peca(f'x_rabo{i}', 'ball', (H * s, H * s, H * s), (H * x, 0, H * z), '#4ade80', corpo)
    _par('x_chifre', 'cone', (H * 0.05, H * 0.05, H * 0.09), (H * 0.02, H * 0.09, H * 0.40), '#fef08a', cabeca, rot=(0.15, 0, 0), espelhar_rot=True)

def pers_raposa():
    _par('x_orelha', 'cone', (H * 0.14, H * 0.10, H * 0.21), (-H * 0.01, H * 0.115, H * 0.44), '#fdba74', cabeca, rot=(0.20, 0, 0), espelhar_rot=True)
    _par('x_dentro', 'cone', (H * 0.075, H * 0.05, H * 0.12), (H * 0.012, H * 0.115, H * 0.435), '#ffffff', cabeca, rot=(0.20, 0, 0), espelhar_rot=True)
    peca('x_rabo', 'ball', (H * 0.25, H * 0.13, H * 0.13), (-H * 0.29, 0, H * 0.10), '#fb923c', corpo, rot=(0, 0.5, 0))
    peca('x_ponta', 'ball', (H * 0.10, H * 0.11, H * 0.11), (-H * 0.40, 0, H * 0.16), '#ffffff', corpo)

def pers_unicornio():
    peca('x_chifre', 'cone', (H * 0.07, H * 0.07, H * 0.20), (H * 0.04, 0, H * 0.47), '#fde047', cabeca, rot=(0, 0.25, 0))
    for i, z in enumerate([0.36, 0.30, 0.24]):
        peca(f'x_crina{i}', 'ball', (H * 0.075, H * 0.075, H * 0.075), (-H * 0.17, 0, H * z), ['#f0abfc', '#93c5fd', '#fde68a'][i], cabeca)

def pers_panda():
    _par('x_orelha', 'ball', (H * 0.12, H * 0.09, H * 0.12), (0, H * 0.15, H * 0.375), '#64748b', cabeca)
    _par('x_mancha', 'ball', (H * 0.05, H * 0.09, H * 0.11), (H * 0.215, H * 0.115, H * 0.235), '#94a3b8', cabeca)
    _par('x_braco', 'box', (H * 0.098, H * 0.098, H * 0.05), (0, H * 0.19, H * 0.215), '#64748b', corpo)

PERSONAGENS_EXTRA = {
    'robo': pers_robo, 'alien': pers_alien, 'gato': pers_gato, 'urso': pers_urso, 'coelho': pers_coelho,
    'cachorro': pers_cachorro, 'pinguim': pers_pinguim, 'dino': pers_dino, 'raposa': pers_raposa,
    'unicornio': pers_unicornio, 'panda': pers_panda,
}
