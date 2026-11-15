import { test } from 'node:test';
import assert from 'node:assert/strict';
import { passoAtual, descrever, tutorialJaVisto, marcarTutorialVisto, CHAVE_TUTORIAL, type ContextoGuia } from './tutorial.ts';

const base: ContextoGuia = { moveu: false, pulou: false, noHabitat: 5, carregando: 0, entregas: 0, fase: 'dia' };
const memoria = () => {
  const dados = new Map<string, string>();
  return { getItem: (k: string) => dados.get(k) ?? null, setItem: (k: string, v: string) => { dados.set(k, v); } };
};

test('the guide follows what the player does: walk, jump, pick up, deliver, end day', () => {
  assert.equal(passoAtual(base), 'mover');
  assert.equal(passoAtual({ ...base, moveu: true }), 'pular');
  assert.equal(passoAtual({ ...base, moveu: true, pulou: true }), 'habitat');
  assert.equal(passoAtual({ ...base, moveu: true, pulou: true, noHabitat: 0, carregando: 5 }), 'salas');
  assert.equal(passoAtual({ ...base, moveu: true, pulou: true, noHabitat: 0, carregando: 4, entregas: 1 }), 'fim');
});

test('the guide ends when the day is over, whatever step it was on', () => {
  assert.equal(passoAtual({ ...base, fase: 'noite' }), 'pronto');
  assert.equal(descrever('pronto', base), null);
});

test('each step points at something useful', () => {
  assert.equal(descrever('mover', base)!.alvo, null);
  assert.deepEqual(descrever('pular', base)!.teclas, ['SPACE']);
  assert.equal(descrever('habitat', base)!.alvo, 'habitat');
  assert.equal(descrever('salas', base)!.alvo, 'salas');
  // Last step: keep pointing at rooms while batteries remain, then at END DAY.
  assert.equal(descrever('fim', { ...base, carregando: 2, noHabitat: 0 })!.alvo, 'salas');
  assert.equal(descrever('fim', { ...base, carregando: 0, noHabitat: 0 })!.alvo, 'fim');
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
