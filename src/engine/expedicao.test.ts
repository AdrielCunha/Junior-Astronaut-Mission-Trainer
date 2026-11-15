// Generated with AI assistance (Claude). See README, "Use of AI tools".
import test from 'node:test';
import assert from 'node:assert/strict';
import { avancar, terminada, tracarRota, pontoLivrePerto, maisLonge, criarCorridaEntrega, alvoDaSeta, pista, temperatura, BANDEIRAS_CORRIDA, type Expedicao } from './expedicao.ts';
import { criarExploracao, sortearTipo, haExploracaoHoje, esperaDaExploracao, TIPOS_POR_MUNDO, ESPERA_EXPLORACAO_MIN, ESPERA_EXPLORACAO_MAX, type Contexto } from './exploracao.ts';

const tudoLivre = () => true;

test('the route has n flags, ends at the destination and zig-zags', () => {
  const r = tracarRota({ x: 0, y: 0 }, { x: 20, y: 0 }, 4, tudoLivre);
  assert.equal(r.length, 4);
  assert.deepEqual(r[3], { x: 20, y: 0 });
  assert.ok(r[0].y !== 0 && Math.sign(r[0].y) !== Math.sign(r[1].y));
});

test('a flag on a blocked spot moves to the nearest free one', () => {
  const livre = (x: number, y: number) => !(Math.abs(x - 10) < 1 && Math.abs(y) < 1);
  const p = pontoLivrePerto(10, 0, livre)!;
  assert.ok(livre(p.x, p.y));
  assert.ok(Math.hypot(p.x - 10, p.y) <= 1.5);
  assert.equal(pontoLivrePerto(0, 0, () => false), null);
});

test('flags count in order, only when driving, and the run ends after the last', () => {
  let e = criarCorridaEntrega({ x: 0, y: 0 }, { x: 24, y: 0, nome: 'Workshop' }, tudoLivre)!;
  assert.ok(e.pontos.length >= BANDEIRAS_CORRIDA[0] && e.pontos.length <= BANDEIRAS_CORRIDA[1]);
  assert.equal(avancar(e, e.pontos[1].x, e.pontos[1].y, true).passou, false);   // not before the first
  const aPe = avancar(e, e.pontos[0].x, e.pontos[0].y, false);
  assert.ok(!aPe.passou && aPe.aPe);
  for (const p of e.pontos) { const r = avancar(e, p.x, p.y, true); assert.ok(r.passou); e = r.e; }
  assert.ok(terminada(e));
  assert.equal(avancar(e, 0, 0, true).passou, false);
});

test('runs change: the flag count and the zig-zag vary with the luck', () => {
  const contagens = new Set<number>(), lados = new Set<number>();
  for (let i = 0; i < 20; i++) {
    const v = [i / 20, (i * 0.37) % 1, (i * 0.61) % 1];
    let k = 0;
    const e = criarCorridaEntrega({ x: 0, y: 0 }, { x: 30, y: 0, nome: 'X' }, tudoLivre, () => v[k++ % 3])!;
    contagens.add(e.pontos.length);
    lados.add(Math.sign(e.pontos[0].y));
  }
  assert.ok(contagens.size >= 2);
  assert.deepEqual([...lados].sort(), [-1, 1]);
});

test('no run when there is no room for flags; the farthest module is picked', () => {
  assert.equal(criarCorridaEntrega({ x: 0, y: 0 }, { x: 10, y: 0, nome: 'X' }, () => false), null);
  assert.equal(maisLonge({ x: 0, y: 0 }, [{ x: 3, y: 0, n: 'a' }, { x: 0, y: 9, n: 'b' }, { x: 5, y: 5, n: 'c' }])!.n, 'b');
});

const ctx = (over: Partial<Contexto> = {}): Contexto => ({
  centro: { x: 32, y: 32 }, n: 64, livre: tudoLivre, crateras: [{ x: 50, y: 20, raio: 4 }, { x: 33, y: 33, raio: 3 }],
  casa: { x: 30, y: 30, nome: 'Habitat' }, ...over,
});
const fixa = (v = 0.5) => () => v;

test('hot/cold: the words get warmer as the player gets closer', () => {
  const t = [30, 20, 10, 6, 2].map((d) => temperatura(d).nivel);
  assert.deepEqual(t, [0, 1, 2, 3, 4]);
  assert.equal(temperatura(2).texto, 'Burning!');
});

test('the lost sample has no arrow until it is picked up, then the way back has one', () => {
  let e = criarExploracao('amostra', ctx(), fixa())!;
  assert.equal(e.pontos.length, 2);
  assert.equal(alvoDaSeta(e, 0, 0), null);
  assert.ok(pista(e, 0, 0));
  const r = avancar(e, e.pontos[0].x, e.pontos[0].y, false);
  assert.ok(r.passou);   // on foot is fine
  e = r.e;
  assert.deepEqual(alvoDaSeta(e, 0, 0), e.pontos[1]);
  assert.equal(pista(e, 0, 0), null);
  e = avancar(e, e.pontos[1].x, e.pontos[1].y, false).e;
  assert.ok(terminada(e));
});

