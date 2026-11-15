// Generated with AI assistance (Claude). See README, "Use of AI tools".
import test from 'node:test';
import assert from 'node:assert/strict';
import { criarScanner, escanear, marcar, leituraReal, melhorLeitura, tarefaConcluida, COLUNAS, LINHAS } from './scanner-gelo-tarefa.ts';

test('the ice is never on the edge, and the same seed gives the same spot', () => {
  for (let s = 0; s < 60; s++) {
    const e = criarScanner(s), c = e.gelo % COLUNAS, l = Math.floor(e.gelo / COLUNAS);
    assert.ok(c > 0 && c < COLUNAS - 1 && l > 0 && l < LINHAS - 1);
  }
  assert.deepEqual(criarScanner(9), criarScanner(9));
});

test('the reading is 100 on the ice and drops with the distance', () => {
  const e = criarScanner(3);
  assert.equal(leituraReal(e.gelo, e.gelo), 100);
  assert.equal(leituraReal(e.gelo, e.gelo + 1), 78);
  assert.ok(leituraReal(e.gelo, e.gelo + 2) < leituraReal(e.gelo, e.gelo + 1));
  assert.equal(leituraReal(0, COLUNAS * LINHAS - 1), 0);
});

test('scanning shows a reading once, and the best reading is kept', () => {
  let e = criarScanner(3);
  e = escanear(e, e.gelo + 1);
  assert.equal(e.escaneios, 1);
  assert.deepEqual(escanear(e, e.gelo + 1), e);
  assert.deepEqual(escanear(e, -1), e);
  e = escanear(e, e.gelo);
  assert.equal(melhorLeitura(e), 100);
});

test('only a scanned spot can be marked; a wrong mark is only a hint', () => {
  let e = criarScanner(5);
  let r = marcar(e, e.gelo);
  assert.ok(!r.certo && r.dica.includes('first'));
  e = escanear(escanear(e, e.gelo + 1), e.gelo - 1);
  r = marcar(e, e.gelo + 1);
  assert.ok(!r.certo && r.e.marcas === 1 && r.dica.includes('close'));
  e = escanear(e, e.gelo);
  r = marcar(e, e.gelo);
  assert.ok(r.certo && tarefaConcluida(r.e));
  assert.deepEqual(escanear(r.e, 0), r.e);
});
