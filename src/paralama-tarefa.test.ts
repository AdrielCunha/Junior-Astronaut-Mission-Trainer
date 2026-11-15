// Generated with AI assistance (Claude). See README, "Use of AI tools".
import test from 'node:test';
import assert from 'node:assert/strict';
import { criarParalama, colocarMapa, prender, deveQuebrar, mapasColocados, tarefaConcluida, DISTANCIA_QUEBRA, NUM_PECAS } from './paralama-tarefa.ts';

test('the fender breaks once a day, after enough driving', () => {
  assert.ok(!deveQuebrar(DISTANCIA_QUEBRA - 1, false));
  assert.ok(deveQuebrar(DISTANCIA_QUEBRA, false));
  assert.ok(!deveQuebrar(DISTANCIA_QUEBRA * 5, true));
});

test('a gap takes one map and a placed map does not move', () => {
  let e = colocarMapa(criarParalama(), 0, 2);
  assert.equal(e.mapas[0], 2);
  assert.deepEqual(colocarMapa(e, 1, 2), e);
  assert.deepEqual(colocarMapa(e, 0, 3), e);
  assert.deepEqual(colocarMapa(e, 9, 1), e);
});

test('clamps only close after every gap is covered', () => {
  let e = criarParalama();
  assert.deepEqual(prender(e, 0), e);
  for (let i = 0; i < NUM_PECAS; i++) e = colocarMapa(e, i, NUM_PECAS - 1 - i);
  assert.equal(mapasColocados(e), NUM_PECAS);
  assert.equal(e.fase, 'prender');
  for (let i = 0; i < NUM_PECAS; i++) { assert.ok(!tarefaConcluida(e)); e = prender(e, i); }
  assert.ok(tarefaConcluida(e));
  assert.deepEqual(colocarMapa(e, 0, 0), e);
});