test('beacons light up in any order, after staying a moment at each', () => {
  let e = criarExploracao('balizas', ctx(), fixa(0.3))!;
  assert.ok(e.pontos.length === 3 || e.pontos.length === 4);
  const ordem = e.pontos.map((_p, i) => e.pontos.length - 1 - i);
  for (const i of ordem) {
    const p = e.pontos[i];
    let r = avancar(e, p.x, p.y, false, 0.8);
    assert.ok(!r.passou && r.progresso > 0.4 && r.progresso < 0.6);
    r = avancar(r.e, p.x, p.y, false, 1);
    assert.ok(r.passou);
    e = r.e;
  }
  assert.ok(terminada(e));
});

test('walking away from a beacon resets the time spent there', () => {
  let e = criarExploracao('balizas', ctx(), fixa(0.3))!;
  const p = e.pontos[0];
  e = avancar(e, p.x, p.y, false, 1.2).e;
  assert.ok(e.espera > 1);
  e = avancar(e, p.x + 20, p.y, false, 0.1).e;
  assert.equal(e.espera, 0);
});

test('the ice spot is a far crater and opens the scanner on arrival', () => {
  const e = criarExploracao('gelo', ctx(), fixa())!;
  assert.equal(e.cena, 'ScannerGeloTarefa');
  assert.ok(Math.hypot(e.pontos[0].x - 32, e.pontos[0].y - 32) >= 10);   // not the crater next to the base
});

test('Mars tubes are picked up in order', () => {
  let e = criarExploracao('tubos', ctx(), fixa(0.4))!;
  assert.ok(e.pontos.length === 3 || e.pontos.length === 4);
  assert.equal(avancar(e, e.pontos[2].x, e.pontos[2].y, false).passou, false);
  for (const p of [...e.pontos]) e = avancar(e, p.x, p.y, false).e;
  assert.ok(terminada(e));
});

test('spots go far out on the map, away from the buildings and from each other', () => {
  const evitar = [{ x: 32, y: 32 }, { x: 36, y: 30 }, { x: 28, y: 35 }];
  for (let i = 0; i < 30; i++) {
    const sorte = (() => { let k = i * 7 + 1; return () => ((k = (k * 9301 + 49297) % 233280) / 233280); })();
    for (const tipo of ['balizas', 'tubos'] as const) {
      const e = criarExploracao(tipo, ctx({ evitar }), sorte);
      assert.ok(e, tipo);
      for (const p of e!.pontos) {
        assert.ok(Math.hypot(p.x - 32, p.y - 32) >= 10, `${tipo} too close to the base`);
        assert.ok(evitar.every((m) => Math.hypot(m.x - p.x, m.y - p.y) >= 6));
      }
      const n = e!.pontos.length;
      for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) assert.ok(Math.hypot(e!.pontos[a].x - e!.pontos[b].x, e!.pontos[a].y - e!.pontos[b].y) >= 12);
    }
    const amostra = criarExploracao('amostra', ctx({ evitar }), sorte)!;
    assert.ok(Math.hypot(amostra.pontos[0].x - 32, amostra.pontos[0].y - 32) >= 12);
  }
});

test('spots stay inside the map and nothing is made when there is no free ground', () => {
  for (let i = 0; i < 40; i++) {
    const e = criarExploracao('balizas', ctx(), () => (i * 0.137) % 1) as Expedicao | null;
    if (e) for (const p of e.pontos) assert.ok(p.x >= 4 && p.y >= 4 && p.x <= 60 && p.y <= 60);
  }
  assert.equal(criarExploracao('amostra', ctx({ livre: () => false }), fixa()), null);
});

test('events come from day 2, by world, and never the same kind twice in a row', () => {
  assert.equal(haExploracaoHoje(1, 'lua', () => 0), false);
  assert.equal(haExploracaoHoje(2, 'lua', () => 0.74), true);
  assert.equal(haExploracaoHoje(2, 'lua', () => 0.76), false);
  assert.ok(esperaDaExploracao(() => 0.999) <= 8);   // as soon as the day starts
  assert.equal(haExploracaoHoje(5, 'nave', () => 0), false);
  assert.ok(TIPOS_POR_MUNDO.lua.includes(sortearTipo('lua', undefined, () => 0)!));
  for (let i = 0; i < 30; i++) assert.notEqual(sortearTipo('lua', 'balizas', () => i / 30), 'balizas');
  assert.equal(sortearTipo('marte', 'tubos', () => 0), 'tubos');   // only one kind: it can repeat
  assert.equal(sortearTipo('nave', undefined, () => 0), undefined);
  assert.equal(esperaDaExploracao(() => 0), ESPERA_EXPLORACAO_MIN);
  assert.ok(esperaDaExploracao(() => 0.999) <= ESPERA_EXPLORACAO_MAX);
});
