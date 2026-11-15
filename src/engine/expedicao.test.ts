// Generated with AI assistance (Claude). See README, "Use of AI tools".
import test from 'node:test';
import assert from 'node:assert/strict';
import { avancar, terminada, tracarRota, pontoLivrePerto, maisLonge, criarCorridaEntrega, BANDEIRAS_CORRIDA } from './expedicao.ts';

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
  assert.equal(e.pontos.length, BANDEIRAS_CORRIDA);
  // the second flag does not count before the first
  assert.equal(avancar(e, e.pontos[1].x, e.pontos[1].y, true).passou, false);
  // on foot at the right flag: not counted, but noticed
  const aPe = avancar(e, e.pontos[0].x, e.pontos[0].y, false);
  assert.ok(!aPe.passou && aPe.aPe);
  for (const p of e.pontos) { const r = avancar(e, p.x, p.y, true); assert.ok(r.passou); e = r.e; }
  assert.ok(terminada(e));
  assert.equal(avancar(e, 0, 0, true).passou, false);
});

test('no run when there is no room for flags; the farthest module is picked', () => {
  assert.equal(criarCorridaEntrega({ x: 0, y: 0 }, { x: 10, y: 0, nome: 'X' }, () => false), null);
  assert.equal(maisLonge({ x: 0, y: 0 }, [{ x: 3, y: 0, n: 'a' }, { x: 0, y: 9, n: 'b' }, { x: 5, y: 5, n: 'c' }])!.n, 'b');
});
