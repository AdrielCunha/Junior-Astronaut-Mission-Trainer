import test from 'node:test';
import assert from 'node:assert/strict';
import { CORES_BASE, proximaCor, multiplicarTom } from './cores.ts';

test('colors have unique ids', () => {
  assert.equal(new Set(CORES_BASE.map((c) => c.id)).size, CORES_BASE.length);
  assert.ok(CORES_BASE.length >= 5);
});

test('clicking cycles no color, then the colors won, then back', () => {
  assert.equal(proximaCor('', []), '');
  assert.equal(proximaCor('', ['azul']), 'azul');
  assert.equal(proximaCor('azul', ['azul']), '');
  assert.equal(proximaCor('azul', ['roxo', 'azul']), 'roxo');   // palette order, not the order won
  assert.equal(proximaCor('verde', ['azul']), 'azul');          // a color no longer owned starts over
});

test('tints multiply channel by channel', () => {
  assert.equal(multiplicarTom(0xffffff, 0xa8d0ff), 0xa8d0ff);
  assert.equal(multiplicarTom(0x000000, 0xa8d0ff), 0);
  assert.equal(multiplicarTom(0xff8000, 0xffffff), 0xff8000);
});
