// Generated with AI assistance (Claude). See README, "Use of AI tools".
import test from 'node:test';
import assert from 'node:assert/strict';
import { criarRumo, diferencaAngular, apontarPara, avancarRumo, rumoNoAlvo, rumoConcluido, alvoAtual, progressoDoAlvo } from './direcao-tarefa.ts';

test('a diferença entre ângulos dá a volta no círculo', () => {
  assert.equal(diferencaAngular(350, 10), 20);
  assert.equal(diferencaAngular(0, 180), 180);
  assert.equal(diferencaAngular(90, 90), 0);
  assert.equal(diferencaAngular(-90, 270), 0);
});

test('apontar normaliza o ângulo entre 0 e 360', () => {
  assert.equal(apontarPara(criarRumo(), -30).rumo, 330);
  assert.equal(apontarPara(criarRumo(), 450).rumo, 90);
});

test('começa no primeiro alvo (norte), fora do rumo e sem travar', () => {
  const t = criarRumo();
  assert.equal(alvoAtual(t)?.id, 'norte');
  assert.equal(rumoNoAlvo(t), false);
  assert.equal(rumoConcluido(t), false);
  assert.equal(avancarRumo(t, 5), t);
});

test('segurar o rumo trava o alvo e passa ao próximo', () => {
  let t = apontarPara(criarRumo(), 5);
  assert.equal(rumoNoAlvo(t), true);
  t = avancarRumo(t, 0.4);
  assert.equal(progressoDoAlvo(t), 0.5);
  assert.equal(t.indice, 0);
  t = avancarRumo(t, 0.5);
  assert.equal(t.indice, 1);
  assert.equal(t.seguro, 0);
  assert.equal(alvoAtual(t)?.id, 'leste');
});

test('sair da tolerância esvazia o progresso sem punição', () => {
  let t = avancarRumo(apontarPara(criarRumo(), 0), 0.4);
  t = apontarPara(t, 60);
  const depois = avancarRumo(t, 0.1);
  assert.ok(depois.seguro < t.seguro && depois.seguro >= 0);
  assert.equal(depois.indice, 0);
});

test('travar norte, leste e sul conclui, e depois nada mais muda', () => {
  let t = criarRumo();
  for (const a of [0, 90, 180]) t = avancarRumo(apontarPara(t, a), 1);
  assert.equal(rumoConcluido(t), true);
  assert.equal(alvoAtual(t), undefined);
  assert.equal(avancarRumo(t, 1), t);
});
