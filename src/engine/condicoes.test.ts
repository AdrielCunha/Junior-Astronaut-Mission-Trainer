import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortearCondicoes, CONDICOES, ESTUFA_OXIGENIO } from './condicoes.ts';

// A seeded random generator (numerical recipes LCG): the same seed always gives the same days.
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 2 ** 32; };
}

test('the array has one entry per day, and day 1 is always calm', () => {
  assert.deepEqual(sortearCondicoes(0), []);
  for (let seed = 1; seed <= 100; seed++) {
    const lista = sortearCondicoes(12, lcg(seed));
    assert.equal(lista.length, 12);
    assert.equal(lista[0], null);
  }
});

test('never two condition days in a row', () => {
  for (let seed = 1; seed <= 300; seed++) {
    const lista = sortearCondicoes(12, lcg(seed));
    for (let i = 0; i + 1 < lista.length; i++) assert.ok(!(lista[i] && lista[i + 1]), `seed ${seed}, day ${i + 1}`);
  }
});

test('with sorte always 0, every second day has a condition, and the kinds are valid', () => {
  const lista = sortearCondicoes(9, () => 0);
  assert.deepEqual(lista, [null, 'sol', null, 'sol', null, 'sol', null, 'sol', null]);
  const validos = ['sol', 'sinal', 'estufa'];
  for (const c of lista) if (c !== null) assert.ok(validos.includes(c));
});

test('the kind is picked from all three', () => {
  const sequencia = [0, 0.99];          // chance: yes; kind: the last one (estufa)
  let i = 0;
  assert.deepEqual(sortearCondicoes(2, () => sequencia[i++]), [null, 'estufa']);
});

test('the texts and the oxygen loss are set', () => {
  assert.equal(ESTUFA_OXIGENIO, 5);
  assert.ok(CONDICOES.sol.aviso('marte').startsWith('Dust storm'));
  assert.ok(CONDICOES.sol.aviso('lua').startsWith('Little sunlight'));
  for (const c of ['sol', 'sinal', 'estufa'] as const) {
    assert.ok(CONDICOES[c].fato.length > 0);
    assert.ok(CONDICOES[c].conceito.length > 0);
  }
});
