import test from 'node:test';
import assert from 'node:assert/strict';
import { criarTarefaOxigenioFaixa, passo, progresso, tarefaConcluida, naFaixa, emAlerta, faltaOxigenio } from './oxigenio-faixa-tarefa.ts';

test('starts below the green band with no progress', () => {
  const t = criarTarefaOxigenioFaixa();
  assert.equal(faltaOxigenio(t), true);
  assert.equal(naFaixa(t), false);
  assert.equal(progresso(t), 0);
  assert.equal(tarefaConcluida(t), false);
});

test('without injecting, the level leaks and never goes negative', () => {
  let t = criarTarefaOxigenioFaixa();
  const antes = t.nivel;
  t = passo(t, false, 0.5);
  assert.ok(t.nivel < antes);
  for (let i = 0; i < 200; i++) t = passo(t, false, 0.1);
  assert.equal(t.nivel, 0);
});

test('injecting raises the level (more than the leak) and never goes past 1', () => {
  let t = criarTarefaOxigenioFaixa();
  const antes = t.nivel;
  assert.ok(passo(t, true, 0.2).nivel > antes);
  for (let i = 0; i < 200; i++) t = passo(t, true, 0.1);
  assert.equal(t.nivel, 1);
});

test('the old state does not change', () => {
  const t = criarTarefaOxigenioFaixa();
  passo(t, true, 1);
  assert.equal(t.nivel, 0.3);
});

test('above the band is an alert and progress drops', () => {
  let t = { ...criarTarefaOxigenioFaixa(), nivel: 0.69, tempoNaFaixa: 3 };
  t = passo(t, true, 0.2);
  assert.equal(emAlerta(t), true);
  assert.ok(t.tempoNaFaixa < 3);
  const zerado = passo({ ...t, tempoNaFaixa: 0 }, true, 0.1);
  assert.ok(zerado.tempoNaFaixa >= 0);
});

test('below the band progress stays still', () => {
  const t = { ...criarTarefaOxigenioFaixa(), nivel: 0.2, tempoNaFaixa: 2 };
  assert.equal(passo(t, false, 0.1).tempoNaFaixa, 2);
});

test('holding the band accumulates time and the task finishes only once', () => {
  let t = { ...criarTarefaOxigenioFaixa(), nivel: 0.55 };
  // alternate injecting/leaking to hover in the band
  for (let i = 0; i < 2000 && !tarefaConcluida(t); i++) t = passo(t, t.nivel < 0.57, 0.05);
  assert.equal(tarefaConcluida(t), true);
  assert.equal(progresso(t), 1);
  assert.equal(passo(t, true, 1), t, 'nothing changes after finishing');
});

test('it is possible to win just by holding the button at the right rhythm (winnable)', () => {
  let t = criarTarefaOxigenioFaixa();
  for (let i = 0; i < 4000 && !tarefaConcluida(t); i++) t = passo(t, t.nivel < (t.faixaMin + t.faixaMax) / 2, 0.02);
  assert.equal(tarefaConcluida(t), true);
});
