// Generated with AI assistance (Claude). See README, "Use of AI tools".
import test from 'node:test';
import assert from 'node:assert/strict';
import { criarBateria, tirarVazia, girar, encaixar, travar, posicaoCerta, tarefaConcluida } from './bateria-rover-tarefa.ts';

test('the new battery never starts the right way', () => {
  for (let s = 0; s < 12; s++) assert.ok(!posicaoCerta(criarBateria(s)));
});

test('steps only work in order', () => {
  const e = criarBateria(1);
  assert.deepEqual(girar(e), e);
  assert.deepEqual(encaixar(e), e);
  assert.deepEqual(travar(e), e);
  assert.equal(tirarVazia(e).etapa, 'encaixar');
});

test('a wrong-way battery does not go in; four turns come back to the start', () => {
  let e = tirarVazia(criarBateria(2));
  assert.deepEqual(encaixar(e), e);
  const giro = e.giro;
  for (let i = 0; i < 4; i++) e = girar(e);
  assert.equal(e.giro, giro);
});

test('turn until it fits, slide it in, close the latch', () => {
  let e = tirarVazia(criarBateria(3));
  while (!posicaoCerta(e)) e = girar(e);
  e = encaixar(e);
  assert.equal(e.etapa, 'travar');
  assert.deepEqual(girar(e), e);
  e = travar(e);
  assert.ok(tarefaConcluida(e));
});
