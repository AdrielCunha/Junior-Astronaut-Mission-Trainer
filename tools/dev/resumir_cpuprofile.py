# Generated with AI assistance (Claude). See README, "Use of AI tools".
# Summarizes a Chrome .cpuprofile (from medir_desempenho.mjs with PERFIL=dir): self time and
# total time per function, with its file, so you can see what costs the frame time.
#
#   python3 tools/dev/resumir_cpuprofile.py dir/stage.cpuprofile [top=25]
import json, sys, collections

p = json.load(open(sys.argv[1]))
top = int(sys.argv[2]) if len(sys.argv) > 2 else 25
nos = {n['id']: n for n in p['nodes']}
pai = {}
for n in p['nodes']:
    for c in n.get('children', []): pai[c] = n['id']
nome = lambda n: f"{n['callFrame']['functionName'] or '(anon)'}  {n['callFrame']['url'].split('/')[-1].split('?')[0]}:{n['callFrame']['lineNumber'] + 1}"
proprio, total = collections.Counter(), collections.Counter()
tempo = collections.Counter()
for sid, dt in zip(p['samples'], p['timeDeltas']):
    tempo[sid] += dt
soma = sum(tempo.values()) or 1
for sid, dt in tempo.items():
    n = nos[sid]
    proprio[nome(n)] += dt
    vistos, k = set(), sid
    while k is not None:
        nm = nome(nos[k])
        if nm not in vistos: total[nm] += dt; vistos.add(nm)
        k = pai.get(k)
ocioso = sum(dt for sid, dt in tempo.items() if nos[sid]['callFrame']['functionName'] in ('(idle)', '(program)', '(garbage collector)'))
print(f'{soma / 1000:.0f} ms sampled; idle/program/GC {100 * ocioso / soma:.0f}%')
print('\nself time:')
for k, v in proprio.most_common(top): print(f'  {100 * v / soma:5.1f}%  {k}')
print('\ntotal time (game code):')
for k, v in total.most_common(400):
    if any(s in k for s in ('Superficie', 'Espaco', 'Interface', 'ambiente', 'terreno', 'caminho', 'construcao', 'fisica', 'Radar', 'Menu', 'Carregar', 'filme')):
        print(f'  {100 * v / soma:5.1f}%  {k}')
