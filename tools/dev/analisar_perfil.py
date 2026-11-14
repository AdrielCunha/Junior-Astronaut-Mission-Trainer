# Generated with AI assistance (Claude). See README, "Use of AI tools".
# Summarizes a Firefox profile (profiler.firefox.com "Upload" / "Save as file", .json.gz):
# which threads were busy and, in the busiest game thread, which functions took the time.
#
#   python3 tools/dev/analisar_perfil.py "Firefox <date> profile.json.gz" [url-part=localhost]
import gzip, json, sys, collections


def carregar(p):
    with (gzip.open(p) if p.endswith('.gz') else open(p)) as f:
        return json.load(f)


def tabela(t, d, nome):
    # Processed profiles keep tables per thread or in "shared", depending on the version.
    return t.get(nome) or d.get('shared', {}).get(nome)


def prefixos(st):
    # Newer profiles store each stack's parent as an offset back from its own index (0 = root).
    if 'prefix' in st: return st['prefix']
    return [None if o == 0 else k - o for k, o in enumerate(st['prefixOffset'])]


def categorias(st, ft):
    if 'category' in st: return st['category']
    fc = ft['category']
    return [fc[f] for f in st['frame']]


def coluna(tab, campo):
    if 'data' in tab and 'schema' in tab:              # raw gecko format
        i = tab['schema'][campo]
        return [row[i] if row else None for row in tab['data']]
    return tab[campo]


def main():
    caminho = sys.argv[1]
    d = carregar(caminho)
    S = d.get('shared', {}).get('stringArray')
    cats = [c['name'] for c in d['meta']['categories']]
    interval = d['meta'].get('interval', 1)
    # Weight every sample by the CPU time the thread really used (threadCPUDelta): the category of
    # the leaf frame does not say whether the thread was busy in newer profiles.
    resumo = []
    for i, t in enumerate(d['threads']):
        s = t['samples']
        cpu = s.get('threadCPUDelta') or [1] * len(s['stack'])
        resumo.append((sum(c or 0 for c in cpu), i, t.get('name'), t.get('processName'), len(s['stack'])))
    resumo.sort(reverse=True)
    total_cpu = sum(r[0] for r in resumo) or 1
    print(f'interval {interval} ms; threads by CPU used:')
    for r in resumo[:8]:
        print(f'  {100 * r[0] / total_cpu:5.1f}%  #{r[1]:2d} {r[2]} [{r[3]}]')
    alvo = resumo[0] if 'Content' in (resumo[0][3] or '') else next(r for r in resumo if 'Content' in (r[3] or ''))
    t = d['threads'][alvo[1]]
    st, ft, fn = tabela(t, d, 'stackTable'), tabela(t, d, 'frameTable'), tabela(t, d, 'funcTable')
    strings = t.get('stringArray') or t.get('stringTable') or S
    sp, sf, sc = prefixos(st), st['frame'], categorias(st, ft)
    ff = coluna(ft, 'func')
    fname = coluna(fn, 'name')
    nome = lambda k: strings[fname[ff[sf[k]]]]
    proprio, inclusivo, cat_t = collections.Counter(), collections.Counter(), collections.Counter()
    pilhas = coluna(t['samples'], 'stack')
    cpu = t['samples'].get('threadCPUDelta') or [1] * len(pilhas)
    for k, w in zip(pilhas, cpu):
        if k is None or not w: continue
        cat_t[cats[sc[k]]] += w
        proprio[nome(k)] += w
        vistos = set()
        while k is not None:
            n = nome(k)
            if n not in vistos: inclusivo[n] += w; vistos.add(n)
            k = sp[k]
    total = sum(cat_t.values())
    print(f'\ngame thread #{alvo[1]} ({alvo[3]})')
    print('by category:', ', '.join(f'{c} {100 * n / total:.0f}%' for c, n in cat_t.most_common()))
    print('\nself time (top 25):')
    for n, c in proprio.most_common(25): print(f'  {100 * c / total:5.1f}%  {n[:110]}')
    print('\ninclusive time, game code and engine (top 30):')
    for n, c in inclusivo.most_common(400):
        if any(k in n for k in ('cenas/', 'engine/', 'phaser', 'Phaser', 'update', 'render', 'step')):
            print(f'  {100 * c / total:5.1f}%  {n[:110]}')


main()
