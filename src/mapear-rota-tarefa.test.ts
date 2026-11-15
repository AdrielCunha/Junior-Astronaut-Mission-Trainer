// Generated with AI assistance (Claude). See README, "Use of AI tools".
import test from 'node:test';
import assert from 'node:assert/strict';
import { criarConstelacao, proximaEstrela, estrelaNoPonto, ligarEstrela, estrelasLigadas, constelacaoConcluida } from './mapear-rota-tarefa.ts';

test('the constellation starts with star 1 lit and star 2 next', () => {
  const c = criarConstelacao();
  assert.equal(c.estrelas.length, 7);
  assert.equal(estrelasLigadas(c), 1);
  assert.equal(proximaEstrela(c), 2);
  assert.equal(constelacaoConcluida(c), false);
});

test('joining a star out of order changes nothing', () => {
  const c = criarConstelacao();
  assert.equal(ligarEstrela(c, 5), c);
  assert.equal(ligarEstrela(c, 1), c);
  assert.equal(ligarEstrela(c, 99), c);
});

test('joining the next star moves forward and leaves the old state untouched', () => {
  const c = criarConstelacao();
  const d = ligarEstrela(c, 2);
  assert.equal(estrelasLigadas(d), 2);
  assert.equal(proximaEstrela(d), 3);
  assert.equal(estrelasLigadas(c), 1);
});

test('joining all in order finishes, and then the next one is 0', () => {
  let c = criarConstelacao();
  for (let n = 2; n <= c.estrelas.length; n++) c = ligarEstrela(c, n);
  assert.equal(constelacaoConcluida(c), true);
  assert.equal(proximaEstrela(c), 0);
});

test('estrelaNoPonto finds the star within reach and 0 outside it', () => {
  const c = criarConstelacao();
  const e = c.estrelas[2];
  assert.equal(estrelaNoPonto(c, { x: e.x + 10, y: e.y - 10 }), 3);
  assert.equal(estrelaNoPonto(c, { x: 5, y: 5 }), 0);
});

test('the stars stay inside the window and away from each other', () => {
  const c = criarConstelacao();
  for (const e of c.estrelas) assert.ok(e.x > 30 && e.x < c.largura - 30 && e.y > 30 && e.y < c.altura - 30);
  for (const a of c.estrelas) for (const b of c.estrelas) if (a !== b) assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > c.raioToque * 2);
});
