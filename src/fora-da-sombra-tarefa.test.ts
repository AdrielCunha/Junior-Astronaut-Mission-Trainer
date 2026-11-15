// Generated with AI assistance (Claude). See README, "Use of AI tools".
import test from 'node:test';
import assert from 'node:assert/strict';
import { criarSombra, moverPainel, painelNoSol, paineisNoSol, tarefaConcluida, LAYOUTS, VAGAS, NUM_PAINEIS } from './fora-da-sombra-tarefa.ts';

test('every layout has room in the sun for all panels', () => {
  for (const l of LAYOUTS) {
    assert.equal(l.length, VAGAS);
    assert.ok(l.filter((s) => !s).length >= NUM_PAINEIS);
  }
});

test('panels start on different spots and at least 2 are in the shadow', () => {
  for (let s = 0; s < 20; s++) {
    const e = criarSombra(s);
    assert.equal(new Set(e.paineis).size, NUM_PAINEIS);
    assert.ok(e.paineis.length - paineisNoSol(e) >= 2);
    assert.ok(!tarefaConcluida(e));
  }
});

test('a panel cannot go onto another panel or off the rail', () => {
  const e = criarSombra(1);
  assert.deepEqual(moverPainel(e, 0, e.paineis[1]), e);
  assert.deepEqual(moverPainel(e, 0, -1), e);
  assert.deepEqual(moverPainel(e, 0, VAGAS), e);
});

test('moving every panel to a sunny spot completes the task', () => {
  let e = criarSombra(3);
  const claras = e.sombra.map((s, i) => (s ? -1 : i)).filter((i) => i >= 0);
  // Free the sunny spots first by parking nothing there, then move each panel in turn.
  e.paineis.forEach((_v, i) => { e = moverPainel(e, i, claras.find((c) => !e.paineis.includes(c))!); });
  assert.ok(e.paineis.every((_v, i) => painelNoSol(e, i)));
  assert.ok(tarefaConcluida(e));
});
