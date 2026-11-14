// Generated with AI assistance (Claude). See README, "Use of AI tools".
import test from 'node:test';
import assert from 'node:assert/strict';
import { criarTarefaTapar, colocarSaco, removerSaco, cobertura, doseSentida, tarefaConcluida } from './tapar-tempestade-tarefa.ts';

const idDoLado = (t: ReturnType<typeof criarTarefaTapar>, lado: string, f: number) => t.encaixes.find((e) => e.lado === lado && e.fileira === f)!.id;

test('starts with no protection, full dose and bags in the pile', () => {
  const t = criarTarefaTapar();
  assert.equal(t.encaixes.length, 8);
  assert.ok(t.sacosNaPilha >= t.fileiras);
  assert.equal(cobertura(t), 0);
  assert.equal(doseSentida(t), 1);
  assert.equal(tarefaConcluida(t), false);
});

test('a bag on the storm side lowers the dose and uses up a bag', () => {
  const t = criarTarefaTapar('esquerda');
  const r = colocarSaco(t, idDoLado(t, 'esquerda', 0));
  assert.equal(r.resultado, 'certo');
  assert.equal(r.tarefa.sacosNaPilha, t.sacosNaPilha - 1);
  assert.ok(doseSentida(r.tarefa) < 1);
  assert.equal(t.sacosNaPilha, criarTarefaTapar().sacosNaPilha, 'the old state does not change');
});

test('a bag on the wrong side is not accepted and does not use up a bag', () => {
  const t = criarTarefaTapar('esquerda');
  const r = colocarSaco(t, idDoLado(t, 'direita', 1));
  assert.equal(r.resultado, 'lado-errado');
  assert.equal(r.tarefa, t);
});

test('an occupied slot does not accept another bag', () => {
  const t = criarTarefaTapar();
  const id = idDoLado(t, 'esquerda', 2);
  const a = colocarSaco(t, id).tarefa;
  assert.equal(colocarSaco(a, id).resultado, 'ocupado');
});

test('the dose only drops with each right bag and covering the whole side finishes', () => {
  let t = criarTarefaTapar('direita');
  let anterior = doseSentida(t);
  for (let f = 0; f < t.fileiras; f++) {
    t = colocarSaco(t, idDoLado(t, 'direita', f)).tarefa;
    assert.ok(doseSentida(t) < anterior);
    anterior = doseSentida(t);
  }
  assert.equal(cobertura(t), 1);
  assert.equal(tarefaConcluida(t), true);
});

test('with one bag missing it does not finish; removing returns the bag to the pile', () => {
  let t = criarTarefaTapar();
  for (let f = 0; f < 3; f++) t = colocarSaco(t, idDoLado(t, 'esquerda', f)).tarefa;
  assert.equal(tarefaConcluida(t), false);
  const antes = t.sacosNaPilha;
  const u = removerSaco(t, idDoLado(t, 'esquerda', 0));
  assert.equal(u.sacosNaPilha, antes + 1);
  assert.ok(doseSentida(u) > doseSentida(t));
  assert.equal(removerSaco(u, idDoLado(u, 'esquerda', 0)), u);
});

test('with no bags in the pile you cannot place one', () => {
  const t = { ...criarTarefaTapar(), sacosNaPilha: 0 };
  assert.equal(colocarSaco(t, 0).resultado, 'sem-sacos');
});
