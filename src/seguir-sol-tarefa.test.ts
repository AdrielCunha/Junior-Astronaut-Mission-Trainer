// Generated with AI assistance (Claude). See README, "Use of AI tools".
import test from 'node:test';
import assert from 'node:assert/strict';
import { criarSeguirSol, passo, girarPainel, alinhado, tarefaConcluida, ARCO, TEMPO_CARGA, ANGULO_MAX } from './seguir-sol-tarefa.ts';

test('starts empty with the panel facing away from the Sun', () => {
  for (const s of [1, 2]) {
    const e = criarSeguirSol(s);
    assert.equal(e.carga, 0);
    assert.ok(!alinhado(e));
  }
});

test('looking away never charges and never loses charge', () => {
  let e = criarSeguirSol(1);
  for (let i = 0; i < 100; i++) e = passo(girarPainel(e, e.sol > 0 ? -ANGULO_MAX : ANGULO_MAX), 0.1);
  assert.equal(e.carga, 0);
});

test('the Sun stays inside the arc and turns back at its ends', () => {
  let e = criarSeguirSol(1);
  const sentidos = new Set<number>();
  for (let i = 0; i < 400; i++) { e = passo(e, 0.1); assert.ok(Math.abs(e.sol) <= ARCO + 1e-9); sentidos.add(e.sentido); }
  assert.deepEqual([...sentidos].sort(), [-1, 1]);
});

test('following the Sun fills the charge in TEMPO_CARGA seconds and then stops changing', () => {
  let e = criarSeguirSol(2);
  let t = 0;
  while (!tarefaConcluida(e) && t < 60) { e = passo(girarPainel(e, e.sol), 0.1); t += 0.1; }
  assert.ok(tarefaConcluida(e));
  assert.ok(Math.abs(t - TEMPO_CARGA) < 0.2);
  assert.deepEqual(girarPainel(e, 0), e);
  assert.deepEqual(passo(e, 1), e);
});

test('the panel angle is clamped', () => {
  assert.equal(girarPainel(criarSeguirSol(1), 500).painel, ANGULO_MAX);
  assert.equal(girarPainel(criarSeguirSol(1), -500).painel, -ANGULO_MAX);
});
