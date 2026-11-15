# Generated with AI assistance (Claude). See README, "Use of AI tools".
# More astronaut accessories for make_astronaut.py (exec'ed into its namespace: peca, H, cabeca, math...).
# Hats and the "carinhas": little faces drawn on the dark visor (eyes, mouth, whiskers...). They only exist
# when ACESSORIO=<id> is set; every id here must also be in src/dados/acessorios.ts.

def acessorio_chef():
    peca('acc_faixa', 'cyl', (H * 0.30, H * 0.30, H * 0.07), (0, 0, H * 0.345), '#ffffff', cabeca)
    peca('acc_balao', 'ball', (H * 0.40, H * 0.40, H * 0.28), (0, 0, H * 0.50), '#f8fafc', cabeca)
    for k in range(3):
        a = k * 2 * math.pi / 3
        peca(f'acc_nuvem{k}', 'ball', (H * 0.16, H * 0.16, H * 0.16), (math.cos(a) * H * 0.13, math.sin(a) * H * 0.13, H * 0.60), '#ffffff', cabeca)

def acessorio_mago():
    peca('acc_aba2', 'cyl', (H * 0.54, H * 0.54, H * 0.025), (0, 0, H * 0.335), '#a78bfa', cabeca)
    peca('acc_ponta', 'cone', (H * 0.30, H * 0.30, H * 0.52), (0, 0, H * 0.60), '#c4b5fd', cabeca, rot=(0, 0.10, 0))
    peca('acc_fita2', 'cyl', (H * 0.305, H * 0.305, H * 0.04), (0, 0, H * 0.375), '#fde047', cabeca)
    peca('acc_estrela', 'ball', (H * 0.07, H * 0.07, H * 0.07), (H * 0.04, 0, H * 0.58), '#fde047', cabeca)

# ---- faces on the visor: the visor is an ellipsoid centered (0.10, 0, 0.21) H with radii (0.12, 0.155, 0.115) H ----
def _x(y, z):
    t = 1 - (y / (H * 0.155)) ** 2 - ((z - H * 0.21) / (H * 0.115)) ** 2
    return H * 0.10 + H * 0.12 * math.sqrt(max(t, 0.05)) + H * 0.002

def _elipse(nome, y, z, wy, wz, cor):
    return peca(nome, 'ball', (H * 0.02, wy * H, wz * H), (_x(y * H, z * H), y * H, z * H), cor, cabeca)

def _barra(nome, y, z, wy, wz, cor, giro=0.0):
    return peca(nome, 'box', (H * 0.014, wy * H, wz * H), (_x(y * H, z * H), y * H, z * H), cor, cabeca, rot=(giro, 0, 0))

def _arco(nome, z0, w, prof, cor, sorriso=True, n=7, grosso=0.014):
    for i in range(n):
        y = -w + 2 * w * i / (n - 1)
        z = z0 + (1 if sorriso else -1) * prof * (y / w) ** 2
        _elipse(f'{nome}{i}', y, z, grosso, grosso, cor)

CIANO = '#8ae8ff'; AMARELO = '#fde047'; ROSA = '#fb7185'; ROSA2 = '#f9a8d4'; LIMA = '#bef264'; VERDE = '#86efac'

def _olhos_normais(cor=CIANO, tam=(0.024, 0.045)):
    for lado in (-1, 1): _elipse(f'acc_olho{lado}', lado * 0.058, 0.245, tam[0], tam[1], cor)

def _coracao(nome, y, z, cor):
    _elipse(nome + 'a', y - 0.014, z + 0.010, 0.024, 0.024, cor)
    _elipse(nome + 'b', y + 0.014, z + 0.010, 0.024, 0.024, cor)
    _barra(nome + 'c', y, z - 0.004, 0.036, 0.036, cor, giro=math.pi / 4)

def _estrela(nome, y, z, cor):
    _barra(nome + 'a', y, z, 0.012, 0.062, cor); _barra(nome + 'b', y, z, 0.062, 0.012, cor)
    _barra(nome + 'c', y, z, 0.012, 0.050, cor, giro=math.pi / 4); _barra(nome + 'd', y, z, 0.012, 0.050, cor, giro=-math.pi / 4)

def carinha_feliz():
    _olhos_normais(); _arco('acc_boca', 0.165, 0.075, 0.040, CIANO)

def carinha_piscadinha():
    _elipse('acc_olhoE', -0.058, 0.245, 0.024, 0.045, CIANO)
    _barra('acc_olhoD', 0.058, 0.245, 0.050, 0.012, CIANO)
    _arco('acc_boca', 0.165, 0.075, 0.040, CIANO)

