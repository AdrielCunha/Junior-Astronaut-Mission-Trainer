// Generated with AI assistance (Claude). See README, "Use of AI tools".
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  criarTransferenciaAntena, posicaoDaTerra, anguloParaTerra, erroAngular, sinalBom, forcaDoSinal,
  avancarTransferencia, blocosEnviados, transferenciaConcluida,
} from './transferir-dados-tarefa.ts';

test('Earth stays inside the window the whole time', () => {
  const t = criarTransferenciaAntena();
  for (let s = 0; s < 30; s += 0.5) {
    const p = posicaoDaTerra(t, s);
    assert.ok(p.y >= t.terra.yMin - 1e-9 && p.y <= t.terra.yMax + 1e-9 && p.x === t.terra.x);
  }
});

test('erroAngular gives the smallest difference, even when wrapping around', () => {
  assert.ok(Math.abs(erroAngular(3.1, -3.1) - (2 * Math.PI - 6.2)) < 1e-9);
  assert.equal(erroAngular(1, 1), 0);
  assert.ok(Math.abs(erroAngular(0, Math.PI / 2) - Math.PI / 2) < 1e-9);
});

test('aiming at Earth gives a good signal; aiming the opposite way does not', () => {
  const t = criarTransferenciaAntena();
  const a = anguloParaTerra(t, 3);
  assert.equal(sinalBom(t, a, 3), true);
  assert.equal(sinalBom(t, a + 0.5, 3), false);
  assert.ok(forcaDoSinal(t, a, 3) > 0.99);
  assert.equal(forcaDoSinal(t, a + 1, 3), 0);
});

test('without a good signal nothing advances and the state does not change', () => {
  const t = criarTransferenciaAntena();
  assert.equal(avancarTransferencia(t, 1, anguloParaTerra(t, 0) + 1, 0), t);
});

test('with a good signal progress rises and the blocks go out one by one', () => {
  let t = criarTransferenciaAntena();
  let tempo = 0, anterior = 0;
  while (!transferenciaConcluida(t) && tempo < 60) {
    t = avancarTransferencia(t, 0.1, anguloParaTerra(t, tempo), tempo);
    tempo += 0.1;
    assert.ok(blocosEnviados(t) >= anterior);
    anterior = blocosEnviados(t);
  }
  assert.equal(transferenciaConcluida(t), true);
  assert.equal(blocosEnviados(t), 4);
  assert.ok(tempo <= t.duracao + 0.3);
});

test('losing the signal only pauses: progress already made stays', () => {
  let t = criarTransferenciaAntena();
  t = avancarTransferencia(t, 2, anguloParaTerra(t, 0), 0);
  const p = t.progresso;
  t = avancarTransferencia(t, 2, anguloParaTerra(t, 0) + 1, 0);
  assert.equal(t.progresso, p);
});

test('progress never goes past 1', () => {
  let t = criarTransferenciaAntena();
  t = avancarTransferencia(t, 100, anguloParaTerra(t, 0), 0);
  t = avancarTransferencia(t, 100, anguloParaTerra(t, 0), 0);
  assert.equal(t.progresso, 1);
});
