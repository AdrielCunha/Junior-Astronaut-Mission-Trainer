// Generated with AI assistance (Claude). See README, "Use of AI tools".
import test from 'node:test';
import assert from 'node:assert/strict';
import { criarTarefaReator, ligarEmOrdem, proximoModulo, carregar, reatorOnline, tarefaConcluida, ignicaoLiberada } from './reator-tarefa.ts';

test('the sequence starts with the pump', () => {
  const t = criarTarefaReator();
  assert.equal(proximoModulo(t), 'bomba');
  assert.equal(t.carga, 0);
});

test('switching on out of order changes nothing and does not punish', () => {
  const t = criarTarefaReator();
  assert.equal(ligarEmOrdem(t, 'gerador'), t);
  assert.equal(ligarEmOrdem(t, 'tubulacao'), t);
});

test('switching on in order moves forward until the ignition is released', () => {
  let t = criarTarefaReator();
  for (const id of ['bomba', 'tubulacao', 'gerador']) t = ligarEmOrdem(t, id);
  assert.equal(proximoModulo(t), null);
  assert.equal(tarefaConcluida(t), true);
  assert.equal(ignicaoLiberada(t), true);
});

test('without the modules on, the charge does not rise', () => {
  const t = criarTarefaReator();
  assert.equal(carregar(t, 5, true), t);
});

test('holding fills the charge, releasing drains it slowly, and at the maximum it goes online', () => {
  let t = criarTarefaReator();
  for (const id of ['bomba', 'tubulacao', 'gerador']) t = ligarEmOrdem(t, id);
  t = carregar(t, 1, true);
  assert.ok(t.carga > 0.3 && t.carga < 0.5);
  const solto = carregar(t, 1, false);
  assert.ok(solto.carga < t.carga && solto.carga > 0.2);
  assert.equal(reatorOnline(t), false);
  t = carregar(t, 10, true);
  assert.equal(t.carga, 1);
  assert.equal(reatorOnline(t), true);
  assert.equal(carregar(criarTarefaReator(), 1, false).carga, 0);
});
