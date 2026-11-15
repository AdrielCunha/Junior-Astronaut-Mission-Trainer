// Generated with AI assistance (Claude). See README, "Use of AI tools".
import test from 'node:test';
import assert from 'node:assert/strict';
import { criarManobra, soprar, passo, naFaixa, centroFaixa, tarefaConcluida, IMPULSO, META, MEIA_FAIXA } from './manobra-nave-tarefa.ts';

test('starts in the lane, still, with no progress', () => {
  const e = criarManobra(3);
  assert.ok(naFaixa(e));
  assert.equal(e.v, 0);
  assert.equal(e.progresso, 0);
});

test('a puff keeps the ship drifting until a puff the other way stops it', () => {
  let e = soprar(criarManobra(1), 1);
  assert.equal(e.v, IMPULSO);
  const x0 = e.x;
  e = passo(e, 0.5);
  e = passo(e, 0.5);
  assert.ok(e.x > x0 + IMPULSO * 0.9);   // still moving after 1 s with no new puff
  e = soprar(e, -1);
  assert.equal(e.v, 0);
});

test('the ship never leaves the screen', () => {
  let e = criarManobra(2);
  for (let i = 0; i < 10; i++) e = soprar(e, 1);
  for (let i = 0; i < 100; i++) { e = passo(e, 0.1); assert.ok(e.x >= 0.04 && e.x <= 0.96); }
});

test('outside the lane the bar waits; following the lane fills it in META seconds', () => {
  let e = criarManobra(4);
  e = { ...e, x: centroFaixa(0, 4) + MEIA_FAIXA * 3 };
  const fora = passo(e, 1);
  assert.equal(fora.progresso, 0);
  let s = criarManobra(4), t = 0;
  while (!tarefaConcluida(s) && t < 60) { s = passo({ ...s, x: centroFaixa(s.t, s.semente), v: 0 }, 0.1); t += 0.1; }
  assert.ok(tarefaConcluida(s));
  assert.ok(Math.abs(t - META) < 0.3);
  assert.deepEqual(soprar(s, 1), s);
});