def carinha_coracao():
    for lado in (-1, 1): _coracao(f'acc_c{lado}', lado * 0.060, 0.245, ROSA)
    _arco('acc_boca', 0.165, 0.060, 0.035, ROSA)

def carinha_estrela():
    for lado in (-1, 1): _estrela(f'acc_e{lado}', lado * 0.062, 0.245, AMARELO)
    _arco('acc_boca', 0.165, 0.075, 0.040, AMARELO)

def carinha_gato():
    _olhos_normais(LIMA, (0.020, 0.050))
    _elipse('acc_nariz', 0, 0.190, 0.018, 0.014, ROSA2)
    for lado in (-1, 1):
        _arco(f'acc_w{lado}', 0.165, 0.032, 0.020, LIMA, n=4, grosso=0.010)
        for k in range(3):
            _barra(f'acc_bg{lado}{k}', lado * 0.11, 0.185 + (k - 1) * 0.022, 0.040, 0.008, LIMA, giro=(k - 1) * 0.35 * lado)

def carinha_surpreso():
    for lado in (-1, 1): _elipse(f'acc_olho{lado}', lado * 0.058, 0.248, 0.034, 0.052, CIANO)
    _elipse('acc_boca', 0, 0.160, 0.026, 0.038, ROSA2)

def carinha_sono():
    for lado in (-1, 1): _barra(f'acc_olho{lado}', lado * 0.058, 0.240, 0.050, 0.011, CIANO)
    _elipse('acc_boca', 0, 0.160, 0.016, 0.018, CIANO)
    _barra('acc_z1', 0.10, 0.300, 0.026, 0.009, AMARELO); _barra('acc_z2', 0.10, 0.285, 0.026, 0.009, AMARELO, giro=0.8); _barra('acc_z3', 0.10, 0.270, 0.026, 0.009, AMARELO)

def carinha_lingua():
    for lado in (-1, 1): _arco(f'acc_olho{lado}', 0.240, 0.026, 0.020, CIANO, sorriso=False, n=5, grosso=0.012)
    _elipse('acc_boca', 0, 0.160, 0.050, 0.034, ROSA)
    _elipse('acc_lingua', 0, 0.140, 0.028, 0.028, ROSA2)

def carinha_bravo():
    _olhos_normais(CIANO, (0.022, 0.036))
    for lado in (-1, 1): _barra(f'acc_sob{lado}', lado * 0.058, 0.285, 0.048, 0.011, AMARELO, giro=lado * 0.45)
    _arco('acc_boca', 0.160, 0.045, 0.025, AMARELO, sorriso=False)

def carinha_bobo():
    _elipse('acc_olhoE', -0.058, 0.250, 0.036, 0.056, CIANO); _elipse('acc_pupilaE', -0.052, 0.246, 0.014, 0.020, '#ffffff')
    _elipse('acc_olhoD', 0.058, 0.240, 0.020, 0.030, CIANO)
    _barra('acc_boca', 0.01, 0.165, 0.070, 0.016, ROSA, giro=0.25)
    _elipse('acc_lingua', 0.045, 0.145, 0.026, 0.030, ROSA2)

def carinha_calmo():
    for lado in (-1, 1): _arco(f'acc_olho{lado}', 0.245, 0.028, 0.022, VERDE, sorriso=False, n=5, grosso=0.012)
    _arco('acc_boca', 0.165, 0.040, 0.020, VERDE, n=5)

def carinha_robo():
    for lado in (-1, 1): _barra(f'acc_olho{lado}', lado * 0.058, 0.245, 0.046, 0.046, VERDE)
    _barra('acc_boca', 0, 0.160, 0.110, 0.034, VERDE)
    for k in (-2, -1, 0, 1, 2): _barra(f'acc_dente{k}', k * 0.022, 0.160, 0.006, 0.036, '#1e293b')

ACESSORIOS_EXTRA = {
    'chef': acessorio_chef, 'mago': acessorio_mago,
    'carinha_feliz': carinha_feliz, 'carinha_piscadinha': carinha_piscadinha, 'carinha_coracao': carinha_coracao,
    'carinha_estrela': carinha_estrela, 'carinha_gato': carinha_gato, 'carinha_surpreso': carinha_surpreso,
    'carinha_sono': carinha_sono, 'carinha_lingua': carinha_lingua, 'carinha_bravo': carinha_bravo,
    'carinha_bobo': carinha_bobo, 'carinha_calmo': carinha_calmo, 'carinha_robo': carinha_robo,
}
