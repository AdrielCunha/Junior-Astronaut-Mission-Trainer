import { test } from 'node:test';
import assert from 'node:assert/strict';
import { passoAtual, descrever, tutorialJaVisto, marcarTutorialVisto, CHAVE_TUTORIAL, type ContextoGuia } from './tutorial.ts';

const base: ContextoGuia = { moveu: false, pulou: false, noHabitat: 5, carregando: 0, oxigenio: 0, meta: 0, fase: 'dia' };
const memoria = () => {
  const dados = new Map<string, string>();
  return { getItem: (k: string) => dados.get(k) ?? null, setItem: (k: string, v: string) => { dados.set(k, v); } };
};

test('the guide follows day 1: walk, jump, Battery Bank, Life Support, Rocket Workshop, the rest, end day', () => {
  const pronto = { ...base, moveu: true, pulou: true };
  assert.equal(passoAtual(base), 'mover');
  assert.equal(passoAtual({ ...base, moveu: true }), 'pular');
  assert.equal(passoAtual(pronto), 'banco');
  assert.equal(passoAtual({ ...pronto, noHabitat: 0, carregando: 5 }), 'suporte');
  assert.equal(passoAtual({ ...pronto, noHabitat: 0, carregando: 4, oxigenio: 1 }), 'oficina');
  assert.equal(passoAtual({ ...pronto, noHabitat: 0, carregando: 3, oxigenio: 1, meta: 1 }), 'resto');
  assert.equal(passoAtual({ ...pronto, noHabitat: 0, carregando: 0, oxigenio: 3, meta: 2 }), 'fim');
});

test('the guide ends when the day is over, whatever step it was on', () => {
  assert.equal(passoAtual({ ...base, fase: 'noite' }), 'pronto');
  assert.equal(descrever('pronto', base), null);
});

test('each step points at the right place: batteries at the Battery Bank, not the Habitat', () => {
  assert.equal(descrever('mover', base)!.alvo, null);
  assert.deepEqual(descrever('pular', base)!.teclas, ['SPACE']);
  assert.equal(descrever('banco', base)!.alvo, 'banco');
  assert.match(descrever('banco', base)!.texto, /Battery Bank/);
  assert.equal(descrever('suporte', base)!.alvo, 'suporte');
  assert.equal(descrever('oficina', base)!.alvo, 'oficina');
  assert.equal(descrever('resto', base)!.alvo, 'salas');
  assert.equal(descrever('fim', base)!.alvo, 'fim');
});

test('mobile guide shows touch controls without desktop keyboard hints', () => {
  assert.deepEqual(descrever('mover', base, true)!.teclas, ['MOVE']);
  assert.deepEqual(descrever('pular', base, true)!.teclas, ['JUMP']);
  assert.deepEqual(descrever('banco', base, true)!.teclas, ['USE']);
  assert.equal(descrever('banco', base, true)!.alvo, 'banco');
  assert.deepEqual(descrever('fim', { ...base, noHabitat: 0 }, true)!.teclas, ['END DAY']);
});

test('the guide is unseen at first and remembered once finished', () => {
  const storage = memoria();
  assert.equal(tutorialJaVisto(storage), false);
  marcarTutorialVisto(storage);
  assert.equal(storage.getItem(CHAVE_TUTORIAL), '1');
  assert.equal(tutorialJaVisto(storage), true);
});

test('blocked storage never throws and the guide just shows again', () => {
  const bloqueado = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } };
  assert.equal(tutorialJaVisto(bloqueado), false);
  assert.doesNotThrow(() => marcarTutorialVisto(bloqueado));
  assert.equal(tutorialJaVisto(null), false);
});
