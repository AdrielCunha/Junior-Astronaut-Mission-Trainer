// Generated with AI assistance (Claude). See README, "Use of AI tools".
import test from 'node:test';
import assert from 'node:assert/strict';
import { criarTarefaValvulas, girarValvula, leituras, naFaixa, tudoNaFaixa, avancar, progresso, tarefaConcluida, nivelDoAngulo } from './equilibrar-valvulas-tarefa.ts';

// Valve levels that put both needles at the centre of the green.
function certo() {
  let t = criarTarefaValvulas();
  t = girarValvula(t, 'o2', t.alvoO2);
  return girarValvula(t, 'co2', t.alvoCo2 - t.acoplamento * (t.alvoO2 - 0.5));
}

test('começa fora do verde, sem tempo estável', () => {
  const t = criarTarefaValvulas();
  assert.equal(naFaixa(t, 'o2'), false);
  assert.equal(naFaixa(t, 'co2'), false);
  assert.equal(tarefaConcluida(t), false);
  assert.equal(progresso(t), 0);
});

test('girar a válvula devolve novo estado, limita 0 a 1 e não muda o antigo', () => {
  const t = criarTarefaValvulas();
  const n = girarValvula(t, 'o2', 5);
  assert.equal(n.o2, 1);
  assert.equal(t.o2, 0.12);
  assert.equal(girarValvula(t, 'co2', -2).co2, 0);
  assert.equal(girarValvula(t, 'o2', t.o2), t);
});

test('a válvula de O2 empurra a leitura do CO2', () => {
  const t = criarTarefaValvulas();
  const a = leituras(girarValvula(t, 'o2', 0.2)).co2;
  const b = leituras(girarValvula(t, 'o2', 0.9)).co2;
  assert.ok(b > a);
});

test('com as duas válvulas certas os dois ponteiros ficam no verde', () => {
  const t = certo();
  assert.equal(naFaixa(t, 'o2'), true);
  assert.equal(naFaixa(t, 'co2'), true);
  assert.equal(tudoNaFaixa(t), true);
});

test('só uma no verde não enche o tempo estável', () => {
  const t = girarValvula(criarTarefaValvulas(), 'o2', 0.7);
  assert.equal(tudoNaFaixa(t), false);
  assert.equal(avancar(t, 5).estavel, 0);
});

test('ficar no verde por 2 segundos conclui', () => {
  let t = certo();
  for (let i = 0; i < 19; i++) t = avancar(t, 0.1);
  assert.equal(tarefaConcluida(t), false);
  assert.ok(progresso(t) > 0.8 && progresso(t) < 1);
  t = avancar(t, 0.2);
  assert.equal(tarefaConcluida(t), true);
  assert.equal(progresso(t), 1);
});

test('sair do verde faz o tempo estável cair, mas não vai abaixo de 0', () => {
  let t = certo();
  t = avancar(t, 1);
  assert.equal(t.estavel, 1);
  t = girarValvula(t, 'o2', 0);
  t = avancar(t, 0.2);
  assert.ok(Math.abs(t.estavel - 0.6) < 1e-9);
  assert.equal(avancar(t, 10).estavel, 0);
});

test('ângulo do ponteiro vira nível da válvula', () => {
  assert.equal(nivelDoAngulo(0), 0.5);
  assert.equal(nivelDoAngulo(-135), 0);
  assert.equal(nivelDoAngulo(135), 1);
  assert.equal(nivelDoAngulo(180), 1);
  assert.equal(nivelDoAngulo(-170), 0);
  assert.equal(nivelDoAngulo(360), 0.5);
  assert.ok(nivelDoAngulo(45) > nivelDoAngulo(-45));
});
