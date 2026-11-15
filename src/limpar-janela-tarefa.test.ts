// Generated with AI assistance (Claude). See README, "Use of AI tools".
import test from 'node:test';
import assert from 'node:assert/strict';
import { criarJanela, limpar, tocar, fracaoLimpa, tarefaConcluida, COLUNAS, LINHAS, LIMPO_SUFICIENTE } from './limpar-janela-tarefa.ts';

const todas = Array.from({ length: COLUNAS * LINHAS }, (_, k) => k);

test('starts all dirty, some cells with dust that needs two wipes', () => {
  const e = criarJanela(5);
  assert.equal(e.fase, 'limpar');
  assert.equal(fracaoLimpa(e), 0);
  assert.ok(e.sujeira.some((v) => v === 2) && e.sujeira.some((v) => v === 1));
  assert.deepEqual(criarJanela(5), criarJanela(5));
});

test('one wipe takes one layer; dusty cells stay dirty after the first pass', () => {
  const e = criarJanela(5);
  const dupla = e.sujeira.findIndex((v) => v === 2);
  assert.equal(limpar(e, [dupla, dupla, dupla]).sujeira[dupla], 1);
});

test('reaching 90% clean finishes the cleaning and moves to finding Earth', () => {
  let e = criarJanela(2);
  e = limpar(e, todas);
  assert.equal(e.fase, fracaoLimpa(e) >= LIMPO_SUFICIENTE ? 'achar' : 'limpar');
  e = limpar(e, todas);
  assert.equal(e.fase, 'achar');
  assert.ok(e.sujeira.every((v) => v === 0));
});

test('a wrong tap is only a hint; tapping Earth completes the task', () => {
  let e = limpar(limpar(criarJanela(1), todas), todas);
  assert.equal(tocar(criarJanela(1), 'terra').fase, 'limpar');   // no finding before the window is clean
  e = tocar(e, 'lua');
  assert.equal(e.erros, 1);
  assert.equal(e.fase, 'achar');
  e = tocar(e, 'terra');
  assert.ok(tarefaConcluida(e));
});
